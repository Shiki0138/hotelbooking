// 楽天API実際の検索動作テスト

const RAKUTEN_API_KEY = '1044303809598455171';

// 実際のAPIテスト
export const testRakutenSearch = async () => {
  console.log('🔍 楽天API検索テスト開始');

  // テストケース
  const testCases = [
    // 完全一致テスト
    { query: 'ザ・リッツ・カールトン東京', type: '完全一致' },
    { query: 'リッツカールトン東京', type: '完全一致(ハイフンなし)' },
    { query: 'リッツ', type: '部分一致' },
    { query: 'ritz', type: '英語' },
    
    // チェーンホテルテスト
    { query: '東横イン', type: 'チェーン名' },
    { query: '東横イン新宿', type: 'チェーン名+地名' },
    { query: 'アパホテル', type: 'チェーン名' },
    
    // 地名検索テスト
    { query: '新宿', type: '地名' },
    { query: '東京', type: '都市名' },
    { query: '渋谷', type: '地名' },
    
    // 存在しないホテル
    { query: 'テストホテル123456', type: '存在しない' },
    { query: 'あいうえおホテル', type: '存在しない' }
  ];

  const results: any[] = [];

  for (const testCase of testCases) {
    try {
      console.log(`\n📋 テスト: "${testCase.query}" (${testCase.type})`);
      
      const params = new URLSearchParams({
        format: 'json',
        keyword: testCase.query,
        applicationId: RAKUTEN_API_KEY,
        hits: '10'
      });

      const url = `https://app.rakuten.co.jp/services/api/Travel/HotelSearch/20131024?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        console.log(`❌ エラー: ${data.error} - ${data.error_description}`);
        results.push({
          query: testCase.query,
          type: testCase.type,
          success: false,
          error: data.error,
          count: 0
        });
        continue;
      }

      const hotelCount = data.hotels ? data.hotels.length : 0;
      console.log(`✅ 検索結果: ${hotelCount}軒`);

      if (hotelCount > 0) {
        // 最初の3軒を表示
        const topHotels = data.hotels.slice(0, 3).map((h: any) => ({
          name: h.hotel[0].hotelBasicInfo.hotelName,
          address: `${h.hotel[0].hotelBasicInfo.address1}${h.hotel[0].hotelBasicInfo.address2}`,
          price: h.hotel[0].hotelBasicInfo.hotelMinCharge
        }));

        topHotels.forEach((hotel: any, index: number) => {
          console.log(`   ${index + 1}. ${hotel.name}`);
          console.log(`      場所: ${hotel.address}`);
          console.log(`      最低料金: ¥${hotel.price?.toLocaleString() || '未設定'}`);
        });

        results.push({
          query: testCase.query,
          type: testCase.type,
          success: true,
          count: hotelCount,
          topHotels
        });
      } else {
        console.log(`   ⚠️  該当ホテルなし`);
        results.push({
          query: testCase.query,
          type: testCase.type,
          success: true,
          count: 0
        });
      }

      // API制限を避けるため少し待機
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`❌ ネットワークエラー: ${error}`);
      results.push({
        query: testCase.query,
        type: testCase.type,
        success: false,
        error: error,
        count: 0
      });
    }
  }

  // 結果サマリー
  console.log('\n📊 テスト結果サマリー');
  console.log('=' * 50);
  
  const successfulSearches = results.filter(r => r.success && r.count > 0);
  const failedSearches = results.filter(r => !r.success);
  const noResultSearches = results.filter(r => r.success && r.count === 0);

  console.log(`✅ 成功: ${successfulSearches.length}/${results.length}`);
  console.log(`❌ エラー: ${failedSearches.length}/${results.length}`);
  console.log(`⚠️  結果なし: ${noResultSearches.length}/${results.length}`);

  // 成功したクエリ
  if (successfulSearches.length > 0) {
    console.log('\n✅ 検索成功したクエリ:');
    successfulSearches.forEach(r => {
      console.log(`   "${r.query}" (${r.type}) → ${r.count}軒`);
    });
  }

  // 結果がなかったクエリ
  if (noResultSearches.length > 0) {
    console.log('\n⚠️  結果がなかったクエリ:');
    noResultSearches.forEach(r => {
      console.log(`   "${r.query}" (${r.type})`);
    });
  }

  // エラーが発生したクエリ
  if (failedSearches.length > 0) {
    console.log('\n❌ エラーが発生したクエリ:');
    failedSearches.forEach(r => {
      console.log(`   "${r.query}" (${r.type}) → ${r.error}`);
    });
  }

  return results;
};

// ブラウザコンソールで実行用
if (typeof window !== 'undefined') {
  (window as any).testRakutenAPI = testRakutenSearch;
  console.log('💡 ブラウザコンソールで testRakutenAPI() を実行してテストできます');
}