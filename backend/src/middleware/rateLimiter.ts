import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

export const rateLimiter = (options: RateLimiterOptions = {}) => {
  return rateLimit({
    windowMs: options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: options.max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: options.message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // IPアドレスとユーザーIDの組み合わせでレート制限
      const userId = (req as any).user?.id || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `${ip}:${userId}`;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        userId: (req as any).user?.id
      });
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests from this IP, please try again later.'
        }
      });
    }
  });
};