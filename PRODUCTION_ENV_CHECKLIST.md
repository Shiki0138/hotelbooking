# 本番環境変数チェックリスト

## 必須環境変数

### 🔐 認証・セキュリティ
- [ ] `JWT_SECRET` - JWT認証用秘密鍵（強力なランダム文字列）
- [ ] `NODE_ENV` - "production"に設定

### 🗄️ Supabase設定
- [ ] `SUPABASE_URL` - SupabaseプロジェクトURL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - サービスロールキー（管理者権限）
- [ ] `SUPABASE_ANON_KEY` - 匿名アクセス用キー

### 🏨 楽天Travel API
- [ ] `RAKUTEN_APPLICATION_ID` - 楽天アプリケーションID
- [ ] `RAKUTEN_AFFILIATE_ID` - 楽天アフィリエイトID（オプション）

### 📧 メール通知（Resend）
- [ ] `RESEND_API_KEY` - Resend APIキー
- [ ] `FROM_EMAIL` - 送信元メールアドレス（例: noreply@lastminutestay.com）
- [ ] `DOMAIN` - ドメイン名（例: lastminutestay.com）

### 💳 決済（Stripe）
- [ ] `STRIPE_SECRET_KEY` - Stripe秘密鍵
- [ ] `STRIPE_PUBLISHABLE_KEY` - Stripe公開鍵

### 📊 監視・ログ（オプション）
- [ ] `SENTRY_DSN` - Sentryエラー監視用DSN
- [ ] `LOG_LEVEL` - ログレベル（info/warn/error）

### ⚙️ システム設定
- [ ] `PORT` - APIポート番号（デフォルト: 3001）
- [ ] `DATABASE_URL` - データベース接続URL（Supabase利用時は不要）

### 🔄 リアルタイム監視設定
- [ ] `MONITOR_INTERVAL_MINUTES` - 監視間隔（デフォルト: 15）
- [ ] `MAX_DAILY_ALERTS_PER_USER` - 1日あたりの最大アラート数（デフォルト: 10）
- [ ] `PRICE_DROP_THRESHOLD` - 価格下落通知閾値（円）
- [ ] `PRICE_DROP_PERCENTAGE` - 価格下落通知閾値（%）

## Vercelでの設定方法

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. Settings → Environment Variables
4. 各環境変数を追加（Production環境を選択）
5. 保存後、再デプロイ

## セキュリティ注意事項

- 秘密鍵は絶対にコードにハードコーディングしない
- 環境変数はVercelダッシュボードから安全に設定
- SERVICE_ROLE_KEYは特に機密性が高いため厳重に管理
- 本番環境では必ずHTTPSを使用