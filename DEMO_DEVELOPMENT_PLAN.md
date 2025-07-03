# 🚀 LastMinuteStay デモモード開発計画

## 📋 開発タスク分担

### 👨‍💻 Worker1: ホテル検索システム（6時間）
#### 実装項目
1. **楽天API統合強化**（2時間）
   - 既存`/api/main.js`を拡張
   - エリア別検索機能
   - 価格帯フィルタリング
   - 空室状況チェック

2. **検索UI実装**（2時間）
   - エリア選択フォーム
   - 検索結果一覧表示
   - ホテル詳細モーダル
   - 価格・空室表示

3. **フィルタリング機能**（2時間）
   - 価格帯フィルタ
   - ホテルタイプ分類
   - 評価フィルタ
   - ソート機能

#### 成果物
- `/api/hotels/search-enhanced.js` - 拡張検索API
- `/components/HotelSearch.js` - 検索UI
- `/components/HotelCard.js` - ホテル表示カード
- `/components/HotelModal.js` - 詳細モーダル

### 👩‍💻 Worker2: ユーザー管理・ウォッチリスト（5時間）
#### 実装項目
1. **ユーザー登録システム**（2時間）
   - 簡易登録フォーム
   - メール認証
   - ログイン機能
   - プロフィール管理

2. **ウォッチリスト機能**（2時間）
   - お気に入りホテル登録
   - ウォッチリスト表示
   - 条件設定（価格・日程）
   - 削除・編集機能

3. **マイページ実装**（1時間）
   - ダッシュボード
   - 登録ホテル一覧
   - 通知履歴
   - 設定変更

#### 成果物
- `/components/UserAuth.js` - 認証UI
- `/components/Watchlist.js` - ウォッチリスト管理
- `/components/Dashboard.js` - マイページ
- `/api/users/` - ユーザー管理API

### 🔧 Worker3: データベース・メール配信（5時間）
#### 実装項目
1. **データベース設計**（2時間）
   - Supabaseスキーマ作成
   - RLSポリシー設定
   - インデックス最適化
   - サンプルデータ作成

2. **メール配信システム**（2時間）
   - 自動チェックバッチ
   - 条件マッチング処理
   - Resend統合
   - HTMLメールテンプレート

3. **通知管理**（1時間）
   - 通知履歴保存
   - 配信設定管理
   - エラーハンドリング
   - 監視・ログ

#### 成果物
- `/database/demo-schema.sql` - DB設計
- `/api/notifications/` - 通知API
- `/services/email-alerts.js` - メール配信
- `/scripts/hotel-checker.js` - 定期チェック

## ⏰ 開発スケジュール

### Phase 1: 基盤構築（0-6時間）
- **Worker1**: 楽天API拡張・基本検索
- **Worker2**: ユーザー認証システム
- **Worker3**: データベース設計・作成

### Phase 2: 機能実装（6-12時間）
- **Worker1**: 検索UI・フィルタリング
- **Worker2**: ウォッチリスト機能
- **Worker3**: メール配信システム

### Phase 3: 統合・テスト（12-16時間）
- 全機能統合
- テスト・デバッグ
- UI/UX調整
- デプロイ準備

## 🎯 技術要件

### API設計
```javascript
// 拡張検索API
GET /api/hotels/search-enhanced
  ?area=tokyo&checkin=2025-07-10&checkout=2025-07-11
  &minPrice=5000&maxPrice=15000&rating=4.0

// ウォッチリスト管理
POST /api/watchlist/add
PUT /api/watchlist/update/{id}
DELETE /api/watchlist/remove/{id}
GET /api/watchlist/user/{userId}

// 通知管理
POST /api/notifications/check-alerts
GET /api/notifications/history/{userId}
```

### データフロー
```
1. ユーザー登録 → Supabase users テーブル
2. ホテル検索 → 楽天API → 結果表示
3. ウォッチリスト登録 → Supabase watchlist テーブル
4. 定期チェック → 楽天API → 条件マッチ → メール送信
5. 通知履歴 → Supabase notifications テーブル
```

## 🛡️ 品質保証

### テスト項目
- [ ] ホテル検索機能テスト
- [ ] ユーザー登録・認証テスト
- [ ] ウォッチリスト機能テスト
- [ ] メール配信テスト
- [ ] レスポンシブデザインテスト

### パフォーマンス要件
- 検索レスポンス: < 3秒
- ページ読み込み: < 2秒
- モバイル対応: 完全レスポンシブ

## 🚀 デプロイ準備

### 環境設定
```bash
# 環境変数（Vercel）
RAKUTEN_APPLICATION_ID=<楽天API ID>
SUPABASE_URL=<Supabase URL>
SUPABASE_ANON_KEY=<Supabase匿名キー>
SUPABASE_SERVICE_ROLE_KEY=<サービスロールキー>
RESEND_API_KEY=<Resend APIキー>
```

### デプロイ手順
1. Supabaseデータベース作成
2. 環境変数設定
3. Vercelデプロイ
4. ドメイン設定
5. SSL証明書設定

## 📊 成功指標

### 機能完成度
- ホテル検索: 100%
- ユーザー管理: 100%
- ウォッチリスト: 100%
- メール配信: 100%

### ユーザビリティ
- 直感的な操作性
- 高速な検索体験
- 美しいデザイン
- エラーハンドリング

---
**開発期間**: 16時間  
**チーム**: 3名のWorker  
**目標**: 実用的なデモ版リリース