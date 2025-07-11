// 楽天トラベルの正確なホテルIDマッピング
export const RAKUTEN_HOTEL_MAPPING = {
  // 東京
  'ザ・リッツ・カールトン東京': {
    id: '74944',
    exactName: 'ザ・リッツ・カールトン東京',
    searchKeyword: 'リッツカールトン東京',
    city: '東京都港区',
  },
  'パーク ハイアット 東京': {
    id: '1217',
    exactName: 'パーク ハイアット 東京',
    searchKeyword: 'パークハイアット東京',
    city: '東京都新宿区',
  },
  'マンダリン オリエンタル 東京': {
    id: '67648',
    exactName: 'マンダリン オリエンタル 東京',
    searchKeyword: 'マンダリンオリエンタル東京',
    city: '東京都中央区',
  },
  'コンラッド東京': {
    id: '73984',
    exactName: 'コンラッド東京',
    searchKeyword: 'コンラッド東京',
    city: '東京都港区',
  },
  'アマン東京': {
    id: '142125',
    exactName: 'アマン東京',
    searchKeyword: 'アマン東京',
    city: '東京都千代田区',
  },
  
  // 沖縄
  'ザ・ブセナテラス': {
    id: '40391',
    exactName: 'ザ・ブセナテラス',
    searchKeyword: 'ブセナテラス',
    city: '沖縄県名護市',
  },
  'ハレクラニ沖縄': {
    id: '168223',
    exactName: 'ハレクラニ沖縄',
    searchKeyword: 'ハレクラニ沖縄',
    city: '沖縄県恩納村',
  },
  'ザ・リッツ・カールトン沖縄': {
    id: '126235',
    exactName: 'ザ・リッツ・カールトン沖縄',
    searchKeyword: 'リッツカールトン沖縄',
    city: '沖縄県名護市',
  },
  
  // 大阪
  'ザ・リッツ・カールトン大阪': {
    id: '28110',
    exactName: 'ザ・リッツ・カールトン大阪',
    searchKeyword: 'リッツカールトン大阪',
    city: '大阪府大阪市',
  },
  'セントレジスホテル大阪': {
    id: '133719',
    exactName: 'セントレジスホテル大阪',
    searchKeyword: 'セントレジス大阪',
    city: '大阪府大阪市',
  },
  
  // 京都
  'フォーシーズンズホテル京都': {
    id: '151637',
    exactName: 'フォーシーズンズホテル京都',
    searchKeyword: 'フォーシーズンズ京都',
    city: '京都府京都市',
  },
  'ザ・リッツ・カールトン京都': {
    id: '134518',
    exactName: 'ザ・リッツ・カールトン京都',
    searchKeyword: 'リッツカールトン京都',
    city: '京都府京都市',
  },
  'パーク ハイアット 京都': {
    id: '169768',
    exactName: 'パーク ハイアット 京都',
    searchKeyword: 'パークハイアット京都',
    city: '京都府京都市',
  },
};

// ホテル名から楽天トラベルの正確なURLを生成
export function getRakutenHotelUrl(hotelName: string, affiliateId?: string): string {
  const mapping = RAKUTEN_HOTEL_MAPPING[hotelName];
  
  if (!mapping) {
    // マッピングがない場合はキーワード検索
    return `https://travel.rakuten.co.jp/dsearch/?f_keyword=${encodeURIComponent(hotelName)}`;
  }
  
  // アフィリエイトID付きの正確なホテルURL
  if (affiliateId) {
    return `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=https://travel.rakuten.co.jp/HOTEL/${mapping.id}/${mapping.id}.html`;
  }
  
  return `https://travel.rakuten.co.jp/HOTEL/${mapping.id}/${mapping.id}.html`;
}