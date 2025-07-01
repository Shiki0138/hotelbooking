#\!/bin/bash

echo "🔍 LastMinuteStay デプロイ前チェック"
echo "=================================="

# 1. 必須ファイルの確認
echo ""
echo "📁 必須ファイルチェック:"
files=(
  "vercel.json"
  "package.json"
  "supabase/schema.sql"
  "api/auth/signup.js"
  "api/search/rakuten.js"
  "api/cron/match-preferences.js"
  "api/email/send-notification.js"
  "frontend/public/index.html"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file - 見つかりません！"
  fi
done

# 2. 環境変数テンプレートの確認
echo ""
echo "📋 環境変数テンプレート:"
if [ -f ".env.production.example" ]; then
  echo "✅ .env.production.example が存在します"
  echo "必要な環境変数:"
  grep -E "^[A-Z_]+=" .env.production.example | cut -d'=' -f1 | sort | uniq
else
  echo "❌ .env.production.example が見つかりません"
fi

# 3. APIエンドポイントの確認
echo ""
echo "🔌 APIエンドポイント:"
find api -name "*.js" -type f | grep -v node_modules | sort

# 4. Cronジョブの確認
echo ""
echo "⏰ Cronジョブ設定:"
grep -A5 '"crons"' vercel.json

echo ""
echo "=================================="
echo "✅ チェック完了"
