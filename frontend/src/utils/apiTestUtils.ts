import { apiClient } from '../services/api/apiClient';
import { hotelService } from '../services/api/HotelService';
import { googleMapsService } from '../services/GoogleMapsService';

// Comprehensive API Testing Utilities
export class APITestUtils {
  private static instance: APITestUtils;

  private constructor() {}

  public static getInstance(): APITestUtils {
    if (!APITestUtils.instance) {
      APITestUtils.instance = new APITestUtils();
    }
    return APITestUtils.instance;
  }

  // Test all API endpoints
  public async runComprehensiveAPITest(): Promise<APITestResult> {
    const results: APITestResult = {
      timestamp: new Date().toISOString(),
      overall: 'pending',
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    console.log('🧪 Starting comprehensive API test suite...');

    // Test backend health
    results.tests.backendHealth = await this.testBackendHealth();
    
    // Test hotel service
    results.tests.hotelService = await this.testHotelService();
    
    // Test Google Maps service
    results.tests.googleMaps = await this.testGoogleMapsService();
    
    // Test image optimization
    results.tests.imageOptimization = await this.testImageOptimization();
    
    // Test error handling
    results.tests.errorHandling = await this.testErrorHandling();
    
    // Calculate summary
    const testKeys = Object.keys(results.tests);
    results.summary.total = testKeys.length;
    
    testKeys.forEach(key => {
      const test = results.tests[key];
      if (test.status === 'passed') results.summary.passed++;
      else if (test.status === 'failed') results.summary.failed++;
      else if (test.status === 'warning') results.summary.warnings++;
    });

    // Determine overall status
    if (results.summary.failed === 0) {
      results.overall = results.summary.warnings > 0 ? 'warning' : 'passed';
    } else {
      results.overall = 'failed';
    }

    console.log('🏁 API test suite completed:', results.summary);
    return results;
  }

  // Test backend health
  private async testBackendHealth(): Promise<TestResult> {
    const test: TestResult = {
      name: 'Backend Health Check',
      status: 'pending',
      message: '',
      details: {},
      duration: 0
    };

    const startTime = Date.now();

    try {
      const health = await apiClient.healthCheck();
      test.duration = Date.now() - startTime;

      if (health.status === 'ok') {
        test.status = 'passed';
        test.message = `Backend is healthy (${test.duration}ms)`;
        test.details = health;
      } else {
        test.status = 'warning';
        test.message = `Backend health check returned status: ${health.status}`;
        test.details = health;
      }
    } catch (error) {
      test.duration = Date.now() - startTime;
      test.status = 'failed';
      test.message = `Backend health check failed: ${error.message}`;
      test.details = { error: error.message };
    }

    return test;
  }

  // Test hotel service
  private async testHotelService(): Promise<TestResult> {
    const test: TestResult = {
      name: 'Hotel Service Tests',
      status: 'pending',
      message: '',
      details: {},
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Test featured hotels
      const featuredHotels = await hotelService.getFeaturedHotels(3);
      
      // Test hotel search
      const searchResult = await hotelService.searchHotels({
        query: '東京',
        limit: 5
      });

      // Test autocomplete
      const suggestions = await hotelService.getAutocompleteSuggestions('東京');

      test.duration = Date.now() - startTime;

      // Validate results
      const issues = [];
      
      if (!featuredHotels || featuredHotels.length === 0) {
        issues.push('Featured hotels returned empty');
      }
      
      if (!searchResult || !searchResult.hotels || searchResult.hotels.length === 0) {
        issues.push('Hotel search returned empty');
      }

      if (!Array.isArray(suggestions)) {
        issues.push('Autocomplete returned invalid format');
      }

      // Check image optimization
      if (featuredHotels.length > 0) {
        const hotel = featuredHotels[0];
        if (!hotel.imageOptimized) {
          issues.push('Image optimization not applied');
        }
      }

      if (issues.length === 0) {
        test.status = 'passed';
        test.message = `Hotel service tests passed (${test.duration}ms)`;
        test.details = {
          featuredHotelsCount: featuredHotels.length,
          searchResultsCount: searchResult.hotels?.length || 0,
          suggestionsCount: suggestions.length
        };
      } else {
        test.status = 'warning';
        test.message = `Hotel service has issues: ${issues.join(', ')}`;
        test.details = { issues };
      }
    } catch (error) {
      test.duration = Date.now() - startTime;
      test.status = 'failed';
      test.message = `Hotel service test failed: ${error.message}`;
      test.details = { error: error.message };
    }

    return test;
  }

  // Test Google Maps service
  private async testGoogleMapsService(): Promise<TestResult> {
    const test: TestResult = {
      name: 'Google Maps Integration',
      status: 'pending',
      message: '',
      details: {},
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Test Maps API initialization
      await googleMapsService.initializeGoogleMaps();
      
      // Test geocoding
      const location = await googleMapsService.geocodeAddress('東京駅');
      
      // Test reverse geocoding
      const address = await googleMapsService.reverseGeocode(35.6762, 139.6503);
      
      test.duration = Date.now() - startTime;

      const issues = [];
      
      if (!location) {
        issues.push('Geocoding failed');
      }
      
      if (!address) {
        issues.push('Reverse geocoding failed');
      }

      if (issues.length === 0) {
        test.status = 'passed';
        test.message = `Google Maps integration working (${test.duration}ms)`;
        test.details = {
          geocodingWorking: !!location,
          reverseGeocodingWorking: !!address
        };
      } else {
        test.status = 'warning';
        test.message = `Google Maps has issues: ${issues.join(', ')}`;
        test.details = { issues };
      }
    } catch (error) {
      test.duration = Date.now() - startTime;
      test.status = 'failed';
      test.message = `Google Maps test failed: ${error.message}`;
      test.details = { error: error.message };
    }

    return test;
  }

  // Test image optimization
  private async testImageOptimization(): Promise<TestResult> {
    const test: TestResult = {
      name: 'Image Optimization',
      status: 'pending',
      message: '',
      details: {},
      duration: 0
    };

    const startTime = Date.now();

    try {
      const { generateOptimizedImageUrl, generateSrcSet, generateSizes } = await import('../utils/imageOptimization');
      
      const testImageUrl = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';
      
      // Test URL optimization
      const optimizedUrl = generateOptimizedImageUrl(testImageUrl, {
        width: 400,
        quality: 80
      });
      
      // Test srcSet generation
      const srcSet = generateSrcSet(testImageUrl);
      
      // Test sizes generation
      const sizes = generateSizes();
      
      test.duration = Date.now() - startTime;

      const issues = [];
      
      if (!optimizedUrl || optimizedUrl === testImageUrl) {
        issues.push('URL optimization not working');
      }
      
      if (!srcSet || !srcSet.includes(',')) {
        issues.push('SrcSet generation failed');
      }
      
      if (!sizes || !sizes.includes('vw')) {
        issues.push('Sizes generation failed');
      }

      if (issues.length === 0) {
        test.status = 'passed';
        test.message = `Image optimization working (${test.duration}ms)`;
        test.details = {
          urlOptimization: !!optimizedUrl,
          srcSetGeneration: !!srcSet,
          sizesGeneration: !!sizes
        };
      } else {
        test.status = 'warning';
        test.message = `Image optimization issues: ${issues.join(', ')}`;
        test.details = { issues };
      }
    } catch (error) {
      test.duration = Date.now() - startTime;
      test.status = 'failed';
      test.message = `Image optimization test failed: ${error.message}`;
      test.details = { error: error.message };
    }

    return test;
  }

  // Test error handling
  private async testErrorHandling(): Promise<TestResult> {
    const test: TestResult = {
      name: 'Error Handling',
      status: 'pending',
      message: '',
      details: {},
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Test invalid endpoint
      let errorCaught = false;
      try {
        await apiClient.get('/invalid-endpoint-test');
      } catch (error) {
        errorCaught = true;
        if (!error.message || !error.status) {
          throw new Error('Error normalization failed');
        }
      }

      // Test network timeout simulation
      let timeoutHandled = false;
      try {
        await apiClient.get('/test-timeout', { timeout: 1 });
      } catch (error) {
        timeoutHandled = true;
      }

      test.duration = Date.now() - startTime;

      const issues = [];
      
      if (!errorCaught) {
        issues.push('Error handling not working');
      }
      
      if (!timeoutHandled) {
        issues.push('Timeout handling not working');
      }

      if (issues.length === 0) {
        test.status = 'passed';
        test.message = `Error handling working (${test.duration}ms)`;
        test.details = {
          errorHandling: errorCaught,
          timeoutHandling: timeoutHandled
        };
      } else {
        test.status = 'warning';
        test.message = `Error handling issues: ${issues.join(', ')}`;
        test.details = { issues };
      }
    } catch (error) {
      test.duration = Date.now() - startTime;
      test.status = 'failed';
      test.message = `Error handling test failed: ${error.message}`;
      test.details = { error: error.message };
    }

    return test;
  }

  // Generate test report
  public generateTestReport(results: APITestResult): string {
    const { summary, tests, timestamp } = results;
    
    let report = `
# API Test Report
Generated: ${timestamp}

## Summary
- Total Tests: ${summary.total}
- Passed: ${summary.passed} ✅
- Failed: ${summary.failed} ❌
- Warnings: ${summary.warnings} ⚠️
- Overall Status: ${results.overall.toUpperCase()}

## Test Details
`;

    Object.entries(tests).forEach(([key, test]) => {
      const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
      report += `
### ${test.name} ${icon}
- Status: ${test.status.toUpperCase()}
- Duration: ${test.duration}ms
- Message: ${test.message}
`;
      
      if (Object.keys(test.details).length > 0) {
        report += `- Details: ${JSON.stringify(test.details, null, 2)}`;
      }
    });

    return report;
  }

  // Run quick connectivity test
  public async quickConnectivityTest(): Promise<boolean> {
    try {
      await apiClient.healthCheck();
      return true;
    } catch (error) {
      console.warn('Quick connectivity test failed:', error);
      return false;
    }
  }
}

// Types
export interface APITestResult {
  timestamp: string;
  overall: 'passed' | 'failed' | 'warning' | 'pending';
  tests: Record<string, TestResult>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
  message: string;
  details: Record<string, any>;
  duration: number;
}

// Export singleton instance
export const apiTestUtils = APITestUtils.getInstance();
export default apiTestUtils;