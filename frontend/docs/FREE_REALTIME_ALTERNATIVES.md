# 無料でリアルタイム価格・空室情報を取得する代替方法

## 📊 実装可能な無料アプローチ

### 1. アフィリエイトプログラムの活用 ✅
**最も現実的な選択肢**

#### 楽天アフィリエイト
- **月額費用**: 無料
- **取得可能データ**: 
  - リアルタイム在庫
  - 実価格
  - 空室状況
- **実装方法**:
  ```javascript
  // 楽天ウェブサービスAPI（無料枠あり）
  const RAKUTEN_APP_ID = 'your-app-id';
  const url = `https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426?applicationId=${RAKUTEN_APP_ID}&format=json&datumType=1&checkinDate=${checkin}&checkoutDate=${checkout}&latitude=${lat}&longitude=${lng}`;
  ```
- **制限**: 1秒1リクエスト、1日10万リクエストまで

#### Booking.comアフィリエイト
- **月額費用**: 無料  
- **アクセス方法**: Booking.com Partner Center
- **取得可能データ**: XML/JSONフィード
- **手数料**: 予約成立時のみ（3-5%）

#### じゃらんアフィリエイト（リクルート）
- **月額費用**: 無料
- **アクセス方法**: リクルートWEBサービス
- **取得可能データ**: 空室・価格情報

### 2. Webスクレイピング（合法的な範囲で）⚖️

#### 実装例
```javascript
// Puppeteer を使用した価格取得
import puppeteer from 'puppeteer';

async function scrapeHotelPrice(hotelName: string, checkin: string, checkout: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // robots.txtとサイト規約を確認後に実行
  await page.goto(`https://www.google.com/travel/hotels/search?q=${hotelName}&checkin=${checkin}&checkout=${checkout}`);
  
  // 価格情報を取得
  const prices = await page.evaluate(() => {
    const priceElements = document.querySelectorAll('[data-price]');
    return Array.from(priceElements).map(el => el.textContent);
  });
  
  await browser.close();
  return prices;
}
```

**注意事項**:
- robots.txtの遵守必須
- アクセス頻度の制限（1分に1回程度）
- 利用規約の確認必須
- サーバーサイドでの実行推奨

### 3. Google Hotels Price API（部分的に無料）🔍

```javascript
// Google Maps APIを利用した価格情報取得
const service = new google.maps.places.PlacesService(map);
service.getDetails({
  placeId: 'hotel-place-id',
  fields: ['price_level', 'rating', 'reviews']
}, (place, status) => {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    console.log('Price Level:', place.price_level);
  }
});
```

**制限**: 
- 月$200分の無料クレジット
- リアルタイム価格は限定的

### 4. 価格比較ウィジェット埋め込み 🔧

#### TripAdvisor Price Comparison Widget
```html
<!-- 無料ウィジェット -->
<div id="TA_selfserveprop123" class="TA_selfserveprop">
  <script src="https://www.tripadvisor.com/WidgetEmbed-selfserveprop"></script>
</div>
```

#### Trivago Widget
- 無料提供
- リアルタイム価格表示
- カスタマイズ可能

### 5. ハイブリッドアプローチ（推奨）🏆

```javascript
// 実装例: 複数の無料ソースを組み合わせ
class FreeHotelDataService {
  async getHotelPrices(hotel: Hotel, dates: DateRange) {
    const results = await Promise.allSettled([
      this.getRakutenPrice(hotel, dates),      // 楽天API（無料枠）
      this.getGooglePrice(hotel, dates),       // Google Maps API
      this.getCachedPrice(hotel, dates),       // キャッシュデータ
      this.getAffiliatePrice(hotel, dates)     // アフィリエイトフィード
    ]);
    
    return this.mergeResults(results);
  }
  
  private async getRakutenPrice(hotel: Hotel, dates: DateRange) {
    // 楽天トラベル検索API（無料）
    const response = await fetch(`https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426?applicationId=${APP_ID}&format=json&hotelName=${hotel.name}`);
    return response.json();
  }
}
```

### 6. オープンデータの活用 📂

#### 観光庁オープンデータ
- 宿泊施設の基本情報
- 統計データ
- 無料で利用可能

#### 自治体提供データ
- 地域の観光情報
- イベント情報
- 混雑状況

### 7. パートナーシップモデル 🤝

#### 直接契約のメリット
1. **ホテルとの直接提携**
   - API提供を交渉
   - 手数料ベースの契約
   - Win-Winの関係構築

2. **ホテルチェーンとの連携**
   - 複数施設を一括契約
   - ブランド公式データ
   - マーケティング協力

### 8. 段階的実装戦略 📈

#### Phase 1: MVP（無料版）
```javascript
// 基本実装
- 楽天アフィリエイトAPI（無料枠）
- Google Maps価格レベル
- 静的価格データ + 季節補正
```

#### Phase 2: 拡張版
```javascript
// 収益化後
- 複数アフィリエイト統合
- 軽量スクレイピング
- キャッシュ最適化
```

#### Phase 3: 本格版
```javascript
// 利益確保後
- 有料API導入
- リアルタイム監視
- AI価格予測
```

## 💡 推奨実装プラン

### 即座に実装可能な構成
1. **楽天トラベル検索API**（無料）
2. **Booking.comアフィリエイト**（無料）
3. **Googleプレイス情報**（月$200無料枠）
4. **インテリジェントキャッシング**

### サンプル実装
```typescript
// /api/free-hotel-prices.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hotelName = searchParams.get('hotelName');
  const checkin = searchParams.get('checkin');
  const checkout = searchParams.get('checkout');
  
  // 1. キャッシュチェック（24時間有効）
  const cached = await checkCache(hotelName, checkin, checkout);
  if (cached) return NextResponse.json(cached);
  
  // 2. 楽天API（無料枠）
  const rakutenData = await fetchRakutenFreeAPI(hotelName, checkin, checkout);
  
  // 3. アフィリエイトフィード
  const affiliateData = await fetchAffiliateFeeds(hotelName);
  
  // 4. 統合・正規化
  const mergedData = mergeDataSources(rakutenData, affiliateData);
  
  // 5. キャッシュ保存
  await saveCache(hotelName, checkin, checkout, mergedData);
  
  return NextResponse.json(mergedData);
}
```

## 🚀 実装優先順位

1. **楽天トラベルAPI統合**（1週間）
   - 無料で即座に開始可能
   - 日本のホテルカバー率高い

2. **アフィリエイトフィード統合**（2週間）
   - Booking.com XML/JSON
   - じゃらんフィード

3. **キャッシング層構築**（1週間）
   - Vercel KV活用
   - 24時間キャッシュ

4. **フォールバック実装**（1週間）
   - 静的データ + AI補正
   - エラーハンドリング

この方法により、月額費用0円でリアルタイムに近い価格・空室情報の提供が可能です。