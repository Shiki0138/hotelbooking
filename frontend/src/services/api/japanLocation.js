/**
 * 日本国内ホテル地域検索API
 * 都道府県、駅からの距離、観光地情報を管理
 */

// 日本の都道府県データ
export const PREFECTURES = [
  { code: '01', name: '北海道', region: '北海道', majorCities: ['札幌市', '函館市', '旭川市', '小樽市'] },
  { code: '02', name: '青森県', region: '東北', majorCities: ['青森市', '八戸市', '弘前市'] },
  { code: '03', name: '岩手県', region: '東北', majorCities: ['盛岡市', '花巻市', '一関市'] },
  { code: '04', name: '宮城県', region: '東北', majorCities: ['仙台市', '石巻市', '名取市'] },
  { code: '05', name: '秋田県', region: '東北', majorCities: ['秋田市', '横手市', '大仙市'] },
  { code: '06', name: '山形県', region: '東北', majorCities: ['山形市', '鶴岡市', '酒田市'] },
  { code: '07', name: '福島県', region: '東北', majorCities: ['福島市', '郡山市', 'いわき市'] },
  { code: '08', name: '茨城県', region: '関東', majorCities: ['水戸市', 'つくば市', '日立市'] },
  { code: '09', name: '栃木県', region: '関東', majorCities: ['宇都宮市', '小山市', '足利市'] },
  { code: '10', name: '群馬県', region: '関東', majorCities: ['前橋市', '高崎市', '太田市'] },
  { code: '11', name: '埼玉県', region: '関東', majorCities: ['さいたま市', '川口市', '川越市', '所沢市'] },
  { code: '12', name: '千葉県', region: '関東', majorCities: ['千葉市', '船橋市', '松戸市', '柏市'] },
  { code: '13', name: '東京都', region: '関東', majorCities: ['新宿区', '渋谷区', '港区', '中央区', '台東区'] },
  { code: '14', name: '神奈川県', region: '関東', majorCities: ['横浜市', '川崎市', '相模原市', '藤沢市'] },
  { code: '15', name: '新潟県', region: '中部', majorCities: ['新潟市', '長岡市', '上越市'] },
  { code: '16', name: '富山県', region: '中部', majorCities: ['富山市', '高岡市', '射水市'] },
  { code: '17', name: '石川県', region: '中部', majorCities: ['金沢市', '小松市', '白山市'] },
  { code: '18', name: '福井県', region: '中部', majorCities: ['福井市', '敦賀市', '鯖江市'] },
  { code: '19', name: '山梨県', region: '中部', majorCities: ['甲府市', '富士吉田市', '甲斐市'] },
  { code: '20', name: '長野県', region: '中部', majorCities: ['長野市', '松本市', '上田市'] },
  { code: '21', name: '岐阜県', region: '中部', majorCities: ['岐阜市', '大垣市', '高山市'] },
  { code: '22', name: '静岡県', region: '中部', majorCities: ['静岡市', '浜松市', '沼津市', '富士市'] },
  { code: '23', name: '愛知県', region: '中部', majorCities: ['名古屋市', '豊田市', '岡崎市', '一宮市'] },
  { code: '24', name: '三重県', region: '近畿', majorCities: ['津市', '四日市市', '鈴鹿市'] },
  { code: '25', name: '滋賀県', region: '近畿', majorCities: ['大津市', '草津市', '長浜市'] },
  { code: '26', name: '京都府', region: '近畿', majorCities: ['京都市', '宇治市', '亀岡市'] },
  { code: '27', name: '大阪府', region: '近畿', majorCities: ['大阪市', '堺市', '東大阪市', '枚方市'] },
  { code: '28', name: '兵庫県', region: '近畿', majorCities: ['神戸市', '姫路市', '西宮市', '尼崎市'] },
  { code: '29', name: '奈良県', region: '近畿', majorCities: ['奈良市', '橿原市', '生駒市'] },
  { code: '30', name: '和歌山県', region: '近畿', majorCities: ['和歌山市', '田辺市', '橋本市'] },
  { code: '31', name: '鳥取県', region: '中国', majorCities: ['鳥取市', '米子市', '倉吉市'] },
  { code: '32', name: '島根県', region: '中国', majorCities: ['松江市', '出雲市', '浜田市'] },
  { code: '33', name: '岡山県', region: '中国', majorCities: ['岡山市', '倉敷市', '津山市'] },
  { code: '34', name: '広島県', region: '中国', majorCities: ['広島市', '福山市', '呉市', '尾道市'] },
  { code: '35', name: '山口県', region: '中国', majorCities: ['山口市', '下関市', '宇部市'] },
  { code: '36', name: '徳島県', region: '四国', majorCities: ['徳島市', '鳴門市', '阿南市'] },
  { code: '37', name: '香川県', region: '四国', majorCities: ['高松市', '丸亀市', '坂出市'] },
  { code: '38', name: '愛媛県', region: '四国', majorCities: ['松山市', '今治市', '新居浜市'] },
  { code: '39', name: '高知県', region: '四国', majorCities: ['高知市', '南国市', '土佐市'] },
  { code: '40', name: '福岡県', region: '九州', majorCities: ['福岡市', '北九州市', '久留米市', '飯塚市'] },
  { code: '41', name: '佐賀県', region: '九州', majorCities: ['佐賀市', '唐津市', '鳥栖市'] },
  { code: '42', name: '長崎県', region: '九州', majorCities: ['長崎市', '佐世保市', '諫早市'] },
  { code: '43', name: '熊本県', region: '九州', majorCities: ['熊本市', '八代市', '天草市'] },
  { code: '44', name: '大分県', region: '九州', majorCities: ['大分市', '別府市', '中津市'] },
  { code: '45', name: '宮崎県', region: '九州', majorCities: ['宮崎市', '都城市', '延岡市'] },
  { code: '46', name: '鹿児島県', region: '九州', majorCities: ['鹿児島市', '霧島市', '鹿屋市'] },
  { code: '47', name: '沖縄県', region: '沖縄', majorCities: ['那覇市', '沖縄市', 'うるま市'] }
];

// 主要観光地データ
export const TOURIST_SPOTS = {
  '13': [ // 東京都
    { name: '東京スカイツリー', lat: 35.7101, lng: 139.8107, type: 'landmark' },
    { name: '浅草寺', lat: 35.7148, lng: 139.7967, type: 'temple' },
    { name: '東京タワー', lat: 35.6586, lng: 139.7454, type: 'landmark' },
    { name: '皇居', lat: 35.6852, lng: 139.7528, type: 'palace' },
    { name: '新宿御苑', lat: 35.6852, lng: 139.7100, type: 'park' }
  ],
  '26': [ // 京都府
    { name: '清水寺', lat: 34.9949, lng: 135.7850, type: 'temple' },
    { name: '金閣寺', lat: 35.0394, lng: 135.7292, type: 'temple' },
    { name: '伏見稲荷大社', lat: 34.9671, lng: 135.7727, type: 'shrine' },
    { name: '嵐山', lat: 35.0094, lng: 135.6774, type: 'nature' },
    { name: '二条城', lat: 35.0142, lng: 135.7481, type: 'castle' }
  ],
  '27': [ // 大阪府
    { name: '大阪城', lat: 34.6873, lng: 135.5262, type: 'castle' },
    { name: '道頓堀', lat: 34.6685, lng: 135.5027, type: 'entertainment' },
    { name: '通天閣', lat: 34.6525, lng: 135.5063, type: 'landmark' },
    { name: 'USJ', lat: 34.6657, lng: 135.4323, type: 'theme_park' }
  ],
  '01': [ // 北海道
    { name: '札幌時計台', lat: 43.0631, lng: 141.3539, type: 'landmark' },
    { name: '函館山', lat: 41.7599, lng: 140.7049, type: 'nature' },
    { name: '富良野', lat: 43.3420, lng: 142.3832, type: 'nature' },
    { name: '小樽運河', lat: 43.2005, lng: 140.9938, type: 'landmark' }
  ],
  '47': [ // 沖縄県
    { name: '首里城', lat: 26.2167, lng: 127.7194, type: 'castle' },
    { name: '美ら海水族館', lat: 26.6942, lng: 127.8781, type: 'aquarium' },
    { name: '国際通り', lat: 26.2134, lng: 127.6792, type: 'shopping' }
  ]
};

// 主要駅データ（サンプル）
export const MAJOR_STATIONS = {
  '13': [ // 東京都
    { name: '東京駅', lines: ['JR山手線', 'JR中央線', 'JR東海道新幹線'], lat: 35.6812, lng: 139.7671 },
    { name: '新宿駅', lines: ['JR山手線', 'JR中央線', '小田急線', '京王線'], lat: 35.6896, lng: 139.7006 },
    { name: '渋谷駅', lines: ['JR山手線', '東急東横線', '東京メトロ銀座線'], lat: 35.6580, lng: 139.7016 },
    { name: '池袋駅', lines: ['JR山手線', '東武東上線', '西武池袋線'], lat: 35.7295, lng: 139.7109 },
    { name: '品川駅', lines: ['JR山手線', 'JR東海道新幹線', '京急本線'], lat: 35.6284, lng: 139.7387 }
  ],
  '27': [ // 大阪府
    { name: '大阪駅', lines: ['JR東海道本線', 'JR大阪環状線'], lat: 34.7024, lng: 135.4959 },
    { name: '新大阪駅', lines: ['JR東海道新幹線', 'JR東海道本線', '大阪メトロ御堂筋線'], lat: 34.7331, lng: 135.5002 },
    { name: '難波駅', lines: ['南海本線', '近鉄難波線', '大阪メトロ御堂筋線'], lat: 34.6614, lng: 135.5024 },
    { name: '天王寺駅', lines: ['JR大阪環状線', 'JR阪和線', '大阪メトロ御堂筋線'], lat: 34.6465, lng: 135.5135 }
  ],
  '26': [ // 京都府
    { name: '京都駅', lines: ['JR東海道新幹線', 'JR東海道本線', '近鉄京都線'], lat: 34.9859, lng: 135.7585 },
    { name: '四条駅', lines: ['京阪本線', '阪急京都線'], lat: 35.0036, lng: 135.7607 },
    { name: '京都河原町駅', lines: ['阪急京都線'], lat: 35.0031, lng: 135.7687 }
  ]
};

/**
 * 徒歩時間計算（80m/分）
 * @param {number} distanceInMeters - 距離（メートル）
 * @returns {number} 徒歩時間（分）
 */
export const calculateWalkingTime = (distanceInMeters) => {
  return Math.ceil(distanceInMeters / 80);
};

/**
 * 最寄り駅を検索
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @param {string} prefectureCode - 都道府県コード
 * @returns {Array} 最寄り駅リスト
 */
export const findNearestStations = (lat, lng, prefectureCode) => {
  const stations = MAJOR_STATIONS[prefectureCode] || [];
  
  return stations.map(station => {
    // 簡易的な距離計算（実際の実装では正確な距離計算APIを使用）
    const distance = calculateDistance(lat, lng, station.lat, station.lng);
    return {
      ...station,
      distance: Math.round(distance),
      walkingTime: calculateWalkingTime(distance)
    };
  }).sort((a, b) => a.distance - b.distance).slice(0, 3);
};

/**
 * 2点間の距離を計算（メートル）
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

/**
 * 都道府県のホテル数を取得（モックデータ）
 * 実際の実装では、バックエンドAPIから取得
 */
export const getHotelCountByPrefecture = async (prefectureCode) => {
  // モックデータ
  const hotelCounts = {
    '13': 5432, // 東京都
    '27': 3210, // 大阪府
    '26': 2345, // 京都府
    '01': 1876, // 北海道
    '47': 1234, // 沖縄県
    '14': 1567, // 神奈川県
    '40': 1432, // 福岡県
    '23': 1321, // 愛知県
  };
  
  return hotelCounts[prefectureCode] || Math.floor(Math.random() * 500) + 100;
};

/**
 * 地域別のおすすめホテルを取得
 */
export const getRecommendedHotelsByArea = async (prefectureCode, city) => {
  // 実際の実装では、バックエンドAPIから取得
  return {
    budget: [
      { id: 1, name: 'ビジネスホテル A', price: 5000, rating: 4.0 },
      { id: 2, name: 'カプセルホテル B', price: 3000, rating: 3.8 }
    ],
    standard: [
      { id: 3, name: 'シティホテル C', price: 12000, rating: 4.3 },
      { id: 4, name: 'ホテル D', price: 10000, rating: 4.2 }
    ],
    luxury: [
      { id: 5, name: 'ラグジュアリーホテル E', price: 30000, rating: 4.8 },
      { id: 6, name: '高級旅館 F', price: 45000, rating: 4.9 }
    ]
  };
};

/**
 * 観光地周辺のホテルを検索
 */
export const searchHotelsNearTouristSpot = async (spotName, radiusKm = 3) => {
  // 実際の実装では、観光地の座標を取得してから周辺検索
  return {
    spotInfo: {
      name: spotName,
      description: '人気の観光スポット',
      averageVisitTime: '2-3時間'
    },
    hotels: [
      {
        id: 1,
        name: `${spotName}徒歩圏内ホテル`,
        distance: 500,
        walkingTime: 7,
        price: 15000
      }
    ]
  };
};

/**
 * エリアごとの平均価格を取得
 */
export const getAveragePriceByArea = async (prefectureCode) => {
  const priceData = {
    '13': { min: 8000, avg: 15000, max: 50000 }, // 東京都
    '27': { min: 6000, avg: 12000, max: 40000 }, // 大阪府
    '26': { min: 7000, avg: 14000, max: 45000 }, // 京都府
    '01': { min: 5000, avg: 10000, max: 35000 }, // 北海道
    '47': { min: 6000, avg: 13000, max: 38000 }, // 沖縄県
  };
  
  return priceData[prefectureCode] || { min: 4000, avg: 8000, max: 25000 };
};

/**
 * 季節のおすすめ情報を取得
 */
export const getSeasonalRecommendations = (prefectureCode, month) => {
  const recommendations = {
    '01': { // 北海道
      summer: ['避暑地として人気', 'ラベンダー観光'],
      winter: ['雪まつり', 'スキーリゾート']
    },
    '26': { // 京都府
      spring: ['桜の名所巡り', '春の特別拝観'],
      autumn: ['紅葉シーズン', '秋の特別拝観']
    },
    '47': { // 沖縄県
      summer: ['マリンスポーツ', 'ビーチリゾート'],
      winter: ['避寒地として人気', 'ホエールウォッチング']
    }
  };
  
  const season = getSeason(month);
  return recommendations[prefectureCode]?.[season] || ['通年楽しめる観光地'];
};

const getSeason = (month) => {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};