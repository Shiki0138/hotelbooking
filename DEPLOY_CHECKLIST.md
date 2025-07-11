# デプロイ前チェックリスト 🚀

## 自動チェック

```bash
# 詳細なチェック
npm run check-deploy

# クイックチェック
./quick-check.sh
```

## 手動チェック項目

### 1. 環境変数の設定 ⚙️

#### Frontend (.env)
- [ ] `VITE_SUPABASE_URL` - Supabase URLを設定（オプション）
- [ ] `VITE_SUPABASE_ANON_KEY` - Supabase公開キーを設定（オプション）
- [ ] `VITE_API_URL` - バックエンドAPIのURL（デフォルト: http://localhost:8000）

#### Backend (.env)
- [ ] `SUPABASE_URL` - Supabase URL（オプション）
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabaseサービスロールキー（オプション）
- [ ] `RAKUTEN_API_KEY` - 楽天API キー（本番環境で必要）
- [ ] `RAKUTEN_AFFILIATE_ID` - 楽天アフィリエイトID（収益化に必要）
- [ ] `SMTP_*` - メール送信設定（オプション）

### 2. ビルドとテスト 🧪

- [ ] フロントエンドビルド成功: `cd frontend && npm run build`
- [ ] バックエンドビルド成功: `cd backend && npm run build`
- [ ] ローカルでの動作確認完了

### 3. Vercel設定 🔧

#### Frontend (vercel.json)
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite"
}
```

#### Backend (vercel.json)
```json
{
  "functions": {
    "api/*.ts": {
      "runtime": "@vercel/node@2.15.9"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

### 4. データベース 🗄️

- [ ] Supabaseプロジェクトが作成済み（オプション）
- [ ] スキーマ（backend/src/database/schema.sql）が適用済み（使用する場合）

### 5. セキュリティ 🔒

- [ ] 環境変数に機密情報が含まれていない
- [ ] `.env`ファイルが`.gitignore`に含まれている
- [ ] APIキーが本番用に更新されている

### 6. パフォーマンス ⚡

- [ ] 不要なconsole.logが削除されている
- [ ] 画像が最適化されている
- [ ] 未使用の依存関係が削除されている

### 7. Git 📝

- [ ] 全ての変更がコミットされている
- [ ] 適切なブランチにいる（main/master）
- [ ] タグが付けられている（オプション）

## デプロイコマンド

### Vercelでのデプロイ

```bash
# 初回セットアップ
vercel

# 本番デプロイ
vercel --prod
```

### 手動デプロイ

```bash
# フロントエンド
cd frontend
npm run build
# distフォルダをホスティングサービスにアップロード

# バックエンド
cd backend
npm run build
# Vercel Functionsまたは他のサーバーレスプラットフォームにデプロイ
```

## トラブルシューティング 🔧

### ビルドエラーが発生する場合

1. `node_modules`を削除して再インストール
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. TypeScriptエラーの確認
   ```bash
   npx tsc --noEmit
   ```

3. 環境変数の確認
   ```bash
   # .envファイルが正しく設定されているか確認
   cat .env
   ```

### デプロイ後の確認

- [ ] トップページが表示される
- [ ] ホテル一覧が表示される
- [ ] 予約ボタンが機能する
- [ ] 認証機能が動作する（実装済みの場合）

## 注意事項 ⚠️

1. **開発環境の設定はデプロイしない**
   - モックデータやデバッグコードを削除
   - 開発用URLを本番用に変更

2. **APIキーの管理**
   - 本番環境では必ず環境変数を使用
   - Vercelの環境変数設定を活用

3. **CORS設定**
   - 本番環境のドメインを許可リストに追加

## サポート 💬

問題が発生した場合：
1. エラーログを確認
2. Vercelのログを確認
3. ブラウザの開発者ツールでエラーを確認