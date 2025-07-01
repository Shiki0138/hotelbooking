import { logger } from '../utils/logger';
import { CacheService } from './cacheService';
import { createHttpClient, HttpClient } from '../utils/httpClient';
import CircuitBreaker from 'opossum';
import { ErrorCode } from '../types/errors';
import { createError } from '../utils/errorFactory';

interface AIServiceConfig {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  maxConcurrentRequests?: number;
}

interface AIRequest {
  id: string;
  type: 'search' | 'recommendation' | 'nlp' | 'prediction';
  data: any;
  priority?: 'high' | 'medium' | 'low';
  timestamp?: number;
}

interface AIResponse {
  id: string;
  result: any;
  cached?: boolean;
  processingTime?: number;
  error?: any;
}

interface RequestQueue {
  high: AIRequest[];
  medium: AIRequest[];
  low: AIRequest[];
}

export class AIService {
  private cache: CacheService;
  private httpClient: HttpClient;
  private circuitBreaker: CircuitBreaker;
  private config: Required<AIServiceConfig>;
  private requestQueue: RequestQueue;
  private activeRequests: Map<string, Promise<AIResponse>>;
  private processingCount: number = 0;

  constructor(config?: AIServiceConfig) {
    // Optimized configuration for better UX
    this.config = {
      timeout: config?.timeout || 5000, // 5 seconds default
      maxRetries: config?.maxRetries || 3,
      retryDelay: config?.retryDelay || 100, // Start with 100ms
      cacheEnabled: config?.cacheEnabled !== false,
      cacheTTL: config?.cacheTTL || 3600, // 1 hour cache
      circuitBreakerThreshold: config?.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config?.circuitBreakerTimeout || 30000, // 30 seconds
      maxConcurrentRequests: config?.maxConcurrentRequests || 10
    };

    this.cache = new CacheService();
    
    // HTTP client with intelligent retry
    this.httpClient = createHttpClient({
      name: 'AIService',
      timeout: this.config.timeout,
      retry: {
        retries: this.config.maxRetries,
        retryDelay: (retryCount) => {
          // Exponential backoff with jitter
          const baseDelay = this.config.retryDelay * Math.pow(2, retryCount - 1);
          const jitter = Math.random() * baseDelay * 0.1; // 10% jitter
          return Math.min(baseDelay + jitter, 2000); // Max 2 seconds
        },
        shouldRetry: (error) => {
          // Retry on timeout, network errors, or 5xx
          if (!error.response) return true;
          if (error.code === 'ECONNABORTED') return true;
          return error.response.status >= 500 && error.response.status < 600;
        }
      }
    });

    // Circuit breaker for fault tolerance
    this.circuitBreaker = new CircuitBreaker(async () => {}, {
      errorThresholdPercentage: this.config.circuitBreakerThreshold,
      timeout: this.config.circuitBreakerTimeout,
      resetTimeout: 60000 // 1 minute
    });

    // Request queue for priority handling
    this.requestQueue = {
      high: [],
      medium: [],
      low: []
    };

    // Track active requests for deduplication
    this.activeRequests = new Map();

    // Start queue processor
    this.startQueueProcessor();
  }

  /**
   * Process AI request with timeout optimization
   */
  async processRequest(request: AIRequest): Promise<AIResponse> {
    try {
      // Check if request is already being processed (deduplication)
      const existingRequest = this.activeRequests.get(request.id);
      if (existingRequest) {
        logger.info(`Deduplicating AI request: ${request.id}`);
        return existingRequest;
      }

      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = await this.getCachedResponse(request);
        if (cached) {
          return cached;
        }
      }

      // Add to queue if at capacity
      if (this.processingCount >= this.config.maxConcurrentRequests) {
        return this.queueRequest(request);
      }

      // Process immediately
      const promise = this.executeRequest(request);
      this.activeRequests.set(request.id, promise);

      const response = await promise;
      
      // Clean up
      this.activeRequests.delete(request.id);
      
      return response;

    } catch (error) {
      logger.error('AI request processing error', { error, request });
      this.activeRequests.delete(request.id);
      
      // Return fallback response
      return this.getFallbackResponse(request, error);
    }
  }

  /**
   * Execute request with circuit breaker
   */
  private async executeRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    this.processingCount++;

    try {
      // Use circuit breaker
      const result = await this.circuitBreaker.execute(async () => {
        switch (request.type) {
          case 'search':
            return await this.executeSearchRequest(request);
          case 'recommendation':
            return await this.executeRecommendationRequest(request);
          case 'nlp':
            return await this.executeNLPRequest(request);
          case 'prediction':
            return await this.executePredictionRequest(request);
          default:
            throw new Error(`Unknown request type: ${request.type}`);
        }
      });

      const processingTime = Date.now() - startTime;
      const response: AIResponse = {
        id: request.id,
        result,
        cached: false,
        processingTime
      };

      // Cache successful response
      if (this.config.cacheEnabled) {
        await this.cacheResponse(request, response);
      }

      logger.info(`AI request completed in ${processingTime}ms`, { 
        type: request.type, 
        id: request.id 
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('AI request execution failed', { 
        error, 
        request, 
        processingTime 
      });

      // Check if circuit is open
      if (this.circuitBreaker.isOpen()) {
        logger.warn('Circuit breaker is open, using fallback');
        return this.getFallbackResponse(request, error);
      }

      throw error;

    } finally {
      this.processingCount--;
      this.processQueue(); // Process next in queue
    }
  }

  /**
   * Execute search request with timeout
   */
  private async executeSearchRequest(request: AIRequest): Promise<any> {
    // Import the AI search service
    const { aiSearchService } = await import('./aiSearchService');
    
    // Process with timeout
    return Promise.race([
      aiSearchService.processNaturalLanguageQuery(request.data.query),
      this.createTimeoutPromise(request.id, 'search')
    ]);
  }

  /**
   * Execute recommendation request with timeout
   */
  private async executeRecommendationRequest(request: AIRequest): Promise<any> {
    // Import recommendation service
    const { RecommendationService } = await import('./recommendationService');
    const recommendationService = new RecommendationService();
    
    // Process with timeout
    return Promise.race([
      recommendationService.getPersonalizedRecommendations(request.data),
      this.createTimeoutPromise(request.id, 'recommendation')
    ]);
  }

  /**
   * Execute NLP request with timeout
   */
  private async executeNLPRequest(request: AIRequest): Promise<any> {
    const { aiSearchService } = await import('./aiSearchService');
    
    return Promise.race([
      aiSearchService.getIntelligentSuggestions(
        request.data.partialQuery,
        request.data.userId
      ),
      this.createTimeoutPromise(request.id, 'nlp')
    ]);
  }

  /**
   * Execute prediction request with timeout
   */
  private async executePredictionRequest(request: AIRequest): Promise<any> {
    const { aiSearchService } = await import('./aiSearchService');
    
    return Promise.race([
      aiSearchService.getPredictiveSearchSuggestions(
        request.data.currentQuery,
        request.data.userId,
        request.data.context
      ),
      this.createTimeoutPromise(request.id, 'prediction')
    ]);
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(requestId: string, type: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(createError(
          ErrorCode.TIMEOUT_ERROR,
          { requestId, type, timeout: this.config.timeout },
          `AI ${type} request timeout after ${this.config.timeout}ms`
        ));
      }, this.config.timeout);
    });
  }

  /**
   * Get cached response
   */
  private async getCachedResponse(request: AIRequest): Promise<AIResponse | null> {
    const cacheKey = this.getCacheKey(request);
    const cached = await this.cache.get<AIResponse>(cacheKey);
    
    if (cached) {
      logger.info(`AI response cache hit: ${request.id}`);
      return {
        ...cached,
        cached: true
      };
    }
    
    return null;
  }

  /**
   * Cache response
   */
  private async cacheResponse(request: AIRequest, response: AIResponse): Promise<void> {
    const cacheKey = this.getCacheKey(request);
    await this.cache.set(cacheKey, response, this.config.cacheTTL);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(request: AIRequest): string {
    return `ai:${request.type}:${JSON.stringify(request.data)}`;
  }

  /**
   * Queue request for later processing
   */
  private async queueRequest(request: AIRequest): Promise<AIResponse> {
    const priority = request.priority || 'medium';
    this.requestQueue[priority].push(request);
    
    logger.info(`AI request queued: ${request.id} (priority: ${priority})`);
    
    // Return a promise that will be resolved when processed
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        const result = this.activeRequests.get(request.id);
        if (result) {
          clearInterval(checkInterval);
          try {
            const response = await result;
            resolve(response);
          } catch (error) {
            reject(error);
          }
        }
      }, 100);

      // Timeout for queued requests
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(createError(
          ErrorCode.TIMEOUT_ERROR,
          { requestId: request.id, reason: 'queue_timeout' },
          'Request timeout while in queue'
        ));
      }, this.config.timeout * 2); // Double timeout for queued requests
    });
  }

  /**
   * Process request queue
   */
  private processQueue(): void {
    if (this.processingCount >= this.config.maxConcurrentRequests) {
      return;
    }

    // Process in priority order
    const priorities: Array<keyof RequestQueue> = ['high', 'medium', 'low'];
    
    for (const priority of priorities) {
      const queue = this.requestQueue[priority];
      if (queue.length > 0) {
        const request = queue.shift()!;
        this.processRequest(request).catch(error => {
          logger.error('Queue processing error', { error, request });
        });
        break;
      }
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 100); // Check every 100ms
  }

  /**
   * Get fallback response
   */
  private getFallbackResponse(request: AIRequest, error: any): AIResponse {
    logger.warn('Using fallback response for AI request', { 
      requestId: request.id, 
      type: request.type,
      error: error.message 
    });

    let fallbackResult: any;

    switch (request.type) {
      case 'search':
        fallbackResult = {
          originalQuery: request.data.query,
          processedQuery: request.data.query.toLowerCase(),
          intent: { type: 'mixed', confidence: 0.5 },
          entities: [],
          confidence: 0.5
        };
        break;
      
      case 'recommendation':
        fallbackResult = [];
        break;
      
      case 'nlp':
      case 'prediction':
        fallbackResult = [];
        break;
      
      default:
        fallbackResult = null;
    }

    return {
      id: request.id,
      result: fallbackResult,
      cached: false,
      error: {
        code: error.code || 'FALLBACK',
        message: error.message || 'Using fallback response'
      }
    };
  }

  /**
   * Batch process multiple AI requests
   */
  async batchProcess(requests: AIRequest[]): Promise<AIResponse[]> {
    logger.info(`Batch processing ${requests.length} AI requests`);
    
    // Group by type for more efficient processing
    const grouped = requests.reduce((acc, req) => {
      const type = req.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(req);
      return acc;
    }, {} as Record<string, AIRequest[]>);

    // Process each group in parallel
    const results = await Promise.all(
      Object.entries(grouped).map(async ([type, reqs]) => {
        // Process requests of the same type in parallel (up to limit)
        const batches = [];
        for (let i = 0; i < reqs.length; i += this.config.maxConcurrentRequests) {
          const batch = reqs.slice(i, i + this.config.maxConcurrentRequests);
          batches.push(
            Promise.all(batch.map(req => this.processRequest(req)))
          );
        }
        
        const batchResults = await Promise.all(batches);
        return batchResults.flat();
      })
    );

    return results.flat();
  }

  /**
   * Get service health status
   */
  getHealthStatus(): any {
    return {
      healthy: !this.circuitBreaker.isOpen(),
      circuitBreakerState: this.circuitBreaker.getState(),
      activeRequests: this.activeRequests.size,
      processingCount: this.processingCount,
      queuedRequests: {
        high: this.requestQueue.high.length,
        medium: this.requestQueue.medium.length,
        low: this.requestQueue.low.length
      },
      config: this.config
    };
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(updates: Partial<AIServiceConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
    
    logger.info('AI service configuration updated', { config: this.config });
  }

  /**
   * Clear cache
   */
  async clearCache(pattern?: string): Promise<void> {
    if (pattern) {
      await this.cache.delPattern(pattern);
    } else {
      await this.cache.clear();
    }
    logger.info('AI cache cleared', { pattern });
  }
}

// Export singleton instance
export const aiService = new AIService();