# 🚀 Vercel デプロイ手順

## 📋 デプロイ前チェックリスト

### ✅ 完了済み
- Supabaseデータベース作成
- Edge Functions デプロイ
- フロントエンドビルド成功

### ⚠️ 要設定
- Supabase Anon Key の取得

## 🔧 デプロイ手順

### 1. Vercel CLIでデプロイ

```bash
cd /Users/leadfive/Desktop/system/hotelbooking/frontend
npx vercel
```

### 2. プロジェクト設定

初回デプロイ時の質問：
- Set up and deploy? → **Y**
- Which scope? → あなたのアカウントを選択
- Link to existing project? → **N**（新規作成）
- Project name? → **lms-hotel**
- In which directory is your code? → **./** (現在のディレクトリ)

### 3. 環境変数設定

Vercelダッシュボードで設定：
```
VITE_SUPABASE_URL=https://nanleckihedkmikctltb.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ACTUAL_ANON_KEY
```

### 4. 本番デプロイ

```bash
npx vercel --prod
```

## 🌐 デプロイ後の確認

### URLパターン
- プレビュー: `https://lms-hotel-xxx.vercel.app`
- 本番: `https://lms-hotel.vercel.app`

### 動作確認項目
1. ✅ ホームページ表示
2. ✅ タイムセールバナー
3. ✅ ホテル一覧
4. ⚠️ AI価格予測（Anon Key必要）
5. ⚠️ ユーザー認証（Anon Key必要）

## 🔑 Supabase Anon Key取得

1. https://supabase.com/dashboard/project/nanleckihedkmikctltb/settings/api
2. **Project API keys** → **anon public**
3. コピーしてVercel環境変数に設定

## 📱 モバイル確認

スマートフォンでアクセスして以下を確認：
- スワイプ操作
- レスポンシブデザイン
- PWAインストール

## 🎯 完成！

デプロイ完了後、URLを共有してください。
システムの全機能を本番環境で確認できます。