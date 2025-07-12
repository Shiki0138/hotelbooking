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
    
    // 日付パラメータの構築（複数のフォーマットをサポート）
    let googleDateParams = '';
    let bookingDateParams = '';
    let rakutenDateParams = '';
    
    if (checkinDate && checkoutDate) {
      // Google Hotels用の日付パラメータ（複数のフォーマットで試行）
      const checkin = new Date(checkinDate);
      const checkout = new Date(checkoutDate);
      const checkinStr = `${checkin.getFullYear()}-${String(checkin.getMonth() + 1).padStart(2, '0')}-${String(checkin.getDate()).padStart(2, '0')}`;
      const checkoutStr = `${checkout.getFullYear()}-${String(checkout.getMonth() + 1).padStart(2, '0')}-${String(checkout.getDate()).padStart(2, '0')}`;
      
      // Google Hotelsの複数パラメータフォーマット（複数形式で確実に渡す）
      googleDateParams = `&checkin_date=${checkinStr}&checkout_date=${checkoutStr}&checkin=${checkinStr}&checkout=${checkoutStr}&adults=2&children=0&rooms=1`;
      
      // Booking.comの日付フォーマット
      bookingDateParams = `&checkin=${checkinStr}&checkout=${checkoutStr}&group_adults=2&no_rooms=1&group_children=0`;
      
      // 楽天トラベル用の日付フォーマット
      const checkinFormatted = checkinStr.replace(/-/g, '');
      const checkoutFormatted = checkoutStr.replace(/-/g, '');
      rakutenDateParams = `&f_checkin=${checkinFormatted}&f_checkout=${checkoutFormatted}&f_otona_su=2&f_s1=0&f_s2=0&f_y1=0&f_y2=0&f_y3=0&f_y4=0`;
    }
    
    // 各予約サイトのURL生成（日付パラメータ付き）
    const urls: BookingUrls = {
      // Google Hotels（メイン） - 日付パラメータを優先（内部パラメータを削除）
      primary: `https://www.google.com/travel/hotels/search?q=${searchQuery}+${locationQuery}${googleDateParams}&hl=ja&gl=jp`,
      
      // Booking.com（セカンダリ） - 詳細な日付・人数パラメータ付き
      secondary: checkinDate && checkoutDate 
        ? `https://www.booking.com/searchresults.ja.html?ss=${searchQuery}+${locationQuery}${bookingDateParams}&lang=ja&sb=1&src=index&ac_position=0&ac_click_type=b&dest_type=hotel`
        : `https://www.booking.com/search.html?ss=${searchQuery}+${locationQuery}&lang=ja`,
      
      // 楽天トラベル（フォールバック） - 日付・人数パラメータ付き
      fallback: checkinDate && checkoutDate
        ? `https://travel.rakuten.co.jp/hotel/search?keyword=${searchQuery}${rakutenDateParams}`
        : `https://travel.rakuten.co.jp/hotel/search?keyword=${searchQuery}`
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
  
  // 日付付きの直接ホテルページURLを生成
  static getDirectHotelUrl(hotel: any, checkinDate?: string, checkoutDate?: string): string {
    const rakutenId = this.guessRakutenId(hotel.name);
    
    if (rakutenId && checkinDate && checkoutDate) {
      const checkin = new Date(checkinDate);
      const checkout = new Date(checkoutDate);
      const checkinFormatted = `${checkin.getFullYear()}${String(checkin.getMonth() + 1).padStart(2, '0')}${String(checkin.getDate()).padStart(2, '0')}`;
      const checkoutFormatted = `${checkout.getFullYear()}${String(checkout.getMonth() + 1).padStart(2, '0')}${String(checkout.getDate()).padStart(2, '0')}`;
      
      return `https://travel.rakuten.co.jp/HOTEL/${rakutenId}/?f_checkin=${checkinFormatted}&f_checkout=${checkoutFormatted}&f_otona_su=2`;
    }
    
    // フォールバック: Google Hotels
    return this.getBookingUrl(hotel, checkinDate, checkoutDate).then(urls => urls.primary);
  }
  
  // ホテル名から楽天IDを推測（拡張版）
  static guessRakutenId(hotelName: string): string | null {
    // 既知のホテルマッピング（大幅拡張）
    const knownHotels: Record<string, string> = {
      'ザ・リッツ・カールトン東京': '74944',
      'ザ・ブセナテラス': '40391', 
      'マンダリン オリエンタル 東京': '67648',
      'ハレクラニ沖縄': '168223',
      'ザ・リッツ・カールトン大阪': '168',
      'ザ・リッツ・カールトン京都': '151956',
      'ザ・ペニンシュラ東京': '13834',
      'パーク ハイアット 東京': '10330',
      'コンラッド東京': '8451',
      'アマン東京': '121103',
      '帝国ホテル東京': '6166',
      'ホテルオークラ東京': '6399',
      'パレスホテル東京': '88366'
    };
    
    return knownHotels[hotelName] || null;
  }

  // デバッグ用: 生成されたURLをログ出力
  static debugUrls(hotel: any, checkinDate?: string, checkoutDate?: string): void {
    this.getBookingUrl(hotel, checkinDate, checkoutDate).then(urls => {
      console.log('🔗 生成されたURL一覧:');
      console.log('Google Hotels:', urls.primary);
      console.log('Booking.com:', urls.secondary);
      console.log('楽天トラベル:', urls.fallback);
      console.log('日付情報:', { checkinDate, checkoutDate });
    });
  }
}

export default HotelBookingService;