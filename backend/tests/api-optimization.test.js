/**
 * API Response Speed Optimization and Verification Tests
 * Testing and optimizing API response times for all AI functionality endpoints
 * Author: worker2
 * Date: 2025-06-23
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// API optimization benchmarking utility
class APIOptimizationBenchmark {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.benchmarks = {
      nlp: [],
      suggestions: [],
      personalized: [],
      predictions: [],
      voice: [],
      image: [],
      health: []
    };
  }

  async measureEndpoint(endpoint, method = 'GET', data = null, headers = {}) {
    const startTime = performance.now();
    let response;
    let error = null;

    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers,
        timeout: 10000 // 10 second timeout
      };

      if (data) {
        if (method === 'POST' || method === 'PUT') {
          config.data = data;
        } else {
          config.params = data;
        }
      }

      response = await axios(config);
    } catch (err) {
      error = err;
      response = err.response || { status: 500, data: null };
    }

    const endTime = performance.now();
    const responseTime = endTime - startTime;

    return {
      endpoint,
      method,
      responseTime,
      status: response.status,
      success: response.status >= 200 && response.status < 300,
      error: error ? error.message : null,
      dataSize: JSON.stringify(response.data || {}).length
    };
  }

  recordBenchmark(category, result) {
    if (this.benchmarks[category]) {
      this.benchmarks[category].push(result);
    }
  }

  getOptimizationReport() {
    const report = {};
    
    Object.keys(this.benchmarks).forEach(category => {
      const benchmarks = this.benchmarks[category];
      if (benchmarks.length > 0) {
        const responseTimes = benchmarks.map(b => b.responseTime);
        const successCount = benchmarks.filter(b => b.success).length;
        
        report[category] = {
          totalRequests: benchmarks.length,
          successRate: (successCount / benchmarks.length) * 100,
          averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
          minResponseTime: Math.min(...responseTimes),
          maxResponseTime: Math.max(...responseTimes),
          p95ResponseTime: this.calculatePercentile(responseTimes, 95),
          p99ResponseTime: this.calculatePercentile(responseTimes, 99)
        };
      }
    });

    return report;
  }

  calculatePercentile(arr, percentile) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}

const benchmark = new APIOptimizationBenchmark();

describe('API Response Speed Optimization Tests', () => {
  
  // Test Suite 1: NLP Search API Optimization
  describe('1. NLP Search API Performance', () => {
    
    test('NLP query processing should be optimally fast', async () => {
      const testCases = [
        { query: 'hotel', expectedTime: 1000 },
        { query: 'tokyo business hotel', expectedTime: 1500 },
        { query: 'luxury spa resort with pool and breakfast near tokyo station', expectedTime: 2000 }
      ];

      for (const testCase of testCases) {
        const result = await benchmark.measureEndpoint(
          '/api/ai-search/nlp',
          'POST',
          { query: testCase.query }
        );

        benchmark.recordBenchmark('nlp', result);

        expect(result.success).toBe(true);
        expect(result.responseTime).toBeLessThan(testCase.expectedTime);
        
        console.log(`✅ NLP "${testCase.query}": ${result.responseTime.toFixed(2)}ms`);
      }
    });

    test('NLP API should handle concurrent requests efficiently', async () => {
      const concurrentQueries = [
        'tokyo hotels',
        'osaka business',
        'kyoto luxury',
        'hiroshima budget',
        'nara traditional'
      ];

      const startTime = performance.now();
      const promises = concurrentQueries.map(query => 
        benchmark.measureEndpoint('/api/ai-search/nlp', 'POST', { query })
      );
      
      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          benchmark.recordBenchmark('nlp', result.value);
          expect(result.value.success).toBe(true);
        }
      });

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const successRate = (successCount / concurrentQueries.length) * 100;

      expect(successRate).toBeGreaterThan(90);
      expect(totalTime).toBeLessThan(3000); // Should handle 5 concurrent within 3s

      console.log(`✅ NLP Concurrent: ${totalTime.toFixed(2)}ms total, ${successRate.toFixed(1)}% success`);
    });
  });

  // Test Suite 2: Suggestions API Optimization
  describe('2. Suggestions API Performance', () => {
    
    test('Intelligent suggestions should be lightning fast', async () => {
      const queries = ['tok', 'hotel', 'business', 'luxury spa'];

      for (const query of queries) {
        const result = await benchmark.measureEndpoint(
          '/api/ai-search/suggestions',
          'GET',
          { q: query }
        );

        benchmark.recordBenchmark('suggestions', result);

        expect(result.success).toBe(true);
        expect(result.responseTime).toBeLessThan(500); // Should be very fast (500ms)
        
        console.log(`✅ Suggestions "${query}": ${result.responseTime.toFixed(2)}ms`);
      }
    });

    test('Predictive suggestions should be responsive', async () => {
      const queries = ['tokyo', 'osaka hotel', 'luxury spa'];

      for (const query of queries) {
        const result = await benchmark.measureEndpoint(
          '/api/ai-search/predictions',
          'GET',
          { q: query, userId: 'test-user' }
        );

        benchmark.recordBenchmark('predictions', result);

        expect(result.success).toBe(true);
        expect(result.responseTime).toBeLessThan(1000); // Should be under 1 second
        
        console.log(`✅ Predictions "${query}": ${result.responseTime.toFixed(2)}ms`);
      }
    });
  });

  // Test Suite 3: Voice Search API Optimization
  describe('3. Voice Search API Performance', () => {
    
    test('Voice search should process audio efficiently', async () => {
      // Create mock audio data
      const createMockAudio = (size) => Buffer.alloc(size);
      
      const audioSizes = [
        { size: 1024, name: '1KB' },
        { size: 5 * 1024, name: '5KB' },
        { size: 10 * 1024, name: '10KB' },
        { size: 50 * 1024, name: '50KB' }
      ];

      for (const audioSize of audioSizes) {
        const formData = new FormData();
        formData.append('audio', createMockAudio(audioSize.size), {
          filename: 'test-audio.webm',
          contentType: 'audio/webm'
        });
        formData.append('language', 'ja-JP');

        const result = await benchmark.measureEndpoint(
          '/api/ai-search/voice',
          'POST',
          formData,
          formData.getHeaders()
        );

        benchmark.recordBenchmark('voice', result);

        expect(result.success).toBe(true);
        expect(result.responseTime).toBeLessThan(5000); // Should process within 5 seconds
        
        console.log(`✅ Voice ${audioSize.name}: ${result.responseTime.toFixed(2)}ms`);
      }
    });

    test('Voice search language detection should be fast', async () => {
      const result = await benchmark.measureEndpoint(
        '/api/ai-search/voice/languages',
        'GET'
      );

      benchmark.recordBenchmark('voice', result);

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(100); // Should be very fast
      
      console.log(`✅ Voice Languages: ${result.responseTime.toFixed(2)}ms`);
    });
  });

  // Test Suite 4: Image Search API Optimization  
  describe('4. Image Search API Performance', () => {
    
    test('Image search should handle different image sizes efficiently', async () => {
      // Create mock image data
      const createMockImage = (size) => Buffer.alloc(size);
      
      const imageSizes = [
        { size: 100 * 1024, name: '100KB' },
        { size: 500 * 1024, name: '500KB' },
        { size: 1024 * 1024, name: '1MB' },
        { size: 2 * 1024 * 1024, name: '2MB' }
      ];

      for (const imageSize of imageSizes) {
        const formData = new FormData();
        formData.append('image', createMockImage(imageSize.size), {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg'
        });
        formData.append('searchType', 'interior');

        const result = await benchmark.measureEndpoint(
          '/api/ai-search/image',
          'POST',
          formData,
          formData.getHeaders()
        );

        benchmark.recordBenchmark('image', result);

        expect(result.success).toBe(true);
        expect(result.responseTime).toBeLessThan(4000); // Should process within 4 seconds
        
        console.log(`✅ Image ${imageSize.name}: ${result.responseTime.toFixed(2)}ms`);
      }
    });

    test('Image search types endpoint should be instant', async () => {
      const result = await benchmark.measureEndpoint(
        '/api/ai-search/image/types',
        'GET'
      );

      benchmark.recordBenchmark('image', result);

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(50); // Should be nearly instant
      
      console.log(`✅ Image Types: ${result.responseTime.toFixed(2)}ms`);
    });
  });

  // Test Suite 5: Health and Monitoring API
  describe('5. Health Check API Performance', () => {
    
    test('Health check should be extremely fast', async () => {
      const result = await benchmark.measureEndpoint(
        '/api/ai-search/health',
        'GET'
      );

      benchmark.recordBenchmark('health', result);

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(100); // Should be under 100ms
      
      console.log(`✅ Health Check: ${result.responseTime.toFixed(2)}ms`);
    });

    test('Analytics endpoints should be reasonably fast', async () => {
      const analyticsEndpoints = [
        '/api/ai-search/voice/analytics',
        '/api/ai-search/image/analytics'
      ];

      for (const endpoint of analyticsEndpoints) {
        const result = await benchmark.measureEndpoint(endpoint, 'GET');
        benchmark.recordBenchmark('health', result);

        expect(result.success).toBe(true);
        expect(result.responseTime).toBeLessThan(1000); // Should be under 1 second
        
        console.log(`✅ Analytics ${endpoint}: ${result.responseTime.toFixed(2)}ms`);
      }
    });
  });

  // Test Suite 6: Optimization Verification
  describe('6. API Optimization Verification', () => {
    
    test('Should meet SLA requirements for all endpoints', () => {
      const report = benchmark.getOptimizationReport();
      
      // Define SLA requirements (in milliseconds)
      const slaRequirements = {
        suggestions: { p95: 800, average: 400 },
        nlp: { p95: 2500, average: 1500 },
        predictions: { p95: 1500, average: 800 },
        voice: { p95: 6000, average: 3000 },
        image: { p95: 5000, average: 3000 },
        health: { p95: 200, average: 100 }
      };

      Object.keys(slaRequirements).forEach(category => {
        if (report[category]) {
          const categoryReport = report[category];
          const sla = slaRequirements[category];

          expect(categoryReport.averageResponseTime).toBeLessThan(sla.average);
          expect(categoryReport.p95ResponseTime).toBeLessThan(sla.p95);
          expect(categoryReport.successRate).toBeGreaterThan(95);

          console.log(`✅ ${category.toUpperCase()} SLA: avg=${categoryReport.averageResponseTime.toFixed(2)}ms, p95=${categoryReport.p95ResponseTime.toFixed(2)}ms`);
        }
      });
    });

    test('Should maintain consistent performance across request patterns', async () => {
      // Test burst pattern
      const burstRequests = Array.from({ length: 10 }, () => 
        benchmark.measureEndpoint('/api/ai-search/suggestions', 'GET', { q: 'burst' })
      );
      
      const burstResults = await Promise.allSettled(burstRequests);
      const burstTimes = burstResults
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.responseTime);
      
      // Test sustained pattern
      const sustainedResults = [];
      for (let i = 0; i < 10; i++) {
        const result = await benchmark.measureEndpoint('/api/ai-search/suggestions', 'GET', { q: `sustained-${i}` });
        sustainedResults.push(result.responseTime);
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }

      const burstAvg = burstTimes.reduce((a, b) => a + b, 0) / burstTimes.length;
      const sustainedAvg = sustainedResults.reduce((a, b) => a + b, 0) / sustainedResults.length;
      const variance = Math.abs(burstAvg - sustainedAvg) / Math.max(burstAvg, sustainedAvg) * 100;

      // Variance between burst and sustained should be reasonable
      expect(variance).toBeLessThan(50); // Less than 50% variance

      console.log(`✅ Performance consistency: Burst=${burstAvg.toFixed(2)}ms, Sustained=${sustainedAvg.toFixed(2)}ms, Variance=${variance.toFixed(1)}%`);
    });

    test('Should handle error scenarios gracefully with fast responses', async () => {
      const errorScenarios = [
        { endpoint: '/api/ai-search/nlp', method: 'POST', data: {} }, // Missing query
        { endpoint: '/api/ai-search/suggestions', method: 'GET', data: {} }, // Missing q parameter
        { endpoint: '/api/ai-search/voice', method: 'POST', data: {} }, // Missing audio
        { endpoint: '/api/ai-search/nonexistent', method: 'GET', data: {} } // 404 endpoint
      ];

      for (const scenario of errorScenarios) {
        const result = await benchmark.measureEndpoint(
          scenario.endpoint,
          scenario.method,
          scenario.data
        );

        // Error responses should still be fast
        expect(result.responseTime).toBeLessThan(1000); // Errors should respond within 1 second
        
        console.log(`✅ Error scenario ${scenario.endpoint}: ${result.responseTime.toFixed(2)}ms (status: ${result.status})`);
      }
    });
  });

  // Test Suite 7: Performance Optimization Report
  describe('7. Performance Optimization Summary', () => {
    
    test('Should generate comprehensive optimization report', () => {
      const report = benchmark.getOptimizationReport();
      
      console.log('\n📊 API Optimization Report:');
      console.log('================================');
      
      Object.keys(report).forEach(category => {
        const categoryReport = report[category];
        console.log(`\n${category.toUpperCase()}:`);
        console.log(`  Total Requests: ${categoryReport.totalRequests}`);
        console.log(`  Success Rate: ${categoryReport.successRate.toFixed(1)}%`);
        console.log(`  Average Response: ${categoryReport.averageResponseTime.toFixed(2)}ms`);
        console.log(`  Min Response: ${categoryReport.minResponseTime.toFixed(2)}ms`);
        console.log(`  Max Response: ${categoryReport.maxResponseTime.toFixed(2)}ms`);
        console.log(`  P95 Response: ${categoryReport.p95ResponseTime.toFixed(2)}ms`);
        console.log(`  P99 Response: ${categoryReport.p99ResponseTime.toFixed(2)}ms`);
      });

      // Calculate overall performance score
      const overallMetrics = Object.values(report);
      const overallAvgResponseTime = overallMetrics.reduce((sum, r) => sum + r.averageResponseTime, 0) / overallMetrics.length;
      const overallSuccessRate = overallMetrics.reduce((sum, r) => sum + r.successRate, 0) / overallMetrics.length;
      
      console.log('\n🎯 OVERALL PERFORMANCE:');
      console.log(`  Average Response Time: ${overallAvgResponseTime.toFixed(2)}ms`);
      console.log(`  Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
      
      // Performance grade
      let grade = 'F';
      if (overallAvgResponseTime < 1000 && overallSuccessRate > 98) grade = 'A+';
      else if (overallAvgResponseTime < 1500 && overallSuccessRate > 95) grade = 'A';
      else if (overallAvgResponseTime < 2000 && overallSuccessRate > 90) grade = 'B';
      else if (overallAvgResponseTime < 3000 && overallSuccessRate > 85) grade = 'C';
      else if (overallSuccessRate > 80) grade = 'D';
      
      console.log(`  Performance Grade: ${grade}`);
      
      // Expectations for production readiness
      expect(overallSuccessRate).toBeGreaterThan(90);
      expect(overallAvgResponseTime).toBeLessThan(3000);
      expect(['A+', 'A', 'B'].includes(grade)).toBe(true);
    });
  });
});

// Test runner
const runAPIOptimizationTests = async () => {
  console.log('🚀 Starting API Response Speed Optimization Tests...\n');
  
  try {
    console.log('📋 Test Suite: API Response Speed Optimization and Verification');
    console.log('⚡ Testing: API response times and optimization verification');
    console.log('👨‍💻 Author: worker2');
    console.log('📅 Date: 2025-06-23\n');
    
    console.log('Testing API response speed optimization...\n');
    
  } catch (error) {
    console.error('❌ API optimization test execution failed:', error);
    process.exit(1);
  }
};

module.exports = {
  runAPIOptimizationTests,
  APIOptimizationBenchmark
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAPIOptimizationTests();
}