import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

interface AIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeouts: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  timeoutRate: number;
  cacheHitRate: number;
}

interface RequestMetric {
  id: string;
  type: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  cached?: boolean;
  error?: string;
  timeout?: boolean;
}

class AIMonitoringService extends EventEmitter {
  private metrics: AIMetrics;
  private requestMetrics: RequestMetric[];
  private responseTimes: number[];
  private metricsWindow: number = 60000; // 1 minute window
  private maxMetricsSize: number = 1000;

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.requestMetrics = [];
    this.responseTimes = [];

    // Clean up old metrics every minute
    setInterval(() => this.cleanupOldMetrics(), 60000);

    // Calculate metrics every 10 seconds
    setInterval(() => this.calculateMetrics(), 10000);
  }

  private initializeMetrics(): AIMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerMinute: 0,
      errorRate: 0,
      timeoutRate: 0,
      cacheHitRate: 0
    };
  }

  /**
   * Record request start
   */
  recordRequestStart(id: string, type: string): void {
    const metric: RequestMetric = {
      id,
      type,
      startTime: Date.now(),
      success: false
    };
    
    this.requestMetrics.push(metric);
    this.metrics.totalRequests++;

    // Emit event for real-time monitoring
    this.emit('request:start', metric);
  }

  /**
   * Record request completion
   */
  recordRequestComplete(
    id: string, 
    success: boolean, 
    cached: boolean = false,
    error?: string,
    timeout?: boolean
  ): void {
    const metric = this.requestMetrics.find(m => m.id === id);
    if (!metric) return;

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.cached = cached;
    metric.error = error;
    metric.timeout = timeout;

    // Update counters
    if (success) {
      this.metrics.successfulRequests++;
      this.responseTimes.push(metric.duration);
      
      // Keep response times array bounded
      if (this.responseTimes.length > this.maxMetricsSize) {
        this.responseTimes = this.responseTimes.slice(-this.maxMetricsSize);
      }
    } else {
      this.metrics.failedRequests++;
      if (timeout) {
        this.metrics.timeouts++;
      }
    }

    if (cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    // Emit event for real-time monitoring
    this.emit('request:complete', metric);

    // Log slow requests
    if (metric.duration > 3000) {
      logger.warn('Slow AI request detected', {
        id,
        type: metric.type,
        duration: metric.duration,
        cached
      });
    }
  }

  /**
   * Calculate metrics
   */
  private calculateMetrics(): void {
    const now = Date.now();
    const windowStart = now - this.metricsWindow;

    // Filter metrics within window
    const recentMetrics = this.requestMetrics.filter(
      m => m.startTime >= windowStart
    );

    // Calculate requests per minute
    this.metrics.requestsPerMinute = recentMetrics.length;

    // Calculate error rate
    const recentErrors = recentMetrics.filter(m => !m.success).length;
    this.metrics.errorRate = recentMetrics.length > 0 
      ? (recentErrors / recentMetrics.length) * 100 
      : 0;

    // Calculate timeout rate
    const recentTimeouts = recentMetrics.filter(m => m.timeout).length;
    this.metrics.timeoutRate = recentMetrics.length > 0
      ? (recentTimeouts / recentMetrics.length) * 100
      : 0;

    // Calculate cache hit rate
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate = totalCacheRequests > 0
      ? (this.metrics.cacheHits / totalCacheRequests) * 100
      : 0;

    // Calculate response time percentiles
    if (this.responseTimes.length > 0) {
      const sorted = [...this.responseTimes].sort((a, b) => a - b);
      const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);

      this.metrics.averageResponseTime = Math.round(avg);
      this.metrics.p95ResponseTime = sorted[p95Index] || 0;
      this.metrics.p99ResponseTime = sorted[p99Index] || 0;
    }

    // Emit updated metrics
    this.emit('metrics:updated', this.metrics);

    // Alert on high error rate
    if (this.metrics.errorRate > 10) {
      logger.error('High AI error rate detected', {
        errorRate: this.metrics.errorRate,
        timeoutRate: this.metrics.timeoutRate
      });
      this.emit('alert:high-error-rate', this.metrics);
    }

    // Alert on high timeout rate
    if (this.metrics.timeoutRate > 5) {
      logger.error('High AI timeout rate detected', {
        timeoutRate: this.metrics.timeoutRate,
        p95ResponseTime: this.metrics.p95ResponseTime
      });
      this.emit('alert:high-timeout-rate', this.metrics);
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (this.metricsWindow * 5); // Keep 5 minutes of data
    
    this.requestMetrics = this.requestMetrics.filter(
      m => m.startTime >= cutoff
    );
  }

  /**
   * Get current metrics
   */
  getMetrics(): AIMetrics & { timestamp: string } {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get detailed metrics for a specific time range
   */
  getDetailedMetrics(startTime: number, endTime: number): any {
    const metrics = this.requestMetrics.filter(
      m => m.startTime >= startTime && m.startTime <= endTime
    );

    const byType = metrics.reduce((acc, m) => {
      if (!acc[m.type]) {
        acc[m.type] = {
          total: 0,
          successful: 0,
          failed: 0,
          timeouts: 0,
          cached: 0,
          avgDuration: 0,
          durations: []
        };
      }

      acc[m.type].total++;
      if (m.success) {
        acc[m.type].successful++;
        if (m.duration) {
          acc[m.type].durations.push(m.duration);
        }
      } else {
        acc[m.type].failed++;
        if (m.timeout) {
          acc[m.type].timeouts++;
        }
      }
      if (m.cached) {
        acc[m.type].cached++;
      }

      return acc;
    }, {} as any);

    // Calculate average durations
    Object.keys(byType).forEach(type => {
      const durations = byType[type].durations;
      if (durations.length > 0) {
        byType[type].avgDuration = Math.round(
          durations.reduce((a: number, b: number) => a + b, 0) / durations.length
        );
      }
      delete byType[type].durations;
    });

    return {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      totalRequests: metrics.length,
      byType
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.requestMetrics = [];
    this.responseTimes = [];
    logger.info('AI monitoring metrics reset');
  }

  /**
   * Get health status based on metrics
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
  } {
    const issues: string[] = [];
    
    if (this.metrics.errorRate > 20) {
      issues.push(`High error rate: ${this.metrics.errorRate.toFixed(2)}%`);
    }
    
    if (this.metrics.timeoutRate > 10) {
      issues.push(`High timeout rate: ${this.metrics.timeoutRate.toFixed(2)}%`);
    }
    
    if (this.metrics.averageResponseTime > 3000) {
      issues.push(`Slow average response time: ${this.metrics.averageResponseTime}ms`);
    }
    
    if (this.metrics.p95ResponseTime > 5000) {
      issues.push(`Slow P95 response time: ${this.metrics.p95ResponseTime}ms`);
    }

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, issues };
  }
}

// Export singleton instance
export const aiMonitoring = new AIMonitoringService();