# 環境変数設定ガイド - Hotel Booking System

## 無料アカウント作成手順

### 1. Supabase (データベース・認証)
1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインアップ
4. 新規プロジェクト作成
   - Project name: hotel-booking-prod
   - Database Password: 強力なパスワードを生成
   - Region: Northeast Asia (Tokyo)
5. プロジェクト作成後、Settings → API から以下を取得:
   - Project URL (SUPABASE_URL)
   - anon public key (SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_ROLE_KEY)

### 2. SendGrid (メール送信)
1. https://sendgrid.com にアクセス
2. 「Try for Free」をクリック
3. アカウント情報を入力（無料プラン: 100通/日）
4. メール認証を完了
5. Settings → API Keys から新規APIキー作成
   - API Key Name: hotel-booking-prod
   - Full Access を選択
   - APIキーをコピー (SENDGRID_API_KEY)

### 3. Google Maps API
1. https://console.cloud.google.com にアクセス
2. 新規プロジェクト作成: hotel-booking-prod
3. APIs & Services → Enable APIs
4. 以下のAPIを有効化:
   - Maps JavaScript API
   - Places API
   - Geocoding API
5. Credentials → Create Credentials → API Key
6. APIキーに制限を設定:
   - Application restrictions: HTTP referrers
   - Website restrictions: https://hotelbooking.vercel.app/*
7. APIキーをコピー (GOOGLE_MAPS_API_KEY)

## 環境変数設定手順

### Backend (.env)
```bash
# Backend Environment Variables
PORT=5000
NODE_ENV=production
JWT_SECRET=hb-prod-jwt-secret-2025-secure-key-x9k2m4p7

# Supabase Configuration
SUPABASE_URL=[Supabaseプロジェクトから取得]
SUPABASE_ANON_KEY=[Supabaseプロジェクトから取得]
SUPABASE_SERVICE_ROLE_KEY=[Supabaseプロジェクトから取得]

# SendGrid Configuration
SENDGRID_API_KEY=[SendGridから取得]
EMAIL_FROM=noreply@hotelbooking.com
EMAIL_FROM_NAME=Hotel Booking System

# Rakuten Travel API
RAKUTEN_APP_ID=[楽天APIから取得]
RAKUTEN_AFFILIATE_ID=[楽天アフィリエイトIDから取得]

# Google Maps
GOOGLE_MAPS_API_KEY=[Google Cloudから取得]

# Frontend URL
FRONTEND_URL=https://hotelbooking.vercel.app
```

### Frontend (.env)
```bash
REACT_APP_API_URL=https://api.hotelbooking.com
REACT_APP_SUPABASE_URL=[Supabaseプロジェクトから取得]
REACT_APP_SUPABASE_ANON_KEY=[Supabaseプロジェクトから取得]
REACT_APP_GOOGLE_MAPS_API_KEY=[Google Cloudから取得]
```

## セキュリティ注意事項
1. 本番環境の.envファイルは絶対にGitにコミットしない
2. APIキーは定期的にローテーションする
3. APIキーには適切な制限を設定する
4. サービスロールキーは絶対にフロントエンドで使用しない

## 無料枠の制限
- Supabase: 500MB DB, 2GB bandwidth/月
- SendGrid: 100通/日
- Google Maps: $200クレジット/月
- Vercel: 100GB bandwidth/月

## 作成者
Worker1 - 2025年7月3日