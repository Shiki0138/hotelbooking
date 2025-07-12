// ホテル予約URL生成サービス
// フェーズ1: 検索ベースの実装（即座に動作）
// フェーズ2: API統合による最適化（今後実装）

interface BookingUrls {
  primary: string;
  secondary?: string;
  fallback: string;
}

export class HotelBookingService {
  // キャッシュ機能（ブラウザのlocalStorage使用）
  private static cache = new Map<string, string>();
  
  // ホテル予約URLを取得
  static async getBookingUrl(hotel: any, checkinDate?: string, checkoutDate?: string): Promise<BookingUrls> {
    const searchQuery = encodeURIComponent(hotel.name);
    const locationQuery = hotel.city ? encodeURIComponent(hotel.city) : '';
    
    // 日付パラメータの構築
    let dateParams = '';
    if (checkinDate && checkoutDate) {
      // Google Hotels用の日付パラメータ
      const checkin = new Date(checkinDate);
      const checkout = new Date(checkoutDate);
      dateParams = `&checkin=${checkin.getFullYear()}-${String(checkin.getMonth() + 1).padStart(2, '0')}-${String(checkin.getDate()).padStart(2, '0')}&checkout=${checkout.getFullYear()}-${String(checkout.getMonth() + 1).padStart(2, '0')}-${String(checkout.getDate()).padStart(2, '0')}`;
    }
    
    // 各予約サイトのURL生成
    const urls: BookingUrls = {
      // Google Hotels（メイン） - 日付付きで最も確実に動作
      primary: `https://www.google.com/travel/hotels/search?q=${searchQuery}+${locationQuery}${dateParams}&hl=ja&gl=jp`,
      
      // Booking.com（セカンダリ） - 日付付きで直接検索可能
      secondary: checkinDate && checkoutDate 
        ? `https://www.booking.com/search.html?ss=${searchQuery}+${locationQuery}&checkin=${checkinDate}&checkout=${checkoutDate}&lang=ja`
        : `https://www.booking.com/search.html?ss=${searchQuery}+${locationQuery}&lang=ja`,
      
      // 楽天トラベル（フォールバック）
      fallback: `https://travel.rakuten.co.jp/`
    };
    
    return urls;
  }
  
  // フェーズ2用: APIから最適なURLを取得（将来実装）
  private static async fetchOptimalUrl(hotel: any): Promise<string | null> {
    try {
      // TODO: Vercel Edge FunctionまたはSupabase Functionを呼び出し
      const response = await fetch('/api/hotel-booking-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName: hotel.name,
          location: hotel.location,
          city: hotel.city
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.url;
      }
    } catch (error) {
      console.error('API call failed, using fallback:', error);
    }
    
    return null;
  }
  
  // ホテル名から楽天IDを推測（暫定的な解決策）
  static guessRakutenId(hotelName: string): string | null {
    // 既知のホテルマッピング（随時追加）
    const knownHotels: Record<string, string> = {
      'ザ・リッツ・カールトン東京': '74944',
      'ザ・ブセナテラス': '40391',
      'マンダリン オリエンタル 東京': '67648',
      'ハレクラニ沖縄': '168223'
    };
    
    return knownHotels[hotelName] || null;
  }
}

export default HotelBookingService;