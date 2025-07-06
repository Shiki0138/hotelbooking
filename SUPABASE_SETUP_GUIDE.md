# Supabaseフルスタック セットアップガイド

## 1. Supabaseプロジェクトの作成

### ステップ1: アカウント作成
1. [Supabase](https://supabase.com)にアクセス
2. GitHubアカウントでサインアップ
3. 「New project」をクリック

### ステップ2: プロジェクト設定
- **Project name**: hotel-booking-system
- **Database Password**: 強力なパスワードを生成（保存しておく）
- **Region**: Asia Northeast (Tokyo) を推奨
- **Plan**: Free tier でOK

## 2. 接続情報の取得

プロジェクト作成後、以下の情報を取得：

### Settings → API
- **Project URL**: `https://xxxxx.supabase.co`
- **anon public**: `eyJhbGci...`
- **service_role**: `eyJhbGci...`

### Settings → Database
- **Connection string**: `postgresql://...`

これらを.envファイルに設定します。
EOF < /dev/null