const axios = require('axios');
const Redis = require('ioredis');

const API_BASE_URL = process.env.API_URL || 'http://localhost:8000';

async function runConnectionTests() {
  console.log('🚀 Starting Connection Tests...\n');
  
  const results = [];
  
  // Test API Health Check
  console.log('Testing API Health Check...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
    results.push({
      service: 'API Health Check',
      status: 'success',
      message: `Status: ${response.status}`,
      data: response.data
    });
  } catch (error) {
    results.push({
      service: 'API Health Check',
      status: 'failed',
      message: error.message
    });
  }
  
  // Test Redis Connection
  console.log('Testing Redis Connection...');
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    lazyConnect: true,
    connectTimeout: 5000
  });
  
  try {
    await redis.connect();
    await redis.ping();
    results.push({
      service: 'Redis Cache',
      status: 'success',
      message: 'Redis connection successful'
    });
  } catch (error) {
    results.push({
      service: 'Redis Cache', 
      status: 'failed',
      message: error.message
    });
  } finally {
    await redis.quit();
  }
  
  // Test Public API Endpoints
  const publicEndpoints = [
    { name: 'Hotels Search', path: '/api/search/hotels?location=Tokyo', method: 'GET' },
    { name: 'Autocomplete', path: '/api/autocomplete?query=Tokyo', method: 'GET' },
    { name: 'Currency Rates', path: '/api/currency/rates', method: 'GET' }
  ];
  
  console.log('\nTesting Public API Endpoints...');
  for (const endpoint of publicEndpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.path}`,
        timeout: 5000
      });
      
      results.push({
        service: `API: ${endpoint.name}`,
        status: 'success',
        message: `Status: ${response.status}`
      });
    } catch (error) {
      results.push({
        service: `API: ${endpoint.name}`,
        status: 'failed',
        message: error.message
      });
    }
  }
  
  // Display Results
  console.log('\n📊 Connection Test Results:\n');
  console.log('Service                          Status      Message');
  console.log('─'.repeat(70));
  
  let successCount = 0;
  let failedCount = 0;
  
  results.forEach((result) => {
    const statusIcon = result.status === 'success' ? '✅' : '❌';
    console.log(`${statusIcon} ${result.service.padEnd(30)} ${result.status.padEnd(10)} ${result.message}`);
    
    if (result.status === 'success') {
      successCount++;
    } else {
      failedCount++;
    }
  });
  
  console.log('─'.repeat(70));
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
  
  // Show API health data if available
  const healthResult = results.find(r => r.service === 'API Health Check');
  if (healthResult && healthResult.data) {
    console.log('\nAPI Health Details:');
    console.log(JSON.stringify(healthResult.data, null, 2));
  }
  
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run tests
runConnectionTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});