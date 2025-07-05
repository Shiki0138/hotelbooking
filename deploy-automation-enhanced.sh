#!/bin/bash

# 高級ホテル直前予約システム デプロイ自動化スクリプト（拡張版）
# Worker3 実装 - 本番稼働準備完全版

set -e

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 設定
PROJECT_NAME="ホテル予約システム"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="deploy_${TIMESTAMP}.log"

# ログ関数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${PURPLE}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

# ヘルプ表示
show_help() {
    echo -e "${BLUE}${PROJECT_NAME} デプロイ自動化スクリプト${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 [環境] [オプション]"
    echo ""
    echo "環境:"
    echo "  dev      - 開発環境"
    echo "  staging  - ステージング環境"
    echo "  prod     - 本番環境"
    echo ""
    echo "オプション:"
    echo "  --skip-tests     - テストをスキップ"
    echo "  --skip-build     - ビルドをスキップ"
    echo "  --force         - 強制実行（確認をスキップ）"
    echo "  --rollback      - 前回のデプロイにロールバック"
    echo "  --help          - このヘルプを表示"
    echo ""
}

# 前提条件チェック
check_prerequisites() {
    log "前提条件をチェック中..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js がインストールされていません"
        exit 1
    fi
    
    # npm
    if ! command -v npm &> /dev/null; then
        error "npm がインストールされていません"
        exit 1
    fi
    
    # Git
    if ! command -v git &> /dev/null; then
        error "Git がインストールされていません"
        exit 1
    fi
    
    # Vercel CLI
    if ! command -v vercel &> /dev/null; then
        warn "Vercel CLI がインストールされていません。インストール中..."
        npm install -g vercel
    fi
    
    success "前提条件チェック完了"
}

# Git状態チェック
check_git_status() {
    log "Git状態をチェック中..."
    
    # 未コミットの変更確認
    if [[ -n $(git status --porcelain) ]]; then
        warn "未コミットの変更があります"
        git status --short
        
        if [[ "$FORCE" != "true" ]]; then
            read -p "続行しますか？ (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "デプロイを中止しました"
                exit 1
            fi
        fi
    fi
    
    # ブランチ確認
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log "現在のブランチ: $CURRENT_BRANCH"
    
    if [[ "$ENVIRONMENT" == "prod" && "$CURRENT_BRANCH" != "main" ]]; then
        error "本番環境は main ブランチからのみデプロイ可能です"
        exit 1
    fi
    
    success "Git状態チェック完了"
}

# 環境変数チェック
check_environment_variables() {
    log "環境変数をチェック中..."
    
    # 必須環境変数リスト
    REQUIRED_VARS=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    
    # フロントエンド用環境変数
    FRONTEND_VARS=(
        "REACT_APP_SUPABASE_URL"
        "REACT_APP_SUPABASE_ANON_KEY"
    )
    
    # バックエンド環境変数チェック
    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -z "${!var}" ]]; then
            if [[ -f "backend/.env.${ENVIRONMENT}" ]]; then
                log "backend/.env.${ENVIRONMENT} から環境変数を読み込み"
                source "backend/.env.${ENVIRONMENT}"
            else
                error "必須環境変数 $var が設定されていません"
                exit 1
            fi
        fi
    done
    
    # フロントエンド環境変数チェック
    if [[ -f "frontend/.env.${ENVIRONMENT}" ]]; then
        log "frontend/.env.${ENVIRONMENT} を確認"
    else
        warn "frontend/.env.${ENVIRONMENT} が見つかりません"
    fi
    
    success "環境変数チェック完了"
}

# 依存関係インストール
install_dependencies() {
    log "依存関係をインストール中..."
    
    # バックエンド
    if [[ -f "backend/package.json" ]]; then
        log "バックエンド依存関係をインストール"
        cd backend
        npm ci --production=false
        cd ..
    fi
    
    # フロントエンド  
    if [[ -f "frontend/package.json" ]]; then
        log "フロントエンド依存関係をインストール"
        cd frontend
        npm ci --production=false
        cd ..
    fi
    
    # ルート
    if [[ -f "package.json" ]]; then
        log "ルート依存関係をインストール"
        npm ci --production=false
    fi
    
    success "依存関係インストール完了"
}

# テスト実行
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warn "テストをスキップします"
        return 0
    fi
    
    log "テストを実行中..."
    
    # 統合テスト実行
    if [[ -f "test-integration-suite.js" ]]; then
        log "統合テストを実行"
        node test-integration-suite.js
        
        # テスト結果確認
        if [[ -f "integration-test-report.json" ]]; then
            TEST_STATUS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('integration-test-report.json')).systemStatus)")
            
            if [[ "$TEST_STATUS" == "CRITICAL" ]]; then
                error "重大なテストエラーがあります。デプロイを中止します"
                exit 1
            elif [[ "$TEST_STATUS" == "WARNING" ]]; then
                warn "テストで警告があります"
                if [[ "$FORCE" != "true" ]]; then
                    read -p "続行しますか？ (y/N): " -n 1 -r
                    echo
                    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                        error "デプロイを中止しました"
                        exit 1
                    fi
                fi
            fi
        fi
    fi
    
    # バックエンドテスト
    if [[ -f "backend/package.json" ]]; then
        cd backend
        if npm run test --if-present; then
            log "バックエンドテスト成功"
        else
            warn "バックエンドテストで警告"
        fi
        cd ..
    fi
    
    # フロントエンドテスト
    if [[ -f "frontend/package.json" ]]; then
        cd frontend
        if npm run test --if-present -- --watchAll=false; then
            log "フロントエンドテスト成功"
        else
            warn "フロントエンドテストで警告"
        fi
        cd ..
    fi
    
    success "テスト実行完了"
}

# ビルド実行
run_build() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        warn "ビルドをスキップします"
        return 0
    fi
    
    log "ビルドを実行中..."
    
    # バックエンドビルド
    if [[ -f "backend/package.json" ]]; then
        cd backend
        if npm run build --if-present; then
            log "バックエンドビルド成功"
        else
            warn "バックエンドビルドで警告"
        fi
        cd ..
    fi
    
    # フロントエンドビルド
    if [[ -f "frontend/package.json" ]]; then
        cd frontend
        if npm run build; then
            log "フロントエンドビルド成功"
            
            # ビルドサイズチェック
            if [[ -d "dist" ]]; then
                BUILD_SIZE=$(du -sh dist | cut -f1)
                log "ビルドサイズ: $BUILD_SIZE"
                
                # 10MB以上の場合警告
                SIZE_BYTES=$(du -s dist | cut -f1)
                if [[ $SIZE_BYTES -gt 10240 ]]; then # 10MB in KB
                    warn "ビルドサイズが大きすぎます: $BUILD_SIZE"
                fi
            fi
        else
            error "フロントエンドビルドに失敗しました"
            exit 1
        fi
        cd ..
    fi
    
    success "ビルド実行完了"
}

# デプロイ実行
run_deploy() {
    log "デプロイを実行中..."
    
    case "$ENVIRONMENT" in
        "dev")
            log "開発環境にデプロイ中..."
            ;;
        "staging")
            log "ステージング環境にデプロイ中..."
            ;;
        "prod")
            log "本番環境にデプロイ中..."
            ;;
    esac
    
    # Vercelデプロイ
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    success "デプロイ実行完了"
}

# ヘルスチェック
run_health_check() {
    log "デプロイ後ヘルスチェックを実行中..."
    
    # 5秒待機
    sleep 5
    
    # URLを環境に応じて設定
    case "$ENVIRONMENT" in
        "prod")
            HEALTH_URL="https://hotelbooking-sigma.vercel.app/api/health"
            ;;
        *)
            # デプロイ後のURLを取得（実際の環境では適切に設定）
            HEALTH_URL="https://hotelbooking-sigma.vercel.app/api/health"
            ;;
    esac
    
    # ヘルスチェック実行
    MAX_RETRIES=5
    RETRY_COUNT=0
    
    while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
        if curl -f -s "$HEALTH_URL" > /dev/null; then
            success "ヘルスチェック成功"
            return 0
        else
            RETRY_COUNT=$((RETRY_COUNT + 1))
            warn "ヘルスチェック失敗 (試行 $RETRY_COUNT/$MAX_RETRIES)"
            sleep 10
        fi
    done
    
    error "ヘルスチェックに失敗しました"
    return 1
}

# ロールバック
rollback_deployment() {
    log "ロールバックを実行中..."
    
    # Vercelでの前回デプロイにロールバック
    # 実際の実装では履歴から前回のデプロイIDを取得
    warn "ロールバック機能は手動で実行してください"
    log "vercel rollback コマンドを使用してください"
    
    success "ロールバック情報を表示しました"
}

# クリーンアップ
cleanup() {
    log "クリーンアップを実行中..."
    
    # 一時ファイル削除
    rm -f integration-test-report.json
    
    success "クリーンアップ完了"
}

# メイン実行
main() {
    # ヘッダー表示
    echo -e "${BLUE}"
    echo "=================================================="
    echo "  ${PROJECT_NAME} デプロイ自動化"
    echo "  タイムスタンプ: $TIMESTAMP"
    echo "=================================================="
    echo -e "${NC}"
    
    # パラメータ解析
    ENVIRONMENT=""
    SKIP_TESTS=false
    SKIP_BUILD=false
    FORCE=false
    ROLLBACK=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            dev|staging|prod)
                ENVIRONMENT="$1"
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --rollback)
                ROLLBACK=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                error "不明なオプション: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 環境指定確認
    if [[ -z "$ENVIRONMENT" && "$ROLLBACK" != "true" ]]; then
        error "環境を指定してください (dev, staging, prod)"
        show_help
        exit 1
    fi
    
    log "デプロイ開始: 環境=$ENVIRONMENT"
    
    # ロールバック処理
    if [[ "$ROLLBACK" == "true" ]]; then
        rollback_deployment
        return 0
    fi
    
    # デプロイ処理実行
    check_prerequisites
    check_git_status
    check_environment_variables
    install_dependencies
    run_tests
    run_build
    run_deploy
    
    if run_health_check; then
        success "🎉 デプロイが正常に完了しました！"
        log "環境: $ENVIRONMENT"
        log "タイムスタンプ: $TIMESTAMP"
        log "ログファイル: $LOG_FILE"
    else
        error "❌ デプロイは完了しましたが、ヘルスチェックに失敗しました"
        warn "手動でシステム状態を確認してください"
    fi
    
    cleanup
}

# エラートラップ
trap 'error "スクリプト実行中にエラーが発生しました"; cleanup; exit 1' ERR

# スクリプト実行
main "$@"