// 🎯 Performance Test Runner for 300ms Target Verification
class PerformanceTestRunner {
  constructor() {
    this.results = [];
    this.target = 300; // 300ms target
  }

  async runComprehensiveTest() {
    console.log('🚀 Starting Comprehensive Performance Test');
    console.log('=========================================');
    
    // Test scenarios covering different cases
    const testScenarios = [
      {
        name: '東京 Search (Japan - Rakuten優先)',
        params: {
          location: { name: '東京', latitude: 35.6762, longitude: 139.6503 },
          checkIn: '2024-07-01',
          checkOut: '2024-07-03',
          guests: 2
        }
      },
      {
        name: '大阪 Search (Japan - Cache Test)',
        params: {
          location: { name: '大阪', latitude: 34.6937, longitude: 135.5023 },
          checkIn: '2024-07-05',
          checkOut: '2024-07-07',
          guests: 1
        }
      },
      {
        name: 'パリ Search (Europe - Amadeus優先)',
        params: {
          location: { name: 'パリ', latitude: 48.8566, longitude: 2.3522 },
          checkIn: '2024-07-10',
          checkOut: '2024-07-12',
          guests: 2
        }
      },
      {
        name: 'ロンドン Search (Europe - Multiple APIs)',
        params: {
          location: { name: 'ロンドン', latitude: 51.5074, longitude: -0.1278 },
          checkIn: '2024-07-15',
          checkOut: '2024-07-17',
          guests: 1
        }
      },
      {
        name: 'Cache Hit Test (Repeat Tokyo)',
        params: {
          location: { name: '東京', latitude: 35.6762, longitude: 139.6503 },
          checkIn: '2024-07-01',
          checkOut: '2024-07-03',
          guests: 2
        }
      }
    ];

    // Run each scenario multiple times for statistical significance
    for (const scenario of testScenarios) {
      await this.runScenarioTest(scenario, 3);
    }

    // Generate comprehensive report
    this.generateReport();
    
    return this.getStats();
  }

  async runScenarioTest(scenario, iterations = 1) {
    for (let i = 0; i < iterations; i++) {
      const testName = `${scenario.name}${iterations > 1 ? ` (Run ${i + 1})` : ''}`;
      await this.measurePerformance(testName, scenario.params);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async measurePerformance(testName, searchParams) {
    const startTime = performance.now();
    
    try {
      // Dynamic import to avoid build issues
      const OptimizedHotelSearchService = (await import('../services/OptimizedHotelSearchService.js')).default;
      
      // Test both streaming and non-streaming modes
      const results = await OptimizedHotelSearchService.searchHotels(searchParams, {
        streaming: false,
        useCache: true
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      const result = {
        testName,
        responseTime,
        resultCount: results?.length || 0,
        success: true,
        meetsTarget: responseTime <= this.target,
        timestamp: new Date().toISOString(),
        searchParams
      };
      
      this.results.push(result);
      
      // Real-time feedback
      const status = responseTime <= this.target ? '🎯✅' : responseTime <= 500 ? '⚠️' : '❌';
      console.log(`${status} [${testName}] ${responseTime.toFixed(1)}ms (${results?.length || 0} results)`);
      
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      const result = {
        testName,
        responseTime,
        resultCount: 0,
        success: false,
        error: error.message,
        meetsTarget: false,
        timestamp: new Date().toISOString(),
        searchParams
      };
      
      this.results.push(result);
      console.log(`❌ [${testName}] FAILED after ${responseTime.toFixed(1)}ms - ${error.message}`);
      
      return result;
    }
  }

  getStats() {
    if (this.results.length === 0) {
      return { message: 'No test results available' };
    }

    const times = this.results.map(r => r.responseTime);
    const successfulTests = this.results.filter(r => r.success);
    const targetMetTests = this.results.filter(r => r.meetsTarget);
    
    return {
      totalTests: this.results.length,
      successfulTests: successfulTests.length,
      failedTests: this.results.length - successfulTests.length,
      
      // Performance metrics
      averageResponseTime: times.reduce((a, b) => a + b, 0) / times.length,
      minResponseTime: Math.min(...times),
      maxResponseTime: Math.max(...times),
      medianResponseTime: this.getMedian(times),
      
      // Target achievement
      targetMetCount: targetMetTests.length,
      targetAchievementRate: (targetMetTests.length / this.results.length) * 100,
      
      // Success rates
      successRate: (successfulTests.length / this.results.length) * 100,
      
      // Detailed results
      results: this.results
    };
  }

  getMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  generateReport() {
    const stats = this.getStats();
    
    console.log('\n🏆 FINAL PERFORMANCE REPORT');
    console.log('============================');
    console.log(`🎯 Target: ${this.target}ms`);
    console.log(`📊 Total Tests: ${stats.totalTests}`);
    console.log(`✅ Successful: ${stats.successfulTests} (${stats.successRate.toFixed(1)}%)`);
    console.log(`❌ Failed: ${stats.failedTests}`);
    console.log('');
    console.log('⏱️  RESPONSE TIME ANALYSIS:');
    console.log(`   📈 Average: ${stats.averageResponseTime.toFixed(1)}ms ${stats.averageResponseTime <= this.target ? '✅' : '❌'}`);
    console.log(`   ⚡ Fastest: ${stats.minResponseTime.toFixed(1)}ms`);
    console.log(`   🐌 Slowest: ${stats.maxResponseTime.toFixed(1)}ms`);
    console.log(`   📊 Median: ${stats.medianResponseTime.toFixed(1)}ms`);
    console.log('');
    console.log(`🎯 TARGET ACHIEVEMENT: ${stats.targetAchievementRate.toFixed(1)}% (${stats.targetMetCount}/${stats.totalTests})`);
    
    // Performance grade
    let grade, message;
    if (stats.targetAchievementRate >= 90) {
      grade = '🏆 EXCELLENT';
      message = 'Outstanding performance! Target consistently achieved.';
    } else if (stats.targetAchievementRate >= 75) {
      grade = '🎖️ VERY GOOD';
      message = 'Great performance with room for minor improvements.';
    } else if (stats.targetAchievementRate >= 60) {
      grade = '🥉 GOOD';
      message = 'Acceptable performance but optimization needed.';
    } else if (stats.targetAchievementRate >= 40) {
      grade = '⚠️ NEEDS IMPROVEMENT';
      message = 'Performance issues detected. Significant optimization required.';
    } else {
      grade = '❌ POOR';
      message = 'Major performance problems. Complete optimization overhaul needed.';
    }
    
    console.log('');
    console.log(`🏅 PERFORMANCE GRADE: ${grade}`);
    console.log(`💡 ${message}`);
    
    // Recommendations
    console.log('');
    console.log('🔧 OPTIMIZATION RECOMMENDATIONS:');
    
    if (stats.averageResponseTime > 300) {
      console.log('1. ⚡ Implement more aggressive caching');
      console.log('2. 🔄 Optimize API call patterns');
      console.log('3. 📊 Add request prioritization');
    }
    
    if (stats.successRate < 95) {
      console.log('4. 🛡️ Improve error handling and fallbacks');
      console.log('5. 🔄 Add retry mechanisms for failed requests');
    }
    
    if (stats.targetAchievementRate < 80) {
      console.log('6. 🚀 Consider implementing service workers for caching');
      console.log('7. 📱 Add progressive loading with skeleton screens');
    }
    
    // Cache performance analysis
    const cacheTests = this.results.filter(r => r.testName.includes('Cache Hit'));
    if (cacheTests.length > 0) {
      const avgCacheTime = cacheTests.reduce((sum, test) => sum + test.responseTime, 0) / cacheTests.length;
      console.log('');
      console.log(`💾 CACHE PERFORMANCE: ${avgCacheTime.toFixed(1)}ms average ${avgCacheTime <= 100 ? '✅ Excellent' : '⚠️ Needs optimization'}`);
    }
  }

  // Export results for analysis
  exportResults() {
    return {
      timestamp: new Date().toISOString(),
      target: this.target,
      stats: this.getStats(),
      rawResults: this.results
    };
  }

  // Reset for new test run
  reset() {
    this.results = [];
  }
}

// Usage functions
export const runPerformanceTest = async () => {
  const testRunner = new PerformanceTestRunner();
  return await testRunner.runComprehensiveTest();
};

export const quickPerformanceCheck = async (location = '東京') => {
  const testRunner = new PerformanceTestRunner();
  const result = await testRunner.measurePerformance(
    `Quick Check - ${location}`,
    {
      location: { name: location },
      checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      guests: 2
    }
  );
  
  console.log(`🔍 Quick Check Result: ${result.responseTime.toFixed(1)}ms ${result.meetsTarget ? '✅' : '❌'}`);
  return result;
};

export default PerformanceTestRunner;