
// Performance Measurement Utility
class SearchPerformanceMeasurer {
  constructor() {
    this.measurements = [];
    this.target = 300; // 300ms target
  }
  
  async measureSearch(testName, searchFn, params) {
    const startTime = performance.now();
    let success = false;
    let error = null;
    
    try {
      await searchFn(params);
      success = true;
    } catch (e) {
      error = e.message;
    }
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    const measurement = {
      testName,
      responseTime,
      success,
      error,
      timestamp: new Date().toISOString(),
      meetsTarget: responseTime <= this.target
    };
    
    this.measurements.push(measurement);
    console.log(`🔍 [${testName}] ${responseTime.toFixed(1)}ms [${success ? '✅' : '❌'}] ${responseTime <= this.target ? '🎯' : '⚠️'}`);
    
    return measurement;
  }
  
  getStats() {
    if (this.measurements.length === 0) return null;
    
    const times = this.measurements.map(m => m.responseTime);
    const successCount = this.measurements.filter(m => m.success).length;
    const targetMet = this.measurements.filter(m => m.meetsTarget).length;
    
    return {
      totalTests: this.measurements.length,
      avgResponseTime: times.reduce((a, b) => a + b, 0) / times.length,
      minResponseTime: Math.min(...times),
      maxResponseTime: Math.max(...times),
      successRate: (successCount / this.measurements.length) * 100,
      targetAchievement: (targetMet / this.measurements.length) * 100,
      measurements: this.measurements
    };
  }
  
  printReport() {
    const stats = this.getStats();
    if (!stats) {
      console.log('❌ No measurements recorded');
      return;
    }
    
    console.log('\n📊 PERFORMANCE REPORT');
    console.log('========================');
    console.log(`🎯 Target: ${this.target}ms`);
    console.log(`📈 Average: ${stats.avgResponseTime.toFixed(1)}ms ${stats.avgResponseTime <= this.target ? '✅' : '❌'}`);
    console.log(`⚡ Fastest: ${stats.minResponseTime.toFixed(1)}ms`);
    console.log(`🐌 Slowest: ${stats.maxResponseTime.toFixed(1)}ms`);
    console.log(`✅ Success Rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`🎯 Target Achievement: ${stats.targetAchievement.toFixed(1)}%`);
    console.log(`🔢 Total Tests: ${stats.totalTests}`);
    
    if (stats.targetAchievement >= 80) {
      console.log('\n🚀 EXCELLENT! Target achieved!');
    } else if (stats.targetAchievement >= 60) {
      console.log('\n⚠️  Good, but needs optimization');
    } else {
      console.log('\n❌ Optimization required');
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchPerformanceMeasurer;
} else {
  window.SearchPerformanceMeasurer = SearchPerformanceMeasurer;
}
