# LastMinuteStay システム設計概要書

## 更新履歴
- 2025-06-23: 初版作成 - ポート変更とシステム起動手順の確立

## プロジェクト概要
LastMinuteStayは、当日予約に特化したホテル予約システムです。ユーザーが30秒以内に今日泊まれるホテルを見つけて予約できることを目標としています。

## システム構成

### ディレクトリ構造
```
/Users/MBP/Desktop/system/hotelbooking/
├── backend/                    # バックエンドAPI (Express + TypeScript)
├── lastminutestay-frontend/    # メインフロントエンド (Next.js 15.3.4)
├── lastminutestay/            # 別バージョンのフロントエンド
├── frontend/                  # 旧フロントエンド
├── docs/                      # ドキュメント
├── instructions/              # エージェント指示書
└── CLAUDE.md                  # エージェント通信システム設定

```

### 技術スタック

#### バックエンド
- Node.js v23.11.0
- Express.js
- TypeScript
- Prisma ORM (モックモードで動作中)
- Redis (キャッシュ用)
- Socket.io (リアルタイム通信)

#### フロントエンド
- Next.js 15.3.4
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion (アニメーション)
- Radix UI (UIコンポーネント)

## 現在の動作環境

### ポート設定
- **バックエンドAPI**: ポート 8081
- **フロントエンド**: ポート 3002

### 環境変数設定

#### バックエンド (.env)
```env
NODE_ENV=development
PORT=8081
DATABASE_URL="postgresql://user:password@localhost:5432/lastminutestay"
REDIS_URL="redis://localhost:6379"
JWT_SECRET=supersecretkey123456789
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
FRONTEND_URL=http://localhost:8080
```

#### フロントエンド
- APIエンドポイント: `http://localhost:8081` (api-client.tsで設定)

## 既知の問題と対処

### 1. Tailwind CSS v4 の設定問題
**問題**: `border-border`などのカスタムユーティリティクラスがエラーになる
**対処**: 
- postcss.config.mjsを正しく設定
- globals.cssでカスタムプロパティを直接使用
- 標準のTailwindクラスを使用

### 2. データベース接続
**問題**: Prismaがデータベースに接続できない
**対処**: モックモードで動作するよう修正済み
- databaseService.tsでエラーハンドリングを追加
- hotelService.tsにモックデータを実装

### 3. Hero.tsxの構文エラー
**問題**: primary-500などのクラスが未定義
**対処**: 標準の色クラス（pink-500など）に変更

## システム起動手順

### 1. バックエンドの起動
```bash
cd /Users/MBP/Desktop/system/hotelbooking/backend
npm install  # 初回のみ
npm run dev
```

### 2. フロントエンドの起動
```bash
cd /Users/MBP/Desktop/system/hotelbooking/lastminutestay-frontend
npm install  # 初回のみ
npm run dev
```

### 3. 動作確認
- フロントエンド: http://localhost:3002
- バックエンドAPI: http://localhost:8081/health
- Swagger UI: http://localhost:8081/api-docs

## トラブルシューティング

### ポートが使用中の場合
```bash
# プロセスの確認
lsof -i :8081
lsof -i :3002

# プロセスの終了
pkill -f "next dev"
pkill -f "tsx watch"
```

### Tailwind CSSエラーが発生する場合
1. node_modulesを削除して再インストール
```bash
rm -rf node_modules package-lock.json
npm install
```

2. postcss.config.mjsの確認
```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
```

### データベース接続エラー
現在はモックモードで動作しているため、実際のデータベースは不要です。
本番環境では以下が必要：
- PostgreSQL
- Redis

## 開発ガイドライン

### コード規約
- TypeScriptを使用
- ESLintとPrettierの設定に従う
- コンポーネントは関数コンポーネントで記述
- 状態管理はReact Hooksを使用

### Git運用
- mainブランチが本番環境
- 機能開発はfeatureブランチで行う
- コミットメッセージは日本語可

## 今後の実装予定

### フェーズ1 (完了)
- [x] 基本的なプロジェクト構造の確立
- [x] バックエンドAPIの基本実装
- [x] フロントエンドの基本実装
- [x] ポート設定の変更と動作確認

### フェーズ2 (進行中)
- [ ] データベースの本格的な実装
- [ ] 認証システムの実装
- [ ] ホテル検索機能の実装
- [ ] 予約機能の実装

### フェーズ3 (計画中)
- [ ] 決済システムの統合
- [ ] リアルタイム在庫管理
- [ ] 多言語対応の強化
- [ ] PWA機能の実装

## API仕様

### 主要エンドポイント
- `GET /api/hotels` - ホテル一覧取得
- `GET /api/hotels/:id` - ホテル詳細取得
- `POST /api/bookings` - 予約作成
- `GET /api/search` - ホテル検索
- `GET /api/autocomplete` - 検索オートコンプリート

詳細はSwagger UI (http://localhost:8081/api-docs) で確認可能

## セキュリティ考慮事項
- JWT認証の実装
- CORS設定
- Rate Limiting
- Helmet.jsによるセキュリティヘッダー
- 環境変数による機密情報管理

## パフォーマンス最適化
- Redisキャッシュ
- データローダーパターン
- クエリ最適化
- 画像の遅延読み込み
- Code Splitting

## 監視とログ
- Winstonによるログ管理
- エラートラッキング
- パフォーマンスモニタリング

## デプロイメント
- Vercelでのフロントエンドデプロイ
- Heroku/AWS/GCPでのバックエンドデプロイ
- 環境変数の管理
- CI/CDパイプライン

---

このドキュメントは継続的に更新されます。最終更新: 2025-06-23