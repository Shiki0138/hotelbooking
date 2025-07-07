# Vercel環境変数設定ガイド

## 必要な環境変数

Vercelダッシュボードで以下の環境変数を設定してください：

### フロントエンド環境変数
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=https://your-vercel-app.vercel.app/api
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### バックエンド環境変数
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
RAKUTEN_APP_ID=your-rakuten-app-id
SENDGRID_API_KEY=your-sendgrid-api-key
JWT_SECRET=your-secure-jwt-secret
NODE_ENV=production
```

## 設定手順

1. Vercelダッシュボード (https://vercel.com) にログイン
2. プロジェクトを選択
3. Settings → Environment Variables に移動
4. 上記の環境変数を追加
5. Production、Preview、Development の環境を選択
6. Save をクリック

## 重要な注意事項

- `SUPABASE_SERVICE_ROLE_KEY` は機密情報のため、安全に管理してください
- `JWT_SECRET` は推測困難な長い文字列を使用してください
- 楽天APIとSendGridのキーは事前に取得が必要です