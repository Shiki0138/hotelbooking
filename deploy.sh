#!/bin/bash

# Hotel Booking System Deployment Script
# Created by Worker1

echo "🚀 Hotel Booking System - デプロイメントスクリプト"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI がインストールされていません${NC}"
    echo "インストール方法: npm i -g vercel"
    exit 1
fi

# Function to check environment variables
check_env() {
    if [ ! -f .env ]; then
        echo -e "${RED}❌ .env ファイルが見つかりません${NC}"
        echo "scripts/setup-env.sh を実行して環境変数を設定してください"
        exit 1
    fi
    
    # Check frontend env
    if [ ! -f frontend/.env.production ]; then
        echo -e "${YELLOW}⚠️  frontend/.env.production が見つかりません${NC}"
        echo "frontend/.env.production.example をコピーして設定してください"
        exit 1
    fi
}

# Function to build backend
build_backend() {
    echo -e "${GREEN}📦 バックエンドをビルド中...${NC}"
    cd backend
    npm install --production
    cd ..
}

# Function to build frontend
build_frontend() {
    echo -e "${GREEN}📦 フロントエンドをビルド中...${NC}"
    cd frontend
    npm install
    npm run build
    cd ..
}

# Function to deploy to Vercel
deploy_vercel() {
    echo -e "${GREEN}🚀 Vercelにデプロイ中...${NC}"
    
    # Set environment variables
    echo "環境変数を設定中..."
    vercel env pull
    
    # Deploy
    if [ "$1" == "production" ]; then
        vercel --prod
    else
        vercel
    fi
}

# Main deployment process
main() {
    echo "デプロイメント環境を選択してください:"
    echo "1) Development (プレビュー環境)"
    echo "2) Production (本番環境)"
    read -p "選択 (1 or 2): " choice
    
    case $choice in
        1)
            ENV="development"
            ;;
        2)
            ENV="production"
            echo -e "${YELLOW}⚠️  本番環境にデプロイします。よろしいですか？${NC}"
            read -p "続行しますか？ (y/n): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "デプロイを中止しました"
                exit 1
            fi
            ;;
        *)
            echo -e "${RED}無効な選択です${NC}"
            exit 1
            ;;
    esac
    
    # Check environment
    check_env
    
    # Build
    build_backend
    build_frontend
    
    # Deploy
    deploy_vercel $ENV
    
    echo -e "${GREEN}✅ デプロイが完了しました！${NC}"
    echo ""
    echo "次のステップ:"
    echo "1. Vercel ダッシュボードでデプロイ状況を確認"
    echo "2. 環境変数が正しく設定されているか確認"
    echo "3. アプリケーションの動作テスト"
}

# Run main function
main