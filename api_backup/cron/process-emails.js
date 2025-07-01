import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Run every 15 minutes
export const config = {
  schedule: '*/15 * * * *'
};

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Processing email queue...');

  try {
    // Get pending notifications
    const { data: pendingNotifications, error } = await supabase
      .from('notifications_queue')
      .select(`
        *,
        user_profiles (
          email,
          full_name,
          preferred_language
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50); // Process 50 at a time

    if (error) throw error;

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending notifications',
        processed: 0
      });
    }

    // Group by user for digest emails
    const userNotifications = {};
    pendingNotifications.forEach(notif => {
      if (!userNotifications[notif.user_id]) {
        userNotifications[notif.user_id] = {
          user: notif.user_profiles,
          notifications: []
        };
      }
      userNotifications[notif.user_id].notifications.push(notif);
    });

    let processedCount = 0;
    let failedCount = 0;

    // Process each user's notifications
    for (const userId in userNotifications) {
      const { user, notifications } = userNotifications[userId];
      
      try {
        // Decide whether to send individual or digest email
        if (notifications.length === 1) {
          // Send individual notification
          await sendIndividualNotification(user, notifications[0]);
        } else {
          // Send digest email
          await sendDigestEmail(user, notifications);
        }

        // Mark notifications as sent
        const notificationIds = notifications.map(n => n.id);
        await supabase
          .from('notifications_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .in('id', notificationIds);

        processedCount += notifications.length;

      } catch (error) {
        console.error(`Failed to send email to user ${userId}:`, error);
        failedCount += notifications.length;

        // Mark as failed
        const notificationIds = notifications.map(n => n.id);
        await supabase
          .from('notifications_queue')
          .update({ 
            status: 'failed', 
            error_message: error.message,
            retry_count: notifications[0].retry_count + 1 
          })
          .in('id', notificationIds);
      }
    }

    // Clean up old sent notifications (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await supabase
      .from('notifications_queue')
      .delete()
      .eq('status', 'sent')
      .lt('sent_at', thirtyDaysAgo.toISOString());

    const summary = {
      success: true,
      processed: processedCount,
      failed: failedCount,
      timestamp: new Date().toISOString()
    };

    console.log('Email processing completed:', summary);
    return res.status(200).json(summary);

  } catch (error) {
    console.error('Email processing error:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Send individual notification email
async function sendIndividualNotification(user, notification) {
  const data = notification.match_data;
  
  const emailHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .hotel-card { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .price { font-size: 24px; color: #d32f2f; font-weight: bold; }
    .button { display: inline-block; background: #2196f3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>🎉 マッチするホテルが見つかりました！</h2>
    
    <p>${user.full_name}様</p>
    
    <div class="hotel-card">
      <h3>${data.hotel_name}</h3>
      <p>📅 ${data.date}</p>
      <p>🛏️ 空室: ${data.available_rooms}室</p>
      <p class="price">¥${data.price.toLocaleString()}/泊</p>
      
      ${data.days_until <= 3 ? '<p style="color: #ff5722;">⚡ 直前割引！残り' + data.days_until + '日</p>' : ''}
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/hotels/${notification.hotel_id}?date=${data.date}" class="button">
        詳細を見る
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      このメールは、あなたの希望条件に基づいて送信されています。<br>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/preferences">通知設定を変更</a>
    </p>
  </div>
</body>
</html>
  `;

  const { error } = await resend.emails.send({
    from: 'LastMinuteStay <alerts@lastminutestay.jp>',
    to: user.email,
    subject: `【空室】${data.hotel_name} - ${data.date}`,
    html: emailHtml,
    tags: [
      { name: 'type', value: notification.notification_type },
      { name: 'notification_id', value: notification.id }
    ]
  });

  if (error) throw error;
}

// Send digest email with multiple notifications
async function sendDigestEmail(user, notifications) {
  const hotelList = notifications.map(n => {
    const data = n.match_data;
    return `
      <div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px;">
        <h4 style="margin: 0 0 10px 0;">${data.hotel_name}</h4>
        <p style="margin: 5px 0;">📅 ${data.date} | 💰 ¥${data.price.toLocaleString()}/泊</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/hotels/${n.hotel_id}?date=${data.date}" 
           style="color: #2196f3; text-decoration: none;">
          詳細を見る →
        </a>
      </div>
    `;
  }).join('');

  const emailHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2196f3; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">📋 新着ホテル ${notifications.length}件</h2>
    </div>
    
    <div style="padding: 20px 0;">
      <p>${user.full_name}様</p>
      <p>ご希望の条件に合うホテルが${notifications.length}件見つかりました。</p>
      
      ${hotelList}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/search" 
           style="display: inline-block; background: #2196f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
          すべて見る
        </a>
      </div>
    </div>
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/preferences">通知設定</a> | 
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe">配信停止</a>
    </p>
  </div>
</body>
</html>
  `;

  const { error } = await resend.emails.send({
    from: 'LastMinuteStay <digest@lastminutestay.jp>',
    to: user.email,
    subject: `【LastMinuteStay】新着ホテル ${notifications.length}件`,
    html: emailHtml,
    tags: [
      { name: 'type', value: 'digest' },
      { name: 'count', value: notifications.length.toString() }
    ]
  });

  if (error) throw error;
}