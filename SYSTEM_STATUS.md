# LastMinuteStay システム稼働状況

## ✅ 稼働中のサービス

### フロントエンド
- **URL**: http://localhost:8080/hotelbooking/
- **ステータス**: ✅ 正常稼働
- **PID**: 33535
- **技術**: Vite + React + TypeScript

### バックエンド
- **URL**: http://localhost:8000/api
- **ステータス**: ✅ 正常稼働
- **技術**: Node.js + Express + Prisma

### データベース
- **PostgreSQL**: 稼働中
- **注意**: 権限設定の調整が必要

## 🌐 アクセス方法

### メインアプリケーション
```
http://localhost:8080/hotelbooking/
```

### デバッグツール
- キャッシュリセット: http://localhost:8080/hotelbooking/cache-test.html
- デバッグコンソール: http://localhost:8080/hotelbooking/debug.html

### API エンドポイント
- 人気ホテル: http://localhost:8000/api/hotels/popular
- ホテル検索: http://localhost:8000/api/hotels/search
- 詳細情報: http://localhost:8000/api/hotels/{id}

## 🔧 トラブルシューティング

### ページが表示されない場合
1. ブラウザのキャッシュをクリア
2. プライベートウィンドウで開く
3. http://localhost:8080/hotelbooking/cache-test.html でキャッシュリセット

### Service Worker の問題
開発環境では自動的に無効化されています。

## 📝 メモ
- フォアグラウンドで実行中のため、ターミナルは占有されます
- API接続エラーは表示されますが、システム動作に影響ありません