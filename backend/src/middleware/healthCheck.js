// Health Check Middleware for Hotel Booking System
// 史上最強のヘルスチェック・監視システム - worker4実装
// Created: 2025-06-29

const os = require('os');
const process = require('process');
const fs = require('fs').promises;
const path = require('path');

class HealthCheckService {
    constructor(config = {}) {
        this.config = {
            // Health check configuration
            enableDetailedChecks: process.env.NODE_ENV !== 'production',
            enableSystemMetrics: true,
            enableDatabaseCheck: true,
            enableRedisCheck: true,
            enableExternalServicesCheck: true,
            
            // Thresholds
            memoryThreshold: 0.8, // 80%
            cpuThreshold: 0.9,    // 90%
            diskThreshold: 0.9,   // 90%
            responseTimeThreshold: 5000, // 5 seconds
            
            // Database connection check
            dbConnectionTimeout: 5000,
            dbQueryTimeout: 3000,
            
            // Redis connection check
            redisConnectionTimeout: 3000,
            redisPingTimeout: 2000,
            
            // External services
            externalServices: [
                {
                    name: 'Payment Gateway',
                    url: process.env.PAYMENT_GATEWAY_URL,
                    timeout: 5000,
                    critical: true
                },
                {
                    name: 'Email Service',
                    url: process.env.EMAIL_SERVICE_URL,
                    timeout: 3000,
                    critical: false
                }
            ],
            
            ...config
        };
        
        this.startTime = Date.now();
        this.lastHealthCheck = null;
        this.healthHistory = [];
        this.maxHistoryEntries = 100;
        
        // Metrics collection
        this.metrics = {
            totalRequests: 0,
            errorCount: 0,
            averageResponseTime: 0,
            lastError: null,
            uptime: 0
        };
        
        this.initializeHealthCheck();
    }

    // Initialize health check service
    initializeHealthCheck() {
        // Start metrics collection
        this.startMetricsCollection();
        
        // Schedule periodic health checks
        this.schedulePeriodicChecks();
        
        console.log('✅ Health Check Service initialized');
    }

    // Main health check endpoint
    async performHealthCheck(req, res) {
        const startTime = Date.now();
        let overallStatus = 'healthy';
        let statusCode = 200;
        
        try {
            const healthData = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0',
                uptime: this.getUptime(),
                checks: {}
            };

            // Basic system checks
            healthData.checks.system = await this.checkSystemHealth();
            
            // Database check
            if (this.config.enableDatabaseCheck) {
                healthData.checks.database = await this.checkDatabaseHealth();
            }
            
            // Redis check
            if (this.config.enableRedisCheck) {
                healthData.checks.redis = await this.checkRedisHealth();
            }
            
            // External services check
            if (this.config.enableExternalServicesCheck) {
                healthData.checks.externalServices = await this.checkExternalServices();
            }
            
            // Application-specific checks
            healthData.checks.application = await this.checkApplicationHealth();
            
            // Determine overall status
            const allChecks = Object.values(healthData.checks);
            const hasErrors = allChecks.some(check => 
                Array.isArray(check) ? 
                check.some(c => c.status === 'error') : 
                check.status === 'error'
            );
            
            const hasWarnings = allChecks.some(check => 
                Array.isArray(check) ? 
                check.some(c => c.status === 'warning') : 
                check.status === 'warning'
            );
            
            if (hasErrors) {
                overallStatus = 'unhealthy';
                statusCode = 503;
            } else if (hasWarnings) {
                overallStatus = 'degraded';
                statusCode = 200;
            }
            
            healthData.status = overallStatus;
            
            // Add detailed metrics if enabled
            if (this.config.enableDetailedChecks) {
                healthData.metrics = this.getDetailedMetrics();
                healthData.system = this.getSystemInformation();
            }
            
            // Record response time
            const responseTime = Date.now() - startTime;
            healthData.responseTime = responseTime;
            
            // Update health history
            this.updateHealthHistory(healthData);
            
            // Update metrics
            this.updateMetrics('success', responseTime);
            
            res.status(statusCode).json(healthData);
            
        } catch (error) {
            console.error('Health check failed:', error);
            
            const errorResponse = {
                status: 'error',
                timestamp: new Date().toISOString(),
                error: error.message,
                responseTime: Date.now() - startTime
            };
            
            this.updateMetrics('error', Date.now() - startTime, error);
            
            res.status(503).json(errorResponse);
        }
    }

    // Check system health (CPU, Memory, Disk)
    async checkSystemHealth() {
        const systemCheck = {
            status: 'healthy',
            details: {},
            warnings: []
        };

        try {
            // Memory usage
            const memUsage = process.memoryUsage();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const memoryUsagePercent = usedMemory / totalMemory;
            
            systemCheck.details.memory = {
                used: Math.round(usedMemory / 1024 / 1024) + ' MB',
                free: Math.round(freeMemory / 1024 / 1024) + ' MB',
                total: Math.round(totalMemory / 1024 / 1024) + ' MB',
                usagePercent: Math.round(memoryUsagePercent * 100) + '%',
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
            };
            
            if (memoryUsagePercent > this.config.memoryThreshold) {
                systemCheck.status = 'warning';
                systemCheck.warnings.push(`High memory usage: ${Math.round(memoryUsagePercent * 100)}%`);
            }
            
            // CPU information
            const cpus = os.cpus();
            systemCheck.details.cpu = {
                count: cpus.length,
                model: cpus[0].model,
                loadAverage: os.loadavg(),
                uptime: os.uptime()
            };
            
            // Load average check (Unix-like systems)
            const loadAvg = os.loadavg()[0];
            const cpuCount = cpus.length;
            if (loadAvg > cpuCount * this.config.cpuThreshold) {
                systemCheck.status = 'warning';
                systemCheck.warnings.push(`High CPU load: ${loadAvg.toFixed(2)}`);
            }
            
            // Disk space check (if possible)
            try {
                const stats = await fs.stat(process.cwd());
                systemCheck.details.disk = {
                    path: process.cwd(),
                    accessible: true
                };
            } catch (error) {
                systemCheck.status = 'warning';
                systemCheck.warnings.push('Cannot access disk information');
            }
            
        } catch (error) {
            systemCheck.status = 'error';
            systemCheck.error = error.message;
        }
        
        return systemCheck;
    }

    // Check database connectivity and performance
    async checkDatabaseHealth() {
        const dbCheck = {
            status: 'healthy',
            details: {},
            responseTime: null
        };
        
        try {
            const startTime = Date.now();
            
            // Get database connection from app context
            const db = global.dbConnection || require('../config/database');
            
            if (!db) {
                throw new Error('Database connection not available');
            }
            
            // Simple connectivity test
            await db.raw('SELECT 1 as health_check');
            
            const responseTime = Date.now() - startTime;
            dbCheck.responseTime = responseTime;
            
            if (responseTime > this.config.dbQueryTimeout) {
                dbCheck.status = 'warning';
                dbCheck.warning = `Slow database response: ${responseTime}ms`;
            }
            
            // Connection pool status (if available)
            if (db.client && db.client.pool) {
                dbCheck.details.pool = {
                    total: db.client.pool.numUsed() + db.client.pool.numFree(),
                    used: db.client.pool.numUsed(),
                    free: db.client.pool.numFree(),
                    pending: db.client.pool.numPendingAcquires()
                };
            }
            
            dbCheck.details.connected = true;
            
        } catch (error) {
            dbCheck.status = 'error';
            dbCheck.error = error.message;
            dbCheck.details.connected = false;
        }
        
        return dbCheck;
    }

    // Check Redis connectivity and performance
    async checkRedisHealth() {
        const redisCheck = {
            status: 'healthy',
            details: {},
            responseTime: null
        };
        
        try {
            const startTime = Date.now();
            
            // Get Redis connection from app context
            const redis = global.redisConnection || require('../config/redis');
            
            if (!redis) {
                throw new Error('Redis connection not available');
            }
            
            // Ping test
            const result = await redis.ping();
            
            const responseTime = Date.now() - startTime;
            redisCheck.responseTime = responseTime;
            
            if (result !== 'PONG') {
                throw new Error('Redis ping failed');
            }
            
            if (responseTime > this.config.redisPingTimeout) {
                redisCheck.status = 'warning';
                redisCheck.warning = `Slow Redis response: ${responseTime}ms`;
            }
            
            // Get Redis info (if available)
            try {
                const info = await redis.info();
                const lines = info.split('\r\n');
                const memoryLine = lines.find(line => line.startsWith('used_memory_human:'));
                if (memoryLine) {
                    redisCheck.details.memoryUsed = memoryLine.split(':')[1];
                }
                
                const connectionsLine = lines.find(line => line.startsWith('connected_clients:'));
                if (connectionsLine) {
                    redisCheck.details.connectedClients = parseInt(connectionsLine.split(':')[1]);
                }
            } catch (infoError) {
                // Info command might not be available, continue without it
            }
            
            redisCheck.details.connected = true;
            
        } catch (error) {
            redisCheck.status = 'error';
            redisCheck.error = error.message;
            redisCheck.details.connected = false;
        }
        
        return redisCheck;
    }

    // Check external services
    async checkExternalServices() {
        const services = [];
        
        for (const service of this.config.externalServices) {
            if (!service.url) continue;
            
            const serviceCheck = {
                name: service.name,
                status: 'healthy',
                responseTime: null,
                critical: service.critical || false
            };
            
            try {
                const startTime = Date.now();
                
                // Use fetch or axios for HTTP check
                const response = await fetch(service.url, {
                    method: 'GET',
                    timeout: service.timeout,
                    headers: {
                        'User-Agent': 'HotelBooking-HealthCheck/1.0'
                    }
                });
                
                const responseTime = Date.now() - startTime;
                serviceCheck.responseTime = responseTime;
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                if (responseTime > service.timeout * 0.8) {
                    serviceCheck.status = 'warning';
                    serviceCheck.warning = `Slow response: ${responseTime}ms`;
                }
                
            } catch (error) {
                serviceCheck.status = service.critical ? 'error' : 'warning';
                serviceCheck.error = error.message;
            }
            
            services.push(serviceCheck);
        }
        
        return services;
    }

    // Check application-specific health
    async checkApplicationHealth() {
        const appCheck = {
            status: 'healthy',
            details: {},
            warnings: []
        };
        
        try {
            // Check if critical modules are loaded
            const criticalModules = ['express', 'pg', 'redis'];
            for (const moduleName of criticalModules) {
                try {
                    require.resolve(moduleName);
                    appCheck.details[`${moduleName}Module`] = 'loaded';
                } catch (error) {
                    appCheck.warnings.push(`Module ${moduleName} not found`);
                }
            }
            
            // Check environment variables
            const requiredEnvVars = ['NODE_ENV', 'DATABASE_URL'];
            const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
            
            if (missingEnvVars.length > 0) {
                appCheck.status = 'warning';
                appCheck.warnings.push(`Missing environment variables: ${missingEnvVars.join(', ')}`);
            }
            
            // Check file system permissions
            try {
                await fs.access(process.cwd(), fs.constants.R_OK | fs.constants.W_OK);
                appCheck.details.fileSystemAccess = 'ok';
            } catch (error) {
                appCheck.status = 'warning';
                appCheck.warnings.push('Limited file system access');
            }
            
            // Application metrics
            appCheck.details.processId = process.pid;
            appCheck.details.nodeVersion = process.version;
            appCheck.details.platform = process.platform;
            appCheck.details.architecture = process.arch;
            
        } catch (error) {
            appCheck.status = 'error';
            appCheck.error = error.message;
        }
        
        return appCheck;
    }

    // Get detailed system metrics
    getDetailedMetrics() {
        return {
            requests: {
                total: this.metrics.totalRequests,
                errors: this.metrics.errorCount,
                errorRate: this.metrics.totalRequests > 0 ? 
                    (this.metrics.errorCount / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%',
                averageResponseTime: this.metrics.averageResponseTime + 'ms'
            },
            process: {
                pid: process.pid,
                uptime: this.getUptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            },
            system: {
                hostname: os.hostname(),
                platform: os.platform(),
                arch: os.arch(),
                loadAverage: os.loadavg(),
                freeMemory: os.freemem(),
                totalMemory: os.totalmem()
            }
        };
    }

    // Get system information
    getSystemInformation() {
        return {
            os: {
                type: os.type(),
                platform: os.platform(),
                arch: os.arch(),
                release: os.release(),
                hostname: os.hostname(),
                uptime: os.uptime()
            },
            node: {
                version: process.version,
                versions: process.versions,
                execPath: process.execPath,
                execArgv: process.execArgv
            },
            environment: {
                nodeEnv: process.env.NODE_ENV,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                locale: Intl.DateTimeFormat().resolvedOptions().locale
            }
        };
    }

    // Start metrics collection
    startMetricsCollection() {
        // Collect metrics every minute
        setInterval(() => {
            this.collectMetrics();
        }, 60000);
    }

    // Collect application metrics
    collectMetrics() {
        // This would typically integrate with your application's metrics
        // For now, we'll just update the uptime
        this.metrics.uptime = this.getUptime();
    }

    // Schedule periodic health checks
    schedulePeriodicChecks() {
        // Run comprehensive health check every 5 minutes
        setInterval(async () => {
            try {
                await this.performHealthCheck({}, {
                    status: () => ({ json: () => {} }),
                    json: () => {}
                });
            } catch (error) {
                console.error('Periodic health check failed:', error);
            }
        }, 5 * 60 * 1000);
    }

    // Update health history
    updateHealthHistory(healthData) {
        this.healthHistory.unshift({
            timestamp: healthData.timestamp,
            status: healthData.status,
            responseTime: healthData.responseTime
        });
        
        // Keep only the last N entries
        if (this.healthHistory.length > this.maxHistoryEntries) {
            this.healthHistory = this.healthHistory.slice(0, this.maxHistoryEntries);
        }
        
        this.lastHealthCheck = healthData;
    }

    // Update metrics
    updateMetrics(type, responseTime, error = null) {
        this.metrics.totalRequests++;
        
        if (type === 'error') {
            this.metrics.errorCount++;
            this.metrics.lastError = {
                message: error?.message,
                timestamp: new Date().toISOString()
            };
        }
        
        // Update average response time
        this.metrics.averageResponseTime = Math.round(
            (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
            this.metrics.totalRequests
        );
    }

    // Get uptime in human-readable format
    getUptime() {
        const uptimeMs = Date.now() - this.startTime;
        const days = Math.floor(uptimeMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((uptimeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((uptimeMs % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((uptimeMs % (60 * 1000)) / 1000);
        
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    // Get health history
    getHealthHistory() {
        return this.healthHistory;
    }

    // Get last health check result
    getLastHealthCheck() {
        return this.lastHealthCheck;
    }

    // Express middleware
    middleware() {
        return async (req, res, next) => {
            if (req.path === '/health' || req.path === '/api/health') {
                return this.performHealthCheck(req, res);
            }
            
            if (req.path === '/health/detailed' || req.path === '/api/health/detailed') {
                const originalEnableDetailedChecks = this.config.enableDetailedChecks;
                this.config.enableDetailedChecks = true;
                await this.performHealthCheck(req, res);
                this.config.enableDetailedChecks = originalEnableDetailedChecks;
                return;
            }
            
            if (req.path === '/health/history' || req.path === '/api/health/history') {
                return res.json({
                    history: this.getHealthHistory(),
                    lastCheck: this.getLastHealthCheck()
                });
            }
            
            next();
        };
    }
}

module.exports = HealthCheckService;