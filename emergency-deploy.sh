#!/bin/bash

echo "🚨 LastMinuteStay 緊急デプロイ実行"
echo "================================="

# 現在の進捗確認
echo ""
echo "📊 現在の進捗: 85% → 目標: 95%"
echo "🎯 緊急作業: バックエンドAPIの完全デプロイ"

# 1. Vercelプロジェクトの確認
echo ""
echo "🔍 Vercelプロジェクト状況確認..."
if command -v vercel >/dev/null 2>&1; then
    echo "✅ Vercel CLI利用可能"
else
    echo "❌ Vercel CLIが必要です: npm install -g vercel"
    exit 1
fi

# 2. APIディレクトリの確認
echo ""
echo "📂 APIディレクトリ確認..."
if [ -d "api" ]; then
    echo "✅ apiディレクトリ存在"
    echo "APIエンドポイント数: $(find api -name "*.js" | wc -l)"
else
    echo "❌ apiディレクトリが見つかりません"
    exit 1
fi

# 3. 必要な設定ファイルの確認
echo ""
echo "⚙️ 設定ファイル確認..."
required_files=("vercel.json" "package.json")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file が見つかりません"
        exit 1
    fi
done

# 4. 環境変数の確認
echo ""
echo "🔐 環境変数確認..."
if [ -f ".env.production.example" ]; then
    echo "✅ 環境変数テンプレート存在"
    echo "必要な環境変数:"
    grep -E "^[A-Z_]+=" .env.production.example | cut -d'=' -f1
else
    echo "❌ 環境変数テンプレートが見つかりません"
fi

# 5. フロントエンドの確認
echo ""
echo "🖥️ フロントエンド確認..."
if [ -d "frontend" ]; then
    echo "✅ frontendディレクトリ存在"
    if [ -f "frontend/package.json" ]; then
        echo "✅ frontend/package.json存在"
    fi
else
    echo "❌ frontendディレクトリが見つかりません"
fi

# 6. デプロイ準備状況の評価
echo ""
echo "📊 デプロイ準備状況評価..."
echo "================================="

# チェック項目
checks=(
    "API_ENDPOINTS:$(find api -name "*.js" | wc -l)"
    "VERCEL_CONFIG:$([ -f "vercel.json" ] && echo "OK" || echo "NG")"
    "PACKAGE_JSON:$([ -f "package.json" ] && echo "OK" || echo "NG")"
    "ENV_TEMPLATE:$([ -f ".env.production.example" ] && echo "OK" || echo "NG")"
    "FRONTEND:$([ -d "frontend" ] && echo "OK" || echo "NG")"
)

for check in "${checks[@]}"; do
    echo "  $check"
done

# 7. 緊急デプロイコマンドの生成
echo ""
echo "🚀 緊急デプロイコマンド:"
echo "================================="
cat << 'EOF'

# 手順1: Vercelログイン（未ログインの場合）
vercel login

# 手順2: プロジェクト初期化（新規の場合）
vercel

# 手順3: 環境変数設定（Vercelダッシュボードで）
# - SUPABASE_URL
# - SUPABASE_ANON_KEY  
# - SUPABASE_SERVICE_KEY
# - RAKUTEN_API_KEY
# - RESEND_API_KEY
# - CRON_SECRET
# - NEXTAUTH_SECRET

# 手順4: 本番デプロイ実行
vercel --prod

EOF

echo ""
echo "⚠️  重要な注意事項:"
echo "1. 環境変数を必ずVercelダッシュボードで設定してください"
echo "2. CRON_SECRETとNEXTAUTH_SECRETは既に生成済みです"
echo "3. デプロイ後はAPIエンドポイントの動作確認を実行してください"

echo ""
echo "🎯 デプロイ完了後の進捗: 85% → 93%"
echo "   残り作業でローカル環境とエラーハンドリングを実装し95%達成"

echo ""
echo "✅ 緊急デプロイスクリプト準備完了"