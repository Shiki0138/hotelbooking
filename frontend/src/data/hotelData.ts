// 日本の高級ホテルデータ
export const hotelData = [
  // 東京
  {
    id: 'rakuten_74944',
    name: 'ザ・リッツ・カールトン東京',
    bookingUrl: 'https://travel.rakuten.co.jp/HOTEL/74944/',
    location: '東京都港区赤坂',
    city: '東京',
    rating: 4.8,
    reviewCount: 2543,
    price: 70000,
    originalPrice: 130000,
    discountPercentage: 46,
    thumbnailUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80'
    ],
    access: '東京メトロ日比谷線六本木駅直結',
    nearestStation: '六本木駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', 'バー', 'クラブラウンジ'],
    badge: '人気',
    description: '東京ミッドタウン内、46階スパ、富士山ビュー'
  },
  {
    id: 'palace_tokyo',
    name: 'パレスホテル東京',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '東京都千代田区丸の内',
    city: '東京',
    rating: 4.9,
    reviewCount: 1876,
    price: 55000,
    originalPrice: 100000,
    discountPercentage: 45,
    thumbnailUrl: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80'
    ],
    access: '大手町駅地下通路直結',
    nearestStation: '大手町駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', '皇居ビュー'],
    badge: '最高級',
    description: '皇居外苑を望む最高のロケーション'
  },
  {
    id: 'aman_tokyo',
    name: 'アマン東京',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '東京都千代田区大手町',
    city: '東京',
    rating: 4.9,
    reviewCount: 987,
    price: 120000,
    originalPrice: 200000,
    discountPercentage: 40,
    thumbnailUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80',
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80'
    ],
    access: '大手町駅直結（大手町タワー33階）',
    nearestStation: '大手町駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', '30mプール', 'スパ', 'レストラン', 'ライブラリー'],
    badge: '最高級',
    description: '大手町タワー最上階、東京を一望'
  },
  {
    id: 'rakuten_67648',
    name: 'マンダリン オリエンタル 東京',
    bookingUrl: 'https://travel.rakuten.co.jp/HOTEL/67648/',
    location: '東京都中央区日本橋室町',
    city: '東京',
    rating: 4.9,
    reviewCount: 1234,
    price: 75000,
    originalPrice: 115000,
    discountPercentage: 35,
    thumbnailUrl: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80'
    ],
    access: '東京メトロ銀座線三越前駅直結',
    nearestStation: '三越前駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', 'ラウンジ'],
    badge: '人気',
    description: '37階スパ、ミシュラン星付きレストラン'
  },
  {
    id: 'peninsula_tokyo',
    name: 'ザ・ペニンシュラ東京',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '東京都千代田区有楽町',
    city: '東京',
    rating: 4.8,
    reviewCount: 2108,
    price: 68000,
    originalPrice: 120000,
    discountPercentage: 43,
    thumbnailUrl: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80',
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80'
    ],
    access: '日比谷駅地下通路直結',
    nearestStation: '日比谷駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', 'ルーフトップバー'],
    badge: '人気',
    description: '皇居と日比谷公園に隣接'
  },

  // 大阪
  {
    id: 'ritz_osaka',
    name: 'ザ・リッツ・カールトン大阪',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '大阪府大阪市北区梅田',
    city: '大阪',
    rating: 4.7,
    reviewCount: 1654,
    price: 45000,
    originalPrice: 80000,
    discountPercentage: 44,
    thumbnailUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80'
    ],
    access: '大阪駅・梅田駅徒歩5分',
    nearestStation: '梅田駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', 'バー'],
    badge: '人気',
    description: '大阪初の5つ星ホテル、ヨーロピアンスタイル'
  },
  {
    id: 'stregis_osaka',
    name: 'セントレジスホテル大阪',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '大阪府大阪市中央区本町',
    city: '大阪',
    rating: 4.8,
    reviewCount: 1123,
    price: 52000,
    originalPrice: 95000,
    discountPercentage: 45,
    thumbnailUrl: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
      'https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800&q=80'
    ],
    access: '本町駅直結',
    nearestStation: '本町駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', 'バトラーサービス'],
    badge: '新着',
    description: '御堂筋沿い、専属バトラーサービス'
  },
  {
    id: 'conrad_osaka',
    name: 'コンラッド大阪',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '大阪府大阪市北区中之島',
    city: '大阪',
    rating: 4.8,
    reviewCount: 1456,
    price: 48000,
    originalPrice: 85000,
    discountPercentage: 44,
    thumbnailUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80'
    ],
    access: '肥後橋駅・渡辺橋駅直結',
    nearestStation: '渡辺橋駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', '40階スパ', 'フィットネス', 'レストラン', '大阪湾ビュー'],
    badge: '人気',
    description: '中之島フェスティバルタワー・ウエスト最上階'
  },

  // 京都
  {
    id: 'ritz_kyoto',
    name: 'ザ・リッツ・カールトン京都',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '京都府京都市中京区鴨川二条大橋畔',
    city: '京都',
    rating: 4.9,
    reviewCount: 1987,
    price: 85000,
    originalPrice: 150000,
    discountPercentage: 43,
    thumbnailUrl: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
      'https://images.unsplash.com/photo-1545158535-c3f7168c28b6?w=800&q=80'
    ],
    access: '京都市役所前駅徒歩3分',
    nearestStation: '京都市役所前駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', '日本庭園', 'レストラン', '鴨川ビュー'],
    badge: '最高級',
    description: '鴨川沿い、8年連続5つ星獲得'
  },
  {
    id: 'fourseasons_kyoto',
    name: 'フォーシーズンズホテル京都',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '京都府京都市東山区妙法院前側町',
    city: '京都',
    rating: 4.9,
    reviewCount: 876,
    price: 95000,
    originalPrice: 180000,
    discountPercentage: 47,
    thumbnailUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
      'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800&q=80'
    ],
    access: '京都駅車15分',
    nearestStation: '東山駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', '積翠園（800年の歴史）', 'レストラン'],
    badge: '最高級',
    description: '800年の歴史を持つ日本庭園「積翠園」'
  },
  {
    id: 'mitsui_kyoto',
    name: 'HOTEL THE MITSUI KYOTO',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '京都府京都市中京区二条城前',
    city: '京都',
    rating: 4.8,
    reviewCount: 654,
    price: 72000,
    originalPrice: 130000,
    discountPercentage: 45,
    thumbnailUrl: 'https://images.unsplash.com/photo-1535827841776-24afc1e255ac?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1535827841776-24afc1e255ac?w=800&q=80',
      'https://images.unsplash.com/photo-1587381420270-3e1a5b9e6904?w=800&q=80'
    ],
    access: '二条城前駅徒歩3分',
    nearestStation: '二条城前駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', '温泉SPA', '日本庭園', 'レストラン'],
    badge: '新着',
    description: '二条城至近、天然温泉'
  },

  // 沖縄
  {
    id: 'rakuten_168223',
    name: 'ハレクラニ沖縄',
    bookingUrl: 'https://travel.rakuten.co.jp/HOTEL/168223/',
    location: '沖縄県国頭郡恩納村名嘉真',
    city: '沖縄',
    rating: 4.8,
    reviewCount: 987,
    price: 60000,
    originalPrice: 110000,
    discountPercentage: 45,
    thumbnailUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80'
    ],
    access: '那覇空港から車60分',
    nearestStation: '恩納村',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'プール', 'プライベートビーチ', 'スパ', 'キッズクラブ'],
    badge: '人気',
    description: '全室オーシャンビュー、沖縄初の5つ星'
  },
  {
    id: 'rakuten_40391',
    name: 'ザ・ブセナテラス',
    bookingUrl: 'https://travel.rakuten.co.jp/HOTEL/40391/',
    location: '沖縄県名護市喜瀬',
    city: '沖縄',
    rating: 4.7,
    reviewCount: 1876,
    price: 48000,
    originalPrice: 80000,
    discountPercentage: 40,
    thumbnailUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80'
    ],
    access: '那覇空港より車で約90分',
    nearestStation: '名護バスターミナル',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'プール', 'ビーチ', 'スパ', 'レストラン'],
    badge: 'リゾート',
    description: '美しいビーチと豊かな自然'
  },
  {
    id: 'ritz_okinawa',
    name: 'ザ・リッツ・カールトン沖縄',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '沖縄県名護市喜瀬',
    city: '沖縄',
    rating: 4.8,
    reviewCount: 1432,
    price: 42000,
    originalPrice: 75000,
    discountPercentage: 44,
    thumbnailUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80'
    ],
    access: '那覇空港から車75分',
    nearestStation: '名護',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'ゴルフコース', 'スパ', 'レストラン', 'プール'],
    badge: 'リゾート',
    description: 'チャンピオンシップゴルフコース併設'
  },

  // 北海道
  {
    id: 'windsor_toya',
    name: 'ザ・ウィンザーホテル洞爺',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '北海道虻田郡洞爺湖町清水',
    city: '北海道',
    rating: 4.7,
    reviewCount: 1123,
    price: 35000,
    originalPrice: 65000,
    discountPercentage: 46,
    thumbnailUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80'
    ],
    access: 'JR洞爺駅から車40分',
    nearestStation: '洞爺駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', '洞爺湖ビュー'],
    badge: '人気',
    description: '洞爺湖サミット会場、ミシュラン5つ星'
  },
  {
    id: 'ritz_niseko',
    name: '東山ニセコビレッジ・リッツカールトンリザーブ',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '北海道虻田郡ニセコ町東山温泉',
    city: '北海道',
    rating: 4.8,
    reviewCount: 765,
    price: 65000,
    originalPrice: 120000,
    discountPercentage: 46,
    thumbnailUrl: 'https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=800&q=80',
      'https://images.unsplash.com/photo-1548618771-6bfa7f8d8e65?w=800&q=80'
    ],
    access: 'JRニセコ駅から車10分',
    nearestStation: 'ニセコ駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スキー場直結', '温泉', 'レストラン', '羊蹄山ビュー'],
    badge: '新着',
    description: 'スキー場直結、天然温泉'
  },

  // その他都市
  {
    id: 'kahala_yokohama',
    name: 'ザ・カハラ・ホテル&リゾート横浜',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '神奈川県横浜市西区みなとみらい',
    city: '横浜',
    rating: 4.8,
    reviewCount: 543,
    price: 55000,
    originalPrice: 95000,
    discountPercentage: 42,
    thumbnailUrl: 'https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6?w=800&q=80',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80'
    ],
    access: 'みなとみらい駅徒歩8分',
    nearestStation: 'みなとみらい駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', '横浜港ビュー'],
    badge: '新着',
    description: 'ハワイの名門ホテルが横浜に'
  },
  {
    id: 'ritz_fukuoka',
    name: 'ザ・リッツ・カールトン福岡',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '福岡県福岡市中央区大名',
    city: '福岡',
    rating: 4.9,
    reviewCount: 234,
    price: 48000,
    originalPrice: 85000,
    discountPercentage: 44,
    thumbnailUrl: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    ],
    access: '天神駅徒歩5分',
    nearestStation: '天神駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', 'バー'],
    badge: '新着',
    description: '2023年6月開業、九州初のリッツ・カールトン'
  },
  {
    id: 'hyatt_fukuoka',
    name: 'グランド ハイアット 福岡',
    bookingUrl: 'https://travel.rakuten.co.jp/',
    location: '福岡県福岡市博多区住吉',
    city: '福岡',
    rating: 4.7,
    reviewCount: 1234,
    price: 32000,
    originalPrice: 60000,
    discountPercentage: 47,
    thumbnailUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
    ],
    access: '博多駅徒歩10分',
    nearestStation: '博多駅',
    isLuxury: true,
    amenities: ['WiFi', '駐車場', 'スパ', 'フィットネス', 'レストラン', 'クラブラウンジ'],
    badge: '人気',
    description: 'キャナルシティ博多隣接'
  }
];