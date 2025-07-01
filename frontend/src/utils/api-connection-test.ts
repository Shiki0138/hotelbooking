// API Connection Test Utility
// Tests frontend-backend connectivity with comprehensive diagnostics

interface ConnectionTestResult {
  success: boolean;
  endpoint: string;
  responseTime: number;
  status: number;
  error?: string;
  headers?: Record<string, string>;
}

interface ApiTestSuite {
  backend: ConnectionTestResult;
  health: ConnectionTestResult;
  cors: ConnectionTestResult;
  ai: ConnectionTestResult;
  websocket?: ConnectionTestResult;
}

class ApiConnectionTester {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  async runFullTest(): Promise<ApiTestSuite> {
    console.log('🧪 Starting comprehensive API connection test...');
    console.log('🔗 Base URL:', this.baseUrl);

    const results: ApiTestSuite = {
      backend: await this.testBackendConnection(),
      health: await this.testHealthEndpoint(),
      cors: await this.testCorsHeaders(),
      ai: await this.testAiEndpoint()
    };

    // Test WebSocket if available
    try {
      results.websocket = await this.testWebSocketConnection();
    } catch (error) {
      console.warn('⚠️ WebSocket test skipped:', error);
    }

    this.logResults(results);
    return results;
  }

  private async testBackendConnection(): Promise<ConnectionTestResult> {
    const endpoint = `${this.baseUrl}`;
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
      });

      return {
        success: true,
        endpoint,
        responseTime: Date.now() - startTime,
        status: response.status,
        headers: this.extractHeaders(response)
      };
    } catch (error) {
      return {
        success: false,
        endpoint,
        responseTime: Date.now() - startTime,
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testHealthEndpoint(): Promise<ConnectionTestResult> {
    const endpoint = `${this.baseUrl}/api/health`;
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      console.log('🩺 Health check response:', data);

      return {
        success: response.ok,
        endpoint,
        responseTime: Date.now() - startTime,
        status: response.status,
        headers: this.extractHeaders(response)
      };
    } catch (error) {
      return {
        success: false,
        endpoint,
        responseTime: Date.now() - startTime,
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async testCorsHeaders(): Promise<ConnectionTestResult> {
    const endpoint = `${this.baseUrl}/api/health`;
    const startTime = Date.now();

    try {
      // Simulate a preflight request
      const preflightResponse = await fetch(endpoint, {
        method: 'OPTIONS',
        mode: 'cors',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });

      const corsHeaders = this.extractCorsHeaders(preflightResponse);
      console.log('🌐 CORS headers:', corsHeaders);

      return {
        success: preflightResponse.ok,
        endpoint: `${endpoint} (OPTIONS)`,
        responseTime: Date.now() - startTime,
        status: preflightResponse.status,
        headers: corsHeaders
      };
    } catch (error) {
      return {
        success: false,
        endpoint: `${endpoint} (OPTIONS)`,
        responseTime: Date.now() - startTime,
        status: 0,
        error: error instanceof Error ? error.message : 'CORS test failed'
      };
    }
  }

  private async testAiEndpoint(): Promise<ConnectionTestResult> {
    const endpoint = `${this.baseUrl}/api/ai/health`;
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      console.log('🤖 AI health response:', data);

      return {
        success: response.ok,
        endpoint,
        responseTime: Date.now() - startTime,
        status: response.status,
        headers: this.extractHeaders(response)
      };
    } catch (error) {
      return {
        success: false,
        endpoint,
        responseTime: Date.now() - startTime,
        status: 0,
        error: error instanceof Error ? error.message : 'AI endpoint test failed'
      };
    }
  }

  private async testWebSocketConnection(): Promise<ConnectionTestResult> {
    const wsUrl = this.baseUrl.replace('http', 'ws');
    const endpoint = `${wsUrl}/socket.io/`;
    const startTime = Date.now();

    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(endpoint);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve({
            success: false,
            endpoint,
            responseTime: Date.now() - startTime,
            status: 0,
            error: 'WebSocket connection timeout'
          });
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({
            success: true,
            endpoint,
            responseTime: Date.now() - startTime,
            status: 101 // WebSocket upgrade status
          });
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          resolve({
            success: false,
            endpoint,
            responseTime: Date.now() - startTime,
            status: 0,
            error: 'WebSocket connection failed'
          });
        };
      } catch (error) {
        resolve({
          success: false,
          endpoint,
          responseTime: Date.now() - startTime,
          status: 0,
          error: error instanceof Error ? error.message : 'WebSocket test error'
        });
      }
    });
  }

  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  private extractCorsHeaders(response: Response): Record<string, string> {
    const corsHeaders: Record<string, string> = {};
    const corsHeaderNames = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-allow-credentials',
      'access-control-max-age'
    ];

    corsHeaderNames.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        corsHeaders[header] = value;
      }
    });

    return corsHeaders;
  }

  private logResults(results: ApiTestSuite): void {
    console.log('\n📊 API Connection Test Results:');
    console.log('================================');
    
    Object.entries(results).forEach(([test, result]) => {
      if (!result) return;
      
      const icon = result.success ? '✅' : '❌';
      const status = result.status || 'N/A';
      const time = `${result.responseTime}ms`;
      
      console.log(`${icon} ${test.toUpperCase()}: ${status} (${time})`);
      
      if (result.error) {
        console.log(`   ⚠️  Error: ${result.error}`);
      }
      
      if (result.headers && Object.keys(result.headers).length > 0) {
        console.log(`   📋 Headers:`, result.headers);
      }
    });

    // Overall assessment
    const allSuccessful = Object.values(results).every(r => r?.success);
    const criticalSuccessful = results.backend.success && results.health.success;
    
    console.log('\n🎯 Assessment:');
    if (allSuccessful) {
      console.log('✅ All tests passed - Full connectivity established');
    } else if (criticalSuccessful) {
      console.log('⚠️  Critical connections working - Some optional features may be limited');
    } else {
      console.log('❌ Critical connection issues detected - Check configuration');
    }

    this.provideTroubleshootingTips(results);
  }

  private provideTroubleshootingTips(results: ApiTestSuite): void {
    console.log('\n🔧 Troubleshooting Tips:');
    
    if (!results.backend.success) {
      console.log('• Backend connection failed - Check if backend server is running on correct port');
    }
    
    if (!results.cors.success) {
      console.log('• CORS issues detected - Verify CORS configuration in backend');
    }
    
    if (!results.ai.success) {
      console.log('• AI endpoints not accessible - Check AI routes configuration');
    }
    
    if (results.websocket && !results.websocket.success) {
      console.log('• WebSocket connection failed - Real-time features may not work');
    }

    console.log('\n📚 Common fixes:');
    console.log('• Ensure backend is running: npm run dev (in backend folder)');
    console.log('• Check port configuration: Backend=8000, Frontend=8080');
    console.log('• Verify proxy settings in vite.config.ts');
    console.log('• Check CORS origins in backend/src/index.ts');
  }

  // Public methods for individual tests
  async testConnection(): Promise<boolean> {
    const result = await this.testBackendConnection();
    return result.success;
  }

  async testApiEndpoint(endpoint: string): Promise<ConnectionTestResult> {
    const fullUrl = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      return {
        success: response.ok,
        endpoint: fullUrl,
        responseTime: Date.now() - startTime,
        status: response.status,
        headers: this.extractHeaders(response)
      };
    } catch (error) {
      return {
        success: false,
        endpoint: fullUrl,
        responseTime: Date.now() - startTime,
        status: 0,
        error: error instanceof Error ? error.message : 'Test failed'
      };
    }
  }
}

// Export singleton instance
export const apiConnectionTester = new ApiConnectionTester();

// Auto-run test in development mode
if (import.meta.env.DEV) {
  // Delay to allow app initialization
  setTimeout(() => {
    apiConnectionTester.runFullTest().catch(error => {
      console.error('🚨 API connection test failed:', error);
    });
  }, 2000);
}

export default apiConnectionTester;