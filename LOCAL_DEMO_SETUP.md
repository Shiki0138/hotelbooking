# ローカル環境セットアップガイド

## 現在の状態
- ✅ フロントエンド: http://localhost:3001/hotelbooking/ で稼働中
- ⚠️ バックエンド: 未起動（APIエラーが発生中）

## 完全無料プラン機能確認

### 1. メール通知システム（モック版）
```javascript
// frontend/src/services/EmailNotificationService.js
class EmailNotificationService {
  constructor() {
    this.notifications = JSON.parse(localStorage.getItem('emailNotifications') || '[]');
  }

  async subscribeToHotel(hotelId, email) {
    const notification = {
      id: Date.now(),
      hotelId,
      email,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    this.notifications.push(notification);
    localStorage.setItem('emailNotifications', JSON.stringify(this.notifications));
    
    console.log(`📧 メール通知登録: ${email} → ホテルID: ${hotelId}`);
    return notification;
  }

  async checkAvailability(hotelId) {
    // 実際の実装では、ここでメール送信APIを呼び出す
    const subscribers = this.notifications.filter(n => n.hotelId === hotelId);
    
    subscribers.forEach(sub => {
      console.log(`📨 空室通知送信: ${sub.email}`);
      // Vercel Functionsでは: await fetch('/api/send-email', {...})
    });
  }
}
```

### 2. 動作確認手順

1. **ブラウザで確認**
   - http://localhost:3001/hotelbooking/ にアクセス
   - ホテル検索・詳細表示が動作することを確認

2. **通知機能テスト（コンソールで確認）**
   ```javascript
   // ブラウザのコンソールで実行
   const notifier = new EmailNotificationService();
   await notifier.subscribeToHotel('hotel-1', 'test@example.com');
   await notifier.checkAvailability('hotel-1');
   ```

3. **本番デプロイ時の変更点**
   - localStorage → Supabase Database
   - console.log → Resend/SendGrid API
   - モックデータ → 実際のホテルAPI

## 次のステップ

1. **バックエンドAPI起動（オプション）**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **完全無料デプロイ準備**
   ```bash
   # Vercelアカウント作成後
   vercel
   ```

## 確認項目
- [ ] フロントエンド表示確認
- [ ] ホテル検索機能
- [ ] ホテル詳細表示
- [ ] 通知登録（コンソール）
- [ ] レスポンシブデザイン