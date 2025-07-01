# Vercel本番環境デプロイガイド

## 前提条件
- Vercelアカウント
- Supabaseアカウント
- Resendアカウント
- 楽天APIキー

## 手順

### 1. Supabase本番インスタンスの設定

1. [Supabase](https://app.supabase.io)にログイン
2. 新規プロジェクト作成: "lastminutestay-prod"
3. データベース設定:
   ```bash
   # supabase/schema.sqlの内容をSQL Editorで実行
   ```
4. Authentication設定:
   - Email認証を有効化
   - サイトURLを設定: https://lastminutestay.vercel.app

### 2. Vercelプロジェクトの作成

```bash
# Vercel CLIのインストール（未インストールの場合）
npm i -g vercel

# プロジェクトディレクトリで実行
vercel

# プロンプトに従って設定:
# - Setup and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? lastminutestay
# - Directory? ./
# - Override settings? No
```

### 3. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定:

```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
RAKUTEN_API_KEY=your-rakuten-api-key
RESEND_API_KEY=your-resend-api-key
NEXT_PUBLIC_APP_URL=https://lastminutestay.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
CRON_SECRET=generate-secure-random-string
NEXTAUTH_URL=https://lastminutestay.vercel.app
NEXTAUTH_SECRET=generate-secure-random-string
```

### 4. Cron設定の確認

vercel.jsonで定義されたCronジョブ:
- match-preferences: 毎時0分
- process-emails: 15分ごと

### 5. デプロイ実行

```bash
vercel --prod
```

### 6. 動作確認

1. トップページアクセス: https://lastminutestay.vercel.app
2. ユーザー登録テスト
3. ホテル検索テスト
4. リアルタイム機能テスト
5. メール通知テスト

## トラブルシューティング

### ビルドエラーの場合
- Node.jsバージョン確認（18以上）
- 依存関係の確認: `npm install`

### API接続エラーの場合
- 環境変数の確認
- CORS設定の確認

### Cron実行エラーの場合
- CRON_SECRETの設定確認
- Vercelログの確認
