import { Router, Request, Response } from 'express';
// import emailService from '../services/emailService'; // 実際のメール送信時に使用

const router = Router();

// ユーザー設定を受け取り、メール配信リストに追加
router.post('/preferences', async (req: Request, res: Response) => {
  const { userId, email, preferences } = req.body;
  
  console.log('User preferences received:', { userId, email });
  console.log('Preferences:', preferences);
  
  // デモ用：即座に確認メールを送信
  if (email) {
    // 簡単な確認メール
    console.log(`Demo: Would send welcome email to ${email}`);
    console.log('Preferences saved for email notifications:');
    console.log('- Regions:', preferences.preferred_regions);
    console.log('- Price range:', preferences.min_budget, '-', preferences.max_budget);
    console.log('- Hotel types:', preferences.hotel_types);
    console.log('- Notification frequency:', preferences.notification_frequency);
  }
  
  return res.json({ 
    success: true, 
    message: 'Preferences saved. Email notifications will be sent based on your settings.' 
  });
});

// 価格アラート設定
router.post('/price-alert', async (req: Request, res: Response) => {
  const { userId, email, hotelName, targetPrice } = req.body;
  
  console.log('Price alert set:', { userId, email, hotelName, targetPrice });
  
  return res.json({ 
    success: true, 
    message: `Price alert set for ${hotelName} at ¥${targetPrice.toLocaleString()}` 
  });
});

// デモ用：手動でメール送信トリガー
router.post('/send-demo-email', async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  console.log(`Demo: Sending sample email to ${email}`);
  
  // デモ用のサンプルホテルマッチ
  const sampleMatches = [
    {
      hotel: {
        id: 'ritz-carlton-tokyo',
        name: 'ザ・リッツ・カールトン東京',
        city: '東京都港区',
        minPrice: 65000
      },
      matchReason: 'お客様の希望エリア「東京」で空室があります',
      discountPercentage: 20,
      previousPrice: 80000,
      currentPrice: 64000
    },
    {
      hotel: {
        id: 'park-hyatt-tokyo',
        name: 'パーク ハイアット 東京',
        city: '東京都新宿区',
        minPrice: 48000
      },
      matchReason: '高評価4.7以上・ラグジュアリーホテル',
      discountPercentage: 15,
      previousPrice: 56000,
      currentPrice: 47600
    }
  ];
  
  // 実際のメール送信はスキップ（開発環境）
  console.log('Demo email content:');
  console.log('Subject: 【LastMinuteStay】最大20%割引！お得なホテル情報');
  console.log('To:', email);
  console.log('Matches:', sampleMatches);
  
  return res.json({ 
    success: true, 
    message: 'Demo email sent successfully (check console for details)' 
  });
});

export default router;