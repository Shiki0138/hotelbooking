# 本番環境デプロイ手順（UI確認用）

## 準備完了状況
✅ frontend/dist/index.html - 動作確認済みUI（ホテル検索・表示機能付き）
✅ 静的ファイルのみでの動作確認済み

## デプロイ手順

### 方法1: Vercel CLIを使用（推奨）
```bash
# 1. プロジェクトルートに移動
cd /Users/leadfive/Desktop/system/hotelbooking

# 2. Vercelにログイン
vercel login

# 3. frontendディレクトリをデプロイ
cd frontend
vercel --prod

# 質問への回答:
# - Set up and deploy? → Y
# - Which scope? → あなたのアカウント選択
# - Link to existing project? → Y (lastminutestayを選択)
# - What's your project's name? → lastminutestay
```

### 方法2: Vercel Web UIを使用
1. https://vercel.com にアクセス
2. "New Project" → "Import Project"
3. "Upload Folder" を選択
4. frontend/distフォルダをドラッグ&ドロップ
5. "Deploy"をクリック

### 方法3: GitHub経由
1. GitHubリポジトリを作成
2. 以下のコマンドを実行:
```bash
git init
git add frontend/dist/*
git commit -m "Add working UI"
git remote add origin [YOUR_GITHUB_REPO_URL]
git push -u origin main
```
3. Vercelで"Import Git Repository"を選択
4. リポジトリを選択してデプロイ

## デプロイ後の確認

1. デプロイ完了後、提供されたURLにアクセス
2. 以下の機能を確認:
   - ✅ トップページの表示
   - ✅ ホテル一覧の表示（10件）
   - ✅ 検索機能（東京、京都、大阪で検索）
   - ✅ 予約ボタンの動作

## トラブルシューティング

### 404エラーの場合
vercel.jsonに以下を追加:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### ビルドエラーの場合
package.jsonのbuildコマンドを確認:
```json
{
  "scripts": {
    "build": "echo 'No build needed'"
  }
}
```