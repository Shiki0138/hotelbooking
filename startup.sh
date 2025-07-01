#!/bin/bash

# LastMinuteStay 自動起動スクリプト
# 使用方法: ./startup.sh

echo "LastMinuteStay システムを起動します..."

# バックエンドの起動
echo "バックエンドを起動中..."
cd /Users/MBP/Desktop/system/hotelbooking/backend
npm run dev &
BACKEND_PID=$!

# 少し待機
sleep 5

# フロントエンドの起動
echo "フロントエンドを起動中..."
cd /Users/MBP/Desktop/system/hotelbooking/lastminutestay-frontend
npm run dev &
FRONTEND_PID=$!

# 起動完了メッセージ
echo ""
echo "=========================================="
echo "システムが起動しました！"
echo "フロントエンド: http://localhost:3002"
echo "バックエンドAPI: http://localhost:8081"
echo "Swagger UI: http://localhost:8081/api-docs"
echo "=========================================="
echo ""
echo "停止するには Ctrl+C を押してください"
echo ""

# プロセスの監視
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait