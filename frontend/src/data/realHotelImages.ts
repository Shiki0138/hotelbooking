// 実際のホテル画像マッピング
// 楽天トラベルや公式サイトから取得した実画像URL

export const realHotelImages: Record<string, { thumbnail: string; gallery?: string[] }> = {
  // リッツ・カールトン
  'ritz_tokyo': {
    thumbnail: 'https://www.ritzcarlton.com/content/dam/the-ritz-carlton/hotels/asia-pacific/japan/tokyo/overview/RC_TYORZ_00090.jpg',
    gallery: [
      'https://www.ritzcarlton.com/content/dam/the-ritz-carlton/hotels/asia-pacific/japan/tokyo/guest-rooms/suites/RC_TYORZ_00055.jpg',
      'https://www.ritzcarlton.com/content/dam/the-ritz-carlton/hotels/asia-pacific/japan/tokyo/dining/RC_TYORZ_00127.jpg'
    ]
  },
  'ritz_osaka': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=168'
  },
  'ritz_kyoto': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=151956'
  },
  'ritz_nikko': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=165784'
  },
  'ritz_okinawa': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=91487'
  },
  
  // マンダリン オリエンタル
  'mandarin_tokyo': {
    thumbnail: 'https://photos.mandarinoriental.com/is/image/MandarinOriental/tokyo-hotel-exterior-01',
    gallery: [
      'https://photos.mandarinoriental.com/is/image/MandarinOriental/tokyo-suite-presidential-living-room',
      'https://photos.mandarinoriental.com/is/image/MandarinOriental/tokyo-spa-pool'
    ]
  },
  
  // アマン
  'aman_tokyo': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=121103'
  },
  'aman_kyoto': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=163088'
  },
  
  // フォーシーズンズ
  'four_seasons_tokyo_otemachi': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=164879'
  },
  'four_seasons_tokyo_marunouchi': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=6967'
  },
  'four_seasons_kyoto': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=135532'
  },
  
  // ペニンシュラ
  'peninsula_tokyo': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=13834'
  },
  
  // パークハイアット
  'park_hyatt_tokyo': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=10330'
  },
  'park_hyatt_kyoto': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=163082'
  },
  'park_hyatt_niseko': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=166074'
  },
  
  // コンラッド
  'conrad_tokyo': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=8451'
  },
  'conrad_osaka': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=143994'
  },
  
  // ブルガリ
  'bvlgari_tokyo': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=184256'
  },
  'bvlgari_osaka': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=191632'
  },
  
  // セントレジス
  'st_regis_osaka': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=55318'
  },
  
  // W
  'w_osaka': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=177598'
  },
  
  // エディション
  'edition_toranomon': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=168371'
  },
  
  // 日本ブランド高級ホテル
  'imperial_tokyo': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=6166'
  },
  'okura_tokyo': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=6399'
  },
  'palace_tokyo': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=88366'
  },
  'prince_gallery_tokyo': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=140050'
  },
  'hoshinoya_tokyo': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=132723'
  },
  'hoshinoya_kyoto': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=73871'
  },
  'hoshinoya_karuizawa': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=24571'
  },
  'hoshinoya_fuji': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=125992'
  },
  'hoshinoya_okinawa': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=165741'
  },
  
  // リゾートホテル
  'busena_terrace': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=40391'
  },
  'halekulani_okinawa': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=168223'
  },
  'iraph_sui': {
    thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=149596'
  },
  
  // デフォルト画像（フォールバック）
  'default': {
    thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
  }
};