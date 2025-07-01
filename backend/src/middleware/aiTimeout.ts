import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface TimeoutConfig {
  default: number;
  endpoints: {
    [key: string]: number;
  };
}

const timeoutConfig: TimeoutConfig = {
  default: 5000, // 5 seconds default
  endpoints: {
    '/api/ai/search': 3000, // 3 seconds for search
    '/api/ai/suggestions': 1500, // 1.5 seconds for autocomplete
    '/api/ai/recommendations': 5000, // 5 seconds for recommendations
    '/api/ai/predict': 2000, // 2 seconds for predictions
    '/api/ai/batch': 10000 // 10 seconds for batch operations
  }
};

/**
 * AI-specific timeout middleware with monitoring
 */
export const aiTimeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  const timeout = timeoutConfig.endpoints[path] || timeoutConfig.default;
  const startTime = Date.now();
  
  // Track request
  const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random()}`;
  logger.info('AI request started', {
    requestId,
    path,
    method: req.method,
    timeout
  });

  // Set timeout
  const timeoutHandle = setTimeout(() => {
    if (!res.headersSent) {
      const duration = Date.now() - startTime;
      logger.error('AI request timeout', {
        requestId,
        path,
        duration,
        timeout
      });

      res.status(408).json({
        success: false,
        error: 'Request timeout',
        timeout,
        duration,
        fallback: true
      });
    }
  }, timeout);

  // Track response
  const originalSend = res.send;
  res.send = function(data: any) {
    clearTimeout(timeoutHandle);
    const duration = Date.now() - startTime;
    
    logger.info('AI request completed', {
      requestId,
      path,
      duration,
      status: res.statusCode,
      timedOut: duration > timeout
    });

    return originalSend.call(this, data);
  };

  // Handle connection close
  res.on('close', () => {
    clearTimeout(timeoutHandle);
    const duration = Date.now() - startTime;
    
    if (!res.headersSent) {
      logger.warn('AI request connection closed', {
        requestId,
        path,
        duration
      });
    }
  });

  next();
};

/**
 * Dynamic timeout configuration
 */
export const updateTimeoutConfig = (path: string, timeout: number): void => {
  timeoutConfig.endpoints[path] = timeout;
  logger.info('AI timeout config updated', { path, timeout });
};

/**
 * Get timeout metrics
 */
export const getTimeoutMetrics = (): any => {
  return {
    config: timeoutConfig,
    timestamp: new Date().toISOString()
  };
};