# 🏆 高級ホテル空室通知システム仕様書

## 📋 概要
ユーザーが事前に登録した憧れの高級ホテルに空室が発生した際、即座に通知を送信するシステム

## 🎯 システム要件

### 1. ユーザー登録機能
```typescript
interface LuxuryHotelWatchlist {
  userId: string;
  hotels: WatchedHotel[];
  notificationPreferences: NotificationSettings;
}

interface WatchedHotel {
  hotelId: string;
  hotelName: string;
  category: 'ultra-luxury' | 'luxury' | 'premium';
  targetDates: DateRange[];
  priceThreshold?: number;
  roomTypes: string[];
  specialRequests?: string[];
}

interface NotificationSettings {
  email: boolean;
  sms: boolean;
  line: boolean;
  push: boolean;
  frequency: 'instant' | 'hourly' | 'daily';
  quietHours: TimeRange;
}
```

### 2. 空室監視システム
- **監視間隔**: 5分〜15分（ホテルランクによる）
- **優先度**: Ultra Luxury > Luxury > Premium
- **API連携**: 複数OTAのリアルタイム在庫確認

### 3. 通知システム
```typescript
interface AvailabilityNotification {
  type: 'email' | 'sms' | 'line' | 'push';
  priority: 'urgent' | 'high' | 'normal';
  content: {
    hotelName: string;
    roomType: string;
    availableDates: Date[];
    price: number;
    discountPercentage?: number;
    bookingLink: string;
    expiryTime: Date;
  };
}
```

## 🌟 機能詳細

### 1. ホテル登録画面
- 高級ホテルカテゴリから選択
- カレンダーで希望日程を複数登録可能
- 希望価格帯の設定
- 部屋タイプの選択（スイート、ジュニアスイート等）

### 2. 監視エンジン
```javascript
class LuxuryHotelMonitor {
  constructor() {
    this.monitoringQueue = new PriorityQueue();
    this.apiClients = {
      rakuten: new RakutenTravelAPI(),
      booking: new BookingAPI(),
      expedia: new ExpediaAPI(),
      agoda: new AgodaAPI()
    };
  }

  async checkAvailability(watchedHotel) {
    const results = await Promise.all(
      Object.values(this.apiClients).map(client => 
        client.checkAvailability(watchedHotel)
      )
    );
    
    return this.consolidateResults(results);
  }

  async notifyUser(user, availability) {
    const notification = this.createNotification(availability);
    
    if (user.preferences.email) {
      await this.sendEmail(user, notification);
    }
    if (user.preferences.line) {
      await this.sendLineMessage(user, notification);
    }
    // 他の通知方法も同様に処理
  }
}
```

### 3. 通知テンプレート

#### メール通知
```html
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h1>🎊 お待ちかねの高級ホテルに空室が出ました！</h1>
  <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
    <h2>{{hotelName}}</h2>
    <p>✨ {{roomType}}</p>
    <p>📅 利用可能日: {{availableDates}}</p>
    <p>💰 料金: ¥{{price}} {{#if discount}}({{discount}}%OFF!){{/if}}</p>
    <a href="{{bookingLink}}" style="background: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
      今すぐ予約する
    </a>
    <p style="color: #868e96; font-size: 12px;">
      ⏰ この空室情報は{{expiryTime}}まで有効です
    </p>
  </div>
</div>
```

#### LINE通知
```
🏆 高級ホテル空室速報！

{{hotelName}}
{{roomType}}が予約可能になりました！

📅 {{availableDates}}
💰 ¥{{price}} {{#if discount}}({{discount}}%OFF!){{/if}}

▼ 今すぐ予約
{{bookingLink}}

お急ぎください！人気のお部屋です。
```

### 4. ダッシュボード機能
- 登録ホテル一覧表示
- 通知履歴
- 予約成功率の表示
- お気に入りホテルランキング

## 🔧 技術実装

### バックエンドAPI
```typescript
// routes/api/luxury-hotels.ts
router.post('/watchlist', async (req, res) => {
  const { userId, hotelId, dateRanges, priceThreshold } = req.body;
  
  const watchlistItem = await LuxuryHotelWatchlist.create({
    userId,
    hotelId,
    dateRanges,
    priceThreshold,
    createdAt: new Date()
  });
  
  // 監視ジョブをキューに追加
  await monitoringQueue.add('check-availability', {
    watchlistItemId: watchlistItem.id
  });
  
  res.json({ success: true, watchlistItem });
});

router.get('/watchlist/:userId', async (req, res) => {
  const watchlist = await LuxuryHotelWatchlist.findAll({
    where: { userId: req.params.userId },
    include: ['hotel', 'notifications']
  });
  
  res.json({ watchlist });
});
```

### フロントエンドコンポーネント
```jsx
// components/LuxuryHotelWatchlist.jsx
const LuxuryHotelWatchlist = () => {
  const [watchedHotels, setWatchedHotels] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const addToWatchlist = async (hotel) => {
    const response = await api.post('/luxury-hotels/watchlist', {
      userId: currentUser.id,
      hotelId: hotel.id,
      dateRanges: selectedDates,
      priceThreshold: maxPrice
    });
    
    if (response.data.success) {
      toast.success('高級ホテルを監視リストに追加しました！');
      setWatchedHotels([...watchedHotels, response.data.watchlistItem]);
    }
  };

  return (
    <div className="luxury-watchlist">
      <h2>憧れの高級ホテル監視リスト</h2>
      <Button onClick={() => setShowAddModal(true)}>
        ＋ ホテルを追加
      </Button>
      
      <div className="watched-hotels-grid">
        {watchedHotels.map(hotel => (
          <LuxuryHotelCard 
            key={hotel.id}
            hotel={hotel}
            onRemove={() => removeFromWatchlist(hotel.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

## 📊 期待される成果

1. **ユーザーエンゲージメント**: 300%向上
2. **高級ホテル予約率**: 150%増加
3. **ユーザー満足度**: 95%以上
4. **リピート利用率**: 80%向上

## 🚀 実装スケジュール

1. **Week 1**: データベース設計・API基盤構築
2. **Week 2**: 監視エンジン実装
3. **Week 3**: 通知システム実装
4. **Week 4**: フロントエンド統合・テスト

この機能により、ユーザーは憧れの高級ホテルに泊まる夢を実現しやすくなります。