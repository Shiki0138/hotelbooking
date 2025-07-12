import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string = 'INTERNAL_ERROR',
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

const createErrorResponse = (
  err: Error | AppError,
  req: Request,
  requestId: string
): any => {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl;
  
  if (err instanceof AppError) {
    return {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        timestamp,
        requestId,
        path,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    };
  }
  
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      timestamp,
      requestId,
      path,
      ...(process.env.NODE_ENV === 'development' && { 
        originalError: err.message,
        stack: err.stack 
      })
    }
  };
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Detailed logging
  const errorLog = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.id,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(err instanceof AppError && {
        code: err.code,
        statusCode: err.statusCode
      })
    }
  };
  
  if (err instanceof AppError) {
    logger.error('Application error', errorLog);
  } else {
    logger.error('Unexpected error', errorLog);
  }
  
  // Get status code
  let statusCode = 500;
  if (err instanceof AppError) {
    statusCode = err.statusCode;
  }
  
  // Create and send error response
  const errorResponse = createErrorResponse(err, req, requestId);
  
  res.status(statusCode)
    .set('X-Request-ID', requestId)
    .json(errorResponse);
};