# API エンドポイント仕様書

## 作成: Worker3
## 更新日: 2025-07-04

---

## 🔐 認証API

### POST /api/auth/register
新規ユーザー登録
```json
// リクエスト
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "山田太郎"
}

// レスポンス
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "山田太郎"
  },
  "token": "jwt-token"
}
```

### POST /api/auth/login
ユーザーログイン
```json
// リクエスト
{
  "email": "user@example.com",
  "password": "Password123!"
}

// レスポンス
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "token": "jwt-token"
}
```

---

## 🏨 ホテル検索API

### GET /api/hotels/search
ホテル検索（楽天Travel API）
```
パラメータ:
- checkinDate: 2025-07-10 (必須)
- checkoutDate: 2025-07-11 (必須)
- adultNum: 2 (デフォルト: 2)
- prefecture: tokyo (必須)
- maxCharge: 50000 (オプション)

レスポンス:
{
  "hotels": [
    {
      "id": "12345",
      "name": "東京グランドホテル",
      "price": 25000,
      "location": "東京都千代田区",
      "rating": 4.5,
      "availability": true
    }
  ]
}
```

### GET /api/availability/realtime
リアルタイム空室確認
```
パラメータ:
- hotelId: 12345 (必須)
- checkinDate: 2025-07-10 (必須)
- checkoutDate: 2025-07-11 (必須)

レスポンス:
{
  "available": true,
  "rooms": [
    {
      "roomType": "スタンダードツイン",
      "price": 25000,
      "remainingRooms": 3
    }
  ]
}
```

---

## 💰 予約・決済API

### POST /api/bookings/create
予約作成
```json
// リクエスト
{
  "hotelId": "12345",
  "roomId": "room-001",
  "checkinDate": "2025-07-10",
  "checkoutDate": "2025-07-11",
  "guestsCount": 2,
  "guestInfo": {
    "name": "山田太郎",
    "email": "yamada@example.com",
    "phone": "090-1234-5678"
  },
  "specialRequests": "禁煙ルーム希望"
}

// レスポンス
{
  "bookingId": "LMS250710123456",
  "status": "pending",
  "totalPrice": 25000,
  "paymentIntentId": "pi_xxx"
}
```

### POST /api/payments/process
決済処理
```json
// リクエスト
{
  "bookingId": "LMS250710123456",
  "paymentMethodId": "pm_xxx"
}

// レスポンス
{
  "status": "completed",
  "transactionId": "txn_xxx",
  "receipt": "https://receipt.url"
}
```

---

## 📊 リアルタイム監視API

### POST /api/watchlist/add
ウォッチリスト追加
```json
// リクエスト
{
  "hotelId": "12345",
  "hotelName": "東京グランドホテル",
  "checkinDate": "2025-07-10",
  "checkoutDate": "2025-07-11",
  "targetPrice": 20000
}

// レスポンス
{
  "watchlistId": "wl_xxx",
  "status": "active"
}
```

### GET /api/monitoring/price-tracker
価格追跡状況
```
パラメータ:
- watchlistId: wl_xxx (オプション)

レスポンス:
{
  "trackedHotels": [
    {
      "hotelId": "12345",
      "currentPrice": 22000,
      "targetPrice": 20000,
      "priceHistory": [...]
    }
  ]
}
```

---

## 📧 通知API

### POST /api/notifications/send
通知送信
```json
// リクエスト
{
  "type": "price_drop",
  "userId": "user-uuid",
  "data": {
    "hotelName": "東京グランドホテル",
    "oldPrice": 25000,
    "newPrice": 19000
  }
}

// レスポンス
{
  "notificationId": "notif_xxx",
  "status": "sent"
}
```

---

## 🔧 ユーティリティAPI

### GET /api/health
ヘルスチェック
```json
// レスポンス
{
  "uptime": 12345,
  "message": "OK",
  "timestamp": 1234567890,
  "environment": "production",
  "service": "hotel-booking-api",
  "version": "1.0.0"
}
```

---

## 認証方法

すべての保護されたエンドポイントには、以下のヘッダーが必要です：

```
Authorization: Bearer <jwt-token>
```

## エラーレスポンス

標準エラー形式：
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## レート制限

- 認証なし: 100リクエスト/時
- 認証あり: 1000リクエスト/時

## 環境別URL

- 開発: http://localhost:5000
- 本番: https://api.lastminutestay.com