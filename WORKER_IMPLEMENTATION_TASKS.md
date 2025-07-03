# 👥 Worker実装タスク詳細

## 🔧 Worker1: 楽天API完全統合

### 即座実装ファイル
```javascript
// /api/rakuten/vacant-search.js
import { createClient } from '@supabase/supabase-js';

const RAKUTEN_BASE_URL = 'https://app.rakuten.co.jp/services/api';

export default async function handler(req, res) {
  const { checkinDate, checkoutDate, latitude, longitude, adultNum = 2 } = req.body;
  
  try {
    // 楽天VacantHotelSearch API
    const params = new URLSearchParams({
      applicationId: process.env.RAKUTEN_APP_ID,
      affiliateId: process.env.RAKUTEN_AFFILIATE_ID,
      format: 'json',
      checkinDate,
      checkoutDate,
      latitude,
      longitude,
      searchRadius: 3,
      datumType: 1,
      adultNum,
      responseType: 'large',
      hits: 30
    });
    
    const response = await fetch(
      `${RAKUTEN_BASE_URL}/Travel/VacantHotelSearch/20170426?${params}`
    );
    
    const data = await response.json();
    
    // キャッシュ保存（5分間）
    await cacheResults(data, 300);
    
    return res.status(200).json({
      hotels: formatHotelData(data.hotels),
      total: data.pagingInfo.recordCount
    });
  } catch (error) {
    console.error('楽天API Error:', error);
    return res.status(500).json({ error: 'ホテル検索エラー' });
  }
}

// /api/rakuten/hotel-detail.js
export default async function handler(req, res) {
  const { hotelNo, checkinDate, checkoutDate } = req.query;
  
  const params = new URLSearchParams({
    applicationId: process.env.RAKUTEN_APP_ID,
    format: 'json',
    hotelNo,
    checkinDate,
    checkoutDate,
    responseType: 'large'
  });
  
  const response = await fetch(
    `${RAKUTEN_BASE_URL}/Travel/HotelDetailSearch/20170426?${params}`
  );
  
  const data = await response.json();
  
  return res.json({
    hotel: data.hotels[0],
    rooms: data.hotels[0].roomInfo,
    facilities: data.hotels[0].hotelFacilitiesInfo
  });
}
```

### 実装優先順位
1. API接続確立（30分）
2. エラーハンドリング（30分）
3. キャッシュ実装（30分）
4. レート制限対策（30分）

## 👤 Worker2: リアルタイムUI実装

### 即座実装ファイル
```javascript
// /components/HotelSearchForm.jsx
const HotelSearchForm = ({ onSearch }) => {
  const [searchParams, setSearchParams] = useState({
    checkinDate: '',
    checkoutDate: '',
    location: { lat: null, lng: null },
    adultNum: 2,
    priceMin: 0,
    priceMax: 50000
  });
  
  const handleLocationSearch = async (query) => {
    // Google Maps Geocoding APIで緯度経度取得
    const coords = await geocodeLocation(query);
    setSearchParams({ ...searchParams, location: coords });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchParams);
  };
  
  return (
    <form onSubmit={handleSubmit} className="search-form">
      <DateRangePicker
        startDate={searchParams.checkinDate}
        endDate={searchParams.checkoutDate}
        onChange={dates => setSearchParams({...searchParams, ...dates})}
      />
      <LocationInput
        onChange={handleLocationSearch}
        placeholder="エリア・駅名・ホテル名"
      />
      <PriceRangeSlider
        min={searchParams.priceMin}
        max={searchParams.priceMax}
        onChange={prices => setSearchParams({...searchParams, ...prices})}
      />
      <button type="submit">検索</button>
    </form>
  );
};

// /components/HotelDetailModal.jsx
const HotelDetailModal = ({ hotelNo, dates, onClose }) => {
  const [hotelData, setHotelData] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  useEffect(() => {
    fetchHotelDetail(hotelNo, dates).then(setHotelData);
  }, [hotelNo]);
  
  const handleBooking = () => {
    // 楽天トラベルへ遷移（アフィリエイトID付き）
    const bookingUrl = buildRakutenBookingUrl({
      hotelNo,
      room: selectedRoom,
      ...dates,
      affiliateId: process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID
    });
    window.open(bookingUrl, '_blank');
  };
  
  return (
    <Modal isOpen onClose={onClose}>
      <PhotoGallery images={hotelData?.hotelImageUrl} />
      <HotelInfo data={hotelData} />
      <RoomList 
        rooms={hotelData?.rooms}
        onSelect={setSelectedRoom}
      />
      <BookingButton 
        onClick={handleBooking}
        disabled={!selectedRoom}
      >
        楽天トラベルで予約
      </BookingButton>
    </Modal>
  );
};
```

### 実装優先順位
1. 検索フォーム（45分）
2. 結果一覧表示（45分）
3. 詳細モーダル（30分）
4. モバイル対応（30分）

## 💾 Worker3: 価格追跡・通知システム

### 即座実装ファイル
```javascript
// /api/cron/price-monitor.js
import { supabase } from '../../lib/supabase';
import { sendEmail } from '../../lib/email';

export default async function handler(req, res) {
  // Vercel Cronで15分ごとに実行
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { data: watchlist } = await supabase
    .from('watchlist_extended')
    .select('*')
    .eq('active', true);
  
  for (const item of watchlist) {
    const currentData = await checkHotelPrice(item.hotel_no, {
      checkinDate: item.checkin_date,
      checkoutDate: item.checkout_date
    });
    
    // 価格履歴保存
    await supabase
      .from('price_history_15min')
      .insert({
        hotel_no: item.hotel_no,
        price: currentData.minPrice,
        availability_status: currentData.status,
        room_count: currentData.availableRooms
      });
    
    // アラート条件チェック
    if (shouldAlert(item, currentData)) {
      await sendPriceAlert(item.user_id, {
        hotelName: currentData.hotelName,
        oldPrice: item.last_known_price,
        newPrice: currentData.minPrice,
        dropPercentage: calculateDrop(item.last_known_price, currentData.minPrice),
        bookingUrl: currentData.bookingUrl
      });
    }
  }
  
  return res.json({ processed: watchlist.length });
}

// /lib/price-analytics.js
export const analyzePriceTrends = async (hotelNo) => {
  // 過去30日間の価格データ取得
  const { data: history } = await supabase
    .from('price_history_15min')
    .select('*')
    .eq('hotel_no', hotelNo)
    .gte('checked_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .order('checked_at', { ascending: true });
  
  return {
    averagePrice: calculateAverage(history),
    lowestPrice: Math.min(...history.map(h => h.price)),
    highestPrice: Math.max(...history.map(h => h.price)),
    currentTrend: detectTrend(history),
    bestDayToBook: findOptimalBookingDay(history),
    priceDropProbability: calculateDropProbability(history)
  };
};
```

### 実装優先順位
1. 監視テーブル作成（30分）
2. Cronジョブ設定（30分）
3. 通知システム（45分）
4. 分析機能（45分）

## 📊 統合ポイント

### API → UI連携
```javascript
// Worker1 → Worker2
const searchResults = await api.searchVacantHotels(params);
setHotels(searchResults);
```

### UI → 監視連携
```javascript
// Worker2 → Worker3
const addToWatchlist = async (hotel) => {
  await api.addToWatchlist({
    hotel_no: hotel.hotelNo,
    target_price: hotel.currentPrice * 0.9,
    ...userPreferences
  });
};
```

### 監視 → 通知連携
```javascript
// Worker3 → Email
if (priceDropped) {
  await sendEmail(user.email, 'price-drop-template', {
    hotel: hotelData,
    savings: oldPrice - newPrice
  });
}
```

## ⚡ 即座開始アクション

### Worker1
```bash
# 楽天API接続テスト
curl -X GET "https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426?applicationId=YOUR_APP_ID&format=json"
```

### Worker2
```bash
# UIコンポーネント作成
npx create-next-app@latest hotel-ui --typescript --tailwind
```

### Worker3
```bash
# Supabaseテーブル作成
supabase migration new create_price_monitoring_tables
```

---
**全Worker同時実装開始！10時間で実用システム完成へ！**