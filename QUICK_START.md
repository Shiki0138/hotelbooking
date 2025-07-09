# LastMinuteStay クイックスタートガイド

## 最短起動手順（3分で起動）

### 前提条件
- Node.js v23.11.0 がインストール済み
- npm がインストール済み
- ポート8081, 3002が空いている

### ステップ1: バックエンドの起動
```bash
cd /Users/MBP/Desktop/system/hotelbooking/backend
npm run dev
```
成功すると「Server running on port 8081」と表示されます。

### ステップ2: フロントエンドの起動（別ターミナル）
```bash
cd /Users/MBP/Desktop/system/hotelbooking/lastminutestay-frontend
npm run dev
```
成功すると「Ready in XXXXms」と表示されます。

### ステップ3: ブラウザでアクセス
http://localhost:3002 を開く

## よくあるエラーと対処法

### エラー1: ポートが使用中
```bash
Error: listen EADDRINUSE: address already in use :::8081
```
**対処法**:
```bash
# 使用中のプロセスを確認
lsof -i :8081
# プロセスを終了
kill -9 [PID]
```

### エラー2: Tailwind CSSエラー
```
Error: Cannot apply unknown utility class `border-border`
```
**対処法**: 無視して続行（表示には影響しない）

### エラー3: データベース接続エラー
```
Error: Prisma not initialized
```
**対処法**: 無視して続行（モックモードで動作）

## 動作確認
1. http://localhost:3002 - フロントエンドが表示される
2. http://localhost:8081/health - {"status":"ok","timestamp":"..."} が返る
3. http://localhost:8081/api-docs - Swagger UIが表示される

## 停止方法
各ターミナルで `Ctrl+C` を押す

---
最終更新: 2025-06-23