// 日本全国ホテル検索システム設定

export const HOTEL_SEARCH_CONFIG = {
  // 段階的展開設定
  EXPANSION_PHASES: {
    phase1: {
      description: '主要都市チェーンホテル',
      target: 5000,
      prefectures: ['東京都', '大阪府', '京都府', '神奈川県', '愛知県']
    },
    phase2: {
      description: '全国主要都市',
      target: 20000,
      prefectures: 'all'
    },
    phase3: {
      description: '全国完全網羅',
      target: 75000,
      includeRyokan: true,
      includeMinshuku: true
    }
  },

  // API設定
  EXTERNAL_APIS: {
    rakuten: {
      enabled: true,
      endpoint: 'https://app.rakuten.co.jp/services/api/Travel/HotelSearch/20131024',
      apiKey: process.env.REACT_APP_RAKUTEN_API_KEY,
      rateLimit: 10 // requests per second
    },
    jalan: {
      enabled: false, // 要API契約
      endpoint: 'https://jalan.net/uw/uwp0200/uw_chg_search.do',
      apiKey: process.env.REACT_APP_JALAN_API_KEY
    },
    ikyu: {
      enabled: false, // 要API契約
      endpoint: 'https://api.ikyu.com/v1/hotels',
      apiKey: process.env.REACT_APP_IKYU_API_KEY
    }
  },

  // 検索パフォーマンス設定
  SEARCH_PERFORMANCE: {
    maxResults: 50,
    timeoutMs: 5000,
    cacheExpireMin: 30,
    enableFuzzySearch: true,
    enableSuggestions: true
  },

  // 主要ホテルチェーン（自動展開用）
  MAJOR_CHAINS: [
    {
      name: '東横イン',
      category: 'business',
      estimatedLocations: 300,
      pattern: '{name}{city}',
      keywords: ['東横イン', 'toyoko', 'inn']
    },
    {
      name: 'アパホテル',
      category: 'business', 
      estimatedLocations: 400,
      pattern: '{name}{city}{area}',
      keywords: ['アパ', 'apa', 'hotel']
    },
    {
      name: 'ルートイン',
      category: 'business',
      estimatedLocations: 250,
      pattern: 'ホテル{name}{city}',
      keywords: ['ルートイン', 'route', 'inn']
    },
    {
      name: 'コンフォートホテル',
      category: 'business',
      estimatedLocations: 50,
      pattern: '{name}{city}',
      keywords: ['コンフォート', 'comfort']
    },
    {
      name: 'ダイワロイネット',
      category: 'standard',
      estimatedLocations: 45,
      pattern: '{name}ホテル{city}',
      keywords: ['ダイワロイネット', 'daiwa', 'roynet']
    },
    {
      name: 'スーパーホテル',
      category: 'budget',
      estimatedLocations: 140,
      pattern: '{name}{city}',
      keywords: ['スーパーホテル', 'super']
    }
  ],

  // 都道府県と主要都市マッピング
  PREFECTURE_CITIES: {
    '北海道': ['札幌', 'すすきの', '函館', '旭川', '帯広', '釧路'],
    '青森県': ['青森', '弘前', '八戸'],
    '岩手県': ['盛岡', '一関'],
    '宮城県': ['仙台', '石巻'],
    '秋田県': ['秋田', '大館'],
    '山形県': ['山形', '米沢', '酒田'],
    '福島県': ['福島', '郡山', 'いわき'],
    '茨城県': ['水戸', 'つくば', '日立'],
    '栃木県': ['宇都宮', '那須', '栃木'],
    '群馬県': ['前橋', '高崎', '伊香保'],
    '埼玉県': ['さいたま', '川越', '大宮', '浦和'],
    '千葉県': ['千葉', '成田', '船橋', '柏', '舞浜'],
    '東京都': [
      '新宿', '渋谷', '池袋', '銀座', '上野', '品川', '秋葉原', '浅草',
      '六本木', '赤坂', '丸の内', '有楽町', '日本橋', '築地', '恵比寿',
      '原宿', '代官山', '表参道', '青山', '虎ノ門', '汐留', 'お台場'
    ],
    '神奈川県': ['横浜', '川崎', '藤沢', '小田原', '鎌倉', '湘南', 'みなとみらい'],
    '新潟県': ['新潟', '長岡', '上越'],
    '富山県': ['富山', '高岡'],
    '石川県': ['金沢', '加賀', '輪島'],
    '福井県': ['福井', '敦賀'],
    '山梨県': ['甲府', '河口湖', '山中湖'],
    '長野県': ['長野', '松本', '軽井沢', '上高地', '白馬'],
    '岐阜県': ['岐阜', '高山', '下呂'],
    '静岡県': ['静岡', '浜松', '熱海', '伊豆', '沼津'],
    '愛知県': ['名古屋', '栄', '金山', '豊田', '岡崎'],
    '三重県': ['津', '四日市', '伊勢', '鳥羽'],
    '滋賀県': ['大津', '草津', '彦根'],
    '京都府': ['京都駅', '祇園', '嵐山', '河原町', '烏丸', '三条', '四条'],
    '大阪府': [
      '梅田', '心斎橋', '難波', '天王寺', '新大阪', '淀屋橋', '本町',
      '住吉', '堺', '関西空港', 'なんば', 'ミナミ', 'キタ'
    ],
    '兵庫県': ['神戸', '姫路', '西宮', '尼崎', '三宮', '有馬'],
    '奈良県': ['奈良', '橿原'],
    '和歌山県': ['和歌山', '白浜', '高野山'],
    '鳥取県': ['鳥取', '米子'],
    '島根県': ['松江', '出雲'],
    '岡山県': ['岡山', '倉敷'],
    '広島県': ['広島', '呉', '尾道', '宮島'],
    '山口県': ['山口', '下関', '萩'],
    '徳島県': ['徳島', '阿南'],
    '香川県': ['高松', '丸亀'],
    '愛媛県': ['松山', '今治', '道後'],
    '高知県': ['高知', '南国'],
    '福岡県': ['福岡', '博多', '天神', '北九州', '久留米'],
    '佐賀県': ['佐賀', '唐津'],
    '長崎県': ['長崎', '佐世保', 'ハウステンボス'],
    '熊本県': ['熊本', '阿蘇', '天草'],
    '大分県': ['大分', '別府', '湯布院'],
    '宮崎県': ['宮崎', '都城'],
    '鹿児島県': ['鹿児島', '指宿', '屋久島'],
    '沖縄県': ['那覇', '国際通り', '石垣島', '宮古島', '恩納村', 'アメリカンビレッジ']
  }
};

// 環境変数設定テンプレート
export const ENV_TEMPLATE = `
# 楽天トラベルAPI
REACT_APP_RAKUTEN_API_KEY=your_rakuten_api_key_here

# じゃらんAPI（オプション）
REACT_APP_JALAN_API_KEY=your_jalan_api_key_here

# 一休API（オプション）
REACT_APP_IKYU_API_KEY=your_ikyu_api_key_here

# 検索システム設定
REACT_APP_HOTEL_SEARCH_PHASE=1
REACT_APP_ENABLE_EXTERNAL_APIS=true
REACT_APP_CACHE_EXPIRE_MINUTES=30
`;

// 導入手順
export const IMPLEMENTATION_STEPS = [
  '1. 楽天トラベルAPIキーを取得',
  '2. 環境変数を設定',
  '3. comprehensiveHotelSearch.tsをDateFixedSearch.tsxに統合',
  '4. フェーズ1（主要都市5,000軒）でテスト',
  '5. パフォーマンス最適化',
  '6. フェーズ2（全国20,000軒）展開',
  '7. 最終的にフェーズ3（75,000軒）完全対応'
];