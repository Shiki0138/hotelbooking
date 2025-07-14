# 🏗️ プロジェクト構造の整理完了

## ✅ 実施した修正

### 1. 不要なディレクトリの削除
- `/backend/frontend` ディレクトリを削除しました

### 2. package.json の整理
- ルートのpackage.jsonをワークスペース設定に変更
- フロントエンドとバックエンドを明確に分離

## 📁 正しいプロジェクト構造

```
/hotelbooking/
├── package.json          # ワークスペース管理（メイン）
├── frontend/             # フロントエンドアプリ
│   ├── package.json      # Vite/React設定
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── components/
│   │   └── services/
│   └── public/
├── backend/              # バックエンドAPI
│   ├── package.json      # Express/Node.js設定
│   ├── src/
│   │   ├── server.ts
│   │   └── controllers/
│   └── dist/
└── supabase/            # Supabase設定
    ├── migrations/
    └── functions/
```

## 🚀 使用方法

### フロントエンド開発
```bash
# 方法1: ルートから
npm run dev:frontend

# 方法2: frontendディレクトリから
cd frontend
npx vite
```

### バックエンド開発
```bash
# 方法1: ルートから
npm run dev:backend

# 方法2: backendディレクトリから
cd backend
npm run dev
```

### ビルド
```bash
# フロントエンド
npm run build:frontend

# バックエンド
npm run build:backend
```

## ⚠️ 注意事項

1. **frontendディレクトリで`npm run dev`を使わない**
   - 代わりに `npx vite` を使用
   - または、ルートから `npm run dev:frontend`

2. **環境変数の設定**
   - Frontend: `.env.local`
   - Backend: `.env`

## 🎯 次のステップ

1. Vercelデプロイ
   ```bash
   cd frontend
   npx vercel --prod
   ```

2. 環境変数設定（Vercelダッシュボード）
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`