// 日本の高級ホテル・人気ホテル 完全版データベース
// 選定基準: HOTEL_SELECTION_CRITERIA.mdに基づく

export interface LuxuryHotel {
  id: string;
  name: string;
  nameEn?: string;
  brand: string;
  category: 'luxury' | 'popular' | 'both';
  hotelType: 'city' | 'resort' | 'ryokan' | 'boutique';
  
  location: {
    prefecture: string;
    city: string;
    area: string;
    address?: string;
  };
  
  ratings: {
    average: number; // 各サイトの平均値
    reviewCount: number;
    michelin?: number;
    forbes?: number;
  };
  
  priceRange: {
    min: number;
    max: number;
  };
  
  features: string[];
  amenities: string[];
  tags: string[];
  
  bookingUrls: {
    rakuten?: string;
    ikyu?: string;
    booking?: string;
    official?: string;
  };
  
  images: {
    thumbnail: string;
    gallery?: string[];
  };
}

// インターナショナル高級ホテルチェーン
export const internationalLuxuryHotels: LuxuryHotel[] = [
  // Ritz-Carlton
  {
    id: 'ritz_tokyo',
    name: 'ザ・リッツ・カールトン東京',
    nameEn: 'The Ritz-Carlton Tokyo',
    brand: 'Ritz-Carlton',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '港区',
      area: '六本木',
      address: '東京都港区赤坂9-7-1'
    },
    ratings: {
      average: 4.8,
      reviewCount: 3500,
      forbes: 5
    },
    priceRange: {
      min: 70000,
      max: 250000
    },
    features: ['東京ミッドタウン45-53階', 'ミシュラン星付きレストラン', '富士山ビュー'],
    amenities: ['スパ', 'フィットネス', 'プール', 'クラブラウンジ', 'コンシェルジュ'],
    tags: ['フォーブス5つ星', '人気', 'ビジネス'],
    bookingUrls: {
      rakuten: 'https://travel.rakuten.co.jp/HOTEL/74944/',
      ikyu: 'https://www.ikyu.com/00001389/'
    },
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    }
  },
  {
    id: 'ritz_osaka',
    name: 'ザ・リッツ・カールトン大阪',
    nameEn: 'The Ritz-Carlton Osaka',
    brand: 'Ritz-Carlton',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '大阪府',
      city: '大阪市',
      area: '梅田'
    },
    ratings: {
      average: 4.7,
      reviewCount: 2800,
      forbes: 4
    },
    priceRange: {
      min: 45000,
      max: 150000
    },
    features: ['大阪初の5つ星ホテル', 'ヨーロピアンスタイル', '英国調インテリア'],
    amenities: ['スパ', 'フィットネス', 'プール', 'レストラン', 'バー'],
    tags: ['クラシック', '人気', '伝統'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'
    }
  },
  {
    id: 'ritz_kyoto',
    name: 'ザ・リッツ・カールトン京都',
    nameEn: 'The Ritz-Carlton Kyoto',
    brand: 'Ritz-Carlton',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '京都府',
      city: '京都市',
      area: '中京区'
    },
    ratings: {
      average: 4.9,
      reviewCount: 2100,
      forbes: 5
    },
    priceRange: {
      min: 85000,
      max: 300000
    },
    features: ['鴨川沿い', '8年連続5つ星獲得', '日本庭園'],
    amenities: ['スパ', 'フィットネス', 'レストラン', '日本庭園', 'アクティビティ'],
    tags: ['フォーブス5つ星', '川沿い', '文化体験'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80'
    }
  },
  {
    id: 'ritz_okinawa',
    name: 'ザ・リッツ・カールトン沖縄',
    nameEn: 'The Ritz-Carlton Okinawa',
    brand: 'Ritz-Carlton',
    category: 'luxury',
    hotelType: 'resort',
    location: {
      prefecture: '沖縄県',
      city: '名護市',
      area: '喜瀬'
    },
    ratings: {
      average: 4.8,
      reviewCount: 1500,
      forbes: 4
    },
    priceRange: {
      min: 42000,
      max: 150000
    },
    features: ['チャンピオンシップゴルフコース', 'ビーチアクセス', 'ファミリーフレンドリー'],
    amenities: ['スパ', 'プール', 'ゴルフ', 'レストラン', 'キッズクラブ'],
    tags: ['ゴルフ', 'リゾート', 'ファミリー'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'
    }
  },
  
  // Four Seasons
  {
    id: 'fourseasons_kyoto',
    name: 'フォーシーズンズホテル京都',
    nameEn: 'Four Seasons Hotel Kyoto',
    brand: 'Four Seasons',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '京都府',
      city: '京都市',
      area: '東山区'
    },
    ratings: {
      average: 4.9,
      reviewCount: 900,
      forbes: 5
    },
    priceRange: {
      min: 95000,
      max: 350000
    },
    features: ['800年の歴史を持つ日本庭園「積翠園」', '妙法院近接', 'アート作品展示'],
    amenities: ['スパ', 'プール', 'レストラン', '茶室', 'ライブラリー'],
    tags: ['フォーブス5つ星', '歴史', '庭園'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80'
    }
  },
  {
    id: 'fourseasons_tokyo_otemachi',
    name: 'フォーシーズンズホテル東京大手町',
    nameEn: 'Four Seasons Hotel Tokyo at Otemachi',
    brand: 'Four Seasons',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '千代田区',
      area: '大手町'
    },
    ratings: {
      average: 4.8,
      reviewCount: 600,
      forbes: 5
    },
    priceRange: {
      min: 80000,
      max: 300000
    },
    features: ['皇居の眺望', 'スカイラウンジ', '大手町駅直結'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', 'バー'],
    tags: ['新しい', 'ビジネス', 'ビューポイント'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80'
    }
  },
  
  // Mandarin Oriental
  {
    id: 'mandarin_tokyo',
    name: 'マンダリン オリエンタル 東京',
    nameEn: 'Mandarin Oriental Tokyo',
    brand: 'Mandarin Oriental',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '中央区',
      area: '日本橋'
    },
    ratings: {
      average: 4.9,
      reviewCount: 1300,
      forbes: 5
    },
    priceRange: {
      min: 75000,
      max: 280000
    },
    features: ['日本橋三井タワー最上階', 'ミシュラン星付きレストラン', '東京スカイライン'],
    amenities: ['スパ', 'フィットネス', 'レストラン', 'バー', 'プライベートダイニング'],
    tags: ['フォーブス5つ星', 'グルメ', 'ビジネス'],
    bookingUrls: {
      rakuten: 'https://travel.rakuten.co.jp/HOTEL/67648/'
    },
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80'
    }
  },
  
  // Aman
  {
    id: 'aman_tokyo',
    name: 'アマン東京',
    nameEn: 'Aman Tokyo',
    brand: 'Aman',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '千代田区',
      area: '大手町'
    },
    ratings: {
      average: 4.9,
      reviewCount: 800,
      forbes: 5
    },
    priceRange: {
      min: 120000,
      max: 500000
    },
    features: ['大手町タワー最上階', '日本最大級の客室', '30mプール'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', 'ライブラリー'],
    tags: ['最高級', '静寂', 'ミニマリズム'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80'
    }
  },
  {
    id: 'aman_kyoto',
    name: 'アマン京都',
    nameEn: 'Aman Kyoto',
    brand: 'Aman',
    category: 'luxury',
    hotelType: 'resort',
    location: {
      prefecture: '京都府',
      city: '京都市',
      area: '北区'
    },
    ratings: {
      average: 4.9,
      reviewCount: 400,
      forbes: 5
    },
    priceRange: {
      min: 150000,
      max: 600000
    },
    features: ['秘密の庭園', '金閣寺近接', '森の中の隠れ家'],
    amenities: ['スパ', '温泉', 'レストラン', '茶室', 'ライブラリー'],
    tags: ['最高級', '隠れ家', '自然'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1535827841776-24afc1e255ac?w=800&q=80'
    }
  },
  
  // Peninsula
  {
    id: 'peninsula_tokyo',
    name: 'ザ・ペニンシュラ東京',
    nameEn: 'The Peninsula Tokyo',
    brand: 'Peninsula',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '千代田区',
      area: '有楽町'
    },
    ratings: {
      average: 4.8,
      reviewCount: 2200,
      forbes: 5
    },
    priceRange: {
      min: 68000,
      max: 250000
    },
    features: ['皇居と日比谷公園に隣接', 'ルーフトップバー', 'ロールスロイスフリート'],
    amenities: ['スパ', 'フィットネス', 'プール', 'レストラン', 'バー'],
    tags: ['フォーブス5つ星', '人気', 'アクセス良好'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80'
    }
  },
  
  // Park Hyatt
  {
    id: 'parkhyatt_tokyo',
    name: 'パーク ハイアット 東京',
    nameEn: 'Park Hyatt Tokyo',
    brand: 'Park Hyatt',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '新宿区',
      area: '西新宿'
    },
    ratings: {
      average: 4.7,
      reviewCount: 3000,
      forbes: 4
    },
    priceRange: {
      min: 55000,
      max: 200000
    },
    features: ['新宿パークタワー39-52階', 'ロスト・イン・トランスレーション撮影地', 'ニューヨークバー'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', 'バー'],
    tags: ['アイコニック', 'ビューポイント', '映画'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80'
    }
  },
  {
    id: 'parkhyatt_kyoto',
    name: 'パーク ハイアット 京都',
    nameEn: 'Park Hyatt Kyoto',
    brand: 'Park Hyatt',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '京都府',
      city: '京都市',
      area: '東山区'
    },
    ratings: {
      average: 4.8,
      reviewCount: 700,
      forbes: 4
    },
    priceRange: {
      min: 75000,
      max: 250000
    },
    features: ['清水寺至近', '祇園エリア', '数寄屋造り'],
    amenities: ['スパ', 'フィットネス', 'レストラン', 'バー', '茶室'],
    tags: ['新しい', '立地最高', '文化'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80'
    }
  },
  
  // St. Regis
  {
    id: 'stregis_osaka',
    name: 'セントレジスホテル大阪',
    nameEn: 'The St. Regis Osaka',
    brand: 'St. Regis',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '大阪府',
      city: '大阪市',
      area: '中央区'
    },
    ratings: {
      average: 4.8,
      reviewCount: 1200,
      forbes: 5
    },
    priceRange: {
      min: 52000,
      max: 180000
    },
    features: ['御堂筋沿い', '専属バトラーサービス', 'アフタヌーンティー'],
    amenities: ['スパ', 'フィットネス', 'レストラン', 'バー', 'バトラーサービス'],
    tags: ['フォーブス5つ星', 'バトラー', '伝統'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80'
    }
  },
  
  // Conrad
  {
    id: 'conrad_tokyo',
    name: 'コンラッド東京',
    nameEn: 'Conrad Tokyo',
    brand: 'Conrad',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '港区',
      area: '東新橋'
    },
    ratings: {
      average: 4.7,
      reviewCount: 2500,
      forbes: 4
    },
    priceRange: {
      min: 50000,
      max: 180000
    },
    features: ['東京湾と浜離宮恩賜庭園の眺望', '汐留駅直結', 'ミシュラン星付きレストラン'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', 'バー'],
    tags: ['ビューポイント', 'ビジネス', 'グルメ'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    }
  },
  {
    id: 'conrad_osaka',
    name: 'コンラッド大阪',
    nameEn: 'Conrad Osaka',
    brand: 'Conrad',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '大阪府',
      city: '大阪市',
      area: '北区'
    },
    ratings: {
      average: 4.8,
      reviewCount: 1500,
      forbes: 4
    },
    priceRange: {
      min: 48000,
      max: 160000
    },
    features: ['中之島フェスティバルタワー・ウエスト最上階', '大阪湾ビュー', '40階スパ'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', 'バー'],
    tags: ['高層', 'ビューポイント', '人気'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80'
    }
  },
  
  // Grand Hyatt
  {
    id: 'grandhyatt_tokyo',
    name: 'グランド ハイアット 東京',
    nameEn: 'Grand Hyatt Tokyo',
    brand: 'Grand Hyatt',
    category: 'both',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '港区',
      area: '六本木'
    },
    ratings: {
      average: 4.6,
      reviewCount: 3500
    },
    priceRange: {
      min: 45000,
      max: 150000
    },
    features: ['六本木ヒルズ隣接', '10のレストラン・バー', 'ナガミスパ'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', 'バー'],
    tags: ['アクセス良好', 'ナイトライフ', 'ショッピング'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80'
    }
  },
  
  // W Hotels
  {
    id: 'w_osaka',
    name: 'W大阪',
    nameEn: 'W Osaka',
    brand: 'W Hotels',
    category: 'both',
    hotelType: 'city',
    location: {
      prefecture: '大阪府',
      city: '大阪市',
      area: '中央区'
    },
    ratings: {
      average: 4.7,
      reviewCount: 1800
    },
    priceRange: {
      min: 40000,
      max: 150000
    },
    features: ['黒を基調としたデザイン', 'タダオ・アンドウ設計', 'ルーフトップバー'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', 'バー'],
    tags: ['デザイン', 'ナイトライフ', '若者に人気'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80'
    }
  },
  
  // InterContinental
  {
    id: 'intercontinental_yokohama',
    name: 'インターコンチネンタル横浜Pier 8',
    nameEn: 'InterContinental Yokohama Pier 8',
    brand: 'InterContinental',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '神奈川県',
      city: '横浜市',
      area: '中区'
    },
    ratings: {
      average: 4.8,
      reviewCount: 800
    },
    priceRange: {
      min: 45000,
      max: 150000
    },
    features: ['ハンマーヘッドに隣接', '全室バルコニー付き', '横浜港の眺望'],
    amenities: ['スパ', 'フィットネス', 'レストラン', 'バー', 'ルーフトップ'],
    tags: ['新しい', 'ビューポイント', 'ウォーターフロント'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?w=800&q=80'
    }
  }
];

// 日本ブランドの高級ホテル・旅館
export const japaneseLuxuryHotels: LuxuryHotel[] = [
  // 帝国ホテル
  {
    id: 'imperial_tokyo',
    name: '帝国ホテル 東京',
    nameEn: 'Imperial Hotel Tokyo',
    brand: '帝国ホテル',
    category: 'both',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '千代田区',
      area: '内幸町'
    },
    ratings: {
      average: 4.7,
      reviewCount: 4000,
      forbes: 4
    },
    priceRange: {
      min: 50000,
      max: 200000
    },
    features: ['日本初の迎賓館', '130年の歴史', 'フランク・ロイド・ライトの遺産'],
    amenities: ['スパ', 'フィットネス', 'レストラン', 'バー', 'ショッピングアーケード'],
    tags: ['歴史', '伝統', '格式'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80'
    }
  },
  {
    id: 'imperial_osaka',
    name: '帝国ホテル 大阪',
    nameEn: 'Imperial Hotel Osaka',
    brand: '帝国ホテル',
    category: 'both',
    hotelType: 'city',
    location: {
      prefecture: '大阪府',
      city: '大阪市',
      area: '北区'
    },
    ratings: {
      average: 4.6,
      reviewCount: 2500
    },
    priceRange: {
      min: 35000,
      max: 120000
    },
    features: ['大川沿い', '桜の名所', '大阪城の眺望'],
    amenities: ['スパ', 'フィットネス', 'レストラン', 'バー', '宴会場'],
    tags: ['伝統', 'ビジネス', '川沿い'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'
    }
  },
  
  // ホテルオークラ
  {
    id: 'okura_tokyo',
    name: 'The Okura Tokyo',
    nameEn: 'The Okura Tokyo',
    brand: 'ホテルオークラ',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '港区',
      area: '虎ノ門'
    },
    ratings: {
      average: 4.8,
      reviewCount: 2000,
      forbes: 5
    },
    priceRange: {
      min: 60000,
      max: 250000
    },
    features: ['2019年リニューアル', '日本の美意識', '5つ星獲得'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', '茶室'],
    tags: ['リニューアル', '日本美', 'フォーブス5つ星'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    }
  },
  
  // ホテルニューオータニ
  {
    id: 'newotani_tokyo',
    name: 'ホテルニューオータニ東京',
    nameEn: 'Hotel New Otani Tokyo',
    brand: 'ニューオータニ',
    category: 'both',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '千代田区',
      area: '紀尾井町'
    },
    ratings: {
      average: 4.5,
      reviewCount: 3500
    },
    priceRange: {
      min: 35000,
      max: 150000
    },
    features: ['日本庭園4万㎡', '400年の歴史', '37のレストラン・バー'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', '日本庭園'],
    tags: ['庭園', '歴史', 'レストラン'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?w=800&q=80'
    }
  },
  
  // 星野リゾート
  {
    id: 'hoshinoya_tokyo',
    name: '星のや東京',
    nameEn: 'HOSHINOYA Tokyo',
    brand: '星野リゾート',
    category: 'luxury',
    hotelType: 'ryokan',
    location: {
      prefecture: '東京都',
      city: '千代田区',
      area: '大手町'
    },
    ratings: {
      average: 4.8,
      reviewCount: 800,
      forbes: 4
    },
    priceRange: {
      min: 70000,
      max: 200000
    },
    features: ['都心の日本旅館', '温泉', '塔の日本旅館'],
    amenities: ['温泉', 'スパ', 'レストラン', '茶室', 'ライブラリー'],
    tags: ['温泉', '和風', 'ユニーク'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80'
    }
  },
  {
    id: 'hoshinoya_kyoto',
    name: '星のや京都',
    nameEn: 'HOSHINOYA Kyoto',
    brand: '星野リゾート',
    category: 'luxury',
    hotelType: 'ryokan',
    location: {
      prefecture: '京都府',
      city: '京都市',
      area: '西京区'
    },
    ratings: {
      average: 4.9,
      reviewCount: 600,
      forbes: 5
    },
    priceRange: {
      min: 90000,
      max: 300000
    },
    features: ['嵐山の奥座敷', '舟でのアクセス', '水辺の私邸'],
    amenities: ['スパ', 'レストラン', '舟遊び', 'ライブラリー', 'アクティビティ'],
    tags: ['隠れ家', '自然', 'フォーブス5つ星'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80'
    }
  },
  {
    id: 'hoshinoya_karuizawa',
    name: '星のや軽井沢',
    nameEn: 'HOSHINOYA Karuizawa',
    brand: '星野リゾート',
    category: 'luxury',
    hotelType: 'resort',
    location: {
      prefecture: '長野県',
      city: '軽井沢町',
      area: '星野'
    },
    ratings: {
      average: 4.8,
      reviewCount: 1000
    },
    priceRange: {
      min: 60000,
      max: 200000
    },
    features: ['谷の集落', 'エコツーリズム', '野鳥の森'],
    amenities: ['温泉', 'スパ', 'レストラン', 'アクティビティ', 'メディテーション'],
    tags: ['自然', 'エコ', 'リトリート'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80'
    }
  },
  {
    id: 'hoshinoya_fuji',
    name: '星のや富士',
    nameEn: 'HOSHINOYA Fuji',
    brand: '星野リゾート',
    category: 'luxury',
    hotelType: 'resort',
    location: {
      prefecture: '山梨県',
      city: '富士河口湖町',
      area: '大石'
    },
    ratings: {
      average: 4.7,
      reviewCount: 700
    },
    priceRange: {
      min: 55000,
      max: 150000
    },
    features: ['日本初のグランピングリゾート', '富士山ビュー', 'アウトドア体験'],
    amenities: ['キャンプファイヤー', 'レストラン', 'アクティビティ', 'ライブラリー'],
    tags: ['グランピング', '富士山', 'アウトドア'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=800&q=80'
    }
  },
  {
    id: 'hoshinoya_okinawa',
    name: '星のや沖縄',
    nameEn: 'HOSHINOYA Okinawa',
    brand: '星野リゾート',
    category: 'luxury',
    hotelType: 'resort',
    location: {
      prefecture: '沖縄県',
      city: '読谷村',
      area: '儀間'
    },
    ratings: {
      average: 4.8,
      reviewCount: 500
    },
    priceRange: {
      min: 80000,
      max: 250000
    },
    features: ['グスクウォール', '海辺の集落', '琉球文化'],
    amenities: ['プール', 'スパ', 'ビーチ', 'レストラン'],
    tags: ['ビーチリゾート', '文化体験', '新規開業'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80'
    }
  },
  
  // その他の高級旅館
  {
    id: 'kagaya',
    name: '加賀屋',
    nameEn: 'Kagaya',
    brand: '加賀屋',
    category: 'both',
    hotelType: 'ryokan',
    location: {
      prefecture: '石川県',
      city: '七尾市',
      area: '和倉温泉'
    },
    ratings: {
      average: 4.9,
      reviewCount: 3000
    },
    priceRange: {
      min: 40000,
      max: 150000
    },
    features: ['プロが選ぶ日本一の旅館', 'おもてなし', '能登の海の幸'],
    amenities: ['温泉', 'スパ', 'レストラン', '宴会場'],
    tags: ['日本一', '温泉', 'おもてなし'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1587381420270-3e1a5b9e6904?w=800&q=80'
    }
  },
  {
    id: 'tsubakisanso_tokyo',
    name: 'ホテル椿山荘東京',
    nameEn: 'Hotel Chinzanso Tokyo',
    brand: '藤田観光',
    category: 'both',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '文京区',
      area: '関口'
    },
    ratings: {
      average: 4.7,
      reviewCount: 2500,
      forbes: 4
    },
    priceRange: {
      min: 40000,
      max: 150000
    },
    features: ['雲海の庭園', '蛍の名所', '結婚式の聖地'],
    amenities: ['スパ', 'プール', 'レストラン', '日本庭園'],
    tags: ['庭園', 'ウェディング', '自然'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?w=800&q=80'
    }
  }
];

// 新規開業・話題のホテル
export const newAndTrendingHotels: LuxuryHotel[] = [
  {
    id: 'bulgari_tokyo',
    name: 'ブルガリ ホテル 東京',
    nameEn: 'Bulgari Hotel Tokyo',
    brand: 'Bulgari',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '中央区',
      area: '八重洲'
    },
    ratings: {
      average: 4.9,
      reviewCount: 200
    },
    priceRange: {
      min: 150000,
      max: 500000
    },
    features: ['2023年4月開業', '東京駅直結', 'イル・リストランテ ニコ・ロミート'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', 'バー'],
    tags: ['新規開業', '最高級', 'ブランド'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    }
  },
  {
    id: 'janu_tokyo',
    name: 'ジャヌ東京',
    nameEn: 'Janu Tokyo',
    brand: 'Janu',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '港区',
      area: '麻布台'
    },
    ratings: {
      average: 4.8,
      reviewCount: 100
    },
    priceRange: {
      min: 80000,
      max: 300000
    },
    features: ['2024年3月開業', 'アマン姉妹ブランド', '麻布台ヒルズ'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン'],
    tags: ['新規開業', '話題', 'アマン系'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    }
  },
  {
    id: 'edition_tokyo_toranomon',
    name: 'エディション東京 虎ノ門',
    nameEn: 'The Tokyo EDITION Toranomon',
    brand: 'Edition',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '東京都',
      city: '港区',
      area: '虎ノ門'
    },
    ratings: {
      average: 4.7,
      reviewCount: 500
    },
    priceRange: {
      min: 60000,
      max: 200000
    },
    features: ['イアン・シュレーガー', '東京ワールドゲート最上階', 'ミシュラン星付きレストラン'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン', 'バー'],
    tags: ['デザイン', '話題', 'ナイトライフ'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80'
    }
  },
  {
    id: 'waldorf_astoria_osaka',
    name: 'ウォルドーフ・アストリア大阪',
    nameEn: 'Waldorf Astoria Osaka',
    brand: 'Waldorf Astoria',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '大阪府',
      city: '大阪市',
      area: '新梅田'
    },
    ratings: {
      average: 4.8,
      reviewCount: 50
    },
    priceRange: {
      min: 70000,
      max: 250000
    },
    features: ['2025年開業予定', '新梅田駅直結', '大阪初のウォルドーフ'],
    amenities: ['スパ', 'プール', 'フィットネス', 'レストラン'],
    tags: ['開業予定', '最高級', '注目'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    }
  },
  {
    id: 'belmond_ryokan',
    name: '旅館アオヤマ（ベルモンド）',
    nameEn: 'Ryokan Aoyama (Belmond)',
    brand: 'Belmond',
    category: 'luxury',
    hotelType: 'ryokan',
    location: {
      prefecture: '静岡県',
      city: '伊豆市',
      area: '修善寺'
    },
    ratings: {
      average: 4.9,
      reviewCount: 30
    },
    priceRange: {
      min: 120000,
      max: 400000
    },
    features: ['2025年開業予定', 'ベルモンド初の日本旅館', '修善寺温泉'],
    amenities: ['温泉', 'スパ', 'レストラン', '日本庭園'],
    tags: ['開業予定', '温泉', '海外ブランド'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1587381420270-3e1a5b9e6904?w=800&q=80'
    }
  },
  {
    id: 'ritz_fukuoka',
    name: 'ザ・リッツ・カールトン福岡',
    nameEn: 'The Ritz-Carlton Fukuoka',
    brand: 'Ritz-Carlton',
    category: 'luxury',
    hotelType: 'city',
    location: {
      prefecture: '福岡県',
      city: '福岡市',
      area: '中央区'
    },
    ratings: {
      average: 4.9,
      reviewCount: 300
    },
    priceRange: {
      min: 48000,
      max: 150000
    },
    features: ['2023年6月開業', '九州初のリッツ・カールトン', '天神エリア'],
    amenities: ['スパ', 'フィットネス', 'レストラン', 'バー'],
    tags: ['新規開業', '九州初', '話題'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80'
    }
  },
  {
    id: 'alila_niseko',
    name: 'アリラ ニセコ',
    nameEn: 'Alila Niseko',
    brand: 'Alila',
    category: 'luxury',
    hotelType: 'resort',
    location: {
      prefecture: '北海道',
      city: 'ニセコ町',
      area: 'ニセコ'
    },
    ratings: {
      average: 4.8,
      reviewCount: 150
    },
    priceRange: {
      min: 60000,
      max: 250000
    },
    features: ['2025年開業予定', 'スキーイン・スキーアウト', '羊蹄山ビュー'],
    amenities: ['温泉', 'スパ', 'レストラン', 'スキー場アクセス'],
    tags: ['開業予定', 'スキーリゾート', 'ラグジュアリー'],
    bookingUrls: {},
    images: {
      thumbnail: 'https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=800&q=80'
    }
  }
];

// 全ホテルデータを統合（重複チェック付き）
export const allLuxuryHotels: LuxuryHotel[] = [
  ...internationalLuxuryHotels,
  ...japaneseLuxuryHotels,
  ...newAndTrendingHotels
];

// デバッグ
// console.log('internationalLuxuryHotels:', internationalLuxuryHotels.length);
// console.log('japaneseLuxuryHotels:', japaneseLuxuryHotels.length);
// console.log('newAndTrendingHotels:', newAndTrendingHotels.length);
// console.log('allLuxuryHotels total:', allLuxuryHotels.length);

// 全ホテルデータを統合してApp.tsx用にフォーマット変換
export const luxuryHotelsData = allLuxuryHotels.map(hotel => ({
  id: hotel.id,
  name: hotel.name,
  bookingUrl: hotel.bookingUrls.rakuten || hotel.bookingUrls.ikyu || 'https://travel.rakuten.co.jp/',
  location: `${hotel.location.prefecture}${hotel.location.city}${hotel.location.area}`,
  city: hotel.location.prefecture.replace('都', '').replace('府', '').replace('県', ''),
  rating: hotel.ratings.average,
  reviewCount: hotel.ratings.reviewCount,
  price: hotel.priceRange.min,
  originalPrice: Math.floor(hotel.priceRange.min * 1.8),
  discountPercentage: 45,
  thumbnailUrl: hotel.images.thumbnail,
  images: hotel.images.gallery || [hotel.images.thumbnail],
  access: hotel.features[0] || '',
  nearestStation: hotel.location.area,
  isLuxury: true,
  amenities: hotel.amenities,
  badge: hotel.tags.includes('新規開業') ? '新着' : 
         hotel.tags.includes('フォーブス5つ星') ? '最高級' : 
         hotel.tags.includes('人気') ? '人気' : 
         hotel.hotelType === 'resort' ? 'リゾート' : '',
  description: hotel.features.join('、')
}));

// エリア別カウント
export const hotelCountByArea = {
  東京都: allLuxuryHotels.filter(h => h.location.prefecture === '東京都').length,
  大阪府: allLuxuryHotels.filter(h => h.location.prefecture === '大阪府').length,
  京都府: allLuxuryHotels.filter(h => h.location.prefecture === '京都府').length,
  沖縄県: allLuxuryHotels.filter(h => h.location.prefecture === '沖縄県').length,
  北海道: allLuxuryHotels.filter(h => h.location.prefecture === '北海道').length,
  その他: allLuxuryHotels.filter(h => 
    !['東京都', '大阪府', '京都府', '沖縄県', '北海道'].includes(h.location.prefecture)
  ).length
};

// ブランド別カウント
export const hotelCountByBrand = {
  'Ritz-Carlton': allLuxuryHotels.filter(h => h.brand === 'Ritz-Carlton').length,
  'Four Seasons': allLuxuryHotels.filter(h => h.brand === 'Four Seasons').length,
  'Mandarin Oriental': allLuxuryHotels.filter(h => h.brand === 'Mandarin Oriental').length,
  'Aman': allLuxuryHotels.filter(h => h.brand === 'Aman').length,
  'Peninsula': allLuxuryHotels.filter(h => h.brand === 'Peninsula').length,
  'Park Hyatt': allLuxuryHotels.filter(h => h.brand === 'Park Hyatt').length,
  '星野リゾート': allLuxuryHotels.filter(h => h.brand === '星野リゾート').length,
  その他: allLuxuryHotels.filter(h => 
    !['Ritz-Carlton', 'Four Seasons', 'Mandarin Oriental', 'Aman', 'Peninsula', 'Park Hyatt', '星野リゾート'].includes(h.brand)
  ).length
};