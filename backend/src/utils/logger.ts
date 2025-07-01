import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';

// Custom log format
const customFormat = winston.format.printf(({ timestamp, level, message, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  
  if (metadata && Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Log levels with priorities
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  }
};

winston.addColors(customLevels.colors);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'lastminutestay-api' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        customFormat
      )
    })
  ]
});

// Production file logging
if (process.env.NODE_ENV === 'production') {
  // Error logs
  logger.add(new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
  
  // Combined logs
  logger.add(new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    maxsize: 10485760, // 10MB
    maxFiles: 10,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
  
  // HTTP request logs
  logger.add(new winston.transports.File({
    filename: path.join('logs', 'http.log'),
    level: 'http',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
}

// Structured logging helpers
export const loggers = {
  // API request logging
  logRequest: (req: any, res: any, responseTime: number) => {
    logger.http('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'],
      userId: req.user?.userId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ...(res.statusCode >= 400 && { body: req.body })
    });
  },
  
  // Database query logging
  logQuery: (query: string, params: any[], duration: number) => {
    logger.debug('Database Query', {
      query,
      params,
      duration: `${duration}ms`,
      ...(duration > 1000 && { slowQuery: true })
    });
  },
  
  // External service logging
  logExternalRequest: (service: string, method: string, url: string, statusCode: number, duration: number) => {
    logger.info('External Service Request', {
      service,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ...(statusCode >= 400 && { failed: true })
    });
  },
  
  // Business event logging
  logBusinessEvent: (event: string, data: any) => {
    logger.info('Business Event', {
      event,
      ...data
    });
  },
  
  // Performance logging
  logPerformance: (operation: string, duration: number, metadata?: any) => {
    logger.info('Performance Metric', {
      operation,
      duration: `${duration}ms`,
      ...(metadata && { metadata })
    });
  },
  
  // Security event logging
  logSecurityEvent: (event: string, userId?: string, metadata?: any) => {
    logger.warn('Security Event', {
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...(metadata && { metadata })
    });
  }
};