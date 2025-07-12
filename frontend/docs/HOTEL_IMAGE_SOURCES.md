# ホテル画像取得方法

## 1. 楽天トラベルAPI経由（推奨）
```javascript
// 楽天APIレスポンスから画像取得
{
  "hotel": {
    "hotelBasicInfo": {
      "hotelName": "ザ・リッツ・カールトン東京",
      "hotelImageUrl": "https://img.travel.rakuten.co.jp/image/hotel/74944/...",
      "roomImageUrl": "https://img.travel.rakuten.co.jp/image/room/74944/..."
    }
  }
}
```

## 2. Google Places API
```javascript
// Google Places APIで画像取得
const service = new google.maps.places.PlacesService(map);
service.getDetails({
  placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  fields: ['photos']
}, (place, status) => {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    const photoUrl = place.photos[0].getUrl({
      maxWidth: 800,
      maxHeight: 600
    });
  }
});
```

## 3. ホテル公式サイトからの直リンク
```javascript
const hotelOfficialImages = {
  'ritz_tokyo': 'https://www.ritzcarlton.com/content/dam/the-ritz-carlton/hotels/japan/tokyo/...',
  'mandarin_tokyo': 'https://photos.mandarinoriental.com/is/image/MandarinOriental/tokyo-...',
  'aman_tokyo': 'https://www.aman.com/sites/default/files/styles/property_gallery_extra_large/...'
};
```

## 4. 実装例
```typescript
// hotelDataLuxury.tsを更新
export const luxuryHotelsData: LuxuryHotel[] = [
  {
    id: 'ritz_tokyo',
    name: 'ザ・リッツ・カールトン東京',
    images: {
      // 楽天トラベルの実画像URL
      thumbnail: 'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=74944',
      gallery: [
        'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=74944-1',
        'https://img.travel.rakuten.co.jp/image/imgr_100?hotImageId=74944-2'
      ]
    }
  }
];
```

## 5. 画像の著作権について
- 楽天トラベルAPI: アフィリエイトプログラムで使用可
- Google Places: 利用規約に従えば使用可
- ホテル公式: 直接許可が必要な場合あり

## 6. パフォーマンス最適化
```javascript
// 画像の遅延読み込み
<img 
  loading="lazy"
  src={hotel.images.thumbnail}
  alt={hotel.name}
  onError={(e) => {
    // フォールバック画像
    e.target.src = '/placeholder-hotel.jpg';
  }}
/>
```