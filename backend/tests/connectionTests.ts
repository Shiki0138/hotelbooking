import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { io as Client } from 'socket.io-client';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_URL || 'http://localhost:8000';
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface TestResult {
  service: string;
  status: 'success' | 'failed';
  message: string;
  latency?: number;
}

const results: TestResult[] = [];

async function testSupabaseConnection() {
  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'https://demo-project.supabase.co') {
    results.push({
      service: 'Supabase Database',
      status: 'failed',
      message: 'Supabase credentials not configured (using demo values)',
    });
    return;
  }

  const start = Date.now();
  try {
    const { error } = await supabase
      .from('hotels')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    results.push({
      service: 'Supabase Database',
      status: 'success',
      message: 'Database connection successful',
      latency: Date.now() - start,
    });
  } catch (error: any) {
    results.push({
      service: 'Supabase Database',
      status: 'failed',
      message: `Database connection failed: ${error.message}`,
    });
  }
}

async function testRedisConnection() {
  const start = Date.now();
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryStrategy: () => null, // Don't retry
    connectTimeout: 5000,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    await redis.ping();
    results.push({
      service: 'Redis Cache',
      status: 'success',
      message: 'Redis connection successful',
      latency: Date.now() - start,
    });
  } catch (error: any) {
    results.push({
      service: 'Redis Cache',
      status: 'failed',
      message: 'Redis not available (optional for Vercel deployment)',
    });
  } finally {
    redis.disconnect();
  }
}

async function testAPIEndpoints() {
  const endpoints = [
    { name: 'Health Check', path: '/api/health', method: 'GET' },
    { name: 'Hotels Search', path: '/api/search/hotels?location=Tokyo', method: 'GET' },
    { name: 'Autocomplete', path: '/api/autocomplete?query=Tokyo', method: 'GET' },
    { name: 'Currency Rates', path: '/api/currency/rates', method: 'GET' },
    { name: 'Weather', path: '/api/weather?location=Tokyo', method: 'GET' },
  ];

  for (const endpoint of endpoints) {
    const start = Date.now();
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.path}`,
        timeout: 5000,
      });
      
      results.push({
        service: `API: ${endpoint.name}`,
        status: response.status >= 200 && response.status < 300 ? 'success' : 'failed',
        message: `Status: ${response.status}`,
        latency: Date.now() - start,
      });
    } catch (error: any) {
      results.push({
        service: `API: ${endpoint.name}`,
        status: 'failed',
        message: `${error.message}`,
      });
    }
  }
}

async function testAuthenticatedEndpoints() {
  try {
    // First, create a test user and get token
    const registerResponse = await axios.post(`${API_BASE_URL}/api/auth/register`, {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Connection Test User',
    });

    const token = registerResponse.data.data.token;

    const authenticatedEndpoints = [
      { name: 'User Profile', path: '/api/auth/profile', method: 'GET' },
      { name: 'User Preferences', path: '/api/user-preferences/search-history', method: 'GET' },
      { name: 'Watchlist', path: '/api/watchlist', method: 'GET' },
      { name: 'Bookings', path: '/api/bookings/my-bookings', method: 'GET' },
    ];

    for (const endpoint of authenticatedEndpoints) {
      const start = Date.now();
      try {
        const response = await axios({
          method: endpoint.method,
          url: `${API_BASE_URL}${endpoint.path}`,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        
        results.push({
          service: `Auth API: ${endpoint.name}`,
          status: 'success',
          message: `Status: ${response.status}`,
          latency: Date.now() - start,
        });
      } catch (error: any) {
        results.push({
          service: `Auth API: ${endpoint.name}`,
          status: 'failed',
          message: `${error.message}`,
        });
      }
    }
  } catch (error: any) {
    results.push({
      service: 'Authentication System',
      status: 'failed',
      message: `Auth setup failed: ${error.message}`,
    });
  }
}

async function testWebSocketConnection() {
  return new Promise<void>((resolve) => {
    const start = Date.now();
    const socket = Client(API_BASE_URL, {
      transports: ['websocket'],
      timeout: 5000,
    });

    const timeout = setTimeout(() => {
      results.push({
        service: 'WebSocket (Socket.io)',
        status: 'failed',
        message: 'Connection timeout',
      });
      socket.disconnect();
      resolve();
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      results.push({
        service: 'WebSocket (Socket.io)',
        status: 'success',
        message: 'WebSocket connection successful',
        latency: Date.now() - start,
      });
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      results.push({
        service: 'WebSocket (Socket.io)',
        status: 'failed',
        message: `WebSocket connection failed: ${error.message}`,
      });
      resolve();
    });
  });
}

async function testSendGridConnection() {
  if (!process.env.SENDGRID_API_KEY) {
    results.push({
      service: 'SendGrid Email',
      status: 'failed',
      message: 'SendGrid API key not configured',
    });
    return;
  }

  const start = Date.now();
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    // Simple test - just verify the API key is set
    // In production, you can use sgMail.send() to verify
    
    results.push({
      service: 'SendGrid Email',
      status: 'success',
      message: 'SendGrid API key configured',
      latency: Date.now() - start,
    });
  } catch (error: any) {
    results.push({
      service: 'SendGrid Email',
      status: 'failed',
      message: `SendGrid configuration failed: ${error.message}`,
    });
  }
}

async function testBullQueues() {
  const start = Date.now();
  let testQueue: any;
  
  try {
    const Bull = require('bull');
    testQueue = new Bull('connection-test', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        retryStrategy: () => null,
        connectTimeout: 5000,
      },
    });

    await testQueue.add('test-job', { test: true });
    
    results.push({
      service: 'Bull Job Queue',
      status: 'success',
      message: 'Job queue system operational',
      latency: Date.now() - start,
    });
  } catch (error: any) {
    results.push({
      service: 'Bull Job Queue',
      status: 'failed',
      message: 'Job queue not available (requires Redis)',
    });
  } finally {
    if (testQueue) {
      await testQueue.close();
    }
  }
}

async function testAdminEndpoints() {
  try {
    const adminEndpoints = [
      { name: 'Admin Dashboard', path: '/api/admin/dashboard/stats', method: 'GET' },
      { name: 'Hotel Inventory', path: '/api/inventory/availability', method: 'GET' },
      { name: 'Revenue Management', path: '/api/revenue/analytics', method: 'GET' },
    ];

    for (const endpoint of adminEndpoints) {
      const start = Date.now();
      try {
        const response = await axios({
          method: endpoint.method,
          url: `${API_BASE_URL}${endpoint.path}`,
          timeout: 5000,
        });
        
        // Expecting 401 without auth - this confirms endpoint exists
        if (response.status === 401 || response.status === 403) {
          results.push({
            service: `Admin: ${endpoint.name}`,
            status: 'success',
            message: 'Endpoint exists and requires auth',
            latency: Date.now() - start,
          });
        }
      } catch (error: any) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          results.push({
            service: `Admin: ${endpoint.name}`,
            status: 'success',
            message: 'Endpoint exists and requires auth',
            latency: Date.now() - start,
          });
        } else if (error.response?.status === 404) {
          results.push({
            service: `Admin: ${endpoint.name}`,
            status: 'failed',
            message: 'Endpoint not found (commented out)',
          });
        } else {
          results.push({
            service: `Admin: ${endpoint.name}`,
            status: 'failed',
            message: `${error.message}`,
          });
        }
      }
    }
  } catch (error: any) {
    results.push({
      service: 'Admin System',
      status: 'failed',
      message: `Admin test failed: ${error.message}`,
    });
  }
}

async function runAllTests() {
  console.log('🚀 Starting Connection Tests...\n');
  
  // Core Infrastructure
  console.log('Testing Core Infrastructure...');
  await testSupabaseConnection();
  await testRedisConnection();
  
  // API Endpoints
  console.log('\nTesting API Endpoints...');
  await testAPIEndpoints();
  await testAuthenticatedEndpoints();
  await testAdminEndpoints();
  
  // Real-time Features
  console.log('\nTesting Real-time Features...');
  await testWebSocketConnection();
  
  // External Services
  console.log('\nTesting External Services...');
  await testSendGridConnection();
  
  // Job Queue System
  console.log('\nTesting Job Queue System...');
  await testBullQueues();
  
  // Display Results
  console.log('\n📊 Connection Test Results:\n');
  console.log('Service                          Status      Latency    Message');
  console.log('─'.repeat(80));
  
  let successCount = 0;
  let failedCount = 0;
  
  results.forEach((result) => {
    const statusIcon = result.status === 'success' ? '✅' : '❌';
    const latencyStr = result.latency ? `${result.latency}ms` : 'N/A';
    
    console.log(
      `${statusIcon} ${result.service.padEnd(30)} ${result.status.padEnd(10)} ${latencyStr.padEnd(10)} ${result.message}`
    );
    
    if (result.status === 'success') {
      successCount++;
    } else {
      failedCount++;
    }
  });
  
  console.log('─'.repeat(80));
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
  
  console.log('\n💡 Note: Redis and some services may not be available in local development.');
  console.log('   These are optional for Vercel deployment.');
  
  process.exit(0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});