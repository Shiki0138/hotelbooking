// Advanced Security Middleware for Hotel Booking System
// 史上最強のセキュリティミドルウェア - worker4実装
// Created: 2025-06-29

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const validator = require('validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class AdvancedSecurityMiddleware {
    constructor(config = {}) {
        this.config = {
            enableCSP: true,
            enableRateLimit: true,
            enableSlowDown: true,
            enableXSSProtection: true,
            enableSQLInjectionProtection: true,
            enableAdvancedLogging: true,
            enableHoneypot: true,
            enableIPWhitelist: false,
            enableGeoBlocking: false,
            maxRequestSize: '10mb',
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            ...config
        };
        
        this.suspiciousIPs = new Map();
        this.requestSignatures = new Map();
        this.honeypotFields = ['website', 'url', 'homepage'];
    }

    // 🛡️ Content Security Policy (CSP)
    getCSPMiddleware() {
        if (!this.config.enableCSP) return (req, res, next) => next();
        
        return helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: [
                    "'self'", 
                    "'unsafe-inline'", 
                    "https://fonts.googleapis.com",
                    "https://cdn.jsdelivr.net"
                ],
                scriptSrc: [
                    "'self'",
                    "'unsafe-eval'", // For development only
                    "https://cdn.jsdelivr.net",
                    "https://apis.google.com"
                ],
                fontSrc: [
                    "'self'", 
                    "https://fonts.gstatic.com",
                    "data:"
                ],
                imgSrc: [
                    "'self'", 
                    "data:", 
                    "https:",
                    "blob:"
                ],
                connectSrc: [
                    "'self'",
                    "https://api.hotelbooking.com",
                    "wss://ws.hotelbooking.com",
                    "https://maps.googleapis.com"
                ],
                mediaSrc: ["'self'", "https://cdn.hotelbooking.com"],
                objectSrc: ["'none'"],
                childSrc: ["'self'", "blob:"],
                workerSrc: ["'self'", "blob:"],
                manifestSrc: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                baseUri: ["'self'"],
                upgradeInsecureRequests: []
            },
            reportOnly: false
        });
    }

    // 🚨 Advanced Rate Limiting
    getAdvancedRateLimitMiddleware() {
        if (!this.config.enableRateLimit) return (req, res, next) => next();
        
        const createRateLimit = (windowMs, max, message, keyGenerator) => {
            return rateLimit({
                windowMs,
                max,
                message: { error: message, type: 'rate_limit_exceeded' },
                standardHeaders: true,
                legacyHeaders: false,
                keyGenerator: keyGenerator || ((req) => req.ip),
                handler: (req, res) => {
                    this.logSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', { 
                        limit: max, 
                        window: windowMs 
                    });
                    res.status(429).json({
                        error: message,
                        retryAfter: Math.ceil(windowMs / 1000)
                    });
                },
                skip: (req) => {
                    // Skip for health checks and internal requests
                    return req.path === '/health' || 
                           req.path === '/api/health' ||
                           req.headers['x-internal-request'] === 'true';
                }
            });
        };
        
        // Different limits for different endpoints
        return {
            general: createRateLimit(15 * 60 * 1000, 100, 'Too many requests'),
            auth: createRateLimit(5 * 60 * 1000, 5, 'Too many auth attempts'),
            booking: createRateLimit(15 * 60 * 1000, 20, 'Too many booking requests'),
            search: createRateLimit(1 * 60 * 1000, 50, 'Too many search requests'),
            admin: createRateLimit(5 * 60 * 1000, 10, 'Too many admin requests')
        };
    }

    // 🐌 Slow Down Middleware
    getSlowDownMiddleware() {
        if (!this.config.enableSlowDown) return (req, res, next) => next();
        
        return slowDown({
            windowMs: 15 * 60 * 1000, // 15 minutes
            delayAfter: 50, // Allow 50 requests per window without delay
            delayMs: 500, // Add 500ms delay per request after delayAfter
            maxDelayMs: 20000, // Maximum delay of 20 seconds
            skipFailedRequests: false,
            skipSuccessfulRequests: false,
            onLimitReached: (req, res, options) => {
                this.logSecurityEvent(req, 'SLOW_DOWN_TRIGGERED', options);
            }
        });
    }

    // 🔍 Advanced Request Validation
    getRequestValidationMiddleware() {
        return (req, res, next) => {
            try {
                // Check request size
                const contentLength = parseInt(req.headers['content-length'] || '0');
                if (contentLength > 10 * 1024 * 1024) { // 10MB
                    return res.status(413).json({ error: 'Request too large' });
                }

                // Validate Content-Type for POST/PUT requests
                if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                    const contentType = req.headers['content-type'] || '';
                    if (!contentType.includes('application/json') && 
                        !contentType.includes('multipart/form-data') &&
                        !contentType.includes('application/x-www-form-urlencoded')) {
                        return res.status(400).json({ 
                            error: 'Invalid Content-Type' 
                        });
                    }
                }

                // Check for suspicious patterns in URL
                const suspiciousPatterns = [
                    /\.\./,  // Path traversal
                    /%2e%2e/i, // Encoded path traversal
                    /union.*select/i, // SQL injection
                    /<script/i, // XSS
                    /javascript:/i, // XSS
                    /vbscript:/i, // XSS
                    /expression\(/i, // CSS injection
                    /\bexec\b/i, // Command injection
                    /\beval\b/i, // Code injection
                ];

                const urlPath = decodeURIComponent(req.path);
                const queryString = req.url.split('?')[1] || '';
                
                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(urlPath) || pattern.test(queryString)) {
                        this.logSecurityEvent(req, 'SUSPICIOUS_PATTERN_DETECTED', { 
                            pattern: pattern.source,
                            path: urlPath
                        });
                        return res.status(403).json({ 
                            error: 'Forbidden request pattern' 
                        });
                    }
                }

                // Validate User-Agent
                const userAgent = req.headers['user-agent'] || '';
                if (!userAgent || userAgent.length < 10) {
                    this.logSecurityEvent(req, 'SUSPICIOUS_USER_AGENT', { userAgent });
                    return res.status(400).json({ 
                        error: 'Invalid User-Agent' 
                    });
                }

                // Check for bot patterns
                const botPatterns = [
                    /bot|crawler|spider|scraper|scanner/i,
                    /curl|wget|python|java|php|perl|ruby/i,
                    /nikto|sqlmap|nmap|masscan|zap|burp/i
                ];

                for (const pattern of botPatterns) {
                    if (pattern.test(userAgent)) {
                        this.logSecurityEvent(req, 'BOT_DETECTED', { userAgent });
                        return res.status(403).json({ 
                            error: 'Automated requests not allowed' 
                        });
                    }
                }

                next();
            } catch (error) {
                this.logSecurityEvent(req, 'REQUEST_VALIDATION_ERROR', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        };
    }

    // 🍯 Honeypot Middleware
    getHoneypotMiddleware() {
        if (!this.config.enableHoneypot) return (req, res, next) => next();
        
        return (req, res, next) => {
            // Check for honeypot fields in POST/PUT requests
            if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
                for (const field of this.honeypotFields) {
                    if (req.body[field] && req.body[field].trim() !== '') {
                        this.logSecurityEvent(req, 'HONEYPOT_TRIGGERED', { 
                            field,
                            value: req.body[field]
                        });
                        
                        // Add IP to suspicious list
                        this.markSuspiciousIP(req.ip, 'honeypot_triggered');
                        
                        // Return fake success to not reveal honeypot
                        return res.status(200).json({ success: true });
                    }
                }
            }
            next();
        };
    }

    // 🔐 JWT Security Enhancement
    getJWTSecurityMiddleware() {
        return (req, res, next) => {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (token) {
                try {
                    // Verify token structure
                    const parts = token.split('.');
                    if (parts.length !== 3) {
                        throw new Error('Invalid token format');
                    }

                    // Check token expiration buffer (5 minutes before actual expiry)
                    const decoded = jwt.decode(token);
                    if (decoded && decoded.exp) {
                        const expiryTime = decoded.exp * 1000;
                        const bufferTime = 5 * 60 * 1000; // 5 minutes
                        
                        if (Date.now() > (expiryTime - bufferTime)) {
                            return res.status(401).json({ 
                                error: 'Token expiring soon, please refresh' 
                            });
                        }
                    }

                    // Check for token reuse (simple implementation)
                    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                    const currentTime = Date.now();
                    
                    if (this.requestSignatures.has(tokenHash)) {
                        const lastUsed = this.requestSignatures.get(tokenHash);
                        if (currentTime - lastUsed < 1000) { // Less than 1 second
                            this.logSecurityEvent(req, 'POTENTIAL_TOKEN_REPLAY', { tokenHash });
                            return res.status(429).json({ 
                                error: 'Token used too frequently' 
                            });
                        }
                    }
                    
                    this.requestSignatures.set(tokenHash, currentTime);

                    // Clean old signatures (older than 1 hour)
                    if (this.requestSignatures.size > 10000) {
                        const oneHourAgo = currentTime - (60 * 60 * 1000);
                        for (const [hash, time] of this.requestSignatures.entries()) {
                            if (time < oneHourAgo) {
                                this.requestSignatures.delete(hash);
                            }
                        }
                    }

                } catch (error) {
                    this.logSecurityEvent(req, 'JWT_SECURITY_ERROR', { error: error.message });
                }
            }
            next();
        };
    }

    // 🌐 Geolocation Security
    getGeolocationMiddleware() {
        if (!this.config.enableGeoBlocking) return (req, res, next) => next();
        
        return (req, res, next) => {
            const countryCode = req.headers['cf-ipcountry'] || 
                               req.headers['x-country-code'] ||
                               req.headers['geoip-country-code'];
            
            // Block certain countries (configure as needed)
            const blockedCountries = ['XX', 'YY']; // Replace with actual country codes
            
            if (countryCode && blockedCountries.includes(countryCode.toUpperCase())) {
                this.logSecurityEvent(req, 'GEO_BLOCKED', { countryCode });
                return res.status(403).json({ 
                    error: 'Access not available in your region' 
                });
            }
            next();
        };
    }

    // 🔒 IP Whitelist Middleware
    getIPWhitelistMiddleware() {
        if (!this.config.enableIPWhitelist) return (req, res, next) => next();
        
        const whitelist = process.env.IP_WHITELIST?.split(',') || [];
        
        return (req, res, next) => {
            if (whitelist.length > 0 && !whitelist.includes(req.ip)) {
                this.logSecurityEvent(req, 'IP_NOT_WHITELISTED', { ip: req.ip });
                return res.status(403).json({ 
                    error: 'IP address not authorized' 
                });
            }
            next();
        };
    }

    // 📊 Security Event Logging
    logSecurityEvent(req, eventType, details = {}) {
        if (!this.config.enableAdvancedLogging) return;
        
        const event = {
            timestamp: new Date().toISOString(),
            eventType,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            method: req.method,
            path: req.path,
            origin: req.headers.origin,
            referer: req.headers.referer,
            requestId: req.id || crypto.randomBytes(8).toString('hex'),
            details
        };

        // In production, send to logging service (e.g., Winston, CloudWatch, etc.)
        console.warn('SECURITY_EVENT:', JSON.stringify(event));
        
        // Update suspicious IP tracking
        if (['RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_PATTERN_DETECTED', 'BOT_DETECTED'].includes(eventType)) {
            this.markSuspiciousIP(req.ip, eventType.toLowerCase());
        }
    }

    // 🚨 Suspicious IP Tracking
    markSuspiciousIP(ip, reason) {
        if (!this.suspiciousIPs.has(ip)) {
            this.suspiciousIPs.set(ip, {
                count: 0,
                reasons: [],
                firstSeen: Date.now(),
                lastSeen: Date.now()
            });
        }
        
        const record = this.suspiciousIPs.get(ip);
        record.count++;
        record.lastSeen = Date.now();
        
        if (!record.reasons.includes(reason)) {
            record.reasons.push(reason);
        }
        
        // Auto-block after 10 suspicious activities
        if (record.count >= 10) {
            // In production, add to firewall block list
            console.error(`IP ${ip} marked for blocking:`, record);
        }
    }

    // 🛠️ Security Health Check
    getHealthCheckMiddleware() {
        return (req, res, next) => {
            if (req.path === '/api/security/health') {
                const healthStatus = {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    security: {
                        csp: this.config.enableCSP,
                        rateLimit: this.config.enableRateLimit,
                        xssProtection: this.config.enableXSSProtection,
                        suspiciousIPs: this.suspiciousIPs.size,
                        activeTokens: this.requestSignatures.size
                    }
                };
                
                return res.json(healthStatus);
            }
            next();
        };
    }

    // 🏗️ Setup All Middleware
    setupAll(app) {
        // Basic security headers
        app.use(helmet({
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));

        // Trust proxy
        app.set('trust proxy', true);

        // Request ID
        app.use((req, res, next) => {
            req.id = req.headers['x-request-id'] || crypto.randomBytes(16).toString('hex');
            res.setHeader('X-Request-ID', req.id);
            next();
        });

        // Health check (must be before rate limiting)
        app.use(this.getHealthCheckMiddleware());

        // CSP
        app.use(this.getCSPMiddleware());

        // Slow down
        app.use(this.getSlowDownMiddleware());

        // Request validation
        app.use(this.getRequestValidationMiddleware());

        // Geolocation
        app.use(this.getGeolocationMiddleware());

        // IP whitelist
        app.use(this.getIPWhitelistMiddleware());

        // Data sanitization
        app.use(mongoSanitize());
        app.use(xss());
        app.use(hpp({
            whitelist: ['sort', 'fields', 'page', 'limit', 'filter']
        }));

        // JWT security
        app.use(this.getJWTSecurityMiddleware());

        // Honeypot
        app.use(this.getHoneypotMiddleware());

        // Apply rate limiting to specific routes
        const rateLimits = this.getAdvancedRateLimitMiddleware();
        app.use('/api/', rateLimits.general);
        app.use('/api/auth/', rateLimits.auth);
        app.use('/api/bookings', rateLimits.booking);
        app.use('/api/search', rateLimits.search);
        app.use('/api/admin/', rateLimits.admin);

        console.log('🛡️ Advanced Security Middleware initialized');
    }
}

module.exports = AdvancedSecurityMiddleware;