# 🚀 LMS ホテル予約システム - デプロイ手順

## 📋 事前準備

### 1. Supabaseプロジェクト情報を確認
```bash
# Supabaseダッシュボードから以下を取得
PROJECT_REF=your-project-ref-here
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. 環境変数ファイル作成
```bash
# frontend/.env.local
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🗄️ データベースセットアップ

### 1. マイグレーション実行
```bash
cd /Users/leadfive/Desktop/system/hotelbooking
npx supabase db push
```

### 2. RLS (Row Level Security) 設定
Supabaseダッシュボードで以下のポリシーを設定：

```sql
-- hotel_price_history テーブル
CREATE POLICY "Anyone can read price history" ON hotel_price_history
FOR SELECT USING (true);

-- price_predictions テーブル  
CREATE POLICY "Anyone can read predictions" ON price_predictions
FOR SELECT USING (true);

-- affiliate_clicks テーブル
CREATE POLICY "Users can insert their clicks" ON affiliate_clicks
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
```

## ⚡ Edge Functions デプロイ

### 1. Supabase CLI ログイン
```bash
npx supabase login
```

### 2. 価格収集関数デプロイ
```bash
npx supabase functions deploy collect-prices --project-ref YOUR_PROJECT_REF
```

### 3. AI価格予測関数デプロイ
```bash
npx supabase functions deploy predict-price --project-ref YOUR_PROJECT_REF
```

### 4. 環境変数設定
```bash
# OpenAI API キー設定
npx supabase secrets set OPENAI_API_KEY=your-openai-api-key
```

## 🌐 フロントエンドデプロイ

### 1. Vercelデプロイ
```bash
cd frontend
npx vercel --prod
```

### 2. 環境変数設定 (Vercel)
Vercelダッシュボードで以下を設定：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3. ビルド設定確認
```json
// vercel.json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

## 🔄 完了後のテスト

### 1. システム全体テスト
```bash
# 開発サーバー起動
npm run dev

# 以下をテスト
✅ ホテル検索
✅ AI価格予測表示
✅ OTA価格比較
✅ ユーザー登録・ログイン
✅ お気に入り機能
✅ モバイル表示
```

### 2. API エンドポイントテスト
```bash
# Edge Functions テスト
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/collect-prices' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"hotelId": "test-hotel"}'

curl -X POST 'https://your-project-ref.supabase.co/functions/v1/predict-price' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"hotelId": "test-hotel", "targetDates": {"checkin": "2024-08-01", "checkout": "2024-08-02"}}'
```

## 📊 モニタリング設定

### 1. Supabase ダッシュボード
- Database metrics
- Function logs
- Auth analytics

### 2. Vercel Analytics
- Performance metrics
- Core Web Vitals
- User analytics

## 🔧 トラブルシューティング

### Edge Functions エラー
```bash
# ログ確認
npx supabase functions logs predict-price

# 再デプロイ
npx supabase functions deploy predict-price --no-verify-jwt
```

### Build エラー
```bash
# 依存関係再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュクリア
npm run build -- --force
```

## 🎯 最終チェックリスト

- [ ] Supabaseプロジェクト作成完了
- [ ] データベーステーブル作成完了
- [ ] Edge Functions デプロイ完了
- [ ] 環境変数設定完了
- [ ] フロントエンドビルド成功
- [ ] Vercelデプロイ完了
- [ ] 全機能動作確認完了
- [ ] モバイル表示確認完了
- [ ] PWA動作確認完了

## 🚀 運用開始

デプロイ完了後のURL:
- **本番サイト**: https://your-app.vercel.app
- **Supabase**: https://your-project-ref.supabase.co
- **ダッシュボード**: https://app.supabase.com

---

**おめでとうございます！** 🎉
**LMS ホテル予約システム**が本番環境で稼働開始しました。