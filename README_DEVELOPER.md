# LastMinuteStay 開発者向けドキュメント

## 📁 重要ファイル一覧

### 設計ドキュメント
- `SYSTEM_DESIGN_DOCUMENT.md` - システム設計概要書（最重要）
- `QUICK_START.md` - クイックスタートガイド
- `README_DEVELOPER.md` - このファイル

### 起動スクリプト
- `startup.sh` - 自動起動スクリプト

## 🚀 最速起動方法
```bash
cd /Users/MBP/Desktop/system/hotelbooking
./startup.sh
```

## 📝 作業履歴サマリー

### 2025-06-23 実施内容
1. **ポート変更作業**
   - バックエンド: 3000 → 8081
   - フロントエンド: 5173 → 3002
   - 理由: ポート5173での起動要求に対応

2. **エラー修正**
   - Tailwind CSS v4の設定問題を修正
   - Hero.tsxの構文エラーを修正
   - Prismaデータベース接続エラーをモックモードで回避

3. **依存関係の追加**
   - critters
   - tailwindcss
   - autoprefixer

## 🔧 現在の設定値

### 環境変数
```bash
# バックエンド
PORT=8081
FRONTEND_URL=http://localhost:8080

# フロントエンド
NEXT_PUBLIC_API_URL=http://localhost:8081
```

### 変更したファイル
1. `/backend/.env` - ポート変更
2. `/backend/src/index.ts` - CORS設定
3. `/backend/src/services/databaseService.ts` - モックモード対応
4. `/backend/src/services/hotelService.ts` - モックデータ追加
5. `/lastminutestay-frontend/package.json` - ポート設定
6. `/lastminutestay-frontend/src/lib/api-client.ts` - APIエンドポイント
7. `/lastminutestay-frontend/postcss.config.mjs` - PostCSS設定
8. `/lastminutestay-frontend/src/components/Hero.tsx` - Tailwindクラス修正
9. `/lastminutestay-frontend/src/app/globals.css` - CSS変数対応

## 🐛 既知の問題

### 解決済み
- ✅ Tailwind CSS v4のユーティリティクラスエラー
- ✅ Hero.tsxの構文エラー
- ✅ Prismaデータベース接続エラー
- ✅ critters依存関係の不足

### 未解決（優先度低）
- ⚠️ Tailwind CSSの一部カスタムクラスが動作しない
- ⚠️ メタデータのviewport警告
- ⚠️ データベースがモックモードで動作

## 📊 システム状態確認コマンド

### プロセス確認
```bash
# Node.jsプロセス確認
ps aux | grep -E "(node|next)" | grep -v grep

# ポート使用状況
lsof -i :8081
lsof -i :3002
```

### ログ確認
```bash
# バックエンドログ
tail -f /Users/MBP/Desktop/system/hotelbooking/backend/backend.log

# フロントエンドログ  
tail -f /Users/MBP/Desktop/system/hotelbooking/lastminutestay-frontend/frontend.log
```

### API動作確認
```bash
# ヘルスチェック
curl http://localhost:8081/health

# ホテル一覧（モックデータ）
curl http://localhost:8081/api/hotels
```

## 🔄 次回作業時の注意点

1. **データベース実装**
   - 現在モックモードで動作中
   - PostgreSQLとRedisの設定が必要

2. **認証システム**
   - JWTトークンの実装は準備済み
   - 実際の認証フローは未実装

3. **本番環境準備**
   - 環境変数の本番用設定
   - HTTPSの設定
   - ドメイン設定

## 💡 開発Tips

### Tailwind CSS問題の回避
```css
/* 使用を避ける */
@apply border-border;

/* 代わりに使用 */
border-color: hsl(var(--border));
```

### モックデータの場所
- `/backend/src/services/hotelService.ts` - getMockHotels()メソッド

### デバッグモード
```bash
# バックエンド詳細ログ
LOG_LEVEL=debug npm run dev

# フロントエンドデバッグ
NODE_OPTIONS='--inspect' npm run dev
```

---
最終更新: 2025-06-23
作成者: Claude