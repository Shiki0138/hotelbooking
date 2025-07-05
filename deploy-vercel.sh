#!/bin/bash

echo "🚀 Vercelデプロイスクリプト"
echo "========================="

# Vercel CLIがインストールされているか確認
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLIがインストールされていません"
    echo "👉 インストール: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLIを確認しました"

# フロントエンドのデプロイ
echo ""
echo "📦 フロントエンドのデプロイを開始します..."
cd frontend

# package.jsonを確認
if [ ! -f "package.json" ]; then
    echo "❌ エラー: frontend/package.jsonが見つかりません"
    exit 1
fi

# 環境変数の設定案内
echo ""
echo "⚠️  重要: Vercelダッシュボードで以下の環境変数を設定してください:"
echo "   - VITE_API_URL (バックエンドのURL)"
echo "   - VITE_GOOGLE_MAPS_API_KEY (Google Maps APIキー)"
echo ""

# デプロイ実行
echo "🔄 Vercelにデプロイ中..."
vercel --prod

echo ""
echo "✅ デプロイが完了しました！"
echo ""
echo "次のステップ:"
echo "1. Vercelダッシュボードで環境変数を設定"
echo "2. バックエンドAPI（Supabase Edge Functions）のセットアップ"
echo "3. 本番環境でのテスト実施"