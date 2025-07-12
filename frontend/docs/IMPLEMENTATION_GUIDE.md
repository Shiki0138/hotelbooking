# 無料リアルタイム価格システム実装ガイド

## 🚀 今すぐ始められる実装手順

### ステップ1: 楽天トラベルAPI（無料）の設定

1. **楽天デベロッパーアカウント作成**
   ```
   https://webservice.rakuten.co.jp/
   → 新規登録（無料）
   → アプリID取得
   ```

2. **環境変数設定**
   ```bash
   # .env.local
   RAKUTEN_APP_ID=your-app-id-here
   ```

3. **API実装確認**
   ```typescript
   // 既に実装済み: /api/free-hotel-prices.ts
   // テスト: /api/free-hotel-prices?hotelName=リッツカールトン東京
   ```

### ステップ2: アフィリエイトプログラム登録

#### Booking.com（推奨）
1. https://www.booking.com/affiliate-program/
2. 審査（1-3日）
3. XMLフィード/APIアクセス取得

#### じゃらんnet（リクルート）
1. https://webservice.recruit.co.jp/
2. APIキー取得（即日）
3. 無料で空室・価格情報取得可能

### ステップ3: フロントエンド統合

```typescript
// App.tsxに追加
const fetchFreeHotelPrices = async (hotelName: string, checkin: string, checkout: string) => {
  try {
    const response = await fetch(
      `/api/free-hotel-prices?hotelName=${encodeURIComponent(hotelName)}&checkin=${checkin}&checkout=${checkout}`
    );
    
    if (response.ok) {
      const data = await response.json();
      
      // 楽天データがある場合
      if (data.rakuten?.price) {
        return {
          lowestPrice: data.rakuten.price,
          available: data.rakuten.available,
          source: 'rakuten'
        };
      }
      
      // 推定価格を使用
      if (data.estimatedPriceRange) {
        return {
          lowestPrice: data.estimatedPriceRange.min,
          highestPrice: data.estimatedPriceRange.max,
          estimated: true
        };
      }
    }
  } catch (error) {
    console.error('Price fetch error:', error);
  }
  
  return null;
};
```

### ステップ4: キャッシュ最適化（Vercel KV）

```typescript
// Vercel KVの設定
import { kv } from '@vercel/kv';

async function getCachedPrice(key: string) {
  return await kv.get(key);
}

async function setCachedPrice(key: string, data: any, ttl: number = 86400) {
  return await kv.set(key, data, { ex: ttl });
}
```

### ステップ5: 段階的改善

#### Phase 1（今すぐ）
- ✅ 楽天API（無料枠）
- ✅ 静的価格 + 季節補正
- ✅ Google検索リンク

#### Phase 2（1ヶ月後）
- アフィリエイトフィード統合
- 価格予測AI
- 通知システム

#### Phase 3（収益化後）
- 有料API導入
- リアルタイム監視
- 高度な分析

## 📊 コスト比較

### 現在の有料API案
- 月額: 30,000円〜70,000円
- 初期投資: 高
- リスク: 高

### 無料実装案
- 月額: 0円
- 初期投資: 0円
- 収益分配: 予約成立時のみ（3-5%）

## 💡 収益化モデル

1. **アフィリエイト収益**
   - 予約1件: 500円〜3,000円
   - 月100件で: 50,000円〜300,000円

2. **プレミアム機能**
   - 価格アラート: 月額299円
   - 優先通知: 月額499円
   - API提供: 月額9,999円〜

3. **ホテル直接契約**
   - 送客手数料: 5-10%
   - 広告掲載: 月額10,000円〜

## 🎯 実装優先順位

### 今週中に実装
1. 楽天API統合 ✓
2. 価格表示UI改善
3. キャッシュ実装

### 今月中に実装
1. アフィリエイト申請
2. 価格比較機能
3. 通知システム基盤

### 3ヶ月以内
1. AI価格予測
2. モバイルアプリ
3. B2B API提供

## 🔧 トラブルシューティング

### 楽天APIエラー
```typescript
// レート制限対策
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRateLimit(url: string) {
  await delay(1000); // 1秒待機
  return fetch(url);
}
```

### CORS エラー
```typescript
// Vercel Edge Functionで解決済み
export const config = {
  runtime: 'edge',
};
```

これで月額0円でリアルタイム価格システムの構築が可能です！