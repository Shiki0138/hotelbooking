import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ErrorCode, ErrorResponse } from '../types/errors';
import { CustomError } from '../utils/errorFactory';
import { v4 as uuidv4 } from 'uuid';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

const createErrorResponse = (
  err: Error | AppError | CustomError,
  req: Request,
  requestId: string
): ErrorResponse => {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl;
  
  if (err instanceof CustomError) {
    return {
      error: {
        code: err.code,
        message: process.env.NODE_ENV === 'production' ? err.userMessage : err.message,
        details: err.details,
        timestamp,
        requestId,
        path,
        ...(err.suggestion ? { suggestion: err.suggestion } : {}),
        ...(process.env.NODE_ENV === 'development' ? { 
          debugMessage: err.message,
          stack: err.stack 
        } : {})
      }
    };
  }
  
  if (err instanceof AppError) {
    return {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: process.env.NODE_ENV === 'production' 
          ? 'エラーが発生しました。' 
          : err.message,
        timestamp,
        requestId,
        path,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      }
    };
  }
  
  return {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: process.env.NODE_ENV === 'production' 
        ? 'システムエラーが発生しました。' 
        : 'Internal server error',
      timestamp,
      requestId,
      path,
      suggestion: 'しばらく待ってから再度お試しください。',
      ...(process.env.NODE_ENV === 'development' && { 
        originalError: err.message,
        stack: err.stack 
      })
    }
  };
};

export const errorHandler = (
  err: Error | AppError | CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Detailed logging
  const errorLog = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: (req as any).user?.userId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(err instanceof CustomError && {
        code: err.code,
        details: err.details
      })
    }
  };
  
  if (err instanceof CustomError || err instanceof AppError) {
    logger.error('Application error', errorLog);
  } else {
    logger.error('Unexpected error', errorLog);
  }
  
  // Get status code
  let statusCode = 500;
  if (err instanceof CustomError || err instanceof AppError) {
    statusCode = err.statusCode;
  }
  
  // Create and send error response
  const errorResponse = createErrorResponse(err, req, requestId);
  
  res.status(statusCode)
    .set('X-Request-ID', requestId)
    .json(errorResponse);
};