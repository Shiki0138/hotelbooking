/**
 * 楽天トラベルAPI実動作テスト
 * APIキーの検証とモックデータ実装
 */

import rakutenAPI from './rakutenTravel.js';

class RakutenAPITester {
  constructor() {
    this.testResults = [];
    this.currentApiKey = '1089506543046478259';
  }

  // APIキーの有効性テスト
  async testApiKey(apiKey = this.currentApiKey) {
    console.log(`楽天APIキーのテスト開始: ${apiKey}`);
    
    try {
      const testUrl = `https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426?applicationId=${apiKey}&format=json&formatVersion=2&largeClassCode=japan&middleClassCode=tokyo&hits=1`;
      
      const response = await fetch(testUrl);
      const data = await response.json();
      
      if (data.error) {
        console.error('APIキーエラー:', data.error_description);
        return {
          valid: false,
          error: data.error_description,
          suggestedAction: 'valid_api_key_required'
        };
      }
      
      console.log('APIキー有効:', data);
      return {
        valid: true,
        data: data
      };
    } catch (error) {
      console.error('API接続エラー:', error);
      return {
        valid: false,
        error: error.message,
        suggestedAction: 'check_network_or_use_mock'
      };
    }
  }

  // 実データ取得テスト（3都市）
  async testRealDataRetrieval() {
    const cities = [
      { name: '東京', area: 'tokyo', subArea: 'shinjuku' },
      { name: '大阪', area: 'osaka', subArea: 'umeda' },
      { name: '京都', area: 'kyoto', subArea: 'station' }
    ];

    const results = [];

    for (const city of cities) {
      console.log(`${city.name}のホテル検索テスト開始...`);
      
      try {
        const hotels = await rakutenAPI.searchByArea({
          area: city.area,
          subArea: city.subArea,
          limit: 5
        });

        results.push({
          city: city.name,
          status: 'success',
          hotelCount: hotels.length,
          hotels: hotels,
          message: `${hotels.length}件のホテルを取得`
        });

        console.log(`${city.name}: ${hotels.length}件取得成功`);
        
        // API制限対策（1秒待機）
        await this.wait(1000);
        
      } catch (error) {
        console.error(`${city.name}のデータ取得エラー:`, error);
        
        results.push({
          city: city.name,
          status: 'error',
          error: error.message,
          message: 'モックデータを使用中'
        });
      }
    }

    return results;
  }

  // 空室検索テスト
  async testVacantRoomSearch() {
    console.log('空室検索テスト開始...');
    
    // 明日から1泊の検索
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    try {
      const rooms = await rakutenAPI.searchVacantRooms({
        area: 'tokyo',
        subArea: 'shinjuku',
        checkinDate: tomorrow.toISOString().split('T')[0],
        checkoutDate: dayAfter.toISOString().split('T')[0],
        adults: 2,
        rooms: 1,
        limit: 10
      });

      return {
        status: 'success',
        roomCount: rooms.length,
        rooms: rooms,
        searchDate: {
          checkin: tomorrow.toISOString().split('T')[0],
          checkout: dayAfter.toISOString().split('T')[0]
        }
      };
    } catch (error) {
      console.error('空室検索エラー:', error);
      return {
        status: 'error',
        error: error.message,
        message: 'モックデータまたは代替手段が必要'
      };
    }
  }

  // API制限チェック（1秒1リクエスト）
  async testRateLimit() {
    console.log('API制限テスト開始...');
    const startTime = Date.now();
    
    try {
      // 3回連続でリクエスト
      const promises = [
        rakutenAPI.searchTokyoHotels('shinjuku', { limit: 3 }),
        rakutenAPI.searchOsakaHotels('umeda', { limit: 3 }),
        rakutenAPI.searchKyotoHotels('station', { limit: 3 })
      ];

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        status: 'completed',
        duration: duration,
        results: results.map((result, index) => ({
          city: ['東京', '大阪', '京都'][index],
          status: result.status,
          hotelCount: result.status === 'fulfilled' ? result.value.length : 0,
          error: result.status === 'rejected' ? result.reason.message : null
        })),
        rateLimitCompliant: duration >= 2000, // 3リクエストで2秒以上
        recommendation: duration < 2000 ? 'API制限対策として各リクエスト間に1秒の遅延を推奨' : 'API制限に準拠'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        recommendation: 'モックデータまたは代替APIの使用を検討'
      };
    }
  }

  // アフィリエイトリンク生成テスト
  async testAffiliateLinks() {
    console.log('アフィリエイトリンク生成テスト...');
    
    // テスト用ホテルデータ
    const testHotel = {
      id: '143637',
      name: 'アパホテル〈新宿歌舞伎町タワー〉',
      rakutenHotelId: '143637',
      jalanHotelId: 'test_jalan_id',
      yahooHotelId: 'test_yahoo_id',
      bookingId: 'test_booking_id',
      agodaId: 'test_agoda_id',
      expediaId: 'test_expedia_id'
    };

    // AffiliateService動的インポート
    let affiliateService;
    try {
      const module = await import('../AffiliateService.js');
      affiliateService = module.default;
    } catch (error) {
      console.error('AffiliateService読み込みエラー:', error);
      return {
        status: 'error',
        error: 'AffiliateServiceが利用できません',
        recommendation: 'アフィリエイトサービスの実装確認が必要'
      };
    }

    try {
      const links = affiliateService.generateAllLinks(testHotel);
      
      return {
        status: 'success',
        links: links,
        message: '全OTAのアフィリエイトリンク生成完了',
        activeLinks: Object.entries(links).filter(([key, url]) => 
          url && url !== '#' && !url.includes(testHotel.id)
        ).length
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        recommendation: 'アフィリエイトID設定の確認が必要'
      };
    }
  }

  // 総合テスト実行
  async runAllTests() {
    console.log('=== 楽天トラベルAPI 総合テスト開始 ===');
    const testResults = {};

    // 1. APIキー検証
    console.log('\n1. APIキー検証...');
    testResults.apiKeyTest = await this.testApiKey();

    // 2. 実データ取得テスト
    console.log('\n2. 実データ取得テスト...');
    testResults.realDataTest = await this.testRealDataRetrieval();

    // 3. 空室検索テスト
    console.log('\n3. 空室検索テスト...');
    testResults.vacantRoomTest = await this.testVacantRoomSearch();

    // 4. API制限テスト
    console.log('\n4. API制限テスト...');
    testResults.rateLimitTest = await this.testRateLimit();

    // 5. アフィリエイトリンクテスト
    console.log('\n5. アフィリエイトリンクテスト...');
    testResults.affiliateTest = await this.testAffiliateLinks();

    // 結果まとめ
    const summary = this.generateTestSummary(testResults);
    
    console.log('\n=== テスト結果サマリー ===');
    console.log(summary);

    return {
      timestamp: new Date().toISOString(),
      results: testResults,
      summary: summary,
      recommendations: this.generateRecommendations(testResults)
    };
  }

  // テスト結果サマリー生成
  generateTestSummary(results) {
    const summary = {
      apiStatus: results.apiKeyTest?.valid ? '有効' : '無効',
      dataRetrievalSuccess: results.realDataTest?.filter(r => r.status === 'success').length || 0,
      dataRetrievalTotal: results.realDataTest?.length || 0,
      vacantRoomSearch: results.vacantRoomTest?.status || 'unknown',
      rateLimitCompliant: results.rateLimitTest?.rateLimitCompliant ? '準拠' : '要改善',
      affiliateLinksWorking: results.affiliateTest?.activeLinks > 0 ? '動作' : '要設定'
    };

    return summary;
  }

  // 推奨事項生成
  generateRecommendations(results) {
    const recommendations = [];

    // APIキー関連
    if (!results.apiKeyTest?.valid) {
      recommendations.push({
        priority: 'high',
        category: 'api_key',
        message: '有効な楽天APIキーの取得が必要です',
        action: '楽天ウェブサービスに登录してAPIキーを取得してください'
      });
    }

    // データ取得関連
    const failedCities = results.realDataTest?.filter(r => r.status === 'error').length || 0;
    if (failedCities > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'data_retrieval',
        message: `${failedCities}都市のデータ取得に失敗`,
        action: 'モックデータまたは代替API（じゃらん、Yahoo!トラベル）の検討'
      });
    }

    // API制限関連
    if (!results.rateLimitTest?.rateLimitCompliant) {
      recommendations.push({
        priority: 'medium',
        category: 'rate_limit',
        message: 'API制限（1秒1リクエスト）への対応が不十分',
        action: 'リクエスト間に適切な遅延処理を実装'
      });
    }

    // アフィリエイト関連
    if (results.affiliateTest?.activeLinks === 0) {
      recommendations.push({
        priority: 'low',
        category: 'affiliate',
        message: 'アフィリエイトIDの設定が必要',
        action: '楽天アフィリエイト、バリューコマース等への登録'
      });
    }

    return recommendations;
  }

  // ユーティリティ関数
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 代替案の提案
  getAlternativeOptions() {
    return {
      mockDataImplementation: {
        description: '実際のAPI接続なしでモックデータを使用',
        pros: ['即座に利用可能', '開発・テスト環境に最適', 'API制限なし'],
        cons: ['実データではない', '最新情報が反映されない'],
        implementation: 'rakutenTravel.jsのgetMockData()メソッドを活用'
      },
      alternativeApis: {
        description: '他のホテル予約APIを併用',
        options: [
          {
            name: 'じゃらんnet API',
            description: 'リクルート社のホテル検索API',
            cost: 'アフィリエイト型（成果報酬）'
          },
          {
            name: 'Yahoo!トラベル API',
            description: 'Yahoo! JAPANのトラベルAPI',
            cost: 'アフィリエイト型（成果報酬）'
          },
          {
            name: 'Booking.com API',
            description: '世界最大級のホテル予約サイト',
            cost: 'アフィリエイト型（成果報酬）'
          }
        ]
      },
      hybridApproach: {
        description: '複数のAPIとモックデータを組み合わせる',
        strategy: '主要APIが利用できない場合は自動的にモックデータにフォールバック',
        benefits: ['高い可用性', 'ユーザー体験の継続性', '段階的な実装が可能']
      }
    };
  }
}

export default RakutenAPITester;

// 使用例
/*
import RakutenAPITester from './rakutenApiTest.js';

const tester = new RakutenAPITester();

// 個別テスト
const apiKeyResult = await tester.testApiKey();
const dataResults = await tester.testRealDataRetrieval();

// 総合テスト
const allResults = await tester.runAllTests();

// 代替案取得
const alternatives = tester.getAlternativeOptions();
*/