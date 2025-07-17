#!/bin/bash

echo "🚀 ホテル予約システムを起動します..."
echo ""

# フロントエンドディレクトリに移動
cd frontend

# 依存関係をインストール（必要な場合）
if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストールしています..."
    npm install
fi

# 開発サーバーを起動
echo "🌐 開発サーバーを起動しています..."
echo "👉 ブラウザで http://localhost:8080 にアクセスしてください"
echo ""
echo "終了するには Ctrl+C を押してください"
echo ""

npm run dev