import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';
import axios, { CancelTokenSource } from 'axios';

interface AIServiceConfig {
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  cacheTime?: number;
  fallbackEnabled?: boolean;
}

interface AIRequestOptions {
  priority?: 'high' | 'medium' | 'low';
  useCache?: boolean;
  fallback?: any;
  onProgress?: (progress: number) => void;
}

interface AIResponse<T> {
  data: T;
  cached: boolean;
  processingTime?: number;
  error?: any;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; expiry: number }>();

export const useAIService = (config: AIServiceConfig = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  const defaultConfig: Required<AIServiceConfig> = {
    baseURL: config.baseURL || '/api/ai',
    timeout: config.timeout || 5000,
    maxRetries: config.maxRetries || 3,
    cacheTime: config.cacheTime || 300000, // 5 minutes
    fallbackEnabled: config.fallbackEnabled !== false
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, []);

  /**
   * Make AI request with optimizations
   */
  const makeRequest = useCallback(async <T>(
    endpoint: string,
    data?: any,
    options: AIRequestOptions = {}
  ): Promise<AIResponse<T>> => {
    const cacheKey = `${endpoint}:${JSON.stringify(data)}`;
    
    // Check cache first
    if (options.useCache !== false) {
      const cached = cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return {
          data: cached.data,
          cached: true,
          processingTime: 0
        };
      }
    }

    // Cancel previous request
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('New request initiated');
    }

    // Create new cancel token
    cancelTokenRef.current = axios.CancelToken.source();

    setLoading(true);
    setError(null);

    const startTime = Date.now();
    let retries = 0;

    const attemptRequest = async (): Promise<any> => {
      try {
        const response = await axios({
          method: endpoint.includes('search') || endpoint.includes('predict') ? 'POST' : 'GET',
          url: `${defaultConfig.baseURL}${endpoint}`,
          data,
          timeout: defaultConfig.timeout,
          cancelToken: cancelTokenRef.current!.token,
          onDownloadProgress: (progressEvent) => {
            if (options.onProgress && progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              options.onProgress(progress);
            }
          }
        });

        const processingTime = Date.now() - startTime;

        // Cache successful response
        if (options.useCache !== false && response.data.success) {
          cache.set(cacheKey, {
            data: response.data.data || response.data,
            expiry: Date.now() + defaultConfig.cacheTime
          });
        }

        setLoading(false);
        return {
          data: response.data.data || response.data,
          cached: false,
          processingTime
        };

      } catch (err: any) {
        if (axios.isCancel(err)) {
          throw err;
        }

        // Retry logic
        if (retries < defaultConfig.maxRetries && 
            (err.code === 'ECONNABORTED' || err.response?.status >= 500)) {
          retries++;
          const delay = Math.min(100 * Math.pow(2, retries), 2000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptRequest();
        }

        throw err;
      }
    };

    try {
      return await attemptRequest();
    } catch (err: any) {
      setError(err);
      setLoading(false);

      // Return fallback if enabled
      if (defaultConfig.fallbackEnabled && options.fallback !== undefined) {
        console.warn('Using fallback response:', err.message);
        return {
          data: options.fallback,
          cached: false,
          error: err
        };
      }

      throw err;
    }
  }, [defaultConfig]);

  /**
   * AI Search with optimizations
   */
  const search = useCallback(async (
    query: string,
    context?: any,
    options: AIRequestOptions = {}
  ) => {
    return makeRequest<any>('/search', { query, context }, {
      ...options,
      priority: options.priority || 'high',
      fallback: options.fallback || {
        results: [],
        suggestions: [],
        intent: { type: 'mixed', confidence: 0.5 }
      }
    });
  }, [makeRequest]);

  /**
   * AI Suggestions with debouncing
   */
  const getSuggestions = useCallback(
    debounce(async (
      query: string,
      callback: (suggestions: string[]) => void,
      options: AIRequestOptions = {}
    ) => {
      try {
        const response = await makeRequest<string[]>(
          `/suggestions?query=${encodeURIComponent(query)}`,
          undefined,
          {
            ...options,
            priority: 'high',
            fallback: []
          }
        );
        callback(response.data);
      } catch (err) {
        callback(options.fallback || []);
      }
    }, 300),
    [makeRequest]
  );

  /**
   * AI Recommendations
   */
  const getRecommendations = useCallback(async (
    options: AIRequestOptions = {}
  ) => {
    return makeRequest<any[]>('/recommendations', undefined, {
      ...options,
      priority: options.priority || 'medium',
      fallback: options.fallback || []
    });
  }, [makeRequest]);

  /**
   * AI Predictions
   */
  const getPredictions = useCallback(async (
    currentQuery: string,
    context?: any,
    options: AIRequestOptions = {}
  ) => {
    return makeRequest<string[]>('/predict', { currentQuery, context }, {
      ...options,
      priority: options.priority || 'low',
      fallback: options.fallback || []
    });
  }, [makeRequest]);

  /**
   * Batch AI requests
   */
  const batchRequests = useCallback(async (
    requests: Array<{
      type: 'search' | 'recommendation' | 'nlp' | 'prediction';
      data: any;
      priority?: 'high' | 'medium' | 'low';
    }>,
    options: AIRequestOptions = {}
  ) => {
    return makeRequest<any[]>('/batch', { requests }, {
      ...options,
      fallback: options.fallback || requests.map(() => null)
    });
  }, [makeRequest]);

  /**
   * Cancel ongoing requests
   */
  const cancel = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Request cancelled by user');
      setLoading(false);
    }
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback((pattern?: string) => {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of cache.keys()) {
        if (regex.test(key)) {
          cache.delete(key);
        }
      }
    } else {
      cache.clear();
    }
  }, []);

  /**
   * Get cache stats
   */
  const getCacheStats = useCallback(() => {
    let hits = 0;
    let expired = 0;
    const now = Date.now();

    for (const [, value] of cache.entries()) {
      if (value.expiry > now) {
        hits++;
      } else {
        expired++;
      }
    }

    return {
      size: cache.size,
      active: hits,
      expired
    };
  }, []);

  return {
    loading,
    error,
    search,
    getSuggestions,
    getRecommendations,
    getPredictions,
    batchRequests,
    cancel,
    clearCache,
    getCacheStats
  };
};