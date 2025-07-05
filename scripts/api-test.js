#!/usr/bin/env node

// API動作確認スクリプト - Worker1
// Hotel Booking System

const axios = require('axios');
const colors = require('colors');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

console.log('🔍 API動作確認テスト開始'.green);
console.log('================================'.gray);

// テスト用データ
const testData = {
  user: {
    email: 'test@example.com',
    password: 'Test123!',
    fullName: 'Test User',
    phoneNumber: '090-1234-5678'
  },
  search: {
    area: 'tokyo',
    checkInDate: '2025-08-01',
    checkOutDate: '2025-08-03',
    guests: 2
  }
};

let authToken = null;

// APIテスト関数
async function testAPI(name, method, endpoint, data = null, requireAuth = false) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      timeout: 10000
    };

    if (data) {
      config.data = data;
    }

    if (requireAuth && authToken) {
      config.headers = { Authorization: `Bearer ${authToken}` };
    }

    const response = await axios(config);
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ ${name}`.green);
      return response.data;
    } else {
      console.log(`❌ ${name}: Status ${response.status}`.red);
      return null;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`.red);
    return null;
  }
}

// メインテスト実行
async function runTests() {
  console.log('\n📝 認証APIテスト'.yellow);
  console.log('----------------'.gray);

  // 1. ユーザー登録テスト
  const registerResult = await testAPI(
    'ユーザー登録',
    'POST',
    '/auth/register',
    testData.user
  );

  // 2. ログインテスト
  const loginResult = await testAPI(
    'ログイン',
    'POST',
    '/auth/login',
    {
      email: testData.user.email,
      password: testData.user.password
    }
  );

  if (loginResult && loginResult.session) {
    authToken = loginResult.session.access_token;
  }

  // 3. ユーザー情報取得テスト
  await testAPI('ユーザー情報取得', 'GET', '/auth/me', null, true);

  console.log('\n🏨 ホテル検索APIテスト'.yellow);
  console.log('--------------------'.gray);

  // 4. ホテル検索テスト
  await testAPI(
    'ホテル検索',
    'GET',
    `/hotels/search?area=${testData.search.area}&checkInDate=${testData.search.checkInDate}&checkOutDate=${testData.search.checkOutDate}&guests=${testData.search.guests}`
  );

  // 5. 検索フィルター取得テスト
  await testAPI('検索フィルター取得', 'GET', '/hotels/filters');

  // 6. 検索サジェスト取得テスト
  await testAPI('検索サジェスト取得', 'GET', '/hotels/suggestions?query=東京');

  console.log('\n📋 ウォッチリストAPIテスト'.yellow);
  console.log('----------------------'.gray);

  // 7. ウォッチリスト取得テスト
  await testAPI('ウォッチリスト取得', 'GET', '/watchlist', null, true);

  // 8. ウォッチリスト追加テスト
  await testAPI(
    'ウォッチリスト追加',
    'POST',
    '/watchlist',
    {
      hotel_id: 'test-hotel-123',
      hotel_name: 'テストホテル',
      check_in: testData.search.checkInDate,
      check_out: testData.search.checkOutDate,
      guests_count: testData.search.guests,
      target_price: 15000
    },
    true
  );

  // 9. 通知設定取得テスト
  await testAPI('通知設定取得', 'GET', '/watchlist/notifications', null, true);

  console.log('\n📊 システムヘルスチェック'.yellow);
  console.log('--------------------'.gray);

  // 10. APIヘルスチェック
  await testAPI('APIヘルスチェック', 'GET', '/health');

  // 11. 検索メトリクス取得テスト
  await testAPI('検索メトリクス取得', 'GET', '/hotels/metrics');

  console.log('\n🎉 API動作確認テスト完了'.green);
}

// テスト実行
runTests().catch(console.error);