#!/bin/bash

# Environment Setup Script for Hotel Booking System
# Created by Worker1

echo "🏨 Hotel Booking System - 環境設定スクリプト"
echo "============================================"

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Check if .env exists
if [ -f .env ]; then
    echo "⚠️  .env ファイルが既に存在します。"
    read -p "上書きしますか？ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "設定を中止しました。"
        exit 1
    fi
fi

# Copy template
cp .env.template .env

# Generate JWT Secret
JWT_SECRET=$(generate_secret)
sed -i '' "s/generate-secure-random-string-here/$JWT_SECRET/g" .env

# Generate Session Secret  
SESSION_SECRET=$(generate_secret)
sed -i '' "s/generate-another-secure-random-string/$SESSION_SECRET/g" .env

echo "✅ .env ファイルを作成しました。"
echo ""
echo "次のステップ:"
echo "1. 各サービスの無料アカウントを作成してください："
echo "   - Supabase: https://supabase.com"
echo "   - SendGrid: https://sendgrid.com" 
echo "   - Google Cloud: https://console.cloud.google.com"
echo ""
echo "2. ENV_SETUP_GUIDE.md の手順に従ってAPIキーを取得してください。"
echo ""
echo "3. .env ファイルに取得したAPIキーを設定してください。"
echo ""
echo "4. 設定完了後、以下のコマンドでテストできます："
echo "   npm run test:env"

# Create test script
cat > scripts/test-env.js << 'EOF'
// Environment Variables Test Script
const dotenv = require('dotenv');
dotenv.config();

console.log('🔍 環境変数チェック中...\n');

const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'SENDGRID_API_KEY',
    'GOOGLE_MAPS_API_KEY',
    'JWT_SECRET',
    'SESSION_SECRET'
];

let allSet = true;

required.forEach(key => {
    if (process.env[key]) {
        console.log(`✅ ${key}: 設定済み`);
    } else {
        console.log(`❌ ${key}: 未設定`);
        allSet = false;
    }
});

if (allSet) {
    console.log('\n✨ すべての必須環境変数が設定されています！');
} else {
    console.log('\n⚠️  未設定の環境変数があります。.envファイルを確認してください。');
    process.exit(1);
}
EOF

chmod +x scripts/test-env.js

echo "✅ セットアップスクリプトが完了しました。"