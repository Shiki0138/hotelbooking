# Vercelデプロイ簡易手順

## フロントエンドのみVercelでホスティング

### 1. Vercelダッシュボードから手動デプロイ

1. [Vercel](https://vercel.com/)にアクセス
2. 「New Project」をクリック
3. 「Import Third-Party Git Repository」から：
   - リポジトリURL: あなたのGitHubリポジトリ
   - または「Upload」から`frontend`フォルダを直接アップロード

### 2. ビルド設定

プロジェクト設定で以下を入力：
- **Framework Preset**: Other
- **Root Directory**: `frontend`
- **Build Command**: `npm install`
- **Output Directory**: `.`
- **Install Command**: `npm install`

### 3. 環境変数設定

Settings → Environment Variables：
- `VITE_GOOGLE_MAPS_API_KEY`: あなたのGoogle Maps APIキー

### 4. デプロイ実行

「Deploy」ボタンをクリック

## バックエンドについて

バックエンドAPIは以下の選択肢があります：

1. **Supabase Edge Functions**（推奨）
   - Supabaseで直接APIを実行
   - データベースと同じ場所でホスティング

2. **別途APIサーバー**
   - Heroku、Railway、Render等
   - Node.jsアプリとしてデプロイ

3. **ローカル開発のみ**
   - `cd backend && npm run dev`
   - フロントエンドからlocalhost:8000にアクセス

現在の構成では、フロントエンドは静的HTMLサイトとしてVercelでホスティングし、APIはSupabaseまたは別のサービスで運用するのが最適です。