# 🚀 リアルホテルシステム実装開始宣言

## ⏰ 実装タイムライン
- **開始**: T+6h (22:30)
- **完成**: T+16h (08:30)
- **残り時間**: 10時間

## 📊 進捗確認ポイント
- **T+8h (00:30)**: 基本機能実装確認
- **T+10h (02:30)**: 第2統合テスト
- **T+12h (04:30)**: 機能完成確認
- **T+14h (06:30)**: 最終統合テスト

## 👥 Worker実装開始

### Worker1: 楽天API完全統合
```bash
# 実装開始項目
1. VacantHotelSearch API
   - リアルタイム空室検索
   - 料金プラン取得
   - responseType: large

2. HotelDetailSearch API  
   - 施設詳細情報
   - 写真URL取得
   - レビュー情報

3. エラーハンドリング
   - レート制限対応
   - タイムアウト処理
   - フォールバック
```

### Worker2: リアルタイムUI実装
```bash
# 実装開始項目
1. 検索UI
   - 日付カレンダー
   - エリア選択
   - 人数設定

2. ホテル詳細画面
   - 写真ギャラリー
   - 料金表示
   - 楽天予約ボタン

3. モバイル対応
   - レスポンシブ設計
   - タッチ最適化
   - 高速表示
```

### Worker3: 価格監視システム
```bash
# 実装開始項目
1. 15分間隔監視
   - cron設定
   - 価格チェック
   - 変動検知

2. 即時通知
   - メール配信
   - 価格下落アラート
   - 空室通知

3. データ分析
   - 価格履歴
   - トレンド表示
   - 最適タイミング
```

## 🔧 即時実装コード

### Worker1: API統合開始
```javascript
// backend/services/rakuten-realtime-api.js
const RakutenRealtimeAPI = {
  async searchVacantHotels(params) {
    const endpoint = '/Travel/VacantHotelSearch/20170426';
    const apiParams = {
      applicationId: process.env.RAKUTEN_APP_ID,
      affiliateId: process.env.RAKUTEN_AFFILIATE_ID,
      format: 'json',
      checkinDate: params.checkinDate,
      checkoutDate: params.checkoutDate,
      latitude: params.latitude,
      longitude: params.longitude,
      searchRadius: params.searchRadius || 3,
      squeezeCondition: params.squeezeCondition,
      carrier: 0,
      datumType: 1,
      responseType: 'large',
      hits: 30,
      page: params.page || 1,
      sort: params.sort || '+roomCharge',
      adultNum: params.adultNum || 2
    };
    
    try {
      const response = await axios.get(
        `https://app.rakuten.co.jp/services/api${endpoint}`,
        { params: apiParams, timeout: 10000 }
      );
      return this.formatHotelData(response.data);
    } catch (error) {
      return this.handleAPIError(error);
    }
  },

  formatHotelData(data) {
    if (!data.hotels) return { hotels: [], error: null };
    
    return {
      hotels: data.hotels.map(hotel => ({
        hotelNo: hotel.hotel[0].hotelBasicInfo.hotelNo,
        hotelName: hotel.hotel[0].hotelBasicInfo.hotelName,
        hotelKanaName: hotel.hotel[0].hotelBasicInfo.hotelKanaName,
        hotelSpecial: hotel.hotel[0].hotelBasicInfo.hotelSpecial,
        hotelMinCharge: hotel.hotel[0].hotelBasicInfo.hotelMinCharge,
        latitude: hotel.hotel[0].hotelBasicInfo.latitude,
        longitude: hotel.hotel[0].hotelBasicInfo.longitude,
        postalCode: hotel.hotel[0].hotelBasicInfo.postalCode,
        address1: hotel.hotel[0].hotelBasicInfo.address1,
        address2: hotel.hotel[0].hotelBasicInfo.address2,
        telephoneNo: hotel.hotel[0].hotelBasicInfo.telephoneNo,
        access: hotel.hotel[0].hotelBasicInfo.access,
        parkingInformation: hotel.hotel[0].hotelBasicInfo.parkingInformation,
        nearestStation: hotel.hotel[0].hotelBasicInfo.nearestStation,
        hotelImageUrl: hotel.hotel[0].hotelBasicInfo.hotelImageUrl,
        hotelThumbnailUrl: hotel.hotel[0].hotelBasicInfo.hotelThumbnailUrl,
        roomImageUrl: hotel.hotel[0].hotelBasicInfo.roomImageUrl,
        roomThumbnailUrl: hotel.hotel[0].hotelBasicInfo.roomThumbnailUrl,
        hotelMapImageUrl: hotel.hotel[0].hotelBasicInfo.hotelMapImageUrl,
        reviewCount: hotel.hotel[0].hotelBasicInfo.reviewCount,
        reviewAverage: hotel.hotel[0].hotelBasicInfo.reviewAverage,
        userReview: hotel.hotel[0].hotelBasicInfo.userReview
      })),
      pagingInfo: data.pagingInfo
    };
  }
};
```

### Worker2: UI実装開始
```jsx
// frontend/components/RealTimeSearch/SearchForm.jsx
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const SearchForm = ({ onSearch }) => {
  const [searchParams, setSearchParams] = useState({
    checkinDate: new Date(),
    checkoutDate: new Date(Date.now() + 86400000),
    location: '',
    adultNum: 2,
    roomNum: 1
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    onSearch(searchParams);
  };

  return (
    <form onSubmit={handleSearch} className="search-form">
      <div className="form-group">
        <label>チェックイン</label>
        <DatePicker
          selected={searchParams.checkinDate}
          onChange={(date) => setSearchParams({...searchParams, checkinDate: date})}
          dateFormat="yyyy/MM/dd"
          minDate={new Date()}
        />
      </div>
      
      <div className="form-group">
        <label>チェックアウト</label>
        <DatePicker
          selected={searchParams.checkoutDate}
          onChange={(date) => setSearchParams({...searchParams, checkoutDate: date})}
          dateFormat="yyyy/MM/dd"
          minDate={searchParams.checkinDate}
        />
      </div>

      <div className="form-group">
        <label>エリア・ホテル名</label>
        <input 
          type="text"
          value={searchParams.location}
          onChange={(e) => setSearchParams({...searchParams, location: e.target.value})}
          placeholder="東京、大阪、ホテル名など"
        />
      </div>

      <button type="submit" className="search-button">
        空室を検索
      </button>
    </form>
  );
};
```

### Worker3: 監視システム開始
```javascript
// backend/jobs/price-monitor-15min.js
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// 15分ごとに価格監視
cron.schedule('*/15 * * * *', async () => {
  console.log('🔍 価格監視開始:', new Date().toISOString());
  
  try {
    // アクティブなウォッチリスト取得
    const { data: watchlist } = await supabase
      .from('watchlist_extended')
      .select('*')
      .eq('is_active', true);

    for (const item of watchlist) {
      await checkHotelPrice(item);
    }
  } catch (error) {
    console.error('価格監視エラー:', error);
  }
});

async function checkHotelPrice(watchItem) {
  // 現在の価格を取得
  const currentData = await RakutenRealtimeAPI.getHotelDetail({
    hotelNo: watchItem.hotel_no,
    checkinDate: watchItem.checkin_date,
    checkoutDate: watchItem.checkout_date,
    adultNum: watchItem.adult_num
  });

  if (currentData.error) return;

  const currentPrice = currentData.minCharge;
  const lastPrice = watchItem.last_checked_price;

  // 価格履歴に記録
  await supabase.from('price_history_15min').insert({
    hotel_no: watchItem.hotel_no,
    price: currentPrice,
    availability_status: currentData.availabilityStatus,
    checked_at: new Date().toISOString()
  });

  // 価格下落チェック
  if (lastPrice && currentPrice < lastPrice) {
    const dropAmount = lastPrice - currentPrice;
    const dropPercent = Math.round((dropAmount / lastPrice) * 100);

    // 通知送信
    await sendPriceDropNotification(watchItem, {
      hotelName: currentData.hotelName,
      oldPrice: lastPrice,
      newPrice: currentPrice,
      dropAmount,
      dropPercent
    });
  }

  // ウォッチリスト更新
  await supabase
    .from('watchlist_extended')
    .update({ 
      last_checked_price: currentPrice,
      last_checked_at: new Date().toISOString()
    })
    .eq('id', watchItem.id);
}
```

## 📈 成功指標

### T+8h (00:30) 目標
- [ ] 楽天API接続成功
- [ ] 基本検索UI完成
- [ ] 価格監視基盤稼働

### T+10h (02:30) 目標
- [ ] ホテル詳細取得
- [ ] 詳細画面表示
- [ ] 初回価格チェック

### T+12h (04:30) 目標
- [ ] 全機能実装完了
- [ ] モバイル対応完了
- [ ] 通知テスト成功

### T+14h (06:30) 目標
- [ ] 統合テスト完了
- [ ] パフォーマンス最適化
- [ ] 本番準備完了

---

**実データで動く、実用的なホテル検索システムを10時間で実現！**