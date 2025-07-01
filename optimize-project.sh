#!/bin/bash

echo "🧹 LastMinuteStay プロジェクト最適化開始"
echo "========================================="

# 最適化前の構成を記録
echo ""
echo "📊 最適化前の統計:"
echo "総ファイル数: $(find . -type f | wc -l)"
echo "総ディレクトリ数: $(find . -type d | wc -l)"
echo "総サイズ: $(du -sh . | cut -f1)"

# アーカイブディレクトリの作成
echo ""
echo "📁 アーカイブディレクトリを作成..."
mkdir -p archive/reports
mkdir -p archive/logs
mkdir -p archive/old-files
mkdir -p archive/duplicates

# 1. 古いレポートファイルの移動
echo ""
echo "📄 古いレポートファイルを整理中..."

# 大量のレポートファイルをアーカイブに移動
report_files=(
    "3D_AR_VR_INTEGRATION_GUIDE.md"
    "API_INTEGRATION_PLAN.md" 
    "API_INTEGRATION_PROPOSAL.md"
    "COMMUNICATION_GUIDE.md"
    "DEVELOPMENT_LOG.md"
    "IMAGE_LAZY_LOADING_IMPLEMENTATION.md"
    "NEXTAUTH_UNIFIED_DESIGN.md"
    "PERFORMANCE_OPTIMIZATION.md"
    "PRODUCTION_DEPLOYMENT_GUIDE.md"
    "PRODUCTION_SECURITY_GUIDE.md"
    "PROJECT_STATUS.md"
    "SECURITY_CHECKLIST.md"
    "SESSION_TOKEN_STRATEGY.md"
    "SYSTEM_DESIGN_DOCUMENT.md"
    "SYSTEM_STATUS.md"
    "UI_DESIGN_SPEC.md"
    "UI_UX_IMPROVEMENT_PLAN.md"
    "USER_GUIDE.md"
    "WORK_RULES.md"
)

for file in "${report_files[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" archive/reports/
        echo "移動: $file → archive/reports/"
    fi
done

# 2. ログファイルとテンポラリファイルの削除
echo ""
echo "🗑️ ログファイルと一時ファイルを削除中..."

# ログファイルの削除
find . -name "*.log" -type f -delete 2>/dev/null
find . -name "*.tmp" -type f -delete 2>/dev/null
find . -name ".DS_Store" -type f -delete 2>/dev/null

# tmp_archiveディレクトリの整理
if [ -d "tmp_archive" ]; then
    mv tmp_archive/* archive/old-files/ 2>/dev/null
    rmdir tmp_archive 2>/dev/null
    echo "tmp_archive/ → archive/old-files/ に移動"
fi

# 3. 重複ファイルの整理
echo ""
echo "🔍 重複ファイルを整理中..."

# 古いフロントエンドプロジェクトの整理
if [ -d "lastminutestay-frontend" ]; then
    mv lastminutestay-frontend archive/old-files/
    echo "lastminutestay-frontend/ → archive/old-files/ に移動"
fi

# 4. 不要な設定ファイルの削除
echo ""
echo "⚙️ 不要な設定ファイルを削除中..."

unnecessary_files=(
    ".env_hotel"
    ".env_hotelbooking"
    ".env_sms"
    ".env.development"
    ".env.production"
    ".env.staging"
    "nextauth.config.ts"
    "init-project.js"
    "test-smart-send.sh"
    "health-check.sh"
    "kill-dev-ports.sh"
)

for file in "${unnecessary_files[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "削除: $file"
    fi
done

# 5. 本番に不要なディレクトリの整理
echo ""
echo "📂 不要なディレクトリを整理中..."

if [ -d "aws-infrastructure" ]; then
    mv aws-infrastructure archive/old-files/
    echo "aws-infrastructure/ → archive/old-files/ に移動"
fi

if [ -d "production-config" ]; then
    mv production-config archive/old-files/
    echo "production-config/ → archive/old-files/ に移動"
fi

if [ -d "development" ]; then
    mv development archive/old-files/
    echo "development/ → archive/old-files/ に移動"
fi

# 6. node_modulesの最適化
echo ""
echo "📦 依存関係を最適化中..."

# ルートのnode_modules（重複）を削除
if [ -d "node_modules" ] && [ -d "frontend/node_modules" ]; then
    rm -rf node_modules
    echo "削除: ルートレベルのnode_modules (frontend/に統合)"
fi

# バックエンドのnode_modules（未使用）を削除
if [ -d "backend/node_modules" ]; then
    rm -rf backend/node_modules
    echo "削除: backend/node_modules (未使用)"
fi

# 7. テストファイルの整理
echo ""
echo "🧪 テストファイルを整理中..."

# 重複テストファイルの削除
test_files_to_remove=(
    "test-connection.js"
    "test-rakuten-api.js"
    "test-local.html"
    "test-monitoring-system.html"
)

for file in "${test_files_to_remove[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "削除: $file"
    fi
done

# 8. スクリプトファイルの整理
echo ""
echo "📜 スクリプトファイルを整理中..."

# 使用されていないスクリプトの削除
unused_scripts=(
    "deploy-production.sh"
    "setup.sh"
    "startup.sh"
    "presidentsetup.sh"
    "boss-auto-cycle.sh"
    "boss-implementation-cycle.sh"
    "implementation-90-percent.sh"
    "final-api-integration.sh"
    "performance-evaluation.sh"
    "mobile-ux-evaluation.sh"
    "progress-tracker.sh"
    "session-health-monitor.sh"
    "simple-health-check.sh"
    "start-communication.sh"
    "auto-logger.sh"
    "auto-enter-monitor.sh"
    "model-switcher.sh"
)

for script in "${unused_scripts[@]}"; do
    if [ -f "$script" ]; then
        rm "$script"
        echo "削除: $script"
    fi
done

# 9. ドキュメントファイルの最適化
echo ""
echo "📚 ドキュメントを最適化中..."

# 重要なドキュメントのみ保持
important_docs=(
    "README.md"
    "CLAUDE.md"
    "LICENSE"
    "DEPLOYMENT_CHECKLIST.md"
    "PRODUCTION_DEPLOYMENT_FINAL_REPORT.md"
    "PHASE_2_INTEGRATION_TEST_REPORT.md"
    "REALTIME_LUXURY_HOTEL_SYSTEM_REPORT.md"
)

# その他のマークダウンファイルをアーカイブに移動
find . -maxdepth 1 -name "*.md" -type f | while read file; do
    filename=$(basename "$file")
    if [[ ! " ${important_docs[@]} " =~ " ${filename} " ]]; then
        mv "$file" archive/reports/
        echo "移動: $filename → archive/reports/"
    fi
done

# 10. .envファイルの整理
echo ""
echo "🔐 環境変数ファイルを整理中..."

# 本番で必要な環境変数ファイルのみ保持
env_files_to_keep=(
    ".env.local"
    ".env.production.example"
    ".env.example"
)

find . -maxdepth 1 -name ".env*" -type f | while read file; do
    filename=$(basename "$file")
    if [[ ! " ${env_files_to_keep[@]} " =~ " ${filename} " ]]; then
        rm "$file"
        echo "削除: $filename"
    fi
done

# 最適化後の統計
echo ""
echo "✅ 最適化完了!"
echo ""
echo "📊 最適化後の統計:"
echo "総ファイル数: $(find . -type f | wc -l)"
echo "総ディレクトリ数: $(find . -type d | wc -l)"
echo "総サイズ: $(du -sh . | cut -f1)"
echo ""
echo "📁 アーカイブ統計:"
echo "アーカイブサイズ: $(du -sh archive | cut -f1)"
echo "アーカイブファイル数: $(find archive -type f | wc -l)"

echo ""
echo "🎯 最適化完了! 以下のディレクトリに整理されました:"
echo "   📂 archive/reports/ - 古いレポートファイル"
echo "   📂 archive/logs/ - ログファイル"  
echo "   📂 archive/old-files/ - 古いプロジェクトファイル"
echo "   📂 archive/duplicates/ - 重複ファイル"