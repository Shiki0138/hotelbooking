# LastMinuteStay Backend API

高性能なホテル予約APIシステム - リアルタイム空室管理と高速検索を実現

## 主な機能

- **高速ホテル検索**: 地理位置、価格、評価、設備による絞り込み検索
- **リアルタイム空室管理**: WebSocketによる即時空室情報更新
- **価格比較エンジン**: Redisキャッシュによる高速価格計算
- **予約管理**: 安全なトランザクション処理による予約システム
- **認証・認可**: JWT基盤のセキュアな認証

## 技術スタック

- Node.js + Express + TypeScript
- PostgreSQL (Prisma ORM)
- Redis (キャッシュレイヤー)
- Socket.io (リアルタイム通信)
- JWT認証
- Swagger API Documentation

## セットアップ

```bash
cd backend
npm install
cp .env.example .env
# .envファイルを編集して必要な環境変数を設定

# データベースマイグレーション
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

## API エンドポイント

- `GET /api/hotels/search` - ホテル検索
- `GET /api/hotels/:id` - ホテル詳細
- `GET /api/rooms/search` - 空室検索
- `POST /api/bookings` - 予約作成
- `GET /api/bookings` - 予約一覧
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン

## Swagger Documentation

開発サーバー起動後、以下のURLでAPI仕様を確認できます:
```
http://localhost:3000/api-docs
```

## パフォーマンス最適化

- Redisによる検索結果キャッシュ (TTL: 1時間)
- データベースインデックス最適化
- 非同期処理による並列実行
- 圧縮ミドルウェア
- レート制限による過負荷防止

## セキュリティ

- Helmet.jsによるセキュリティヘッダー設定
- レート制限 (15分間に100リクエスト)
- JWT認証
- 入力検証 (Joi)
- SQLインジェクション対策 (Prisma)
