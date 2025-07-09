#!/bin/bash
# 🚀 Multi-Agent Communication Demo – setup

# ▼ セッション名を変数で統一
SESSION_MAIN="hotel_multiagent"
SESSION_PRE="hotel_president"

set -e

####################  ユーティリティ  ####################
log_info()    { echo -e "\033[1;32m[INFO]\033[0m    $1"; }
log_success() { echo -e "\033[1;34m[SUCCESS]\033[0m $1"; }

echo -e "\n🤖 Multi-Agent Demo 環境構築\n===========================================\n"

#################### 1. 既存セッションクリーン ####################
log_info "🧹 既存セッションクリーンアップ..."

tmux kill-session -t "$SESSION_MAIN" 2>/dev/null && \
  log_info "$SESSION_MAIN セッション削除完了" || \
  log_info "$SESSION_MAIN セッションは存在せず"

tmux kill-session -t "$SESSION_PRE" 2>/dev/null && \
  log_info "$SESSION_PRE セッション削除完了" || \
  log_info "$SESSION_PRE セッションは存在せず"

mkdir -p ./tmp
rm -f ./tmp/worker*_done.txt 2>/dev/null && \
  log_info "完了ファイルをクリア" || \
  log_info "完了ファイルは存在せず"

log_success "✅ クリーンアップ完了\n"

#################### 2. multiagent セッション ####################
log_info "📺 $SESSION_MAIN セッション作成 (4 ペイン)..."

tmux new-session -d -s "$SESSION_MAIN" -n agents           # pane 0.0
tmux split-window -h  -t "$SESSION_MAIN:0"                 # pane 0.1
tmux select-pane   -t "$SESSION_MAIN:0.0"
tmux split-window -v                                        # pane 0.2
tmux select-pane   -t "$SESSION_MAIN:0.1"
tmux split-window -v                                        # pane 0.3

PANE_TITLES=(boss1 worker1 worker2 worker3)

for i in {0..3}; do
  PID="$SESSION_MAIN:0.$i"
  tmux select-pane -t "$PID" -T "${PANE_TITLES[$i]}"
  tmux send-keys   -t "$PID" "cd $(pwd)" C-m

  # カラープロンプト
  color=$([ $i -eq 0 ] && echo 31 || echo 34)
  tmux send-keys -t "$PID" \
    "export PS1='(\[\033[1;${color}m\]${PANE_TITLES[$i]}\[\033[0m\]) \[\033[1;32m\]\w\[\033[0m\]\$ '" C-m
  tmux send-keys -t "$PID" "echo '=== ${PANE_TITLES[$i]} エージェント ==='" C-m
done

log_success "✅ $SESSION_MAIN セッション作成完了\n"

#################### 3. president セッション ####################
log_info "👑 $SESSION_PRE セッション作成..."

tmux new-session -d -s "$SESSION_PRE"
tmux send-keys -t "$SESSION_PRE" "cd $(pwd)" C-m
tmux send-keys -t "$SESSION_PRE" \
  "export PS1='(\[\033[1;35m\]PRESIDENT\[\033[0m\]) \[\033[1;32m\]\w\[\033[0m\]\$ '" C-m
tmux send-keys -t "$SESSION_PRE" "echo '=== PRESIDENT セッション ==='" C-m
tmux send-keys -t "$SESSION_PRE" "echo 'プロジェクト統括責任者'" C-m

log_success "✅ $SESSION_PRE セッション作成完了\n"

#################### 4. サマリ表示 ####################
log_info "🔍 セットアップ結果"

echo -e "\n📺 tmux セッション一覧:"
tmux list-sessions

echo -e "\n📋 ペイン構成:"
echo "  $SESSION_MAIN : boss1 / worker1 / worker2 / worker3"
echo "  $SESSION_PRE  : PRESIDENT"

log_success "\n🎉 Demo セットアップ完了！\n"
echo "次のステップ:"
echo "  tmux attach-session -t $SESSION_MAIN   # マルチエージェント"
echo "  tmux attach-session -t $SESSION_PRE    # プレジデント"