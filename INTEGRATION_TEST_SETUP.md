# 🧪 統合テスト環境セットアップ

## 🎯 Worker1完了対応 - 統合テスト準備

### ✅ 利用可能なAPI（Worker1実装完了）
1. **認証API**
   - `POST /api/auth/register` - ユーザー登録
   - `POST /api/auth/login` - ログイン
   - `POST /api/auth/logout` - ログアウト
   - `GET /api/auth/verify` - JWT検証

2. **予約API**
   - `POST /api/bookings` - 予約作成
   - `GET /api/bookings/:id` - 予約詳細
   - `PUT /api/bookings/:id` - 予約更新
   - `DELETE /api/bookings/:id` - 予約キャンセル

3. **セキュリティ機能**
   - CORS設定済み
   - IPv6対応（Supavisor URL）
   - レート制限実装
   - CSRF対策

### 🔄 統合テストシナリオ

#### シナリオ1: 基本認証フロー
```javascript
// 1. ユーザー登録
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'TestPass123!'
  })
});

// 2. ログイン
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'TestPass123!'
  })
});

const { token } = await loginResponse.json();

// 3. 認証必須API呼び出し
const protectedResponse = await fetch('/api/bookings', {
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

#### シナリオ2: 予約作成フロー
```javascript
// 認証済みユーザーで予約作成
const bookingResponse = await fetch('/api/bookings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    hotel_id: 'hotel123',
    check_in: '2025-07-10',
    check_out: '2025-07-12',
    guests: 2,
    total_amount: 25000
  })
});
```

### 📋 テスト用データ準備

#### テストユーザー
```json
{
  "email": "test@lastminutestay.com",
  "password": "TestUser123!",
  "name": "テスト太郎"
}
```

#### テストホテルデータ
```json
{
  "hotel_id": "test-hotel-001",
  "name": "テストホテル東京",
  "location": "東京都渋谷区",
  "price_per_night": 12500,
  "available_rooms": 10
}
```

### 🚀 Worker2/3統合準備

#### Worker2統合点
- フロントエンド → Worker1 API接続
- 認証状態管理
- 予約フォーム → 予約API連携

#### Worker3統合点
- Stripe決済 → 予約API連携
- メール通知 → 予約完了トリガー
- データベース → Worker1実装済み

### ⚡ 次期統合作業

1. **Worker2完了後**
   - フロントエンド・バックエンド統合
   - UI・API動作確認

2. **Worker3完了後**
   - 決済フロー統合
   - メール通知テスト

3. **全統合後**
   - エンドツーエンドテスト
   - セキュリティテスト
   - パフォーマンステスト

### 📊 テスト成功基準
- [ ] 認証フロー完了率 100%
- [ ] 予約作成成功率 100%
- [ ] API応答時間 < 500ms
- [ ] エラー率 < 0.1%
- [ ] セキュリティスキャン合格

---
Worker1の早期完了により、統合テストの基盤が確立されました。