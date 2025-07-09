# Vercel + Supabaseデプロイメントガイド

## 前提条件

1. Vercelアカウント
2. Supabaseアカウント
3. GitHubアカウント

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にログイン
2. 新規プロジェクトを作成
3. プロジェクトのURLとAPIキーを取得：
   - Settings → API → Project URL
   - Settings → API → anon public key
   - Settings → API → service_role key

### 2. データベースのセットアップ

Supabaseダッシュボードで以下のSQLを実行：

```sql
-- /database/combined_schema.sqlの内容を実行
```

### 3. Vercelへのデプロイ

#### バックエンド

1. GitHubにプッシュ
2. Vercelダッシュボードで「New Project」
3. GitHubリポジトリを選択
4. Root Directoryを`backend`に設定
5. 環境変数を設定（下記参照）
6. デプロイ

#### フロントエンド

1. 同じリポジトリで新規プロジェクト作成
2. Root Directoryを`frontend`に設定
3. 環境変数を設定
4. デプロイ

### 4. 環境変数の設定

Vercelダッシュボード → Settings → Environment Variables

必須の環境変数：
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
JWT_SECRET=ランダムな文字列（openssl rand -base64 32で生成）
FRONTEND_URL=https://your-frontend.vercel.app
```

オプション：
```
SENDGRID_API_KEY=（メール送信用）
RAKUTEN_APPLICATION_ID=（楽天トラベルAPI）
```

### 5. CORSの設定

バックエンドの環境変数に追加：
```
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://*.vercel.app
```

## トラブルシューティング

### エラー: Module not found

```bash
npm install
```

### エラー: Database connection failed

- Supabaseの接続情報を確認
- 環境変数が正しく設定されているか確認

### エラー: CORS policy

- ALLOWED_ORIGINSにフロントエンドURLが含まれているか確認
- Vercelのプレビューデプロイメントも許可する場合は`https://*.vercel.app`を追加

## 本番環境のチェックリスト

- [ ] Supabase Row Level Security (RLS)の有効化
- [ ] 環境変数の設定完了
- [ ] CORSの設定
- [ ] Rate Limitingの確認
- [ ] エラーログの監視設定

## 削除されたファイル

以下のファイルは従来のサーバーデプロイ用のため削除されました：
- terraform/
- kubernetes/
- Dockerfile
- docker-compose.yml
- scripts/setup-production.sh
- .env.production

Vercel + Supabaseではこれらは不要です。