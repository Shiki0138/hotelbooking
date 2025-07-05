# 🚀 Supabase本番環境構築手順書

**作成者**: Worker2  
**作成日**: 2025-07-04  
**目的**: LastMinuteStay本番環境データベース構築

## 📋 前提条件
- Supabaseアカウント（無料）
- GitHubアカウント（推奨）
- 基本的なSQL知識

## 🔧 セットアップ手順

### 1️⃣ Supabaseプロジェクト作成（5分）

1. [Supabase](https://supabase.com) にアクセス
2. 「Start your project」をクリック
3. GitHubでサインイン
4. 「New project」をクリック
5. 以下を入力：
   ```
   Organization: 個人アカウントを選択
   Project name: lastminutestay-prod
   Database Password: [強力なパスワードを生成]
   Region: Northeast Asia (Tokyo)
   Pricing Plan: Free tier
   ```
6. 「Create new project」をクリック

### 2️⃣ 認証情報の取得（2分）

プロジェクト作成後、以下の手順で認証情報を取得：

1. **Project Settings** → **API** へ移動
2. 以下をコピーして保存：
   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 3️⃣ データベーススキーマ適用（10分）

1. Supabaseダッシュボードの **SQL Editor** へ移動
2. 「New query」をクリック
3. `PRODUCTION_DATABASE_SCHEMA.sql` の内容をコピー
4. SQLエディタに貼り付け
5. 「Run」をクリック

**注意**: エラーが出た場合は、セクションごとに実行してください

### 4️⃣ 認証設定（5分）

1. **Authentication** → **URL Configuration** へ移動
2. 以下を設定：
   ```
   Site URL: https://lastminutestay.vercel.app
   Redirect URLs:
   - https://lastminutestay.vercel.app/auth/callback
   - http://localhost:3000/auth/callback
   - http://localhost:5173/auth/callback
   - http://localhost:8080/auth/callback
   ```
3. 「Save」をクリック

### 5️⃣ Row Level Security (RLS) 確認（3分）

1. **Table Editor** へ移動
2. 各テーブルのRLSが有効になっていることを確認
3. ポリシーが正しく適用されていることを確認

### 6️⃣ 環境変数の更新（5分）

#### Backend (.env)
```env
# Supabase Production
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Frontend (.env.local)
```env
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 7️⃣ 接続テスト（5分）

1. バックエンドサーバーを再起動
2. 以下のコマンドでテスト：
   ```bash
   curl http://localhost:8000/health
   ```
3. レスポンスで `database: connected` を確認

## 📊 テーブル構成

### コアテーブル
- `hotels` - ホテル情報（楽天APIキャッシュ）
- `user_profiles` - ユーザープロファイル
- `watchlist` - 価格監視リスト
- `hotel_price_history` - 価格履歴
- `notification_queue` - 通知キュー
- `user_notification_preferences` - 通知設定
- `notification_history` - 通知履歴

### セキュリティ
- 全テーブルでRLS有効
- ユーザーは自分のデータのみアクセス可能
- ホテル情報と価格履歴は公開読み取り

### パフォーマンス
- 適切なインデックス設定済み
- 自動クリーンアップ機能実装
- ビューで高速クエリ対応

## 🔍 動作確認チェックリスト

- [ ] Supabaseプロジェクト作成完了
- [ ] 認証情報取得完了
- [ ] スキーマ適用成功
- [ ] RLS有効化確認
- [ ] 環境変数更新完了
- [ ] 接続テスト成功
- [ ] テーブル作成確認
- [ ] インデックス作成確認
- [ ] トリガー動作確認

## ⚠️ トラブルシューティング

### pg_cron エラー
無料プランでは利用不可。該当部分をコメントアウトして実行。

### RLSエラー
テーブルエディタから手動でRLSを有効化。

### 接続エラー
1. 環境変数の確認
2. Supabaseダッシュボードでプロジェクトステータス確認
3. ネットワーク設定確認

## 📝 次のステップ

1. 本番用シードデータの準備
2. バックエンドのデプロイ
3. フロントエンドのデプロイ
4. エンドツーエンドテスト
5. 監視設定

---
**完了予定時刻**: 30分以内  
**サポート**: 問題があれば即座に報告