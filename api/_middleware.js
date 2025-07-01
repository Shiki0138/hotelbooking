// Global error handling middleware for Vercel Functions
import { createClient } from '@supabase/supabase-js';

// Initialize error tracking (can be replaced with Sentry in production)
const logError = async (error, context) => {
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    path: context.pathname,
    method: context.method,
    timestamp: new Date().toISOString()
  });
};

// Circuit breaker implementation
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.timeout;
      }
      throw error;
    }
  }
}

// Global circuit breaker instances
const circuitBreakers = new Map();

export function getCircuitBreaker(key) {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, new CircuitBreaker());
  }
  return circuitBreakers.get(key);
}

// Error response formatter
export function errorResponse(error, statusCode = 500) {
  return {
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      statusCode,
      timestamp: new Date().toISOString()
    }
  };
}

// Retry with exponential backoff
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Request validation
export function validateRequest(schema) {
  return (handler) => async (req, res) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json(errorResponse(error, 400));
      }
      return handler(req, res);
    } catch (error) {
      await logError(error, { pathname: req.url, method: req.method });
      return res.status(500).json(errorResponse(error));
    }
  };
}

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map();

export function rateLimit(windowMs = 60000, max = 100) {
  return (handler) => async (req, res) => {
    const key = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      const limit = rateLimitMap.get(key);
      if (now > limit.resetTime) {
        limit.count = 1;
        limit.resetTime = now + windowMs;
      } else {
        limit.count++;
        if (limit.count > max) {
          return res.status(429).json(errorResponse(new Error('Too many requests'), 429));
        }
      }
    }
    
    return handler(req, res);
  };
}