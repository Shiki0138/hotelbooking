import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import { logger, loggers } from './logger';
import { createError } from './errorFactory';
import { ErrorCode } from '../types/errors';

interface RetryConfig {
  retries?: number;
  retryDelay?: (retryCount: number) => number;
  shouldRetry?: (error: AxiosError) => boolean;
}

interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  retry?: RetryConfig;
  name: string;
}

const defaultRetryConfig: RetryConfig = {
  retries: 3,
  retryDelay: (retryCount) => {
    // Exponential backoff: 100ms, 200ms, 400ms
    return Math.min(100 * Math.pow(2, retryCount - 1), 5000);
  },
  shouldRetry: (error) => {
    // Retry on network errors or 5xx responses
    if (!error.response) return true;
    return error.response.status >= 500 && error.response.status < 600;
  }
};

export class HttpClient {
  private client: AxiosInstance;
  private name: string;
  
  constructor(config: HttpClientConfig) {
    this.name = config.name;
    
    // Create axios instance
    const axiosConfig: AxiosRequestConfig = {
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    };
    
    if (config.baseURL) {
      axiosConfig.baseURL = config.baseURL;
    }
    
    this.client = axios.create(axiosConfig);
    
    // Configure retry logic
    const retryConfig = { ...defaultRetryConfig, ...config.retry };
    
    axiosRetry(this.client, {
      retries: retryConfig.retries!,
      retryDelay: (retryCount, error) => {
        const delay = retryConfig.retryDelay!(retryCount);
        logger.info(`Retrying request to ${error.config?.url} (attempt ${retryCount}) after ${delay}ms`);
        return delay;
      },
      retryCondition: (error) => {
        return axiosRetry.isNetworkError(error) || retryConfig.shouldRetry!(error);
      },
      onRetry: (retryCount, error, requestConfig) => {
        logger.warn(`Retry attempt ${retryCount} for ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, {
          error: error.message,
          statusCode: error.response?.status
        });
      }
    });
    
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        (config as any).metadata = { startTime: Date.now() };
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config as any).metadata.startTime;
        
        loggers.logExternalRequest(
          this.name,
          response.config.method?.toUpperCase() || 'GET',
          response.config.url || '',
          response.status,
          duration
        );
        
        return response;
      },
      (error) => {
        const duration = error.config && (error.config as any).metadata 
          ? Date.now() - (error.config as any).metadata.startTime 
          : 0;
        
        loggers.logExternalRequest(
          this.name,
          error.config?.method?.toUpperCase() || 'GET',
          error.config?.url || '',
          error.response?.status || 0,
          duration
        );
        
        // Transform to custom error
        if (error.response) {
          // Server responded with error
          if (error.response.status >= 500) {
            throw createError(
              ErrorCode.EXTERNAL_SERVICE_ERROR,
              {
                service: this.name,
                status: error.response.status,
                data: error.response.data
              },
              `External service error: ${this.name}`
            );
          } else if (error.response.status === 408 || error.code === 'ECONNABORTED') {
            throw createError(
              ErrorCode.TIMEOUT_ERROR,
              {
                service: this.name,
                timeout: error.config?.timeout
              },
              `Request timeout: ${this.name}`
            );
          }
        } else if (error.request) {
          // No response received
          throw createError(
            ErrorCode.CONNECTION_ERROR,
            {
              service: this.name,
              code: error.code
            },
            `Connection error: ${this.name}`
          );
        }
        
        throw error;
      }
    );
  }
  
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
  
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }
}

// Factory function for creating HTTP clients
export const createHttpClient = (config: HttpClientConfig): HttpClient => {
  return new HttpClient(config);
};