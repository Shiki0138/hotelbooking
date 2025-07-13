# AI価格予測機能 実装ガイド

## 概要
このドキュメントは、ホテル予約システムにAI価格予測機能を追加するための実装ガイドです。

## 実装済み機能

### 1. データベース構造
- `hotel_price_history`: 価格履歴テーブル
- `price_predictions`: AI予測結果テーブル
- `affiliate_clicks`: アフィリエイトクリック追跡
- `hotel_value_scores`: ホテル価値スコア
- `user_behaviors`: ユーザー行動追跡

### 2. Supabase Edge Functions
- `collect-prices`: 価格データ収集（90日分の価格を生成）
- `predict-price`: AI価格予測（OpenAI/簡易予測）

### 3. フロントエンドコンポーネント
- `PriceChart`: 価格推移グラフ表示
- `PricePredictionCard`: AI予測結果カード
- `supabase.ts`: Supabaseクライアントとヘルパー関数

## セットアップ手順

### 1. Supabaseプロジェクトの設定

1. [Supabase](https://app.supabase.com)でプロジェクトを作成
2. プロジェクトURLとAnon Keyを取得

### 2. 環境変数の設定

```bash
# frontend/.env.localを作成
cp frontend/.env.example frontend/.env.local

# 以下の値を設定
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key (オプション)
```

### 3. データベースの初期化

Supabase SQLエディタで以下を実行：

```sql
-- /supabase/migrations/001_create_price_tables.sqlの内容を実行
```

### 4. Edge Functionsのデプロイ

```bash
# Supabase CLIをインストール
npm install -g supabase

# ログイン
supabase login

# プロジェクトとリンク
supabase link --project-ref your-project-id

# Edge Functionsをデプロイ
supabase functions deploy collect-prices
supabase functions deploy predict-price
```

### 5. 初期データの投入

```bash
# 価格データを収集（Edge Function経由）
curl -X POST https://your-project.supabase.co/functions/v1/collect-prices \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 使用方法

### 価格履歴の取得

```typescript
import { fetchPriceHistory } from '@/lib/supabase'

const history = await fetchPriceHistory('ritz_tokyo', 30)
```

### AI価格予測の取得

```typescript
import { getPricePrediction } from '@/lib/supabase'

const prediction = await getPricePrediction('ritz_tokyo', '2024-07-20')
```

### コンポーネントの使用

```tsx
import { PriceChart } from '@/components/prediction/PriceChart'
import { PricePredictionCard } from '@/components/prediction/PricePredictionCard'

// 価格チャート
<PriceChart 
  historicalData={history}
  predictions={predictions}
  hotelName="ザ・リッツ・カールトン東京"
/>

// 予測カード
<PricePredictionCard
  hotel={hotelData}
  prediction={predictionData}
  onViewDetails={() => {}}
/>
```

## 収益化戦略

### 1. アフィリエイト統合
- Booking.com: 15%コミッション
- 楽天トラベル: 1-4%
- Agoda: 4-7%

### 2. プレミアム機能（将来）
- 月額480円で広告非表示
- 無制限価格アラート
- 詳細な予測データ

## 今後の開発

### Phase 1完了項目 ✅
- Supabaseテーブル作成
- 価格収集システム
- AI予測エンジン
- 基本UIコンポーネント

### Phase 2予定
- 既存システムとの統合
- モバイルUI最適化
- 実際のホテルAPIとの連携

### Phase 3予定
- 本番環境へのデプロイ
- 性能最適化
- A/Bテスト実装

## トラブルシューティング

### よくある問題

1. **Supabase接続エラー**
   - 環境変数が正しく設定されているか確認
   - プロジェクトURLとキーが一致しているか確認

2. **Edge Functionエラー**
   - Supabase CLIが最新版か確認
   - 環境変数がEdge Functionに設定されているか確認

3. **価格予測が表示されない**
   - 初期データが投入されているか確認
   - ブラウザコンソールでエラーを確認

## 参考リンク

- [Supabase Docs](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [OpenAI API Docs](https://platform.openai.com/docs)