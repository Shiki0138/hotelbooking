#!/bin/bash

# エージェント間通信スクリプト
# Usage: ./agent-send.sh [recipient] "[message]"

RECIPIENT=$1
MESSAGE=$2

if [ -z "$RECIPIENT" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: $0 [recipient] \"[message]\""
    echo "Recipients: president, boss1, worker1, worker2, worker3"
    exit 1
fi

# メッセージログファイル
LOG_DIR="./tmp/messages"
mkdir -p "$LOG_DIR"

# タイムスタンプ
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# 送信者の識別（現在のセッションIDから推測）
SENDER="${AGENT_NAME:-unknown}"

# メッセージを保存
echo "[$TIMESTAMP] FROM: $SENDER TO: $RECIPIENT - $MESSAGE" >> "$LOG_DIR/message_log.txt"
echo "$MESSAGE" > "$LOG_DIR/${RECIPIENT}_inbox.txt"

echo "✉️ メッセージを $RECIPIENT に送信しました: $MESSAGE"