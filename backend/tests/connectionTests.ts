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
  process.env.SUPABASE_SERVICE_KEY || ''
);

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

interface TestResult {
  service: string;
  status: 'success' | 'failed';
  message: string;
  latency?: number;
}

const results: TestResult[] = [];

async function testSupabaseConnection() {
  const start = Date.now();
  try {
    const { data, error } = await supabase
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
  try {
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
      message: `Redis connection failed: ${error.message}`,
    });
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

    socket.on('connect', () => {
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
      results.push({
        service: 'WebSocket (Socket.io)',
        status: 'failed',
        message: `WebSocket connection failed: ${error.message}`,
      });
      resolve();
    });

    setTimeout(() => {
      socket.disconnect();
      resolve();
    }, 5000);
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
    
    // Verify API key without sending email
    const request = {
      method: 'GET' as const,
      url: '/v3/scopes',
    };
    
    await sgMail.request(request);
    
    results.push({
      service: 'SendGrid Email',
      status: 'success',
      message: 'SendGrid API connection successful',
      latency: Date.now() - start,
    });
  } catch (error: any) {
    results.push({
      service: 'SendGrid Email',
      status: 'failed',
      message: `SendGrid connection failed: ${error.message}`,
    });
  }
}

async function testBullQueues() {
  const start = Date.now();
  try {
    const Bull = require('bull');
    const testQueue = new Bull('connection-test', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    await testQueue.add('test-job', { test: true });
    const job = await testQueue.getJob(1);
    
    if (job) {
      results.push({
        service: 'Bull Job Queue',
        status: 'success',
        message: 'Job queue system operational',
        latency: Date.now() - start,
      });
    } else {
      throw new Error('Failed to create test job');
    }

    await testQueue.close();
  } catch (error: any) {
    results.push({
      service: 'Bull Job Queue',
      status: 'failed',
      message: `Job queue test failed: ${error.message}`,
    });
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
  
  // Cleanup
  await redis.quit();
  
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});