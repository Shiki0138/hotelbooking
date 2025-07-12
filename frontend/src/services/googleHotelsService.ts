// Google Hotels専用のURL生成サービス
// より確実な日付パラメータ設定を実現

export class GoogleHotelsService {
  // Google Hotels URLを生成（複数の方法で日付を確実に設定）
  static generateUrl(hotel: any, checkinDate: string, checkoutDate: string): string {
    const searchQuery = encodeURIComponent(hotel.name);
    const locationQuery = hotel.city ? encodeURIComponent(hotel.city) : '';
    
    // 日付をDateオブジェクトに変換
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    
    // 日付フォーマット
    const checkinStr = `${checkin.getFullYear()}-${String(checkin.getMonth() + 1).padStart(2, '0')}-${String(checkin.getDate()).padStart(2, '0')}`;
    const checkoutStr = `${checkout.getFullYear()}-${String(checkout.getMonth() + 1).padStart(2, '0')}-${String(checkout.getDate()).padStart(2, '0')}`;
    
    // 宿泊日数計算
    const nights = Math.round((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
    
    // 方法1: 直接的なホテル検索URL（日付付き）
    const method1 = `https://www.google.com/travel/hotels/${encodeURIComponent(hotel.name)}?q=${searchQuery}&ts=CAESCgoCCAMKAggDEAAaIAoCGgASGhIUCgcI6A8QBxgVEgcI6A8QBxgWGAEyAhAAKg8KDQjsBRABGgNKUFkqABoA&qs=CAAgACgA&ap=MAA`;
    
    // 方法2: 検索URLに日付パラメータを埋め込む形式
    const dateParams = `d=${checkinStr}_${checkoutStr}&n=${nights}&s=2_0`;
    const method2 = `https://www.google.com/travel/hotels/search?q=${searchQuery}+${locationQuery}&${dateParams}&gl=jp&hl=ja`;
    
    // 方法3: 新しいフォーマット（内部パラメータ）
    const method3 = `https://www.google.com/travel/search?q=${searchQuery}&ts=CAESABpAEjoKBwjoDxAHGBUSBwjoDxAHGBYaBQoDCAEiGAoKMggyAAoEOgJKUBIKMggyAAoEOgJKUFkqCwoHKAE6A0pQWQ&qs=CAAgACgA&ap=MAA`;
    
    // 方法4: ハッシュパラメータを使用（最も確実）
    const hashParams = `#c:${checkinStr},${checkoutStr},${nights}:2:0,${checkinStr},${checkoutStr},${nights}:2:0`;
    const method4 = `https://www.google.com/travel/hotels/search?q=${searchQuery}+${locationQuery}${hashParams}`;
    
    // デバッグログ
    console.log('🗓️ Google Hotels URL生成:');
    console.log('ホテル名:', hotel.name);
    console.log('チェックイン:', checkinStr);
    console.log('チェックアウト:', checkoutStr);
    console.log('宿泊数:', nights, '泊');
    console.log('生成URL:', method4);
    
    // 最も確実な方法（方法4）を返す
    return method4;
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