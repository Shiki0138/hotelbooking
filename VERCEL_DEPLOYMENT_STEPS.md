# Vercel本番環境デプロイ手順

## 現在の状況
- ✅ vercel.json作成済み
- ✅ package.json設定済み  
- ✅ デプロイスクリプト準備済み
- ✅ Vercel CLIインストール済み

## 次の手順

### 1. Supabase本番インスタンスの作成

```bash
# Supabaseダッシュボードで実行
# 1. https://app.supabase.io にアクセス
# 2. 新規プロジェクト作成
# 3. プロジェクト名: lastminutestay-prod
# 4. データベースパスワード設定
# 5. リージョン: Tokyo推奨
```

### 2. Supabaseスキーマの適用

Supabase SQL Editorで以下を実行:
```sql
-- supabase/schema.sqlの内容をコピー&ペースト
```

### 3. 環境変数の生成

```bash
# CRON_SECRETの生成
openssl rand -base64 32

# NEXTAUTH_SECRETの生成  
openssl rand -base64 32
```

### 4. Vercelデプロイコマンド

```bash
# プロジェクトルートで実行
vercel

# 質問への回答:
# ? Set up and deploy "~/Desktop/system/hotelbooking"? [Y/n] Y
# ? Which scope do you want to deploy to? [Your Account]
# ? Link to existing project? [y/N] N
# ? What's your project's name? lastminutestay
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] N
```

### 5. 環境変数の設定

Vercelダッシュボード(https://vercel.com/dashboard)で:

1. プロジェクトを選択
2. Settings → Environment Variables
3. 以下を追加:

```
SUPABASE_URL=[Supabase Project URL]
SUPABASE_ANON_KEY=[Supabase Anon Key]
SUPABASE_SERVICE_KEY=[Supabase Service Key]
RAKUTEN_API_KEY=[楽天APIキー]
RESEND_API_KEY=[ResendAPIキー]
NEXT_PUBLIC_APP_URL=https://lastminutestay.vercel.app
NEXT_PUBLIC_SUPABASE_URL=[Supabase Project URL]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Supabase Anon Key]
CRON_SECRET=[生成したCRON_SECRET]
NEXTAUTH_URL=https://lastminutestay.vercel.app
NEXTAUTH_SECRET=[生成したNEXTAUTH_SECRET]
```

### 6. 本番デプロイ

```bash
vercel --prod
```

### 7. 動作確認チェックリスト

- [ ] トップページアクセス
- [ ] ユーザー登録機能
- [ ] ログイン機能
- [ ] ホテル検索機能
- [ ] リアルタイム更新
- [ ] 希望条件登録
- [ ] メール通知テスト

## API Keys取得先

### Rakuten Travel API
1. https://webservice.rakuten.co.jp/
2. アプリID発行
3. 楽天トラベル施設検索APIを有効化

### Resend
1. https://resend.com/
2. アカウント作成
3. API Keys → Create API Key
4. ドメイン認証設定

## トラブルシューティング

### ビルドエラー時
```bash
# ログ確認
vercel logs

# 再デプロイ
vercel --prod --force
```

### Function実行エラー時
- Vercel Functions logを確認
- 環境変数の設定確認

## デプロイ完了後のURL

- 本番環境: https://lastminutestay.vercel.app
- API: https://lastminutestay.vercel.app/api/
- 管理画面: https://vercel.com/[your-account]/lastminutestay