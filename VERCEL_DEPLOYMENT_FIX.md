# Vercel本番環境修正手順

## 問題
- https://lastminutestay.vercel.app にアクセスしても表示されない
- 404エラーまたは空白ページ

## 緊急修正手順

### 1. Vercelプロジェクト確認
```bash
vercel ls
```

### 2. ドメイン確認  
```bash
vercel domains ls
```

### 3. 最新ビルドのデプロイ
```bash
# フロントエンドディレクトリで実行
cd frontend
vercel --prod
```

### 4. 環境変数確認
Vercelダッシュボードで以下を確認:
- NEXT_PUBLIC_APP_URL
- SUPABASE_URL
- SUPABASE_ANON_KEY

### 5. ビルド設定確認
vercel.jsonに以下を追加:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 6. 代替デプロイ方法
GitHubリポジトリ経由でデプロイ:
1. GitHubにプッシュ
2. Vercelでリポジトリ連携
3. 自動デプロイ

## 一時的な解決策
working-app.htmlを本番環境にデプロイ:
```bash
vercel --prod --no-build
```