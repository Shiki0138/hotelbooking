# 🏨 リアルホテル情報システム仕様書

## 🎯 システム概要
実際の楽天トラベルAPIを使用した、予約直前まで利用可能な実用的ホテル検索・価格追跡システム

## 📋 機能要件

### 1. Worker1: 楽天API完全統合
#### 空室検索API
```javascript
// 楽天Travel空室検索API v2
GET /services/api/Travel/VacantHotelSearch/20170426
Parameters:
- checkinDate: YYYY-MM-DD
- checkoutDate: YYYY-MM-DD
- adultNum: 大人人数
- latitude/longitude: 緯度経度
- searchRadius: 検索半径(km)
- squeezeCondition: 絞り込み条件
- responseType: large (詳細情報取得)
```

#### ホテル詳細API
```javascript
// 楽天Travelホテル詳細API
GET /services/api/Travel/HotelDetailSearch/20170426
Parameters:
- hotelNo: ホテル番号
- checkinDate/checkoutDate
- adultNum
```

#### 実装要件
- リアルタイム空室確認
- 料金プラン詳細取得
- 部屋タイプ・写真情報
- 施設詳細・アメニティ
- レビュー・評価情報

### 2. Worker2: リアルタイムUI
#### 検索画面
- 日付選択カレンダー（空室状況表示）
- エリア検索（地図連動）
- 人数・部屋数選択
- 詳細フィルター（価格帯、設備、評価）

#### ホテル詳細画面
- 写真ギャラリー（大画面表示）
- 空室状況リアルタイム表示
- 料金プラン比較表
- 地図・アクセス情報
- レビュー表示
- 「楽天で予約」ボタン（アフィリエイトID付き）

#### レスポンシブ対応
- モバイルファースト設計
- タッチ操作最適化
- 高速表示（画像遅延読み込み）

### 3. Worker3: 価格追跡強化
#### 15分間隔監視システム
```javascript
// 価格監視バッチ（15分ごと）
const priceMonitor = {
  interval: 15 * 60 * 1000, // 15分
  targets: ['watchlist_hotels'],
  checks: [
    'price_drop',      // 価格下落
    'new_availability', // 新規空室
    'last_room',       // 残室わずか
    'special_plan'     // 特別プラン
  ]
};
```

#### 通知システム
- メール即時通知
- 価格変動履歴グラフ
- アラート条件カスタマイズ
- 通知履歴管理

## 🔧 技術仕様

### API統合
```javascript
// 楽天API設定
const RAKUTEN_CONFIG = {
  applicationId: process.env.RAKUTEN_APP_ID,
  affiliateId: process.env.RAKUTEN_AFFILIATE_ID,
  timeout: 10000,
  retry: 3,
  cache: {
    search: 300,     // 5分
    detail: 600,     // 10分
    price: 900       // 15分
  }
};
```

### データベース設計
```sql
-- リアルタイムホテル情報
CREATE TABLE hotels_realtime (
  hotel_no VARCHAR(20) PRIMARY KEY,
  hotel_name TEXT NOT NULL,
  area_name TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  min_charge INTEGER,
  review_average DECIMAL(3,2),
  review_count INTEGER,
  hotel_thumbnail_url TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 価格履歴（15分間隔）
CREATE TABLE price_history_15min (
  id SERIAL PRIMARY KEY,
  hotel_no VARCHAR(20),
  room_type TEXT,
  plan_name TEXT,
  price INTEGER NOT NULL,
  availability_status VARCHAR(20),
  checked_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_hotel_time (hotel_no, checked_at)
);

-- ウォッチリスト拡張
CREATE TABLE watchlist_extended (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  hotel_no VARCHAR(20),
  target_price INTEGER,
  checkin_date DATE,
  checkout_date DATE,
  adult_num INTEGER,
  alert_conditions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### パフォーマンス要件
- 検索レスポンス: <2秒
- 詳細表示: <1秒
- 価格更新: 15分以内
- 同時アクセス: 1000ユーザー

## 🚀 実装優先順位

### Phase 1: 基本機能（4時間）
1. 楽天API接続確立
2. 基本検索UI実装
3. 価格監視基盤構築

### Phase 2: 詳細機能（4時間）
1. ホテル詳細画面
2. リアルタイム価格更新
3. アラート通知実装

### Phase 3: 最適化（2時間）
1. キャッシュ戦略
2. UI/UXブラッシュアップ
3. パフォーマンス調整

## 📊 成功指標
- 実際のホテル検索可能
- リアルタイム空室確認
- 15分間隔価格追跡
- 予約サイトへの誘導
- 価格変動通知配信

---
**実用的なホテル検索システムで、ユーザーに実際の価値を提供！**