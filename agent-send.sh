#!/bin/bash

# 🚀 Agent間メッセージ送信スクリプト

# エージェント→tmuxターゲット マッピング
get_agent_target() {
    case "$1" in
        "president") echo "hotel_president" ;;
        "boss") echo "hotel_multiagent:0.0" ;;
        "staff1") echo "hotel_multiagent:1.0" ;;
        "staff2") echo "hotel_multiagent:2.0" ;;
        "staff3") echo "hotel_multiagent:3.0" ;;
        "staff4") echo "hotel_multiagent:4.0" ;;
        "staff5") echo "hotel_multiagent:5.0" ;;
        *) echo "" ;;
    esac
}

show_usage() {
    cat << EOF
🤖 Agent間メッセージ送信

使用方法:
  $0 [エージェント名] [メッセージ]
  $0 --list

利用可能エージェント:
  president - プロジェクト統括責任者
  boss      - チームリーダー  
  staff1    - 実行担当者A
  staff2    - 実行担当者B
  staff3    - 実行担当者C
  staff4    - 実行担当者D
  staff5    - 実行担当者E

使用例:
  $0 president "指示書に従って"
  $0 boss "開発状況確認指示"
  $0 staff1 "作業完了しました"
EOF
}

# エージェント一覧表示
show_agents() {
    echo "📋 利用可能なエージェント:"
    echo "=========================="
    echo "  president → hotel_president:0     (プロジェクト統括責任者)"
    echo "  boss      → hotel_multiagent:0.0        (チームリーダー)"
    echo "  staff1    → hotel_multiagent:1.0        (実行担当者A)"
    echo "  staff2    → hotel_multiagent:2.0        (実行担当者B)" 
    echo "  staff3    → hotel_multiagent:3.0        (実行担当者C)"
    echo "  staff4    → hotel_multiagent:4.0        (実行担当者D)"
    echo "  staff5    → hotel_multiagent:5.0        (実行担当者E)"
}

# ログ記録
log_send() {
    local agent="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    mkdir -p logs
    echo "[$timestamp] $agent: SENT - \"$message\"" >> logs/send_log.txt
}

# メッセージ送信
send_message() {
    local target="$1"
    local message="$2"
    
    echo "📤 送信中: $target ← '$message'"
    
    # Claude Codeのプロンプトを一度クリア
    tmux send-keys -t "$target" C-c
    sleep 0.3
    
    # メッセージ送信
    tmux send-keys -t "$target" "$message"
    sleep 0.1
    
    # エンター押下
    tmux send-keys -t "$target" C-m
    sleep 0.5
}

# ターゲット存在確認
check_target() {
    local target="$1"
    local session_name="${target%%:*}"
    
    if ! tmux has-session -t "$session_name" 2>/dev/null; then
        echo "❌ セッション '$session_name' が見つかりません"
        return 1
    fi
    
    return 0
}

# メイン処理
main() {
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 1
    fi
    
    # --listオプション
    if [[ "$1" == "--list" ]]; then
        show_agents
        exit 0
    fi
    
    if [[ $# -lt 2 ]]; then
        show_usage
        exit 1
    fi
    
    local agent_name="$1"
    local message="$2"
    
    # エージェントターゲット取得
    local target
    target=$(get_agent_target "$agent_name")
    
    if [[ -z "$target" ]]; then
        echo "❌ エラー: 不明なエージェント '$agent_name'"
        echo "利用可能エージェント: $0 --list"
        exit 1
    fi
    
    # ターゲット確認
    if ! check_target "$target"; then
        exit 1
    fi
    
    # メッセージ送信
    send_message "$target" "$message"
    
    # ログ記録
    log_send "$agent_name" "$message"
    
    echo "✅ 送信完了: $agent_name に '$message'"
    
    return 0
}

main "$@" 