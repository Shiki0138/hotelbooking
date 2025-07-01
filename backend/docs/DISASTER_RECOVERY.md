# 障害復旧手順書 - LastMinuteStay Backend

## 1. 障害レベル定義

### Level 1: 軽微な障害
- 単一サービスの部分的な機能不全
- ユーザー影響: 限定的
- 例: キャッシュサーバーの一時的な接続エラー

### Level 2: 中程度の障害
- 複数サービスに影響
- ユーザー影響: 一部機能が利用不可
- 例: 外部APIサービスの全面停止

### Level 3: 重大な障害
- システム全体の機能停止
- ユーザー影響: サービス利用不可
- 例: データベース障害、アプリケーションクラッシュ

## 2. 初動対応フロー

### 2.1 障害検知
1. **自動アラート確認**
   - `/monitoring/health` エンドポイントの監視
   - エラー率の急増アラート
   - サーキットブレーカーのOPEN状態

2. **手動確認**
   ```bash
   # システムヘルスチェック
   curl http://localhost:3000/monitoring/health/detailed
   
   # ログ確認
   tail -f logs/error.log
   
   # サーキットブレーカー状態
   curl http://localhost:3000/monitoring/circuit-breakers
   ```

### 2.2 影響範囲の特定
1. エラーログから影響サービスを特定
2. ユーザー影響の評価
3. データ整合性の確認

## 3. サービス別復旧手順

### 3.1 アプリケーションサーバー

#### 症状: アプリケーションが応答しない
```bash
# プロセス確認
ps aux | grep node

# 再起動
pm2 restart lastminutestay-api
# または
systemctl restart lastminutestay-api

# ログ確認
pm2 logs lastminutestay-api --lines 100
```

#### 症状: メモリリーク/高CPU使用率
```bash
# メモリ使用状況確認
pm2 monit

# グレースフルリスタート
pm2 reload lastminutestay-api

# 必要に応じてスケールダウン/アップ
pm2 scale lastminutestay-api 2
```

### 3.2 データベース (PostgreSQL)

#### 症状: 接続エラー
```bash
# PostgreSQLステータス確認
sudo systemctl status postgresql

# 再起動
sudo systemctl restart postgresql

# 接続テスト
psql -U postgres -d lastminutestay -c "SELECT 1;"

# 接続数確認
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

#### 症状: スロークエリ/デッドロック
```sql
-- 実行中のクエリ確認
SELECT pid, age(clock_timestamp(), pg_stat_activity.query_start), usename, query 
FROM pg_stat_activity 
WHERE pg_stat_activity.query != '<IDLE>' 
AND query NOT ILIKE '%pg_stat_activity%' 
ORDER BY query_start desc;

-- 問題のあるクエリをキル
SELECT pg_terminate_backend(pid);

-- デッドロック確認
SELECT * FROM pg_locks WHERE NOT granted;
```

### 3.3 Redis (キャッシュ)

#### 症状: 接続エラー
```bash
# Redisステータス確認
redis-cli ping

# 再起動
sudo systemctl restart redis

# メモリ使用状況
redis-cli info memory

# 全キャッシュクリア（最終手段）
redis-cli FLUSHALL
```

### 3.4 外部サービス障害

#### 症状: サーキットブレーカーOPEN
1. **監視画面で状態確認**
   ```bash
   curl http://localhost:3000/monitoring/circuit-breakers
   ```

2. **手動リセット（状況改善後）**
   ```bash
   curl -X POST http://localhost:3000/monitoring/circuit-breakers/HotelDataAPI/reset
   ```

3. **フォールバック確認**
   - キャッシュからのデータ提供
   - デグレードモードでの動作確認

## 4. データ復旧手順

### 4.1 バックアップからの復旧
```bash
# 最新バックアップ確認
ls -la /backup/postgres/

# データベース復旧
pg_restore -U postgres -d lastminutestay_restore /backup/postgres/lastminutestay_20240620.dump

# データ整合性チェック
psql -U postgres -d lastminutestay -f /scripts/integrity_check.sql
```

### 4.2 トランザクションログからの復旧
```bash
# WALアーカイブ確認
ls -la /var/lib/postgresql/14/main/pg_wal/

# ポイントインタイムリカバリ
# recovery.conf設定後、PostgreSQL再起動
```

## 5. 復旧後の確認事項

### 5.1 機能テスト
```bash
# ヘルスチェック
curl http://localhost:3000/monitoring/health

# 主要API動作確認
curl http://localhost:3000/api/hotels/search?checkIn=2024-06-21&checkOut=2024-06-22&guests=2

# 予約機能テスト（ステージング環境）
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roomId":"test-room-id","checkIn":"2024-06-21","checkOut":"2024-06-22","guests":2}'
```

### 5.2 パフォーマンス確認
```bash
# レスポンスタイム測定
ab -n 100 -c 10 http://localhost:3000/api/hotels/search?checkIn=2024-06-21&checkOut=2024-06-22&guests=2

# メトリクス確認
curl http://localhost:3000/monitoring/metrics
```

### 5.3 ログ確認
```bash
# エラーログ
tail -f logs/error.log | grep -v "recovered"

# アクセスログでエラー率確認
cat logs/http.log | jq '.statusCode' | sort | uniq -c
```

## 6. エスカレーション手順

### Level 1 障害
1. 担当エンジニアが対応
2. 30分以内に復旧見込みがない場合、チームリーダーに報告

### Level 2 障害
1. チームリーダーに即座に報告
2. 関連チーム（フロントエンド、インフラ）に影響を通知
3. 1時間以内に復旧見込みがない場合、マネージャーに報告

### Level 3 障害
1. 即座に全関係者に通知
2. 対策本部設置
3. 15分ごとに進捗報告
4. 必要に応じて外部ベンダーサポート要請

## 7. 予防措置

### 定期メンテナンス
- 週次: ログローテーション、メトリクス確認
- 月次: パフォーマンステスト、セキュリティパッチ適用
- 四半期: 障害訓練、手順書更新

### 監視強化
- アラート閾値の定期見直し
- 新規エラーパターンの追加
- ダッシュボード改善

## 8. 連絡先

### 緊急連絡先
- インフラチーム: #infrastructure-emergency
- データベース管理者: #database-emergency
- セキュリティチーム: #security-emergency

### 外部ベンダー
- AWS サポート: [Support Case作成手順]
- PostgreSQL サポート: [契約番号: XXXXX]

---

最終更新: 2024-06-20
次回レビュー予定: 2024-09-20