import { Request, Response, NextFunction } from 'express';
import { loggers } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Add request ID to headers
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Log response when finished
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    loggers.logRequest(req, res, responseTime);
  });
  
  next();
};