#!/bin/bash

echo "🔧 データベースセットアップスクリプト"
echo "================================="

# .envファイルから接続情報を読み込む
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Supabaseが設定されているか確認
if [[ -z "$SUPABASE_URL" || "$SUPABASE_URL" == "https://your-project.supabase.co" ]]; then
    echo "❌ エラー: Supabase接続情報が設定されていません"
    echo "👉 .envファイルに以下を設定してください:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - DATABASE_URL"
    exit 1
fi

echo "✅ Supabase接続情報を確認しました"

# ローカルPostgreSQLを使用する場合のオプション
echo ""
echo "データベースセットアップ方法を選択してください:"
echo "1) Supabaseダッシュボードで手動実行（推奨）"
echo "2) psqlコマンドで実行（DATABASE_URLが必要）"
read -p "選択 (1/2): " choice

case $choice in
    1)
        echo ""
        echo "📋 以下の手順でセットアップしてください:"
        echo ""
        echo "1. Supabaseダッシュボードにアクセス"
        echo "2. SQL Editor セクションを開く"
        echo "3. 以下のファイルの内容を順番に実行:"
        echo "   - backend/database/location_schema.sql"
        echo "   - backend/database/hotel_crawling_schema.sql"
        echo "   - backend/database/location_seed_data.sql"
        echo ""
        echo "✨ 実行後、アプリケーションが使用可能になります"
        ;;
    2)
        echo ""
        echo "🔄 psqlでデータベースをセットアップ中..."
        
        # スキーマ適用
        psql "$DATABASE_URL" -f backend/database/location_schema.sql
        psql "$DATABASE_URL" -f backend/database/hotel_crawling_schema.sql
        psql "$DATABASE_URL" -f backend/database/location_seed_data.sql
        
        echo "✅ データベースセットアップが完了しました"
        ;;
    *)
        echo "無効な選択です"
        exit 1
        ;;
esac

echo ""
echo "次のステップ:"
echo "- フロントエンド起動: cd frontend && npm run dev"
echo "- バックエンド起動: cd backend && npm run dev"