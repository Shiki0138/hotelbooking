// ホテルの詳細情報データベース
export interface HotelDetail {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  category: 'luxury' | 'premium' | 'business';
  
  // 楽天トラベル情報
  rakuten: {
    hotelId: string;
    directUrl: string;
    searchKeyword: string;
  };
  
  // 公式サイト情報
  official: {
    url: string;
    bookingUrl?: string;
  };
  
  // その他の予約サイト
  otherSites: {
    agoda?: {
      hotelId: string;
      url: string;
    };
    booking?: {
      hotelId: string;
      url: string;
    };
    expedia?: {
      hotelId: string;
      url: string;
    };
    hotels?: {
      hotelId: string;
      url: string;
    };
  };
  
  // 基本情報
  location: {
    address: string;
    city: string;
    prefecture: string;
    latitude: number;
    longitude: number;
    nearestStation?: string;
    access: string;
  };
  
  // 評価情報
  ratings: {
    average: number;
    count: number;
    source: string;
  };
  
  // 価格情報
  pricing: {
    averagePrice: number;
    minPrice: number;
    currency: 'JPY';
  };
  
  // 画像
  images: {
    main: string;
    thumbnail: string;
    gallery: string[];
  };
  
  // 設備・サービス
  amenities: string[];
  features: string[];
}

export const HOTEL_DATABASE: Record<string, HotelDetail> = {
  'ritz-carlton-tokyo': {
    id: 'ritz-carlton-tokyo',
    name: 'ザ・リッツ・カールトン東京',
    nameEn: 'The Ritz-Carlton, Tokyo',
    description: '東京ミッドタウンの最上層階に位置し、東京の絶景を一望できる5つ星ラグジュアリーホテル',
    category: 'luxury',
    
    rakuten: {
      hotelId: '74944',
      directUrl: 'https://hotel.travel.rakuten.co.jp/hotelinfo/plan/detail/74944',
      searchKeyword: 'リッツカールトン東京'
    },
    
    official: {
      url: 'https://www.ritzcarlton.com/jp/hotels/japan/tokyo',
      bookingUrl: 'https://www.ritzcarlton.com/jp/hotels/japan/tokyo/rooms-and-suites'
    },
    
    otherSites: {
      agoda: {
        hotelId: '66056',
        url: 'https://www.agoda.com/the-ritz-carlton-tokyo/hotel/tokyo-jp.html'
      },
      booking: {
        hotelId: '238833',
        url: 'https://www.booking.com/hotel/jp/the-ritz-carlton-tokyo.html'
      },
      expedia: {
        hotelId: '1130030',
        url: 'https://www.expedia.co.jp/Tokyo-Hotels-The-Ritz-Carlton-Tokyo.h1130030.Hotel-Information'
      }
    },
    
    location: {
      address: '東京都港区赤坂9-7-1 東京ミッドタウンタワー',
      city: '港区',
      prefecture: '東京都',
      latitude: 35.6654,
      longitude: 139.7307,
      nearestStation: '六本木駅',
      access: '地下鉄日比谷線・大江戸線「六本木」駅直結'
    },
    
    ratings: {
      average: 4.8,
      count: 2856,
      source: 'aggregate'
    },
    
    pricing: {
      averagePrice: 75000,
      minPrice: 65000,
      currency: 'JPY'
    },
    
    images: {
      main: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&h=800&fit=crop',
      thumbnail: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=300&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&h=800&fit=crop'
      ]
    },
    
    amenities: ['スパ', 'フィットネスセンター', 'プール', 'レストラン', 'バー', 'ラウンジ'],
    features: ['東京タワービュー', '富士山ビュー', 'クラブラウンジ', 'ミシュラン星付きレストラン']
  },
  
  'park-hyatt-tokyo': {
    id: 'park-hyatt-tokyo',
    name: 'パーク ハイアット 東京',
    nameEn: 'Park Hyatt Tokyo',
    description: '新宿の高層ビル最上階に位置する、洗練されたデザインと卓越したサービスを誇るラグジュアリーホテル',
    category: 'luxury',
    
    rakuten: {
      hotelId: '1217',
      directUrl: 'https://hotel.travel.rakuten.co.jp/hotelinfo/plan/1217',
      searchKeyword: 'パークハイアット東京'
    },
    
    official: {
      url: 'https://www.hyatt.com/ja-JP/hotel/japan/park-hyatt-tokyo/tyoph',
      bookingUrl: 'https://www.hyatt.com/ja-JP/hotel/japan/park-hyatt-tokyo/tyoph/rooms'
    },
    
    otherSites: {
      agoda: {
        hotelId: '5356',
        url: 'https://www.agoda.com/park-hyatt-tokyo/hotel/tokyo-jp.html'
      },
      booking: {
        hotelId: '45168',
        url: 'https://www.booking.com/hotel/jp/park-hyatt-tokyo.html'
      },
      hotels: {
        hotelId: '106348',
        url: 'https://jp.hotels.com/ho106348/paku-haiatto-dong-jing-dong-jing-ri-ben/'
      }
    },
    
    location: {
      address: '東京都新宿区西新宿3-7-1-2',
      city: '新宿区',
      prefecture: '東京都',
      latitude: 35.6854,
      longitude: 139.6908,
      nearestStation: '新宿駅',
      access: 'JR「新宿」駅南口から徒歩12分、都営大江戸線「都庁前」駅から徒歩8分'
    },
    
    ratings: {
      average: 4.7,
      count: 1890,
      source: 'aggregate'
    },
    
    pricing: {
      averagePrice: 55000,
      minPrice: 48000,
      currency: 'JPY'
    },
    
    images: {
      main: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop',
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=1200&h=800&fit=crop'
      ]
    },
    
    amenities: ['スパ', 'フィットネスセンター', 'プール', 'レストラン', 'バー', 'ライブラリー'],
    features: ['ニューヨークグリル', 'ピークラウンジ', '47階からの眺望', 'アートコレクション']
  },
  
  'mandarin-oriental-tokyo': {
    id: 'mandarin-oriental-tokyo',
    name: 'マンダリン オリエンタル 東京',
    nameEn: 'Mandarin Oriental, Tokyo',
    description: '日本橋の歴史的エリアに位置し、東京スカイラインの壮大な眺めを誇る5つ星ホテル',
    category: 'luxury',
    
    rakuten: {
      hotelId: '67648',
      directUrl: 'https://hotel.travel.rakuten.co.jp/hotelinfo/plan/67648',
      searchKeyword: 'マンダリンオリエンタル東京'
    },
    
    official: {
      url: 'https://www.mandarinoriental.co.jp/tokyo/',
      bookingUrl: 'https://www.mandarinoriental.com/tokyo/nihonbashi/luxury-hotel/booking'
    },
    
    otherSites: {
      agoda: {
        hotelId: '59588',
        url: 'https://www.agoda.com/mandarin-oriental-tokyo/hotel/tokyo-jp.html'
      },
      booking: {
        hotelId: '256178',
        url: 'https://www.booking.com/hotel/jp/mandarin-oriental-tokyo.html'
      }
    },
    
    location: {
      address: '東京都中央区日本橋室町2-1-1',
      city: '中央区',
      prefecture: '東京都',
      latitude: 35.6864,
      longitude: 139.7733,
      nearestStation: '三越前駅',
      access: '地下鉄銀座線・半蔵門線「三越前」駅直結'
    },
    
    ratings: {
      average: 4.9,
      count: 3210,
      source: 'aggregate'
    },
    
    pricing: {
      averagePrice: 80000,
      minPrice: 72000,
      currency: 'JPY'
    },
    
    images: {
      main: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=1200&h=800&fit=crop',
      thumbnail: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=400&h=300&fit=crop',
      gallery: []
    },
    
    amenities: ['スパ', 'フィットネスセンター', 'レストラン', 'バー', 'ウェディング施設'],
    features: ['ミシュラン星付きレストラン', '38階スパ', '東京スカイツリービュー', '皇居ビュー']
  },
  
  'busena-terrace': {
    id: 'busena-terrace',
    name: 'ザ・ブセナテラス',
    nameEn: 'The Busena Terrace',
    description: '沖縄本島北部の美しい部瀬名岬に位置する、国内屈指のビーチリゾート',
    category: 'luxury',
    
    rakuten: {
      hotelId: '40391',
      directUrl: 'https://hotel.travel.rakuten.co.jp/hotelinfo/plan/40391',
      searchKeyword: 'ブセナテラス'
    },
    
    official: {
      url: 'https://www.terrace.co.jp/busena/',
      bookingUrl: 'https://www.terrace.co.jp/busena/stay/'
    },
    
    otherSites: {
      agoda: {
        hotelId: '65025',
        url: 'https://www.agoda.com/the-busena-terrace/hotel/okinawa-jp.html'
      },
      booking: {
        hotelId: '443811',
        url: 'https://www.booking.com/hotel/jp/the-busena-terrace.html'
      }
    },
    
    location: {
      address: '沖縄県名護市喜瀬1808',
      city: '名護市',
      prefecture: '沖縄県',
      latitude: 26.6943,
      longitude: 127.9777,
      nearestStation: '那覇空港',
      access: '那覇空港から車で約75分（高速道路利用）'
    },
    
    ratings: {
      average: 4.7,
      count: 1567,
      source: 'aggregate'
    },
    
    pricing: {
      averagePrice: 50000,
      minPrice: 42000,
      currency: 'JPY'
    },
    
    images: {
      main: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&h=800&fit=crop',
      thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop',
      gallery: []
    },
    
    amenities: ['ビーチ', 'プール', 'スパ', 'レストラン', 'マリンアクティビティ'],
    features: ['プライベートビーチ', '屋内外プール', 'バトラーサービス', 'サンセットビュー']
  },
  
  'halekulani-okinawa': {
    id: 'halekulani-okinawa',
    name: 'ハレクラニ沖縄',
    nameEn: 'Halekulani Okinawa',
    description: 'ハワイの名門ホテル「ハレクラニ」の世界観を沖縄で体現する極上のビーチリゾート',
    category: 'luxury',
    
    rakuten: {
      hotelId: '168223',
      directUrl: 'https://hotel.travel.rakuten.co.jp/hotelinfo/plan/168223',
      searchKeyword: 'ハレクラニ沖縄'
    },
    
    official: {
      url: 'https://www.okinawa.halekulani.com/',
      bookingUrl: 'https://www.okinawa.halekulani.com/stay/'
    },
    
    otherSites: {
      agoda: {
        hotelId: '5043709',
        url: 'https://www.agoda.com/halekulani-okinawa/hotel/okinawa-jp.html'
      },
      booking: {
        hotelId: '5099518',
        url: 'https://www.booking.com/hotel/jp/halekulani-okinawa.html'
      }
    },
    
    location: {
      address: '沖縄県国頭郡恩納村名嘉真1967-1',
      city: '恩納村',
      prefecture: '沖縄県',
      latitude: 26.5096,
      longitude: 127.8785,
      nearestStation: '那覇空港',
      access: '那覇空港から車で約75分'
    },
    
    ratings: {
      average: 4.8,
      count: 892,
      source: 'aggregate'
    },
    
    pricing: {
      averagePrice: 65000,
      minPrice: 55000,
      currency: 'JPY'
    },
    
    images: {
      main: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=1200&h=800&fit=crop',
      thumbnail: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=400&h=300&fit=crop',
      gallery: []
    },
    
    amenities: ['ビーチ', 'プール', 'スパ', 'レストラン', 'フィットネス'],
    features: ['全室オーシャンビュー', 'プライベートビーチ', '温泉', 'ハワイアンカルチャー']
  }
};