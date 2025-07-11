import CircuitBreaker from 'opossum';
import { logger } from './logger';
import { createError } from './errorFactory';
import { ErrorCode } from '../types/errors';

export interface CircuitBreakerConfig {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name: string;
}

const defaultConfig = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 10
};

export class ServiceCircuitBreaker<T extends (...args: any[]) => any> {
  private breaker: CircuitBreaker<Parameters<T>, ReturnType<T>>;
  private name: string;
  
  constructor(service: T, config: CircuitBreakerConfig) {
    this.name = config.name;
    
    const options = {
      ...defaultConfig,
      ...config,
      errorFilter: (error: any) => {
        // Don't count client errors (4xx) as circuit breaker failures
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          return false;
        }
        return true;
      }
    };
    
    this.breaker = new CircuitBreaker(service as any, options);
    
    // Circuit breaker event handlers
    this.breaker.on('open', () => {
      logger.error(`Circuit breaker OPENED for ${this.name}`, {
        stats: this.breaker.stats
      });
    });
    
    this.breaker.on('halfOpen', () => {
      logger.warn(`Circuit breaker HALF-OPEN for ${this.name}, testing service health`);
    });
    
    this.breaker.on('close', () => {
      logger.info(`Circuit breaker CLOSED for ${this.name}, service recovered`);
    });
    
    this.breaker.on('timeout', () => {
      logger.error(`Circuit breaker TIMEOUT for ${this.name}`, {
        timeout: options.timeout
      });
    });
    
    this.breaker.on('reject', () => {
      logger.warn(`Circuit breaker REJECTED request for ${this.name}`, {
        state: this.breaker.opened ? 'OPEN' : 'CLOSED'
      });
    });
    
    this.breaker.on('success', (elapsed: number) => {
      if (elapsed > options.timeout * 0.8) {
        logger.warn(`Slow response from ${this.name}`, {
          elapsed: `${elapsed}ms`,
          threshold: `${options.timeout * 0.8}ms`
        });
      }
    });
    
    this.breaker.on('failure', (error: any, latency: number) => {
      logger.error(`Circuit breaker failure for ${this.name}`, {
        error: error.message,
        latency: `${latency}ms`,
        stats: this.breaker.stats
      });
    });
  }
  
  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    try {
      return await this.breaker.fire(...args);
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        throw createError(
          ErrorCode.TIMEOUT_ERROR,
          {
            service: this.name,
            timeout: (this.breaker as any).options?.timeout
          },
          `Service timeout: ${this.name}`
        );
      }
      
      if (error.code === 'EOPENBREAKER') {
        throw createError(
          ErrorCode.SERVICE_UNAVAILABLE,
          {
            service: this.name,
            stats: this.breaker.stats
          },
          `Service unavailable: ${this.name}`
        );
      }
      
      throw error;
    }
  }
  
  getStats() {
    return {
      name: this.name,
      state: this.breaker.opened ? 'OPEN' : 'CLOSED',
      stats: this.breaker.stats,
      enabled: this.breaker.enabled
    };
  }
  
  shutdown() {
    this.breaker.shutdown();
  }
}

// Factory function for creating circuit breakers
export const createCircuitBreaker = <T extends (...args: any[]) => any>(
  service: T,
  config: CircuitBreakerConfig
): ServiceCircuitBreaker<T> => {
  return new ServiceCircuitBreaker(service, config);
};

// Circuit breaker registry for monitoring
class CircuitBreakerRegistry {
  private breakers: Map<string, ServiceCircuitBreaker<any>> = new Map();
  
  register(breaker: ServiceCircuitBreaker<any>, name: string) {
    this.breakers.set(name, breaker);
  }
  
  unregister(name: string) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.shutdown();
      this.breakers.delete(name);
    }
  }
  
  getAllStats() {
    const stats: any[] = [];
    this.breakers.forEach((breaker) => {
      stats.push(breaker.getStats());
    });
    return stats;
  }
  
  getBreaker(name: string) {
    return this.breakers.get(name);
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();