#!/bin/bash

# 🏥 システム健全性チェックスクリプト
# Last-Minute Matchシステムの包括的な健全性検証

echo "======================================"
echo "🏥 システム健全性チェック"
echo "======================================"
echo ""

PROJECT_DIR="/Users/MBP/Desktop/system/【true】Claude-Code-Communication/last-minute-match"
HEALTH_LOG="system-health-$(date +%Y%m%d_%H%M%S).log"

# 結果格納
declare -A health_status
health_issues=()

# 健全性チェック関数
check_health() {
    local component="$1"
    local check_command="$2"
    local expected="$3"
    
    echo -n "🔍 $component チェック中... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo "✅ OK"
        health_status[$component]="OK"
        return 0
    else
        echo "❌ 問題検出"
        health_status[$component]="FAILED"
        health_issues+=("$component: $expected")
        return 1
    fi
}

# 1. ファイルシステムチェック
echo "1️⃣ ファイルシステムチェック"
echo "----------------------------"

check_health "プロジェクトディレクトリ" "test -d $PROJECT_DIR" "ディレクトリが存在しません"
check_health "Backendディレクトリ" "test -d $PROJECT_DIR/backend" "backendディレクトリが見つかりません"
check_health "Frontendディレクトリ" "test -d $PROJECT_DIR/frontend" "frontendディレクトリが見つかりません"
check_health "Package.json (root)" "test -f $PROJECT_DIR/package.json" "ルートpackage.jsonが見つかりません"
check_health "Package.json (backend)" "test -f $PROJECT_DIR/backend/package.json" "backend/package.jsonが見つかりません"
check_health "Package.json (frontend)" "test -f $PROJECT_DIR/frontend/package.json" "frontend/package.jsonが見つかりません"

# 重要ファイルチェック
check_health "Error Handler (backend)" "test -f $PROJECT_DIR/backend/src/utils/error.handler.ts" "エラーハンドラーが見つかりません"
check_health "Logger Service (backend)" "test -f $PROJECT_DIR/backend/src/utils/logger.service.ts" "ログサービスが見つかりません"
check_health "Debug Console (backend)" "test -f $PROJECT_DIR/backend/src/utils/debug.console.ts" "デバッグコンソールが見つかりません"
check_health "Error Reporter (backend)" "test -f $PROJECT_DIR/backend/src/utils/error.reporter.ts" "エラーレポーターが見つかりません"

echo ""

# 2. 依存関係チェック
echo "2️⃣ 依存関係チェック"
echo "----------------------------"

cd "$PROJECT_DIR" || exit 1

# node_modulesの存在チェック
check_health "node_modules (root)" "test -d node_modules" "ルートのnode_modulesが見つかりません"
check_health "node_modules (backend)" "test -d backend/node_modules" "backendのnode_modulesが見つかりません"
check_health "node_modules (frontend)" "test -d frontend/node_modules" "frontendのnode_modulesが見つかりません"

# パッケージマネージャーの一貫性
if [ -f "pnpm-lock.yaml" ] && [ -f "package-lock.json" ]; then
    health_issues+=("複数のパッケージマネージャーロックファイルが検出されました")
fi

echo ""

# 3. TypeScriptコンパイルチェック
echo "3️⃣ TypeScriptコンパイルチェック"
echo "----------------------------"

cd "$PROJECT_DIR/backend" || exit 1
echo -n "🔍 Backend TypeScript チェック中... "
if npx tsc --noEmit > "$HEALTH_LOG" 2>&1; then
    echo "✅ OK"
    health_status["Backend TypeScript"]="OK"
else
    echo "❌ コンパイルエラー"
    health_status["Backend TypeScript"]="FAILED"
    error_count=$(grep -c "error TS" "$HEALTH_LOG" || echo "0")
    health_issues+=("Backend TypeScript: $error_count 個のエラー")
fi

cd "$PROJECT_DIR/frontend" || exit 1
echo -n "🔍 Frontend TypeScript チェック中... "
if npx tsc --noEmit > "$HEALTH_LOG" 2>&1; then
    echo "✅ OK"
    health_status["Frontend TypeScript"]="OK"
else
    echo "❌ コンパイルエラー"
    health_status["Frontend TypeScript"]="FAILED"
    error_count=$(grep -c "error TS" "$HEALTH_LOG" || echo "0")
    health_issues+=("Frontend TypeScript: $error_count 個のエラー")
fi

echo ""

# 4. 環境設定チェック
echo "4️⃣ 環境設定チェック"
echo "----------------------------"

cd "$PROJECT_DIR" || exit 1
check_health ".env ファイル" "test -f .env || test -f .env.local || test -f .env.development" "環境設定ファイルが見つかりません"

# 必要な環境変数チェック
if [ -f ".env" ] || [ -f ".env.local" ] || [ -f ".env.development" ]; then
    env_file=$(ls .env* | head -1)
    echo -n "🔍 必要な環境変数チェック中... "
    
    required_vars=("DATABASE_URL" "JWT_SECRET" "STRIPE_API_KEY" "GOOGLE_MAPS_API_KEY")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file" 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo "✅ OK"
        health_status["環境変数"]="OK"
    else
        echo "❌ 不足"
        health_status["環境変数"]="FAILED"
        health_issues+=("環境変数不足: ${missing_vars[*]}")
    fi
fi

echo ""

# 5. ポート使用状況チェック
echo "5️⃣ ポート使用状況チェック"
echo "----------------------------"

# Backend ポート (3001)
echo -n "🔍 Backend ポート (3001) チェック中... "
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  使用中"
    health_status["Backend Port"]="IN_USE"
else
    echo "✅ 利用可能"
    health_status["Backend Port"]="OK"
fi

# Frontend ポート (3000)
echo -n "🔍 Frontend ポート (3000) チェック中... "
if lsof -i :3000 > /dev/null 2>&1; then
    echo "⚠️  使用中"
    health_status["Frontend Port"]="IN_USE"
else
    echo "✅ 利用可能"
    health_status["Frontend Port"]="OK"
fi

echo ""

# 6. データベース接続チェック
echo "6️⃣ データベース接続チェック"
echo "----------------------------"

if [ -f "$PROJECT_DIR/backend/.env" ] || [ -f "$PROJECT_DIR/backend/.env.local" ]; then
    env_file=$(ls $PROJECT_DIR/backend/.env* | head -1)
    DATABASE_URL=$(grep "^DATABASE_URL=" "$env_file" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    
    if [ -n "$DATABASE_URL" ]; then
        echo -n "🔍 PostgreSQL接続チェック中... "
        if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
            echo "✅ OK"
            health_status["Database"]="OK"
        else
            echo "❌ 接続失敗"
            health_status["Database"]="FAILED"
            health_issues+=("データベース接続に失敗しました")
        fi
    fi
fi

echo ""

# 7. ログディレクトリチェック
echo "7️⃣ ログディレクトリチェック"
echo "----------------------------"

check_health "Backend logs" "test -d $PROJECT_DIR/backend/logs || mkdir -p $PROJECT_DIR/backend/logs" "ログディレクトリの作成に失敗"
check_health "Error reports" "test -d $PROJECT_DIR/backend/error-reports || mkdir -p $PROJECT_DIR/backend/error-reports" "エラーレポートディレクトリの作成に失敗"

echo ""

# 8. Git状態チェック
echo "8️⃣ Git状態チェック"
echo "----------------------------"

cd "$PROJECT_DIR" || exit 1
echo -n "🔍 Git リポジトリ状態チェック中... "
if git status > /dev/null 2>&1; then
    uncommitted=$(git status --porcelain | wc -l)
    if [ "$uncommitted" -gt 0 ]; then
        echo "⚠️  $uncommitted 個の未コミット変更"
        health_status["Git"]="UNCOMMITTED"
    else
        echo "✅ クリーン"
        health_status["Git"]="OK"
    fi
else
    echo "❌ Gitリポジトリではありません"
    health_status["Git"]="NO_REPO"
fi

echo ""

# 結果サマリー
echo "======================================"
echo "📊 健全性チェック結果サマリー"
echo "======================================"
echo ""

ok_count=0
failed_count=0
warning_count=0

for component in "${!health_status[@]}"; do
    status="${health_status[$component]}"
    case "$status" in
        "OK")
            ((ok_count++))
            ;;
        "FAILED")
            ((failed_count++))
            ;;
        *)
            ((warning_count++))
            ;;
    esac
done

total_checks=${#health_status[@]}
health_score=$(echo "scale=2; $ok_count * 100 / $total_checks" | bc)

echo "総チェック数: $total_checks"
echo "✅ 正常: $ok_count"
echo "❌ エラー: $failed_count"
echo "⚠️  警告: $warning_count"
echo ""
echo "健全性スコア: ${health_score}%"
echo ""

# 問題がある場合の詳細
if [ ${#health_issues[@]} -gt 0 ]; then
    echo "🚨 検出された問題:"
    echo "----------------------------"
    for issue in "${health_issues[@]}"; do
        echo "  • $issue"
    done
    echo ""
fi

# 推奨アクション
echo "📋 推奨アクション:"
echo "----------------------------"

if [ "$failed_count" -gt 0 ]; then
    echo "1. 依存関係の再インストール:"
    echo "   cd $PROJECT_DIR && npm install"
    echo "   cd backend && npm install"
    echo "   cd ../frontend && npm install"
    echo ""
fi

if [[ "${health_status[Database]}" == "FAILED" ]]; then
    echo "2. データベース接続の確認:"
    echo "   - PostgreSQLサービスが起動しているか確認"
    echo "   - DATABASE_URLの設定を確認"
    echo ""
fi

if [[ "${health_status[Backend TypeScript]}" == "FAILED" ]] || [[ "${health_status[Frontend TypeScript]}" == "FAILED" ]]; then
    echo "3. TypeScriptエラーの修正:"
    echo "   詳細は $HEALTH_LOG を確認してください"
    echo ""
fi

# 最終判定
echo "======================================"
if [ "$health_score" == "100.00" ]; then
    echo "✅ システムは完全に健全です！"
elif [ $(echo "$health_score >= 80" | bc) -eq 1 ]; then
    echo "🟡 システムは概ね健全ですが、いくつかの問題があります"
else
    echo "🔴 システムに重大な問題があります"
fi
echo "======================================"

# ログ記録
{
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] システム健全性チェック結果"
    echo "健全性スコア: ${health_score}%"
    echo "正常: $ok_count, エラー: $failed_count, 警告: $warning_count"
    if [ ${#health_issues[@]} -gt 0 ]; then
        echo "検出された問題:"
        for issue in "${health_issues[@]}"; do
            echo "  - $issue"
        done
    fi
} >> "$PROJECT_DIR/../development/development_log.txt"

echo ""
echo "📁 詳細ログ: $HEALTH_LOG"
echo "✅ 健全性チェック完了: $(date)"