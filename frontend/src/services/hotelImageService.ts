// ホテル画像取得サービス
// 複数のソースから実際のホテル画像を取得

export interface HotelImageData {
  thumbnail: string;
  gallery?: string[];
  source?: 'rakuten' | 'official' | 'unsplash' | 'cached';
}

export class HotelImageService {
  // キャッシュ
  private static imageCache = new Map<string, HotelImageData>();

  // ホテル名とIDのマッピング（拡張版）
  private static hotelNameToId: Record<string, string> = {
    // リッツ・カールトン
    'ザ・リッツ・カールトン東京': 'ritz_tokyo',
    'ザ・リッツ・カールトン大阪': 'ritz_osaka',
    'ザ・リッツ・カールトン京都': 'ritz_kyoto',
    'ザ・リッツ・カールトン日光': 'ritz_nikko',
    'ザ・リッツ・カールトン沖縄': 'ritz_okinawa',
    
    // マンダリン オリエンタル
    'マンダリン オリエンタル 東京': 'mandarin_tokyo',
    
    // アマン
    'アマン東京': 'aman_tokyo',
    'アマン京都': 'aman_kyoto',
    
    // フォーシーズンズ
    'フォーシーズンズホテル東京大手町': 'four_seasons_tokyo_otemachi',
    'フォーシーズンズホテル丸の内 東京': 'four_seasons_tokyo_marunouchi',
    'フォーシーズンズホテル京都': 'four_seasons_kyoto',
    
    // ペニンシュラ
    'ザ・ペニンシュラ東京': 'peninsula_tokyo',
    
    // パークハイアット
    'パーク ハイアット 東京': 'park_hyatt_tokyo',
    'パーク ハイアット 京都': 'park_hyatt_kyoto',
    'パーク ハイアット ニセコ HANAZONO': 'park_hyatt_niseko',
    
    // コンラッド
    'コンラッド東京': 'conrad_tokyo',
    'コンラッド大阪': 'conrad_osaka',
    
    // ブルガリ
    'ブルガリ ホテル 東京': 'bvlgari_tokyo',
    'ブルガリ ホテル 大阪': 'bvlgari_osaka',
    
    // セントレジス
    'セントレジスホテル大阪': 'st_regis_osaka',
    
    // W
    'W大阪': 'w_osaka',
    
    // エディション
    'エディション虎ノ門': 'edition_toranomon',
    '東京エディション虎ノ門': 'edition_toranomon',
    
    // 日本ブランド
    '帝国ホテル東京': 'imperial_tokyo',
    'ホテルオークラ東京': 'okura_tokyo',
    'The Okura Tokyo': 'okura_tokyo',
    'パレスホテル東京': 'palace_tokyo',
    'ザ・プリンスギャラリー 東京紀尾井町': 'prince_gallery_tokyo',
    
    // 星のや
    '星のや東京': 'hoshinoya_tokyo',
    '星のや京都': 'hoshinoya_kyoto',
    '星のや軽井沢': 'hoshinoya_karuizawa',
    '星のや富士': 'hoshinoya_fuji',
    '星のや沖縄': 'hoshinoya_okinawa',
    
    // リゾート
    'ザ・ブセナテラス': 'busena_terrace',
    'ハレクラニ沖縄': 'halekulani_okinawa',
    'イラフ SUI ラグジュアリーコレクションホテル 沖縄宮古': 'iraph_sui'
  };

  // 楽天トラベル画像API（実際の画像URL）
  private static rakutenImageUrls: Record<string, string> = {
    // 東京
    '74944': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=74944', // リッツ東京
    '67648': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=67648', // マンダリン東京
    '121103': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=121103', // アマン東京
    '13834': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=13834', // ペニンシュラ東京
    '10330': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=10330', // パークハイアット東京
    '8451': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=8451', // コンラッド東京
    '6166': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=6166', // 帝国ホテル
    '6399': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=6399', // オークラ
    '88366': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=88366', // パレスホテル
    
    // 大阪
    '168': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=168', // リッツ大阪
    '143994': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=143994', // コンラッド大阪
    '55318': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=55318', // セントレジス大阪
    '177598': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=177598', // W大阪
    
    // 京都
    '151956': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=151956', // リッツ京都
    '163088': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=163088', // アマン京都
    '163082': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=163082', // パークハイアット京都
    
    // 沖縄
    '40391': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=40391', // ブセナテラス
    '168223': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=168223', // ハレクラニ沖縄
    '91487': 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=91487' // リッツ沖縄
  };

  // ホテル画像を取得（複数ソースから）
  static async getHotelImage(hotel: any): Promise<HotelImageData> {
    // キャッシュチェック
    const cacheKey = hotel.id || hotel.name;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    let imageData: HotelImageData;

    // 1. ホテル名からIDを取得
    const hotelId = this.hotelNameToId[hotel.name] || hotel.id;

    // 2. 既存のrealHotelImagesから取得を試みる
    if (hotelId && typeof window !== 'undefined') {
      try {
        const { realHotelImages } = await import('../data/realHotelImages');
        if (realHotelImages[hotelId]) {
          imageData = {
            ...realHotelImages[hotelId],
            source: 'cached'
          };
          this.imageCache.set(cacheKey, imageData);
          return imageData;
        }
      } catch (error) {
        console.warn('Failed to load realHotelImages:', error);
      }
    }

    // 3. 楽天トラベルAPIから取得
    if (hotel.rakutenId && this.rakutenImageUrls[hotel.rakutenId]) {
      imageData = {
        thumbnail: this.rakutenImageUrls[hotel.rakutenId],
        source: 'rakuten'
      };
      this.imageCache.set(cacheKey, imageData);
      return imageData;
    }

    // 4. ホテル公式サイトの画像（既知のURL）
    const officialImages = this.getOfficialHotelImages(hotel.name);
    if (officialImages) {
      imageData = {
        ...officialImages,
        source: 'official'
      };
      this.imageCache.set(cacheKey, imageData);
      return imageData;
    }

    // 5. フォールバック：高品質なUnsplash画像
    imageData = {
      thumbnail: this.getUnsplashHotelImage(hotel),
      source: 'unsplash'
    };
    this.imageCache.set(cacheKey, imageData);
    return imageData;
  }

  // ホテル公式サイトの画像URL
  private static getOfficialHotelImages(hotelName: string): HotelImageData | null {
    const officialUrls: Record<string, HotelImageData> = {
      'ザ・リッツ・カールトン東京': {
        thumbnail: 'https://www.ritzcarlton.com/content/dam/the-ritz-carlton/hotels/asia-pacific/japan/tokyo/overview/RC_TYORZ_00090.jpg',
        gallery: [
          'https://www.ritzcarlton.com/content/dam/the-ritz-carlton/hotels/asia-pacific/japan/tokyo/guest-rooms/suites/RC_TYORZ_00055.jpg',
          'https://www.ritzcarlton.com/content/dam/the-ritz-carlton/hotels/asia-pacific/japan/tokyo/dining/RC_TYORZ_00127.jpg'
        ]
      },
      'マンダリン オリエンタル 東京': {
        thumbnail: 'https://photos.mandarinoriental.com/is/image/MandarinOriental/tokyo-hotel-exterior-01',
        gallery: [
          'https://photos.mandarinoriental.com/is/image/MandarinOriental/tokyo-suite-presidential-living-room',
          'https://photos.mandarinoriental.com/is/image/MandarinOriental/tokyo-spa-pool'
        ]
      }
    };

    return officialUrls[hotelName] || null;
  }

  // Unsplashから高品質なホテル画像を取得
  private static getUnsplashHotelImage(hotel: any): string {
    // ホテルタイプに応じた画像を選択
    const imageCategories = {
      luxury: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', // 高級ホテル外観
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80', // リゾートホテル
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80', // 高級ホテルロビー
        'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80', // モダンホテル
        'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800&q=80'  // 豪華な客室
      ],
      resort: [
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80', // ビーチリゾート
        'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80', // プール付きリゾート
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80', // トロピカルリゾート
        'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80'  // 山岳リゾート
      ],
      city: [
        'https://images.unsplash.com/photo-1498503403619-e39e4ff390fe?w=800&q=80', // シティホテル
        'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=800&q=80', // 都市の夜景
        'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80'  // モダンなロビー
      ]
    };

    // ホテルの特徴から適切なカテゴリを選択
    let category = 'luxury'; // デフォルト
    if (hotel.location?.includes('沖縄') || hotel.location?.includes('リゾート')) {
      category = 'resort';
    } else if (hotel.hotelClass === 'business' || hotel.location?.includes('駅')) {
      category = 'city';
    }

    // ランダムに画像を選択（ただし、同じホテルには常に同じ画像を返す）
    const images = imageCategories[category as keyof typeof imageCategories];
    const index = hotel.name.charCodeAt(0) % images.length;
    return images[index];
  }

  // 画像のプリロード
  static preloadImages(hotels: any[]): void {
    hotels.forEach(hotel => {
      this.getHotelImage(hotel).then(imageData => {
        if (imageData.thumbnail) {
          const img = new Image();
          img.src = imageData.thumbnail;
        }
      });
    });
  }
}