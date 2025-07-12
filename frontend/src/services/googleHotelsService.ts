// Google Hotels専用のURL生成サービス
// より確実な日付パラメータ設定を実現

export class GoogleHotelsService {
  // Google Hotels tsパラメータ生成（内部エンコード形式）
  private static generateTsParameter(
    checkinYear: number,
    checkinMonth: number,
    checkinDay: number,
    checkoutYear: number,
    checkoutMonth: number,
    checkoutDay: number
  ): string {
    // Google Hotels特有のエンコード形式を生成
    // 例: CAESCgoCCAMKAggDEAAaIAoCGgASGhIUCgcI6A8QBxgMEgcI6A8QBxgNGAEyAhAAKg8KDQjsBRABGgNKUFk=
    
    // Base64エンコードされた日付パラメータを含む文字列を構築
    const checkinCode = `CgcI${this.encodeYear(checkinYear)}${this.encodeMonth(checkinMonth)}${this.encodeDay(checkinDay)}`;
    const checkoutCode = `EgcI${this.encodeYear(checkoutYear)}${this.encodeMonth(checkoutMonth)}${this.encodeDay(checkoutDay)}`;
    
    return `CAESCgoCCAMKAggDEAAaIAoCGgASGhIU${checkinCode}${checkoutCode}GAEyAhAAKg8KDQjsBRABGgNKUFk=`;
  }
  
  // 年をエンコード（Google内部形式）
  private static encodeYear(year: number): string {
    return (year - 2000).toString(16).padStart(2, '0').toUpperCase();
  }
  
  // 月をエンコード（Google内部形式）
  private static encodeMonth(month: number): string {
    return month.toString(16).padStart(2, '0').toUpperCase();
  }
  
  // 日をエンコード（Google内部形式）
  private static encodeDay(day: number): string {
    return day.toString(16).padStart(2, '0').toUpperCase();
  }
  
  // チェックイン・チェックアウト日付をエンコード
  private static encodeCheckinCheckout(checkin: string, checkout: string): string {
    // シンプルなBase64エンコードを使用
    const dateString = `${checkin}|${checkout}`;
    return btoa(dateString).replace(/=/g, '');
  }
  // Google Hotels URLを生成（複数の方法で日付を確実に設定）
  static generateUrl(hotel: any, checkinDate: string, checkoutDate: string): string {
    const searchQuery = encodeURIComponent(hotel.name);
    const locationQuery = hotel.city ? encodeURIComponent(hotel.city) : '';
    
    // 日付をDateオブジェクトに変換
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    
    // 年、月、日を取得（月は0ベースなので注意）
    const checkinYear = checkin.getFullYear();
    const checkinMonth = checkin.getMonth() + 1; // JavaScriptの月は0から始まるので+1
    const checkinDay = checkin.getDate();
    
    const checkoutYear = checkout.getFullYear();
    const checkoutMonth = checkout.getMonth() + 1;
    const checkoutDay = checkout.getDate();
    
    // 宿泊日数計算
    const nights = Math.round((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
    
    // より確実な方法: 直接的な日付パラメータを使用
    // Google Hotelsは以下のパラメータ形式を認識します
    const checkinFormatted = `${checkinYear}-${String(checkinMonth).padStart(2, '0')}-${String(checkinDay).padStart(2, '0')}`;
    const checkoutFormatted = `${checkoutYear}-${String(checkoutMonth).padStart(2, '0')}-${String(checkoutDay).padStart(2, '0')}`;
    
    // Google Hotels URLの構築（シンプルで確実な方法）
    // URLSearchParamsを使用して正確にパラメータを設定
    const params = new URLSearchParams({
      q: `${hotel.name} ${locationQuery}`,
      hl: 'ja',
      gl: 'jp',
      checkin: checkinFormatted,
      checkout: checkoutFormatted,
      guests: '2',
      rooms: '1'
    });
    
    const googleUrl = `https://www.google.com/travel/hotels/search?${params.toString()}`;
    
    // デバッグログ
    console.log('🗓️ Google Hotels URL生成（改善版）:');
    console.log('ホテル名:', hotel.name);
    console.log('チェックイン:', `${checkinYear}年${checkinMonth}月${checkinDay}日`);
    console.log('チェックアウト:', `${checkoutYear}年${checkoutMonth}月${checkoutDay}日`);
    console.log('宿泊数:', nights, '泊');
    console.log('生成URL:', googleUrl);
    
    return googleUrl;
  }
  
  // より高度なURL生成（ホテルIDがある場合）
  static generateDirectUrl(hotelId: string, checkinDate: string, checkoutDate: string): string {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    
    // Google Hotels内部フォーマット
    const checkinNum = Math.floor(checkin.getTime() / 1000);
    const checkoutNum = Math.floor(checkout.getTime() / 1000);
    
    return `https://www.google.com/travel/hotels/entity/${hotelId}?ts=${checkinNum}_${checkoutNum}&ap=MAA`;
  }
  
  // URLパラメータのデバッグ
  static debugUrl(url: string): void {
    console.log('🔍 Google Hotels URLデバッグ:');
    console.log('完全URL:', url);
    
    try {
      const urlObj = new URL(url);
      console.log('ベースURL:', urlObj.origin + urlObj.pathname);
      console.log('検索パラメータ:');
      urlObj.searchParams.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });
      
      if (urlObj.hash) {
        console.log('ハッシュパラメータ:', urlObj.hash);
        
        // ハッシュ内の日付パラメータを解析
        const hashMatch = urlObj.hash.match(/#c:(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2}),(\d+)/);
        if (hashMatch) {
          console.log('  チェックイン:', hashMatch[1]);
          console.log('  チェックアウト:', hashMatch[2]);
          console.log('  宿泊数:', hashMatch[3], '泊');
        }
      }
    } catch (error) {
      console.error('URL解析エラー:', error);
    }
  }
}

export default GoogleHotelsService;