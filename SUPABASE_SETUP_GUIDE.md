# Supabase セットアップガイド

## 1. Supabaseプロジェクト作成（5分）

1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. GitHubでログイン
4. 「New Project」をクリック
5. 以下を入力：
   - Project name: `lastminutestay`
   - Database Password: 安全なパスワード
   - Region: `Northeast Asia (Tokyo)`

## 2. 環境変数取得（2分）

1. プロジェクトダッシュボードから「Settings」→「API」
2. 以下をコピー：
   - `Project URL` → NEXT_PUBLIC_SUPABASE_URL
   - `anon public` → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role` → SUPABASE_SERVICE_ROLE_KEY

## 3. Vercel環境変数設定（3分）

1. https://vercel.com/dashboard にアクセス
2. プロジェクト選択 → Settings → Environment Variables
3. 以下を追加：
   ```
   NEXT_PUBLIC_SUPABASE_URL = [Project URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [anon public key]
   RAKUTEN_API_KEY = [楽天APIキー]
   RAKUTEN_APP_ID = [楽天アプリID]
   ```

## 4. データベース初期化（5分）

1. Supabaseダッシュボード → SQL Editor
2. 以下のSQLを実行：

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables (schema.sql の内容をコピー)
```

## 5. Edge Functions デプロイ（10分）

```bash
# Supabase CLIインストール
brew install supabase/tap/supabase

# ログイン
supabase login

# プロジェクトリンク
supabase link --project-ref [your-project-ref]

# Functions デプロイ
supabase functions deploy hotel-search
```

## 6. 動作確認

1. https://hotelbookingsystem-seven.vercel.app/ にアクセス
2. ホテル検索を実行
3. 実際の楽天トラベルデータが表示されることを確認

## トラブルシューティング

- **CORS エラー**: Supabase Dashboard → Authentication → URL Configuration で Vercel URLを追加
- **API キーエラー**: Vercel の環境変数が正しく設定されているか確認
- **データベースエラー**: SQLスキーマが正しく実行されているか確認