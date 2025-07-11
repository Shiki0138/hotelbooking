// 楽天APIシンプルテスト
const axios = require('axios');
require('dotenv').config();

const APP_ID = process.env.RAKUTEN_APP_ID;
console.log('App ID:', APP_ID);

// キーワード検索APIテスト（最もシンプル）
async function testKeywordSearch() {
  console.log('\n🔍 キーワード検索APIテスト');
  
  try {
    const url = `https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426`;
    const params = {
      applicationId: APP_ID,
      keyword: '東京',
      format: 'json'
    };
    
    console.log('Request URL:', url);
    console.log('Params:', params);
    
    const response = await axios.get(url, { params });
    
    console.log(`✅ 成功！ ${response.data.hotels.length}件のホテルを取得`);
    if (response.data.hotels.length > 0) {
      const hotel = response.data.hotels[0].hotel[0].hotelBasicInfo;
      console.log(`例: ${hotel.hotelName}`);
      console.log(`住所: ${hotel.address1}`);
      console.log(`料金: ¥${hotel.hotelMinCharge}〜`);
    }
  } catch (error) {
    console.error('❌ エラー:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.log('APIキーが無効か、APIが有効化されていない可能性があります');
    }
  }
}

testKeywordSearch();