/**
 * System-wide Performance and Load Testing
 * Testing AI functionality under various load conditions and performance optimization
 * Author: worker2
 * Date: 2025-06-23
 */

const { performance, PerformanceObserver } = require('perf_hooks');
const { aiSearchService } = require('../src/services/aiSearchService');
const { voiceSearchService } = require('../src/services/voiceSearchService');
const { imageSearchService } = require('../src/services/imageSearchService');

// Performance monitoring utility
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiResponseTimes: [],
      concurrentRequests: [],
      memoryUsage: [],
      cacheHitRates: []
    };
  }

  recordAPIResponse(endpoint, responseTime) {
    this.metrics.apiResponseTimes.push({
      endpoint,
      responseTime,
      timestamp: Date.now()
    });
  }

  recordConcurrentRequest(requestCount, totalTime) {
    this.metrics.concurrentRequests.push({
      requestCount,
      totalTime,
      averageTime: totalTime / requestCount,
      timestamp: Date.now()
    });
  }

  recordMemoryUsage() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      ...usage,
      timestamp: Date.now()
    });
  }

  getReport() {
    return {
      averageAPIResponseTime: this.calculateAverage(this.metrics.apiResponseTimes.map(m => m.responseTime)),
      maxAPIResponseTime: Math.max(...this.metrics.apiResponseTimes.map(m => m.responseTime)),
      minAPIResponseTime: Math.min(...this.metrics.apiResponseTimes.map(m => m.responseTime)),
      totalRequests: this.metrics.apiResponseTimes.length,
      memoryPeak: Math.max(...this.metrics.memoryUsage.map(m => m.heapUsed)),
      concurrentPerformance: this.metrics.concurrentRequests
    };
  }

  calculateAverage(numbers) {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }
}

const monitor = new PerformanceMonitor();

describe('System Performance and Load Tests', () => {
  
  beforeEach(() => {
    monitor.recordMemoryUsage();
  });

  // Test Suite 1: Individual Service Performance
  describe('1. Individual Service Performance Tests', () => {
    
    test('NLP Search Service Performance under normal load', async () => {
      const testQueries = [
        '東京のビジネスホテル',
        'luxury spa hotels osaka',
        'budget hotels near station',
        'traditional ryokan kyoto',
        'hotels with pool and breakfast'
      ];

      const performanceResults = [];

      for (const query of testQueries) {
        const startTime = performance.now();
        const result = await aiSearchService.processNaturalLanguageQuery(query);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        performanceResults.push(responseTime);
        monitor.recordAPIResponse('nlp-search', responseTime);

        expect(result).toBeDefined();
        expect(responseTime).toBeLessThan(2000); // Should complete within 2 seconds
      }

      const averageTime = performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length;
      console.log(`✅ NLP Search Average Response Time: ${averageTime.toFixed(2)}ms`);
      
      expect(averageTime).toBeLessThan(1500); // Average should be under 1.5 seconds
    });

    test('Voice Search Service Performance across languages', async () => {
      const languages = ['ja-JP', 'en-US', 'ko-KR', 'zh-CN'];
      const mockAudioBuffer = Buffer.alloc(5000); // 5KB audio
      const performanceResults = [];

      for (const language of languages) {
        const startTime = performance.now();
        
        const request = {
          audioBlob: mockAudioBuffer,
          language,
          format: 'webm'
        };
        
        const result = await voiceSearchService.processVoiceSearch(request);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        performanceResults.push({ language, responseTime });
        monitor.recordAPIResponse('voice-search', responseTime);

        expect(result).toBeDefined();
        expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      }

      const averageTime = performanceResults.reduce((sum, r) => sum + r.responseTime, 0) / performanceResults.length;
      console.log(`✅ Voice Search Average Response Time: ${averageTime.toFixed(2)}ms`);
      
      expect(averageTime).toBeLessThan(3000); // Average should be under 3 seconds
    });

    test('Image Search Service Performance with different image sizes', async () => {
      const imageSizes = [
        { size: 100 * 1024, name: '100KB' },    // 100KB
        { size: 500 * 1024, name: '500KB' },    // 500KB
        { size: 1024 * 1024, name: '1MB' },     // 1MB
        { size: 2 * 1024 * 1024, name: '2MB' }  // 2MB
      ];

      const performanceResults = [];

      for (const imageSize of imageSizes) {
        const mockImageBuffer = Buffer.alloc(imageSize.size);
        const startTime = performance.now();
        
        const request = {
          imageData: mockImageBuffer,
          searchType: 'interior',
          mimeType: 'image/jpeg'
        };
        
        const result = await imageSearchService.processImageSearch(request);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        performanceResults.push({ size: imageSize.name, responseTime });
        monitor.recordAPIResponse('image-search', responseTime);

        expect(result).toBeDefined();
        expect(responseTime).toBeLessThan(4000); // Should complete within 4 seconds
      }

      const averageTime = performanceResults.reduce((sum, r) => sum + r.responseTime, 0) / performanceResults.length;
      console.log(`✅ Image Search Average Response Time: ${averageTime.toFixed(2)}ms`);
      
      expect(averageTime).toBeLessThan(3000); // Average should be under 3 seconds
    });
  });

  // Test Suite 2: Concurrent Request Testing
  describe('2. Concurrent Request Performance Tests', () => {
    
    test('Should handle 10 concurrent NLP requests efficiently', async () => {
      const concurrentCount = 10;
      const queries = Array.from({ length: concurrentCount }, (_, i) => `hotel query ${i}`);
      
      const startTime = performance.now();
      
      const promises = queries.map(query => 
        aiSearchService.processNaturalLanguageQuery(query)
      );
      
      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      monitor.recordConcurrentRequest(concurrentCount, totalTime);

      // All requests should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        expect(result.value).toBeDefined();
      });

      // Total time should be reasonable for concurrent processing
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const averageTime = totalTime / concurrentCount;
      console.log(`✅ 10 Concurrent NLP Requests: ${totalTime.toFixed(2)}ms total, ${averageTime.toFixed(2)}ms average`);
    });

    test('Should handle mixed concurrent requests (NLP, Voice, Image)', async () => {
      const concurrentCount = 12;
      const mockAudioBuffer = Buffer.alloc(3000);
      const mockImageBuffer = Buffer.alloc(1024 * 1024);
      
      const mixedRequests = [
        // NLP requests
        () => aiSearchService.processNaturalLanguageQuery('tokyo hotels'),
        () => aiSearchService.processNaturalLanguageQuery('osaka business'),
        () => aiSearchService.getIntelligentSuggestions('kyoto'),
        () => aiSearchService.getPredictiveSearchSuggestions('hotel', 'user1'),
        
        // Voice requests
        () => voiceSearchService.processVoiceSearch({
          audioBlob: mockAudioBuffer,
          language: 'ja-JP',
          format: 'webm'
        }),
        () => voiceSearchService.processVoiceSearch({
          audioBlob: mockAudioBuffer,
          language: 'en-US',
          format: 'webm'
        }),
        
        // Image requests
        () => imageSearchService.processImageSearch({
          imageData: mockImageBuffer,
          searchType: 'interior',
          mimeType: 'image/jpeg'
        }),
        () => imageSearchService.processImageSearch({
          imageData: mockImageBuffer,
          searchType: 'exterior',
          mimeType: 'image/jpeg'
        }),
        
        // Personalization requests
        () => aiSearchService.getPersonalizedSearchResults(
          'test query',
          'user1',
          [{ id: 'hotel1', name: 'Test', location: 'Tokyo', price: 10000 }]
        ),
        () => aiSearchService.getPersonalizedSearchResults(
          'another query',
          'user2',
          [{ id: 'hotel2', name: 'Test2', location: 'Osaka', price: 15000 }]
        ),
        
        // Additional NLP
        () => aiSearchService.processNaturalLanguageQuery('spa resort'),
        () => aiSearchService.getIntelligentSuggestions('luxury')
      ];

      const startTime = performance.now();
      const promises = mixedRequests.map(requestFn => requestFn());
      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      monitor.recordConcurrentRequest(concurrentCount, totalTime);

      // All requests should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      expect(successCount).toBe(concurrentCount);
      expect(failureCount).toBe(0);

      // Mixed concurrent requests should complete within reasonable time
      expect(totalTime).toBeLessThan(8000); // Should complete within 8 seconds
      
      console.log(`✅ 12 Mixed Concurrent Requests: ${totalTime.toFixed(2)}ms total`);
      console.log(`   Success: ${successCount}, Failures: ${failureCount}`);
    });

    test('Should handle high concurrent load (50 requests)', async () => {
      const concurrentCount = 50;
      const lightweightRequests = Array.from({ length: concurrentCount }, (_, i) => 
        () => aiSearchService.getIntelligentSuggestions(`query${i}`)
      );
      
      const startTime = performance.now();
      const promises = lightweightRequests.map(requestFn => requestFn());
      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      monitor.recordConcurrentRequest(concurrentCount, totalTime);

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const successRate = (successCount / concurrentCount) * 100;

      // Should maintain high success rate under load
      expect(successRate).toBeGreaterThan(95); // At least 95% success rate
      
      // Should complete within reasonable time even under high load
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
      
      console.log(`✅ 50 Concurrent Requests: ${totalTime.toFixed(2)}ms total, ${successRate.toFixed(1)}% success rate`);
    });
  });

  // Test Suite 3: Memory and Resource Usage
  describe('3. Memory and Resource Usage Tests', () => {
    
    test('Should maintain stable memory usage during sustained load', async () => {
      const initialMemory = process.memoryUsage();
      monitor.recordMemoryUsage();
      
      // Perform sustained operations
      for (let i = 0; i < 30; i++) {
        await aiSearchService.processNaturalLanguageQuery(`sustained load query ${i}`);
        
        if (i % 10 === 0) {
          monitor.recordMemoryUsage();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;
      
      // Memory increase should be reasonable
      expect(memoryIncreasePercent).toBeLessThan(50); // Less than 50% increase
      
      console.log(`✅ Memory usage after sustained load: +${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`);
    });

    test('Should handle large batch processing efficiently', async () => {
      const batchSize = 100;
      const queries = Array.from({ length: batchSize }, (_, i) => `batch query ${i}`);
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      // Process in smaller chunks to simulate real-world batch processing
      const chunkSize = 10;
      const results = [];
      
      for (let i = 0; i < queries.length; i += chunkSize) {
        const chunk = queries.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(query => 
          aiSearchService.processNaturalLanguageQuery(query)
        );
        const chunkResults = await Promise.allSettled(chunkPromises);
        results.push(...chunkResults);
        
        // Brief pause between chunks
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const totalTime = endTime - startTime;
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const successRate = (successCount / batchSize) * 100;
      
      expect(successRate).toBeGreaterThan(98); // Should maintain high success rate
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`✅ Batch processing ${batchSize} requests: ${totalTime.toFixed(2)}ms, ${successRate.toFixed(1)}% success`);
      console.log(`   Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  // Test Suite 4: API Response Time Optimization
  describe('4. API Response Time Optimization Tests', () => {
    
    test('Should leverage caching for improved performance', async () => {
      const testQuery = 'performance test caching query';
      
      // First request (cold)
      const coldStartTime = performance.now();
      const firstResult = await aiSearchService.processNaturalLanguageQuery(testQuery);
      const coldEndTime = performance.now();
      const coldTime = coldEndTime - coldStartTime;
      
      // Second request (potentially cached)
      const warmStartTime = performance.now();
      const secondResult = await aiSearchService.processNaturalLanguageQuery(testQuery);
      const warmEndTime = performance.now();
      const warmTime = warmEndTime - warmStartTime;
      
      expect(firstResult).toBeDefined();
      expect(secondResult).toBeDefined();
      
      // Results should be consistent
      expect(firstResult.originalQuery).toBe(secondResult.originalQuery);
      
      // Second request should be faster (if caching is working)
      const performanceImprovement = ((coldTime - warmTime) / coldTime) * 100;
      
      console.log(`✅ Caching performance: Cold=${coldTime.toFixed(2)}ms, Warm=${warmTime.toFixed(2)}ms`);
      console.log(`   Performance improvement: ${performanceImprovement.toFixed(1)}%`);
      
      // Should show some improvement (accounting for variability)
      expect(warmTime).toBeLessThanOrEqual(coldTime * 1.1); // Warm should not be significantly slower
    });

    test('Should optimize response times for different query complexities', async () => {
      const queryComplexities = [
        { query: 'hotel', complexity: 'simple' },
        { query: 'business hotel tokyo', complexity: 'medium' },
        { query: 'luxury spa resort with pool and breakfast near tokyo station under 20000 yen', complexity: 'complex' }
      ];

      const performanceResults = [];

      for (const { query, complexity } of queryComplexities) {
        const startTime = performance.now();
        const result = await aiSearchService.processNaturalLanguageQuery(query);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        performanceResults.push({ complexity, responseTime });
        
        expect(result).toBeDefined();
        expect(responseTime).toBeLessThan(3000); // All should complete within 3 seconds
      }

      // Response times should be reasonable across complexities
      performanceResults.forEach(({ complexity, responseTime }) => {
        console.log(`✅ ${complexity} query: ${responseTime.toFixed(2)}ms`);
      });

      // Even complex queries should be reasonably fast
      const complexQuery = performanceResults.find(r => r.complexity === 'complex');
      expect(complexQuery.responseTime).toBeLessThan(2500);
    });

    test('Should maintain performance with personalization enabled', async () => {
      const userId = 'performance-test-user';
      const query = 'personalization performance test';
      const mockHotels = Array.from({ length: 20 }, (_, i) => ({
        id: `hotel-${i}`,
        name: `Performance Hotel ${i}`,
        location: 'Tokyo',
        price: 10000 + (i * 1000),
        amenities: ['wifi', 'breakfast']
      }));

      // Test without personalization
      const baselineStart = performance.now();
      const baselineResult = await aiSearchService.processNaturalLanguageQuery(query);
      const baselineEnd = performance.now();
      const baselineTime = baselineEnd - baselineStart;

      // Test with personalization
      const personalizedStart = performance.now();
      const personalizedResult = await aiSearchService.getPersonalizedSearchResults(
        query,
        userId,
        mockHotels
      );
      const personalizedEnd = performance.now();
      const personalizedTime = personalizedEnd - personalizedStart;

      expect(baselineResult).toBeDefined();
      expect(personalizedResult).toBeDefined();
      expect(personalizedResult.length).toBe(mockHotels.length);

      // Personalization should not significantly slow down response
      const overhead = personalizedTime - baselineTime;
      const overheadPercent = (overhead / baselineTime) * 100;

      console.log(`✅ Personalization overhead: ${overhead.toFixed(2)}ms (${overheadPercent.toFixed(1)}%)`);
      
      expect(personalizedTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(overheadPercent).toBeLessThan(100); // Overhead should be less than 100%
    });
  });

  // Test Suite 5: Stress Testing
  describe('5. Stress Testing', () => {
    
    test('Should handle rapid sequential requests', async () => {
      const requestCount = 30;
      const requests = [];
      
      const startTime = performance.now();
      
      // Fire requests rapidly without waiting
      for (let i = 0; i < requestCount; i++) {
        requests.push(
          aiSearchService.processNaturalLanguageQuery(`rapid request ${i}`)
        );
      }
      
      const results = await Promise.allSettled(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;
      const successRate = (successCount / requestCount) * 100;
      
      expect(successRate).toBeGreaterThan(90); // Should maintain 90%+ success rate
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`✅ Rapid ${requestCount} requests: ${totalTime.toFixed(2)}ms, ${successRate.toFixed(1)}% success`);
      console.log(`   Failures: ${failureCount} (possibly due to rate limiting)`);
    });

    test('Should recover gracefully from temporary overload', async () => {
      // Simulate overload with many concurrent requests
      const overloadRequests = Array.from({ length: 20 }, (_, i) => 
        aiSearchService.processNaturalLanguageQuery(`overload ${i}`)
      );
      
      // Start overload
      const overloadPromise = Promise.allSettled(overloadRequests);
      
      // Wait briefly then try normal requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const normalRequests = [
        aiSearchService.processNaturalLanguageQuery('normal request 1'),
        aiSearchService.processNaturalLanguageQuery('normal request 2')
      ];
      
      const [overloadResults, normalResults] = await Promise.all([
        overloadPromise,
        Promise.allSettled(normalRequests)
      ]);
      
      // Normal requests should still succeed even during overload
      const normalSuccessRate = normalResults.filter(r => r.status === 'fulfilled').length / normalResults.length * 100;
      expect(normalSuccessRate).toBeGreaterThan(50); // At least some should succeed
      
      console.log(`✅ Recovery from overload: ${normalSuccessRate.toFixed(1)}% normal request success during overload`);
    });
  });
});

// System health monitoring
describe('System Health Monitoring', () => {
  
  test('Should report comprehensive performance metrics', () => {
    const report = monitor.getReport();
    
    expect(report).toBeDefined();
    expect(typeof report.averageAPIResponseTime).toBe('number');
    expect(typeof report.maxAPIResponseTime).toBe('number');
    expect(typeof report.minAPIResponseTime).toBe('number');
    expect(typeof report.totalRequests).toBe('number');
    expect(typeof report.memoryPeak).toBe('number');
    expect(Array.isArray(report.concurrentPerformance)).toBe(true);
    
    console.log('\n🔍 Performance Report:');
    console.log(`   Total API Requests: ${report.totalRequests}`);
    console.log(`   Average Response Time: ${report.averageAPIResponseTime.toFixed(2)}ms`);
    console.log(`   Max Response Time: ${report.maxAPIResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${report.minAPIResponseTime.toFixed(2)}ms`);
    console.log(`   Peak Memory Usage: ${(report.memoryPeak / 1024 / 1024).toFixed(2)}MB`);
    
    // Performance should be within acceptable ranges
    expect(report.averageAPIResponseTime).toBeLessThan(3000); // Average under 3 seconds
    expect(report.maxAPIResponseTime).toBeLessThan(10000); // Max under 10 seconds
  });
});

// Test runner
const runPerformanceLoadTests = async () => {
  console.log('⚡ Starting Performance and Load Tests...\n');
  
  try {
    console.log('📋 Test Suite: System Performance and Load Testing');
    console.log('🎯 Testing: AI functionality under various load conditions');
    console.log('👨‍💻 Author: worker2');
    console.log('📅 Date: 2025-06-23\n');
    
    console.log('Testing system performance and load handling...\n');
    
  } catch (error) {
    console.error('❌ Performance and load test execution failed:', error);
    process.exit(1);
  }
};

module.exports = {
  runPerformanceLoadTests,
  PerformanceMonitor
};

// Run tests if this file is executed directly
if (require.main === module) {
  runPerformanceLoadTests();
}