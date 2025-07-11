// Production Security Middleware
// Implements comprehensive security headers and protections

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const envManager = require('../../production-config/env-manager');

// Security middleware configuration for production
const setupSecurityMiddleware = (app) => {
  // Enable trust proxy for accurate IP addresses
  app.set('trust proxy', true);

  // Compression middleware
  app.use(compression({
    level: 6,
    threshold: 100 * 1024, // 100kb
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.hotelbooking.com", "wss://ws.hotelbooking.com"],
        mediaSrc: ["'self'", "https://cdn.hotelbooking.com"],
        objectSrc: ["'none'"],
        childSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
  }));

  // CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = [
        envManager.get('CORS_ORIGIN'),
        'https://hotelbooking.com',
        'https://www.hotelbooking.com',
        'https://admin.hotelbooking.com'
      ];
      
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400 // 24 hours
  };
  
  app.use(cors(corsOptions));

  // Rate limiting
  const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
      windowMs,
      max,
      message,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      },
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/api/health';
      }
    });
  };

  // General API rate limit
  app.use('/api/', createRateLimiter(
    envManager.get('RATE_LIMIT_WINDOW_MS') || 900000, // 15 minutes
    envManager.get('RATE_LIMIT_MAX_REQUESTS') || 100,
    'Too many requests from this IP, please try again later.'
  ));

  // Strict rate limit for auth endpoints
  app.use('/api/auth/', createRateLimiter(
    300000, // 5 minutes
    5,
    'Too many authentication attempts, please try again later.'
  ));

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`Sanitized potentially malicious data in ${key}`);
    }
  }));

  // Data sanitization against XSS
  app.use(xss());

  // Prevent HTTP Parameter Pollution
  app.use(hpp({
    whitelist: ['sort', 'fields', 'page', 'limit']
  }));

  // Custom security headers
  app.use((req, res, next) => {
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Remove fingerprinting headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    next();
  });

  // Request ID middleware for tracing
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || require('crypto').randomBytes(16).toString('hex');
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Security logging middleware
  app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
      };
      
      // Log security-relevant events
      if (res.statusCode >= 400) {
        console.warn('Security event:', logData);
      }
      
      // Log slow requests
      if (duration > 3000) {
        console.warn('Slow request:', logData);
      }
    });
    
    next();
  });

  // CSRF Protection (for session-based auth)
  if (envManager.get('ENABLE_CSRF_PROTECTION')) {
    const csrf = require('csurf');
    const csrfProtection = csrf({
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      }
    });
    
    // Apply CSRF to state-changing routes
    app.use('/api/bookings', csrfProtection);
    app.use('/api/users', csrfProtection);
    app.use('/api/admin', csrfProtection);
    
    // CSRF token endpoint
    app.get('/api/csrf-token', csrfProtection, (req, res) => {
      res.json({ csrfToken: req.csrfToken() });
    });
  }

  // Content Type Validation
  app.use((req, res, next) => {
    // Ensure JSON content type for API requests with body
    if (req.body && Object.keys(req.body).length > 0) {
      const contentType = req.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return res.status(400).json({
          error: 'Content-Type must be application/json'
        });
      }
    }
    next();
  });

  // API Key Authentication for external services
  app.use('/api/external', (req, res, next) => {
    const apiKey = req.get('X-API-Key');
    if (!apiKey || !isValidApiKey(apiKey)) {
      return res.status(401).json({
        error: 'Invalid API key'
      });
    }
    next();
  });
};

// Helper function to validate API keys
const isValidApiKey = (apiKey) => {
  // Implement API key validation logic
  // This should check against a database or cache of valid API keys
  return true; // Placeholder
};

// Export security configuration
module.exports = {
  setupSecurityMiddleware,
  
  // Security utilities
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  },
  
  // Generate secure tokens
  generateSecureToken: (length = 32) => {
    return require('crypto').randomBytes(length).toString('hex');
  },
  
  // Hash sensitive data
  hashData: async (data) => {
    const bcrypt = require('bcryptjs');
    return await bcrypt.hash(data, 12);
  },
  
  // Verify hashed data
  verifyHash: async (data, hash) => {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(data, hash);
  }
};