// 楽天APIテスト用スクリプト
const axios = require('axios');
require('dotenv').config();

// 環境変数から取得
const APP_ID = process.env.RAKUTEN_APP_ID;
const AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID;

if (!APP_ID) {
  console.error('❌ RAKUTEN_APP_IDが設定されていません');
  console.log('1. 楽天ウェブサービスでアプリIDを取得');
  console.log('2. .envファイルにRAKUTEN_APP_ID=your_app_idを追加');
  process.exit(1);
}

console.log('🔍 楽天APIテスト開始...');
console.log(`App ID: ${APP_ID.substring(0, 4)}...`);
console.log(`Affiliate ID: ${AFFILIATE_ID ? AFFILIATE_ID.substring(0, 8) + '...' : 'なし'}`);

// 施設検索APIテスト
async function testHotelSearchAPI() {
  console.log('\n📍 施設検索APIテスト');
  
  try {
    const response = await axios.get('https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426', {
      params: {
        applicationId: APP_ID,
        largeClassCode: 'japan',
        middleClassCode: 'kanto',
        smallClassCode: 'tokyo',
        detailClassCode: 'A',
        format: 'json'
      }
    });
    
    console.log(`✅ 取得成功: ${response.data.hotels.length}件のホテル`);
    console.log(`例: ${response.data.hotels[0].hotel[0].hotelBasicInfo.hotelName}`);
    return true;
  } catch (error) {
    console.error('❌ エラー:', error.response?.data?.error_description || error.message);
    return false;
  }
}

// 空室検索APIテスト
async function testVacantSearchAPI() {
  console.log('\n🏨 空室検索APIテスト');
  
  // 明日の日付を計算
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  
  const checkinDate = tomorrow.toISOString().split('T')[0];
  const checkoutDate = dayAfter.toISOString().split('T')[0];
  
  try {
    const response = await axios.get('https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426', {
      params: {
        applicationId: APP_ID,
        checkinDate: checkinDate,
        checkoutDate: checkoutDate,
        largeClassCode: 'japan',
        middleClassCode: 'kanto',
        smallClassCode: 'tokyo',
        detailClassCode: 'A',
        adultNum: 2,
        format: 'json'
      }
    });
    
    console.log(`✅ 取得成功: ${response.data.hotels.length}件の空室あり`);
    if (response.data.hotels.length > 0) {
      const hotel = response.data.hotels[0].hotel[0].hotelBasicInfo;
      console.log(`例: ${hotel.hotelName} - ¥${hotel.hotelMinCharge.toLocaleString()}〜`);
    }
    return true;
  } catch (error) {
    console.error('❌ エラー:', error.response?.data?.error_description || error.message);
    return false;
  }
}

// ランキングAPIテスト
async function testRankingAPI() {
  console.log('\n🏆 ランキングAPIテスト');
  
  try {
    const response = await axios.get('https://app.rakuten.co.jp/services/api/Travel/HotelRanking/20170426', {
      params: {
        applicationId: APP_ID,
        genre: 'all',
        format: 'json'
      }
    });
    
    console.log(`✅ 取得成功: TOP${response.data.Rankings.length}ランキング`);
    console.log(`1位: ${response.data.Rankings[0].hotel.hotelBasicInfo.hotelName}`);
    return true;
  } catch (error) {
    console.error('❌ エラー:', error.response?.data?.error_description || error.message);
    return false;
  }
}

// メイン実行
async function main() {
  console.log('\n========================================');
  
  const results = {
    hotelSearch: await testHotelSearchAPI(),
    vacantSearch: await testVacantSearchAPI(),
    ranking: await testRankingAPI()
  };
  
  console.log('\n========================================');
  console.log('📊 テスト結果:');
  console.log(`施設検索API: ${results.hotelSearch ? '✅' : '❌'}`);
  console.log(`空室検索API: ${results.vacantSearch ? '✅' : '❌'}`);
  console.log(`ランキングAPI: ${results.ranking ? '✅' : '❌'}`);
  
  if (Object.values(results).every(r => r)) {
    console.log('\n🎉 全てのAPIが正常に動作しています！');
  } else {
    console.log('\n⚠️  一部のAPIでエラーが発生しました');
    console.log('アプリIDとAPI利用申請を確認してください');
  }
}

main();