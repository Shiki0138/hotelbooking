// DDoS Protection Configuration for Hotel Booking System
// 史上最強のDDoS対策 - worker4実装
// Created: 2025-06-29

const redis = require('redis');
const crypto = require('crypto');

class DDoSProtectionSystem {
    constructor(options = {}) {
        this.config = {
            // Redis connection for distributed tracking
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
            
            // Rate limiting thresholds
            requestsPerSecond: 10,
            requestsPerMinute: 300,
            requestsPerHour: 3600,
            
            // Burst protection
            burstSize: 20,
            burstWindow: 10, // seconds
            
            // Challenge thresholds
            challengeThreshold: 50, // requests per minute
            blockThreshold: 100, // requests per minute
            
            // Timeouts
            challengeTimeout: 300, // 5 minutes
            blockTimeout: 3600, // 1 hour
            
            // Whitelist settings
            whitelistEnabled: true,
            whitelistIPs: [],
            
            // Adaptive settings
            adaptiveEnabled: true,
            adaptiveThreshold: 0.8, // 80% of normal traffic
            
            ...options
        };
        
        this.redisClient = null;
        this.setupRedis();
        
        // In-memory fallback
        this.memoryStore = new Map();
        this.challengeStore = new Map();
        this.blockStore = new Map();
        
        // Traffic analysis
        this.trafficStats = {
            totalRequests: 0,
            requestsPerSecond: [],
            uniqueIPs: new Set(),
            suspiciousPatterns: new Map()
        };
        
        this.initializeTrafficAnalysis();
    }

    // 🔗 Redis Setup
    async setupRedis() {
        try {
            this.redisClient = redis.createClient({
                url: this.config.redisUrl,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        return new Error('Redis server connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });
            
            await this.redisClient.connect();
            console.log('🔗 DDoS Protection: Redis connected');
        } catch (error) {
            console.warn('⚠️ DDoS Protection: Redis connection failed, using memory store');
            this.redisClient = null;
        }
    }

    // 📊 Traffic Analysis Initialization
    initializeTrafficAnalysis() {
        // Clean up old data every minute
        setInterval(() => {
            this.cleanupOldData();
            this.analyzeTrafficPatterns();
        }, 60000);
        
        // Update requests per second tracking
        setInterval(() => {
            this.updateTrafficStats();
        }, 1000);
    }

    // 🛡️ Main DDoS Protection Middleware
    getProtectionMiddleware() {
        return async (req, res, next) => {
            const clientIP = this.getClientIP(req);
            const timestamp = Date.now();
            
            try {
                // Skip protection for whitelisted IPs
                if (this.isWhitelisted(clientIP)) {
                    return next();
                }
                
                // Check if IP is currently blocked
                if (await this.isBlocked(clientIP)) {
                    return this.handleBlocked(req, res);
                }
                
                // Check if IP is in challenge mode
                if (await this.isInChallenge(clientIP)) {
                    return this.handleChallenge(req, res);
                }
                
                // Rate limiting check
                const rateLimitResult = await this.checkRateLimit(clientIP, timestamp);
                
                if (rateLimitResult.blocked) {
                    await this.blockIP(clientIP, rateLimitResult.reason);
                    return this.handleBlocked(req, res);
                }
                
                if (rateLimitResult.challenge) {
                    await this.challengeIP(clientIP, rateLimitResult.reason);
                    return this.handleChallenge(req, res);
                }
                
                // Pattern analysis
                const patternResult = await this.analyzeRequestPattern(req, clientIP);
                if (patternResult.suspicious) {
                    await this.challengeIP(clientIP, 'suspicious_pattern');
                    return this.handleChallenge(req, res);
                }
                
                // Record the request
                await this.recordRequest(clientIP, timestamp, req);
                
                // Add security headers
                this.addSecurityHeaders(res);
                
                next();
                
            } catch (error) {
                console.error('DDoS Protection Error:', error);
                // Fail open - allow request if protection fails
                next();
            }
        };
    }

    // 📍 Get Client IP
    getClientIP(req) {
        return req.headers['cf-connecting-ip'] ||
               req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               req.connection.remoteAddress ||
               req.socket.remoteAddress ||
               req.ip;
    }

    // ✅ Check if IP is whitelisted
    isWhitelisted(ip) {
        if (!this.config.whitelistEnabled) return false;
        
        // Check static whitelist
        if (this.config.whitelistIPs.includes(ip)) return true;
        
        // Check for local IPs
        const localPatterns = [
            /^127\./,
            /^10\./,
            /^172\.(1[6-9]|2\d|3[01])\./,
            /^192\.168\./,
            /^::1$/,
            /^::ffff:127\./
        ];
        
        return localPatterns.some(pattern => pattern.test(ip));
    }

    // 🚫 Check if IP is blocked
    async isBlocked(ip) {
        try {
            if (this.redisClient) {
                const blocked = await this.redisClient.get(`ddos:blocked:${ip}`);
                return blocked !== null;
            } else {
                const blockInfo = this.blockStore.get(ip);
                return blockInfo && blockInfo.until > Date.now();
            }
        } catch (error) {
            console.error('Error checking blocked IP:', error);
            return false;
        }
    }

    // 🧩 Check if IP is in challenge mode
    async isInChallenge(ip) {
        try {
            if (this.redisClient) {
                const challenge = await this.redisClient.get(`ddos:challenge:${ip}`);
                return challenge !== null;
            } else {
                const challengeInfo = this.challengeStore.get(ip);
                return challengeInfo && challengeInfo.until > Date.now();
            }
        } catch (error) {
            console.error('Error checking challenge IP:', error);
            return false;
        }
    }

    // ⏱️ Rate Limiting Check
    async checkRateLimit(ip, timestamp) {
        try {
            const key = `ddos:rate:${ip}`;
            const now = Math.floor(timestamp / 1000);
            
            let requestCounts;
            
            if (this.redisClient) {
                // Use Redis sliding window
                requestCounts = await this.getRedisRequestCounts(key, now);
            } else {
                // Use memory store
                requestCounts = this.getMemoryRequestCounts(ip, now);
            }
            
            // Check thresholds
            if (requestCounts.perSecond > this.config.requestsPerSecond * 2) {
                return { blocked: true, reason: 'excessive_requests_per_second' };
            }
            
            if (requestCounts.perMinute > this.config.blockThreshold) {
                return { blocked: true, reason: 'excessive_requests_per_minute' };
            }
            
            if (requestCounts.perMinute > this.config.challengeThreshold) {
                return { challenge: true, reason: 'high_request_rate' };
            }
            
            // Burst detection
            if (requestCounts.burst > this.config.burstSize) {
                return { challenge: true, reason: 'burst_detected' };
            }
            
            return { allowed: true };
            
        } catch (error) {
            console.error('Rate limit check error:', error);
            return { allowed: true };
        }
    }

    // 📊 Redis Request Counts
    async getRedisRequestCounts(key, now) {
        const pipeline = this.redisClient.multi();
        
        // Count requests in different time windows
        pipeline.zcount(key, now - 1, now); // Last second
        pipeline.zcount(key, now - 60, now); // Last minute
        pipeline.zcount(key, now - 3600, now); // Last hour
        pipeline.zcount(key, now - 10, now); // Burst window (10 seconds)
        
        const results = await pipeline.exec();
        
        return {
            perSecond: results[0][1],
            perMinute: results[1][1],
            perHour: results[2][1],
            burst: results[3][1]
        };
    }

    // 💾 Memory Request Counts
    getMemoryRequestCounts(ip, now) {
        const requests = this.memoryStore.get(ip) || [];
        
        return {
            perSecond: requests.filter(t => t > now - 1).length,
            perMinute: requests.filter(t => t > now - 60).length,
            perHour: requests.filter(t => t > now - 3600).length,
            burst: requests.filter(t => t > now - 10).length
        };
    }

    // 🔍 Request Pattern Analysis
    async analyzeRequestPattern(req, ip) {
        const pattern = {
            userAgent: req.headers['user-agent'] || '',
            path: req.path,
            method: req.method,
            queryParams: Object.keys(req.query || {}).length,
            bodySize: req.headers['content-length'] || 0,
            referer: req.headers.referer || '',
            acceptLanguage: req.headers['accept-language'] || ''
        };
        
        // Suspicious patterns
        const suspiciousIndicators = [
            // Empty or generic user agents
            !pattern.userAgent || pattern.userAgent.length < 10,
            
            // Bot-like user agents
            /bot|crawler|spider|scraper|scanner/i.test(pattern.userAgent),
            
            // Tool signatures
            /curl|wget|python|java|php|perl|ruby/i.test(pattern.userAgent),
            
            // No referer on non-API requests
            !pattern.referer && !req.path.startsWith('/api/'),
            
            // Unusual query parameter count
            pattern.queryParams > 20,
            
            // Large request body
            parseInt(pattern.bodySize) > 1024 * 1024, // 1MB
            
            // Suspicious paths
            /\.(php|asp|jsp|cgi)$/i.test(pattern.path),
            
            // SQL injection patterns in path
            /union|select|drop|insert|delete|update/i.test(pattern.path)
        ];
        
        const suspiciousScore = suspiciousIndicators.filter(Boolean).length;
        
        // Store pattern for analysis
        const patternKey = `${ip}:${this.hashPattern(pattern)}`;
        this.trafficStats.suspiciousPatterns.set(patternKey, {
            score: suspiciousScore,
            timestamp: Date.now(),
            pattern
        });
        
        return {
            suspicious: suspiciousScore >= 3,
            score: suspiciousScore
        };
    }

    // 🔐 Hash Pattern
    hashPattern(pattern) {
        const patternString = JSON.stringify(pattern);
        return crypto.createHash('md5').update(patternString).digest('hex');
    }

    // 📝 Record Request
    async recordRequest(ip, timestamp, req) {
        const now = Math.floor(timestamp / 1000);
        
        try {
            if (this.redisClient) {
                // Store in Redis with expiration
                const key = `ddos:rate:${ip}`;
                await this.redisClient.zadd(key, now, `${now}:${Math.random()}`);
                await this.redisClient.expire(key, 3600); // 1 hour expiration
            } else {
                // Store in memory
                if (!this.memoryStore.has(ip)) {
                    this.memoryStore.set(ip, []);
                }
                this.memoryStore.get(ip).push(now);
            }
            
            // Update traffic stats
            this.trafficStats.totalRequests++;
            this.trafficStats.uniqueIPs.add(ip);
            
        } catch (error) {
            console.error('Error recording request:', error);
        }
    }

    // 🚫 Block IP
    async blockIP(ip, reason) {
        const until = Date.now() + (this.config.blockTimeout * 1000);
        
        try {
            if (this.redisClient) {
                await this.redisClient.setex(`ddos:blocked:${ip}`, this.config.blockTimeout, JSON.stringify({
                    reason,
                    blockedAt: Date.now(),
                    until
                }));
            } else {
                this.blockStore.set(ip, { reason, until });
            }
            
            console.warn(`🚫 DDoS Protection: Blocked IP ${ip} for ${reason}`);
            
        } catch (error) {
            console.error('Error blocking IP:', error);
        }
    }

    // 🧩 Challenge IP
    async challengeIP(ip, reason) {
        const until = Date.now() + (this.config.challengeTimeout * 1000);
        
        try {
            if (this.redisClient) {
                await this.redisClient.setex(`ddos:challenge:${ip}`, this.config.challengeTimeout, JSON.stringify({
                    reason,
                    challengedAt: Date.now(),
                    until
                }));
            } else {
                this.challengeStore.set(ip, { reason, until });
            }
            
            console.warn(`🧩 DDoS Protection: Challenged IP ${ip} for ${reason}`);
            
        } catch (error) {
            console.error('Error challenging IP:', error);
        }
    }

    // 🚫 Handle Blocked Response
    handleBlocked(req, res) {
        res.status(429).json({
            error: 'Too Many Requests',
            message: 'Your IP has been temporarily blocked due to excessive requests',
            retryAfter: this.config.blockTimeout,
            type: 'ddos_protection_block'
        });
    }

    // 🧩 Handle Challenge Response
    handleChallenge(req, res) {
        // Simple challenge - could be replaced with CAPTCHA
        const challenge = crypto.randomBytes(16).toString('hex');
        const solution = crypto.createHash('sha256').update(challenge).digest('hex').substring(0, 6);
        
        res.status(429).json({
            error: 'Rate Limit Challenge',
            message: 'Please solve this challenge to continue',
            challenge,
            solution, // In production, this would be validated separately
            retryAfter: this.config.challengeTimeout,
            type: 'ddos_protection_challenge'
        });
    }

    // 🔒 Add Security Headers
    addSecurityHeaders(res) {
        res.setHeader('X-RateLimit-Limit', this.config.requestsPerMinute);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.requestsPerMinute - 1));
        res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 60);
        res.setHeader('X-DDoS-Protection', 'active');
    }

    // 🧽 Cleanup Old Data
    cleanupOldData() {
        const now = Date.now();
        const oneHourAgo = Math.floor((now - 3600000) / 1000);
        
        // Clean memory store
        for (const [ip, requests] of this.memoryStore.entries()) {
            const recentRequests = requests.filter(t => t > oneHourAgo);
            if (recentRequests.length === 0) {
                this.memoryStore.delete(ip);
            } else {
                this.memoryStore.set(ip, recentRequests);
            }
        }
        
        // Clean challenge store
        for (const [ip, info] of this.challengeStore.entries()) {
            if (info.until < now) {
                this.challengeStore.delete(ip);
            }
        }
        
        // Clean block store
        for (const [ip, info] of this.blockStore.entries()) {
            if (info.until < now) {
                this.blockStore.delete(ip);
            }
        }
        
        // Clean suspicious patterns
        for (const [key, info] of this.trafficStats.suspiciousPatterns.entries()) {
            if (now - info.timestamp > 3600000) { // 1 hour
                this.trafficStats.suspiciousPatterns.delete(key);
            }
        }
    }

    // 📊 Update Traffic Stats
    updateTrafficStats() {
        const now = Date.now();
        this.trafficStats.requestsPerSecond.push({
            timestamp: now,
            count: this.trafficStats.totalRequests
        });
        
        // Keep only last 60 seconds
        this.trafficStats.requestsPerSecond = this.trafficStats.requestsPerSecond
            .filter(stat => now - stat.timestamp < 60000);
    }

    // 🔍 Analyze Traffic Patterns
    analyzeTrafficPatterns() {
        // This could be enhanced with machine learning
        const stats = this.getTrafficStats();
        
        if (stats.requestsPerSecond > this.config.requestsPerSecond * 5) {
            console.warn('🚨 DDoS Protection: High traffic detected', stats);
        }
        
        if (stats.suspiciousRatio > 0.3) {
            console.warn('🚨 DDoS Protection: High suspicious traffic ratio', stats);
        }
    }

    // 📊 Get Traffic Statistics
    getTrafficStats() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        const recentRequests = this.trafficStats.requestsPerSecond
            .filter(stat => stat.timestamp > oneMinuteAgo);
        
        const requestsPerSecond = recentRequests.length > 0 
            ? recentRequests[recentRequests.length - 1].count - recentRequests[0].count
            : 0;
        
        const suspiciousCount = Array.from(this.trafficStats.suspiciousPatterns.values())
            .filter(pattern => now - pattern.timestamp < 60000)
            .length;
        
        return {
            totalRequests: this.trafficStats.totalRequests,
            uniqueIPs: this.trafficStats.uniqueIPs.size,
            requestsPerSecond,
            blockedIPs: this.blockStore.size,
            challengedIPs: this.challengeStore.size,
            suspiciousPatterns: suspiciousCount,
            suspiciousRatio: suspiciousCount / Math.max(1, requestsPerSecond),
            memoryUsage: {
                requestStore: this.memoryStore.size,
                challengeStore: this.challengeStore.size,
                blockStore: this.blockStore.size
            }
        };
    }

    // 🔧 Get Status
    getStatus() {
        return {
            active: true,
            redis: this.redisClient ? 'connected' : 'disconnected',
            config: this.config,
            stats: this.getTrafficStats()
        };
    }
}

module.exports = DDoSProtectionSystem;