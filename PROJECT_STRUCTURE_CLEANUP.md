# 🏗️ プロジェクト構造の整理案

## 現在の問題点

1. **重複したpackage.json**
   - `/hotelbooking/package.json` 
   - `/hotelbooking/backend/package.json`
   - `/hotelbooking/frontend/package.json`

2. **混乱したディレクトリ**
   - `/hotelbooking/backend/frontend/` (なぜバックエンド内にフロントエンド？)

3. **npm run devの混乱**
   - frontendディレクトリで`npm run dev`を実行するとバックエンドが起動

## 推奨される構造

```
/hotelbooking/
├── README.md
├── .gitignore
├── package.json (ワークスペース設定のみ)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── .env.local
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       ├── services/
│       └── styles/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── src/
│       ├── server.ts
│       ├── controllers/
│       ├── services/
│       └── models/
└── supabase/
    ├── config.toml
    ├── migrations/
    └── functions/
        ├── collect-prices/
        └── predict-price/
```

## 修正手順

### 1. ルートpackage.jsonをワークスペース設定に変更
```json
{
  "name": "lms-hotel-booking",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build"
  }
}
```

### 2. 不要なディレクトリを削除
```bash
rm -rf /hotelbooking/backend/frontend
```

### 3. 各package.jsonのスクリプトを明確化
- frontend: Vite関連のみ
- backend: Node.js/Express関連のみ

## 現在の回避策

フロントエンドを起動する場合：
```bash
cd /Users/leadfive/Desktop/system/hotelbooking/frontend
npx vite --port 3000
```

バックエンドを起動する場合：
```bash
cd /Users/leadfive/Desktop/system/hotelbooking/backend
npm run dev
```