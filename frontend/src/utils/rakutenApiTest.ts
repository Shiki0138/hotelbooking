// 楽天トラベルAPI接続テスト

const RAKUTEN_API_KEY = process.env.REACT_APP_RAKUTEN_API_KEY;
const RAKUTEN_BASE_URL = 'https://app.rakuten.co.jp/services/api/Travel';

interface RakutenHotel {
  hotelNo: number;
  hotelName: string;
  hotelInformationUrl: string;
  planListUrl: string;
  dpPlanListUrl: string;
  address1: string;
  address2: string;
  roomImageUrl?: string;
  hotelImageUrl?: string;
  hotelMinCharge: number;
  latitude: number;
  longitude: number;
  postalCode: string;
  telephoneNo: string;
  faxNo?: string;
  access: string;
  parkingInformation?: string;
  nearestStation: string;
  hotelCaption: string;
}

interface RakutenApiResponse {
  hotels?: Array<{
    hotel: Array<{
      hotelBasicInfo: RakutenHotel;
    }>;
  }>;
  error?: string;
  error_description?: string;
}

export class RakutenAPITester {
  private static instance: RakutenAPITester;
  
  static getInstance(): RakutenAPITester {
    if (!RakutenAPITester.instance) {
      RakutenAPITester.instance = new RakutenAPITester();
    }
    return RakutenAPITester.instance;
  }

  // API接続テスト
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    if (!RAKUTEN_API_KEY) {
      return {
        success: false,
        message: 'APIキーが設定されていません。REACT_APP_RAKUTEN_API_KEY を確認してください。'
      };
    }

    try {
      // シンプルなホテル検索でテスト
      const response = await this.searchHotels('東京', 1);
      
      if (response.error) {
        return {
          success: false,
          message: `API エラー: ${response.error} - ${response.error_description}`,
          data: response
        };
      }

      if (response.hotels && response.hotels.length > 0) {
        const hotelCount = response.hotels.length;
        const firstHotel = response.hotels[0].hotel[0].hotelBasicInfo;
        
        return {
          success: true,
          message: `✅ 楽天API接続成功！${hotelCount}軒のホテルが見つかりました。`,
          data: {
            hotelCount,
            sampleHotel: {
              name: firstHotel.hotelName,
              address: `${firstHotel.address1}${firstHotel.address2}`,
              minPrice: firstHotel.hotelMinCharge
            }
          }
        };
      }

      return {
        success: false,
        message: '検索結果がありませんでした。',
        data: response
      };

    } catch (error) {
      return {
        success: false,
        message: `ネットワークエラー: ${error}`,
        data: error
      };
    }
  }

  // ホテル検索
  async searchHotels(keyword: string, limit: number = 10): Promise<RakutenApiResponse> {
    const params = new URLSearchParams({
      format: 'json',
      keyword: keyword,
      applicationId: RAKUTEN_API_KEY!,
      hits: limit.toString()
    });

    const url = `${RAKUTEN_BASE_URL}/HotelSearch/20131024?${params.toString()}`;
    
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      throw new Error(`楽天API呼び出しエラー: ${error}`);
    }
  }

  // 特定ホテル名での検索
  async searchByHotelName(hotelName: string): Promise<RakutenHotel[]> {
    try {
      const response = await this.searchHotels(hotelName, 20);
      
      if (response.hotels) {
        return response.hotels
          .map(h => h.hotel[0].hotelBasicInfo)
          .filter(hotel => 
            hotel.hotelName.toLowerCase().includes(hotelName.toLowerCase())
          );
      }
      
      return [];
    } catch (error) {
      console.error('ホテル名検索エラー:', error);
      return [];
    }
  }

  // 地域別検索
  async searchByArea(area: string): Promise<RakutenHotel[]> {
    try {
      const response = await this.searchHotels(area, 50);
      
      if (response.hotels) {
        return response.hotels.map(h => h.hotel[0].hotelBasicInfo);
      }
      
      return [];
    } catch (error) {
      console.error('地域検索エラー:', error);
      return [];
    }
  }

  // APIキーの状態確認
  getApiStatus(): { hasKey: boolean; keyPreview: string } {
    return {
      hasKey: !!RAKUTEN_API_KEY,
      keyPreview: RAKUTEN_API_KEY ? 
        `${RAKUTEN_API_KEY.substring(0, 8)}...` : 
        '未設定'
    };
  }
}

// インスタンス作成
export const rakutenTester = RakutenAPITester.getInstance();

// 使用例とテスト実行
export const runRakutenApiTests = async () => {
  console.log('🚀 楽天トラベルAPI接続テスト開始');
  
  // 1. API状態確認
  const status = rakutenTester.getApiStatus();
  console.log('📋 API状態:', status);
  
  // 2. 接続テスト
  const connectionTest = await rakutenTester.testConnection();
  console.log('🔗 接続テスト:', connectionTest);
  
  if (connectionTest.success) {
    // 3. 実際の検索テスト
    console.log('🏨 ホテル検索テスト開始...');
    
    const testQueries = ['リッツカールトン', '東横イン', 'ヒルトン'];
    for (const query of testQueries) {
      const results = await rakutenTester.searchByHotelName(query);
      console.log(`📍 "${query}" 検索結果: ${results.length}軒`);
      
      if (results.length > 0) {
        console.log(`   例: ${results[0].hotelName}`);
      }
    }
  }
  
  return connectionTest;
};