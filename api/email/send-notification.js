import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Email templates
const templates = {
  match_notification: {
    subject: (data) => `【LastMinuteStay】${data.hotelName}に空室があります！`,
    html: (data) => `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1976d2; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f5f5f5; padding: 30px; }
    .hotel-card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .price { font-size: 28px; color: #d32f2f; font-weight: bold; }
    .button { display: inline-block; background: #ff5722; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏨 空室のお知らせ</h1>
    </div>
    <div class="content">
      <p>${data.userName}様</p>
      <p>ご希望の条件に合うホテルに空室が見つかりました！</p>
      
      <div class="hotel-card">
        <h2>${data.hotelName}</h2>
        <p>📍 ${data.address}</p>
        <p>📅 チェックイン: ${data.checkIn}</p>
        <p>🛏️ 空室数: ${data.availableRooms}室</p>
        <div class="price">¥${data.price.toLocaleString()}/泊</div>
        
        ${data.isLastMinute ? '<p style="color: #ff5722;">⚡ 直前割引！あと' + data.daysUntil + '日</p>' : ''}
        
        <a href="${data.bookingUrl}" class="button">詳細を見る</a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        ※空室は早い者勝ちです。お早めにご確認ください。
      </p>
    </div>
    <div class="footer">
      <p>このメールは LastMinuteStay から自動送信されています。</p>
      <p><a href="${data.unsubscribeUrl}">配信停止</a> | <a href="${data.preferencesUrl}">通知設定</a></p>
    </div>
  </div>
</body>
</html>
    `
  },
  
  price_drop: {
    subject: (data) => `【値下げ】${data.hotelName} ${data.discountPercent}%OFF！`,
    html: (data) => `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, sans-serif; color: #333; }
    .deal { background: #fff3e0; padding: 20px; border-left: 4px solid #ff9800; margin: 20px 0; }
    .old-price { text-decoration: line-through; color: #999; }
    .new-price { font-size: 24px; color: #f57c00; font-weight: bold; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #f57c00;">💰 お得な値下げ情報！</h2>
    
    <p>${data.userName}様</p>
    
    <div class="deal">
      <h3>${data.hotelName}</h3>
      <p>チェックイン: ${data.checkIn}</p>
      <p>
        <span class="old-price">¥${data.oldPrice.toLocaleString()}</span>
        → <span class="new-price">¥${data.newPrice.toLocaleString()}/泊</span>
      </p>
      <p style="color: #d84315; font-weight: bold;">
        ${data.discountPercent}% OFF（¥${data.discountAmount.toLocaleString()}お得！）
      </p>
      <a href="${data.bookingUrl}" style="display: inline-block; background: #ff6f00; color: white; padding: 10px 25px; text-decoration: none; border-radius: 5px;">
        今すぐ予約
      </a>
    </div>
  </div>
</body>
</html>
    `
  },
  
  weekly_digest: {
    subject: () => '【LastMinuteStay】今週のおすすめホテル',
    html: (data) => `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    .hotel-list { margin: 20px 0; }
    .hotel-item { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>📋 今週のおすすめホテル</h2>
    
    <p>${data.userName}様</p>
    <p>今週、ご希望の条件に合うホテルをまとめました。</p>
    
    <div class="hotel-list">
      ${data.hotels.map(hotel => `
        <div class="hotel-item">
          <h3>${hotel.name}</h3>
          <p>📅 ${hotel.dates.join(', ')}</p>
          <p>💰 ¥${hotel.lowestPrice.toLocaleString()}〜/泊</p>
          <a href="${hotel.url}">詳細を見る</a>
        </div>
      `).join('')}
    </div>
    
    <p style="text-align: center; margin-top: 30px;">
      <a href="${data.searchUrl}" style="background: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
        もっと見る
      </a>
    </p>
  </div>
</body>
</html>
    `
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, userId, data } = req.body;

  if (!type || !userId || !data) {
    return res.status(400).json({ error: '必須パラメータが不足しています' });
  }

  try {
    // Get user info
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('email, full_name, notification_enabled, preferred_language')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    if (!user.notification_enabled) {
      return res.status(200).json({ 
        success: true, 
        message: '通知が無効になっています' 
      });
    }

    // Prepare email data
    const template = templates[type];
    if (!template) {
      return res.status(400).json({ error: '無効なテンプレートタイプ' });
    }

    const emailData = {
      ...data,
      userName: user.full_name || 'お客様',
      unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/preferences/unsubscribe?token=${userId}`,
      preferencesUrl: `${process.env.NEXT_PUBLIC_APP_URL}/preferences`,
      bookingUrl: data.hotelId ? 
        `${process.env.NEXT_PUBLIC_APP_URL}/hotels/${data.hotelId}?date=${data.checkIn}` : 
        '#'
    };

    // Send email
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'LastMinuteStay <notifications@lastminutestay.jp>',
      to: user.email,
      subject: template.subject(emailData),
      html: template.html(emailData),
      tags: [
        { name: 'type', value: type },
        { name: 'user_id', value: userId }
      ]
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      throw emailError;
    }

    // Log notification
    await supabase
      .from('notification_log')
      .insert({
        user_id: userId,
        email_type: type,
        email_id: emailResult.id,
        sent_at: new Date().toISOString(),
        status: 'sent'
      });

    return res.status(200).json({
      success: true,
      messageId: emailResult.id,
      message: 'メールを送信しました'
    });

  } catch (error) {
    console.error('Email notification error:', error);
    return res.status(500).json({ 
      error: 'メール送信に失敗しました' 
    });
  }
}