import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { aiService } from '../src/services/aiService';
import { aiMonitoring } from '../src/services/aiMonitoringService';
import { cache } from '../src/services/cacheService';

// Mock dependencies
jest.mock('../src/services/aiSearchService');
jest.mock('../src/services/recommendationService');

describe('AI Service Optimization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    aiMonitoring.resetMetrics();
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe('Timeout Optimization', () => {
    it('should complete search within timeout limit', async () => {
      const startTime = Date.now();
      
      const response = await aiService.processRequest({
        id: 'test-search-1',
        type: 'search',
        data: { query: 'tokyo hotels' }
      });

      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(3000); // 3 second timeout
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    it('should return fallback on timeout', async () => {
      // Simulate slow response
      jest.spyOn(aiService as any, 'executeSearchRequest').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 6000))
      );

      const response = await aiService.processRequest({
        id: 'test-timeout-1',
        type: 'search',
        data: { query: 'slow query' }
      });

      expect(response.error).toBeDefined();
      expect(response.error.code).toBe('FALLBACK');
      expect(response.result).toBeDefined(); // Fallback result
    });

    it('should respect priority queuing', async () => {
      const results: string[] = [];

      // Fill up concurrent request limit
      const blocker = Array(10).fill(null).map((_, i) => 
        aiService.processRequest({
          id: `blocker-${i}`,
          type: 'search',
          data: { query: 'blocker' }
        })
      );

      // Add requests with different priorities
      const high = aiService.processRequest({
        id: 'high-priority',
        type: 'search',
        data: { query: 'high' },
        priority: 'high'
      }).then(() => results.push('high'));

      const low = aiService.processRequest({
        id: 'low-priority',
        type: 'search',
        data: { query: 'low' },
        priority: 'low'
      }).then(() => results.push('low'));

      const medium = aiService.processRequest({
        id: 'medium-priority',
        type: 'search',
        data: { query: 'medium' },
        priority: 'medium'
      }).then(() => results.push('medium'));

      await Promise.all([...blocker, high, medium, low]);

      // High priority should complete before low
      const highIndex = results.indexOf('high');
      const lowIndex = results.indexOf('low');
      expect(highIndex).toBeLessThan(lowIndex);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network errors', async () => {
      let attempts = 0;
      
      jest.spyOn(aiService as any, 'executeSearchRequest').mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return { results: [] };
      });

      const response = await aiService.processRequest({
        id: 'test-retry-1',
        type: 'search',
        data: { query: 'retry test' }
      });

      expect(attempts).toBe(3);
      expect(response.result).toBeDefined();
    });

    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      const startTimes: number[] = [];

      jest.spyOn(aiService as any, 'executeSearchRequest').mockImplementation(() => {
        startTimes.push(Date.now());
        if (startTimes.length < 3) {
          throw new Error('Retry needed');
        }
        return { results: [] };
      });

      await aiService.processRequest({
        id: 'test-backoff-1',
        type: 'search',
        data: { query: 'backoff test' }
      });

      // Calculate delays between retries
      for (let i = 1; i < startTimes.length; i++) {
        delays.push(startTimes[i] - startTimes[i - 1]);
      }

      // Each delay should be roughly double the previous (with some tolerance)
      expect(delays[1]).toBeGreaterThan(delays[0] * 1.5);
    });
  });

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      const query = 'cache test hotel';
      
      // First request
      const response1 = await aiService.processRequest({
        id: 'test-cache-1',
        type: 'search',
        data: { query }
      });

      expect(response1.cached).toBe(false);

      // Second request (should be cached)
      const response2 = await aiService.processRequest({
        id: 'test-cache-2',
        type: 'search',
        data: { query }
      });

      expect(response2.cached).toBe(true);
      expect(response2.processingTime).toBe(0);
    });

    it('should respect cache TTL', async () => {
      // Update config with short TTL
      aiService.updateConfig({ cacheTTL: 1 }); // 1 second

      const response1 = await aiService.processRequest({
        id: 'test-ttl-1',
        type: 'search',
        data: { query: 'ttl test' }
      });

      expect(response1.cached).toBe(false);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const response2 = await aiService.processRequest({
        id: 'test-ttl-2',
        type: 'search',
        data: { query: 'ttl test' }
      });

      expect(response2.cached).toBe(false);

      // Reset config
      aiService.updateConfig({ cacheTTL: 3600 });
    });
  });

  describe('Parallel Processing', () => {
    it('should handle batch requests efficiently', async () => {
      const requests = Array(5).fill(null).map((_, i) => ({
        id: `batch-${i}`,
        type: 'search' as const,
        data: { query: `batch query ${i}` }
      }));

      const startTime = Date.now();
      const responses = await aiService.batchProcess(requests);
      const duration = Date.now() - startTime;

      expect(responses).toHaveLength(5);
      expect(duration).toBeLessThan(5000); // Should be faster than sequential
      
      responses.forEach(response => {
        expect(response.result).toBeDefined();
      });
    });

    it('should deduplicate concurrent identical requests', async () => {
      let executionCount = 0;
      
      jest.spyOn(aiService as any, 'executeSearchRequest').mockImplementation(() => {
        executionCount++;
        return new Promise(resolve => 
          setTimeout(() => resolve({ results: [] }), 100)
        );
      });

      // Send identical requests concurrently
      const promises = Array(3).fill(null).map((_, i) => 
        aiService.processRequest({
          id: `dedup-${i}`,
          type: 'search',
          data: { query: 'duplicate query' }
        })
      );

      await Promise.all(promises);

      // Should only execute once due to deduplication
      expect(executionCount).toBe(1);
    });
  });

  describe('Monitoring', () => {
    it('should track request metrics', async () => {
      const requestId = 'monitor-test-1';
      
      aiMonitoring.recordRequestStart(requestId, 'search');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      aiMonitoring.recordRequestComplete(requestId, true, false);
      
      const metrics = aiMonitoring.getMetrics();
      
      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.successfulRequests).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(50);
    });

    it('should calculate percentile response times', async () => {
      // Record multiple requests with different response times
      for (let i = 0; i < 100; i++) {
        const id = `perf-test-${i}`;
        aiMonitoring.recordRequestStart(id, 'search');
        
        // Simulate variable response times
        await new Promise(resolve => 
          setTimeout(resolve, Math.random() * 200)
        );
        
        aiMonitoring.recordRequestComplete(id, true);
      }

      const metrics = aiMonitoring.getMetrics();
      
      expect(metrics.p95ResponseTime).toBeGreaterThan(metrics.averageResponseTime);
      expect(metrics.p99ResponseTime).toBeGreaterThan(metrics.p95ResponseTime);
    });

    it('should detect degraded health', async () => {
      // Simulate failures
      for (let i = 0; i < 10; i++) {
        const id = `fail-test-${i}`;
        aiMonitoring.recordRequestStart(id, 'search');
        aiMonitoring.recordRequestComplete(id, false, false, 'Test error');
      }

      const health = aiMonitoring.getHealthStatus();
      
      expect(health.status).not.toBe('healthy');
      expect(health.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit on repeated failures', async () => {
      // Force failures
      jest.spyOn(aiService as any, 'executeSearchRequest').mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      // Trigger multiple failures
      for (let i = 0; i < 6; i++) {
        await aiService.processRequest({
          id: `circuit-test-${i}`,
          type: 'search',
          data: { query: 'fail' }
        }).catch(() => {}); // Ignore errors
      }

      // Circuit should be open, returning fallback immediately
      const startTime = Date.now();
      const response = await aiService.processRequest({
        id: 'circuit-open-test',
        type: 'search',
        data: { query: 'test' }
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Fast fallback
      expect(response.error).toBeDefined();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets', async () => {
      const benchmarks = {
        search: { target: 1000, requests: 10 },
        suggestions: { target: 500, requests: 20 },
        recommendations: { target: 2000, requests: 5 }
      };

      for (const [type, config] of Object.entries(benchmarks)) {
        const durations: number[] = [];
        
        for (let i = 0; i < config.requests; i++) {
          const startTime = Date.now();
          
          await aiService.processRequest({
            id: `perf-${type}-${i}`,
            type: type as any,
            data: type === 'search' ? { query: 'test' } : { userId: 'test' }
          });
          
          durations.push(Date.now() - startTime);
        }

        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        
        expect(avgDuration).toBeLessThan(config.target);
        console.log(`${type} avg duration: ${avgDuration.toFixed(2)}ms (target: ${config.target}ms)`);
      }
    });
  });
});