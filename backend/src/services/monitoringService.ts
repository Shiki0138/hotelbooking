import { logger } from '../utils/logger';
import { circuitBreakerRegistry } from '../utils/circuitBreaker';
import { getPrisma } from './databaseService';
import { cache } from './cacheService';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: HealthCheckResult[];
  metrics: {
    errorRate: number;
    averageResponseTime: number;
    activeConnections: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export class MonitoringService {
  private errorCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private alertWebhookUrl = process.env.ALERT_WEBHOOK_URL;
  
  // Error tracking
  trackError(errorCode: string, metadata?: any) {
    const count = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, count + 1);
    
    // Check thresholds
    this.checkErrorThresholds(errorCode, count + 1, metadata);
  }
  
  trackResponseTime(duration: number) {
    this.responseTimes.push(duration);
    
    // Keep only last 1000 entries
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }
  
  // Health checks
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const prisma = getPrisma();
      if (!prisma) {
        throw new Error('Database connection not available');
      }
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        service: 'database',
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('Database health check failed', error);
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message }
      };
    }
  }
  
  async checkCacheHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const testKey = 'health:check';
      await cache.set(testKey, 'ok', 10);
      const value = await cache.get(testKey);
      
      if (value === 'ok') {
        return {
          service: 'cache',
          status: 'healthy',
          responseTime: Date.now() - startTime
        };
      }
      
      throw new Error('Cache read/write test failed');
    } catch (error) {
      logger.error('Cache health check failed', error);
      return {
        service: 'cache',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message }
      };
    }
  }
  
  async checkCircuitBreakers(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const stats = circuitBreakerRegistry.getAllStats();
    
    for (const stat of stats) {
      results.push({
        service: `circuit-breaker:${stat.name}`,
        status: stat.state === 'OPEN' ? 'unhealthy' : 'healthy',
        responseTime: 0,
        details: stat.stats
      });
    }
    
    return results;
  }
  
  // System health
  async getSystemHealth(): Promise<SystemHealth> {
    const healthChecks = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkCacheHealth(),
      ...await this.checkCircuitBreakers()
    ]);
    
    const unhealthyCount = healthChecks.filter(h => h.status === 'unhealthy').length;
    const degradedCount = healthChecks.filter(h => h.status === 'degraded').length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }
    
    const errorRate = this.calculateErrorRate();
    const avgResponseTime = this.calculateAverageResponseTime();
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: healthChecks,
      metrics: {
        errorRate,
        averageResponseTime: avgResponseTime,
        activeConnections: 0, // process._getActiveHandles() is not available in newer Node versions
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpuUsage: process.cpuUsage().user / 1000000 // seconds
      }
    };
  }
  
  // Alerting
  private async sendAlert(alertType: string, message: string, details: any) {
    const alert = {
      type: alertType,
      message,
      details,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      service: 'lastminutestay-api'
    };
    
    logger.error('ALERT', alert);
    
    // Send to external monitoring service
    if (this.alertWebhookUrl) {
      try {
        // Would use httpClient here to send to monitoring service
        // await httpClient.post(this.alertWebhookUrl, alert);
      } catch (error) {
        logger.error('Failed to send alert', error);
      }
    }
  }
  
  private checkErrorThresholds(errorCode: string, count: number, metadata?: any) {
    // Alert on critical error thresholds
    const thresholds: Record<string, number> = {
      'DATABASE_ERROR': 5,
      'EXTERNAL_SERVICE_ERROR': 10,
      'TIMEOUT_ERROR': 20,
      'INTERNAL_ERROR': 3
    };
    
    const threshold = thresholds[errorCode];
    if (threshold && count >= threshold) {
      this.sendAlert(
        'ERROR_THRESHOLD_EXCEEDED',
        `Error ${errorCode} occurred ${count} times in the monitoring window`,
        { errorCode, count, threshold, metadata }
      );
      
      // Reset counter after alert
      this.errorCounts.set(errorCode, 0);
    }
  }
  
  private calculateErrorRate(): number {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const timeWindow = 300000; // 5 minutes
    return totalErrors / (timeWindow / 1000); // errors per second
  }
  
  private calculateAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / this.responseTimes.length;
  }
  
  // Metrics endpoint data
  getMetrics() {
    return {
      errors: Object.fromEntries(this.errorCounts),
      performance: {
        averageResponseTime: this.calculateAverageResponseTime(),
        p95ResponseTime: this.getPercentile(this.responseTimes, 95),
        p99ResponseTime: this.getPercentile(this.responseTimes, 99)
      },
      circuitBreakers: circuitBreakerRegistry.getAllStats()
    };
  }
  
  private getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
  
  // Cleanup
  resetMetrics() {
    this.errorCounts.clear();
    this.responseTimes = [];
  }
}

export const monitoringService = new MonitoringService();