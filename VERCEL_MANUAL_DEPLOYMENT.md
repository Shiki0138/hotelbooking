# Vercel手動デプロイ手順

## 現在の状況

すべての準備が整いました。以下の手動ステップを実行してください。

## 1. Vercelログイン

```bash
vercel login
```
メールアドレスを入力し、認証メールから確認

## 2. プロジェクト初期化

```bash
vercel
```

以下の質問に回答:
- Set up and deploy? → **Y**
- Which scope? → **あなたのアカウント**
- Link to existing project? → **N**
- Project name? → **lastminutestay**
- In which directory is your code located? → **./**
- Override settings? → **N**

## 3. 環境変数の設定

### 3-1. シークレットキーの生成

```bash
# CRON_SECRET生成
openssl rand -base64 32

# NEXTAUTH_SECRET生成
openssl rand -base64 32
```

### 3-2. Supabase設定

1. https://app.supabase.io にアクセス
2. 新規プロジェクト作成
3. プロジェクト名: **lastminutestay-prod**
4. Settings → APIから以下を取得:
   - Project URL
   - anon public key
   - service_role key

### 3-3. Vercel環境変数設定

https://vercel.com/[your-account]/lastminutestay/settings/environment-variables

追加する環境変数:

```
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_ANON_KEY=[anon key]
SUPABASE_SERVICE_KEY=[service key]
RAKUTEN_API_KEY=[楽天APIキー]
RESEND_API_KEY=[ResendAPIキー]
NEXT_PUBLIC_APP_URL=https://lastminutestay.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
CRON_SECRET=[生成した値]
NEXTAUTH_URL=https://lastminutestay.vercel.app
NEXTAUTH_SECRET=[生成した値]
```

## 4. Supabaseスキーマ適用

Supabase SQL Editorで実行:

```bash
cat supabase/schema.sql
```

上記コマンドの出力をコピーしてSQL Editorで実行

## 5. 本番デプロイ

```bash
vercel --prod
```

## 6. 動作確認

デプロイ完了後、以下を確認:

1. **トップページ**: https://lastminutestay.vercel.app
2. **テストページ1**: https://lastminutestay.vercel.app/test-phase1.html
3. **テストページ2**: https://lastminutestay.vercel.app/test-phase2.html

## 7. Cron動作確認

Vercelダッシュボード → Functions → Logsで確認:
- `match-preferences`: 毎時0分
- `process-emails`: 15分ごと

## トラブルシューティング

### ビルドエラーの場合
```bash
vercel logs
```

### 再デプロイ
```bash
vercel --prod --force
```

## 完了報告内容

デプロイ完了後、以下を報告してください:
- デプロイURL
- 各機能の動作確認結果
- エラーがあれば詳細