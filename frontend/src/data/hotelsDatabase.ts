// 日本の実在するホテルデータベース
export interface Hotel {
  id: string;
  name: string;
  nameEn?: string;
  location: string;
  prefecture: string;
  category: 'luxury' | 'popular' | 'standard' | 'business' | 'budget';
  tags: string[];
  searchKeywords: string[];
}

// 実在する日本のホテルデータベース
export const hotelsDatabase: Hotel[] = [
  // 高級ホテル (Luxury Hotels)
  {
    id: 'h001',
    name: '帝国ホテル東京',
    nameEn: 'Imperial Hotel Tokyo',
    location: '東京都千代田区',
    prefecture: '東京都',
    category: 'luxury',
    tags: ['高級', '歴史的', 'ビジネス'],
    searchKeywords: ['帝国', 'インペリアル', 'imperial', '丸の内']
  },
  {
    id: 'h002',
    name: 'ザ・リッツ・カールトン東京',
    nameEn: 'The Ritz-Carlton Tokyo',
    location: '東京都港区',
    prefecture: '東京都',
    category: 'luxury',
    tags: ['高級', '外資系', '眺望'],
    searchKeywords: ['リッツ', 'ritz', 'carlton', '六本木']
  },
  {
    id: 'h003',
    name: 'パークハイアット東京',
    nameEn: 'Park Hyatt Tokyo',
    location: '東京都新宿区',
    prefecture: '東京都',
    category: 'luxury',
    tags: ['高級', '外資系', '新宿'],
    searchKeywords: ['パークハイアット', 'park', 'hyatt', '新宿']
  },
  {
    id: 'h004',
    name: 'ホテルオークラ東京',
    nameEn: 'Hotel Okura Tokyo',
    location: '東京都港区',
    prefecture: '東京都',
    category: 'luxury',
    tags: ['高級', '日本的', '伝統'],
    searchKeywords: ['オークラ', 'okura', '虎ノ門']
  },
  {
    id: 'h005',
    name: 'マンダリン オリエンタル 東京',
    nameEn: 'Mandarin Oriental Tokyo',
    location: '東京都中央区',
    prefecture: '東京都',
    category: 'luxury',
    tags: ['高級', '外資系', '日本橋'],
    searchKeywords: ['マンダリン', 'mandarin', 'oriental', '日本橋']
  },
  {
    id: 'h006',
    name: 'ザ・ペニンシュラ東京',
    nameEn: 'The Peninsula Tokyo',
    location: '東京都千代田区',
    prefecture: '東京都',
    category: 'luxury',
    tags: ['高級', '外資系', '有楽町'],
    searchKeywords: ['ペニンシュラ', 'peninsula', '有楽町', '日比谷']
  },
  {
    id: 'h007',
    name: 'ウェスティンホテル大阪',
    nameEn: 'The Westin Osaka',
    location: '大阪府大阪市',
    prefecture: '大阪府',
    category: 'luxury',
    tags: ['高級', '外資系', '梅田'],
    searchKeywords: ['ウェスティン', 'westin', '梅田', '大阪']
  },
  {
    id: 'h008',
    name: 'ザ・リッツ・カールトン京都',
    nameEn: 'The Ritz-Carlton Kyoto',
    location: '京都府京都市',
    prefecture: '京都府',
    category: 'luxury',
    tags: ['高級', '外資系', '鴨川'],
    searchKeywords: ['リッツ', 'ritz', '京都', '鴨川']
  },

  // 人気ホテル (Popular Hotels)
  {
    id: 'h020',
    name: 'ホテルニューオータニ東京',
    nameEn: 'Hotel New Otani Tokyo',
    location: '東京都千代田区',
    prefecture: '東京都',
    category: 'popular',
    tags: ['人気', '伝統', '庭園'],
    searchKeywords: ['ニューオータニ', 'new otani', '赤坂', '紀尾井町']
  },
  {
    id: 'h021',
    name: 'グランドハイアット東京',
    nameEn: 'Grand Hyatt Tokyo',
    location: '東京都港区',
    prefecture: '東京都',
    category: 'popular',
    tags: ['人気', '六本木', 'ビジネス'],
    searchKeywords: ['グランドハイアット', 'grand', 'hyatt', '六本木']
  },
  {
    id: 'h022',
    name: 'ヒルトン東京',
    nameEn: 'Hilton Tokyo',
    location: '東京都新宿区',
    prefecture: '東京都',
    category: 'popular',
    tags: ['人気', '新宿', 'ビジネス'],
    searchKeywords: ['ヒルトン', 'hilton', '新宿', '西新宿']
  },
  {
    id: 'h023',
    name: 'シェラトン都ホテル東京',
    nameEn: 'Sheraton Miyako Hotel Tokyo',
    location: '東京都港区',
    prefecture: '東京都',
    category: 'popular',
    tags: ['人気', '品川', 'アクセス良好'],
    searchKeywords: ['シェラトン', 'sheraton', '都ホテル', '白金台']
  },
  {
    id: 'h024',
    name: 'ホテル日航大阪',
    nameEn: 'Hotel Nikko Osaka',
    location: '大阪府大阪市',
    prefecture: '大阪府',
    category: 'popular',
    tags: ['人気', '心斎橋', 'ショッピング'],
    searchKeywords: ['日航', 'nikko', '心斎橋', '大阪']
  },
  {
    id: 'h025',
    name: 'ホテルグランヴィア京都',
    nameEn: 'Hotel Granvia Kyoto',
    location: '京都府京都市',
    prefecture: '京都府',
    category: 'popular',
    tags: ['人気', '駅直結', 'アクセス'],
    searchKeywords: ['グランヴィア', 'granvia', '京都駅', 'JR']
  },

  // 一般・ビジネスホテル (Standard/Business Hotels)
  {
    id: 'h050',
    name: '東横イン東京駅日本橋',
    nameEn: 'Toyoko Inn Tokyo Station',
    location: '東京都中央区',
    prefecture: '東京都',
    category: 'business',
    tags: ['ビジネス', 'チェーン', '駅近'],
    searchKeywords: ['東横イン', 'toyoko', '東京駅', '日本橋']
  },
  {
    id: 'h051',
    name: 'アパホテル新宿歌舞伎町',
    nameEn: 'APA Hotel Shinjuku Kabukicho',
    location: '東京都新宿区',
    prefecture: '東京都',
    category: 'business',
    tags: ['ビジネス', 'チェーン', '新宿'],
    searchKeywords: ['アパ', 'apa', '新宿', '歌舞伎町']
  },
  {
    id: 'h052',
    name: 'サンルートプラザ新宿',
    nameEn: 'Sunroute Plaza Shinjuku',
    location: '東京都渋谷区',
    prefecture: '東京都',
    category: 'standard',
    tags: ['スタンダード', '新宿', 'アクセス'],
    searchKeywords: ['サンルート', 'sunroute', '新宿', '南口']
  },
  {
    id: 'h053',
    name: 'ホテルモントレ大阪',
    nameEn: 'Hotel Monterey Osaka',
    location: '大阪府大阪市',
    prefecture: '大阪府',
    category: 'standard',
    tags: ['スタンダード', '梅田', 'ヨーロッパ風'],
    searchKeywords: ['モントレ', 'monterey', '梅田', '大阪']
  },
  {
    id: 'h054',
    name: 'ダイワロイネットホテル京都駅前',
    nameEn: 'Daiwa Roynet Hotel Kyoto',
    location: '京都府京都市',
    prefecture: '京都府',
    category: 'business',
    tags: ['ビジネス', '駅前', 'チェーン'],
    searchKeywords: ['ダイワロイネット', 'daiwa', 'roynet', '京都駅']
  },
  {
    id: 'h055',
    name: 'リッチモンドホテル浅草',
    nameEn: 'Richmond Hotel Asakusa',
    location: '東京都台東区',
    prefecture: '東京都',
    category: 'standard',
    tags: ['スタンダード', '浅草', '観光'],
    searchKeywords: ['リッチモンド', 'richmond', '浅草', '下町']
  },
  {
    id: 'h056',
    name: 'ホテルルートイン名古屋栄',
    nameEn: 'Hotel Route Inn Nagoya Sakae',
    location: '愛知県名古屋市',
    prefecture: '愛知県',
    category: 'business',
    tags: ['ビジネス', 'チェーン', '栄'],
    searchKeywords: ['ルートイン', 'route inn', '名古屋', '栄']
  },
  {
    id: 'h057',
    name: 'コンフォートホテル横浜関内',
    nameEn: 'Comfort Hotel Yokohama',
    location: '神奈川県横浜市',
    prefecture: '神奈川県',
    category: 'business',
    tags: ['ビジネス', 'チェーン', '朝食無料'],
    searchKeywords: ['コンフォート', 'comfort', '横浜', '関内']
  },
  {
    id: 'h058',
    name: 'ホテルサンルート札幌',
    nameEn: 'Hotel Sunroute Sapporo',
    location: '北海道札幌市',
    prefecture: '北海道',
    category: 'standard',
    tags: ['スタンダード', 'すすきの', '繁華街'],
    searchKeywords: ['サンルート', 'sunroute', '札幌', 'すすきの']
  },
  {
    id: 'h059',
    name: 'ホテルJALシティ那覇',
    nameEn: 'Hotel JAL City Naha',
    location: '沖縄県那覇市',
    prefecture: '沖縄県',
    category: 'standard',
    tags: ['スタンダード', '国際通り', '観光'],
    searchKeywords: ['JALシティ', 'jal city', '那覇', '国際通り']
  },

  // バジェットホテル
  {
    id: 'h070',
    name: 'スーパーホテル新宿歌舞伎町',
    nameEn: 'Super Hotel Shinjuku',
    location: '東京都新宿区',
    prefecture: '東京都',
    category: 'budget',
    tags: ['格安', 'チェーン', '温泉'],
    searchKeywords: ['スーパーホテル', 'super hotel', '新宿', '歌舞伎町']
  },
  {
    id: 'h071',
    name: 'ファーストキャビン秋葉原',
    nameEn: 'First Cabin Akihabara',
    location: '東京都千代田区',
    prefecture: '東京都',
    category: 'budget',
    tags: ['カプセル', 'モダン', '秋葉原'],
    searchKeywords: ['ファーストキャビン', 'first cabin', '秋葉原', 'カプセル']
  },
  {
    id: 'h072',
    name: 'ホテルマイステイズ心斎橋',
    nameEn: 'Hotel MyStays Shinsaibashi',
    location: '大阪府大阪市',
    prefecture: '大阪府',
    category: 'budget',
    tags: ['格安', 'チェーン', '心斎橋'],
    searchKeywords: ['マイステイズ', 'mystays', '心斎橋', '大阪']
  }
];

// ホテル検索用のヘルパー関数
export function searchHotels(query: string, limit: number = 10): Hotel[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) return [];
  
  const results = hotelsDatabase.filter(hotel => {
    // ホテル名で検索
    if (hotel.name.toLowerCase().includes(normalizedQuery)) return true;
    if (hotel.nameEn && hotel.nameEn.toLowerCase().includes(normalizedQuery)) return true;
    
    // 場所で検索
    if (hotel.location.includes(normalizedQuery)) return true;
    if (hotel.prefecture.includes(normalizedQuery)) return true;
    
    // キーワードで検索
    return hotel.searchKeywords.some(keyword => 
      keyword.toLowerCase().includes(normalizedQuery)
    );
  });
  
  // スコアリング（より関連性の高い結果を上位に）
  const scored = results.map(hotel => {
    let score = 0;
    
    // 完全一致
    if (hotel.name.toLowerCase() === normalizedQuery) score += 100;
    if (hotel.nameEn?.toLowerCase() === normalizedQuery) score += 90;
    
    // 名前に含まれる
    if (hotel.name.toLowerCase().startsWith(normalizedQuery)) score += 50;
    if (hotel.nameEn?.toLowerCase().startsWith(normalizedQuery)) score += 45;
    
    // カテゴリによる重み付け
    if (hotel.category === 'luxury') score += 10;
    if (hotel.category === 'popular') score += 8;
    
    return { hotel, score };
  });
  
  // スコア順にソート
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, limit).map(item => item.hotel);
}

// カテゴリ別のホテル取得
export function getHotelsByCategory(category: Hotel['category']): Hotel[] {
  return hotelsDatabase.filter(hotel => hotel.category === category);
}

// おすすめホテル（トップページ用）
export function getFeaturedHotels(): Hotel[] {
  const luxury = getHotelsByCategory('luxury').slice(0, 3);
  const popular = getHotelsByCategory('popular').slice(0, 3);
  return [...luxury, ...popular];
}