const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase client with Supavisor URL (IPv6 compliance)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class EmailService {
  /**
   * Send booking confirmation email
   * @param {Object} params Email parameters
   * @returns {Promise<Object>} Email sending result
   */
  async sendBookingConfirmation({ booking, user, hotel, room }) {
    try {
      const emailContent = this.generateBookingConfirmationHTML({
        booking,
        user,
        hotel,
        room,
      });

      const { data, error } = await resend.emails.send({
        from: 'LastMinuteStay <noreply@lastminutestay.jp>',
        to: user.email,
        subject: `予約確認: ${hotel.name} - 予約番号 ${booking.booking_number}`,
        html: emailContent,
        tags: [
          { name: 'type', value: 'booking_confirmation' },
          { name: 'booking_id', value: booking.id },
        ],
      });

      // Log email notification
      await this.logEmailNotification({
        booking_id: booking.id,
        recipient_email: user.email,
        email_type: 'booking_confirmation',
        subject: `予約確認: ${hotel.name}`,
        status: error ? 'failed' : 'sent',
        error_message: error?.message,
      });

      return { success: !error, data, error };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment confirmation email
   * @param {Object} params Email parameters
   * @returns {Promise<Object>} Email sending result
   */
  async sendPaymentConfirmation({ booking, user, paymentDetails }) {
    try {
      const emailContent = this.generatePaymentConfirmationHTML({
        booking,
        user,
        paymentDetails,
      });

      const { data, error } = await resend.emails.send({
        from: 'LastMinuteStay <noreply@lastminutestay.jp>',
        to: user.email,
        subject: `決済完了のお知らせ - 予約番号 ${booking.booking_number}`,
        html: emailContent,
        tags: [
          { name: 'type', value: 'payment_confirmation' },
          { name: 'booking_id', value: booking.id },
        ],
      });

      await this.logEmailNotification({
        booking_id: booking.id,
        recipient_email: user.email,
        email_type: 'payment_confirmation',
        subject: '決済完了のお知らせ',
        status: error ? 'failed' : 'sent',
        error_message: error?.message,
      });

      return { success: !error, data, error };
    } catch (error) {
      console.error('Payment email error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send cancellation confirmation email
   * @param {Object} params Email parameters
   * @returns {Promise<Object>} Email sending result
   */
  async sendCancellationConfirmation({ booking, user, refundAmount }) {
    try {
      const emailContent = this.generateCancellationHTML({
        booking,
        user,
        refundAmount,
      });

      const { data, error } = await resend.emails.send({
        from: 'LastMinuteStay <noreply@lastminutestay.jp>',
        to: user.email,
        subject: `予約キャンセル確認 - 予約番号 ${booking.booking_number}`,
        html: emailContent,
        tags: [
          { name: 'type', value: 'cancellation' },
          { name: 'booking_id', value: booking.id },
        ],
      });

      await this.logEmailNotification({
        booking_id: booking.id,
        recipient_email: user.email,
        email_type: 'cancellation',
        subject: '予約キャンセル確認',
        status: error ? 'failed' : 'sent',
        error_message: error?.message,
      });

      return { success: !error, data, error };
    } catch (error) {
      console.error('Cancellation email error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log email notification to database
   * @private
   */
  async logEmailNotification(notificationData) {
    try {
      const { error } = await supabase
        .from('email_notifications')
        .insert({
          ...notificationData,
          sent_at: notificationData.status === 'sent' ? new Date().toISOString() : null,
        });

      if (error) {
        console.error('Email log error:', error);
      }
    } catch (error) {
      console.error('Email logging error:', error);
    }
  }

  /**
   * Generate booking confirmation HTML
   * @private
   */
  generateBookingConfirmationHTML({ booking, user, hotel, room }) {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>予約確認</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">予約確認</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">LastMinuteStay</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 30px;">
        ${user.full_name || user.email} 様<br><br>
        この度はLastMinuteStayをご利用いただき、誠にありがとうございます。<br>
        以下の内容でご予約を承りました。
      </p>

      <!-- Booking Details -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">予約詳細</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">予約番号</td>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">${booking.booking_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">ホテル名</td>
            <td style="padding: 8px 0; color: #333;">${hotel.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">お部屋タイプ</td>
            <td style="padding: 8px 0; color: #333;">${room.room_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">チェックイン</td>
            <td style="padding: 8px 0; color: #333;">${new Date(booking.check_in_date).toLocaleDateString('ja-JP')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">チェックアウト</td>
            <td style="padding: 8px 0; color: #333;">${new Date(booking.check_out_date).toLocaleDateString('ja-JP')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">ご利用人数</td>
            <td style="padding: 8px 0; color: #333;">${booking.guests_count}名</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 18px; font-weight: bold;">合計金額</td>
            <td style="padding: 8px 0; color: #ff6b35; font-size: 20px; font-weight: bold;">¥${booking.total_price.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <!-- Hotel Location -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">ホテル所在地</h3>
        <p style="margin: 0; color: #666; line-height: 1.6;">
          ${hotel.address}<br>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.address)}" 
             style="color: #667eea; text-decoration: none;">地図で見る →</a>
        </p>
      </div>

      <!-- Important Notes -->
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #ffeaa7;">
        <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 18px;">重要なお知らせ</h3>
        <ul style="margin: 0; padding-left: 20px; color: #856404; line-height: 1.8;">
          <li>チェックイン時間は15:00以降です</li>
          <li>チェックアウト時間は11:00までです</li>
          <li>ご到着が18:00を過ぎる場合は、ホテルへ直接ご連絡ください</li>
          <li>キャンセルポリシーについては、利用規約をご確認ください</li>
        </ul>
      </div>

      <!-- Contact -->
      <div style="text-align: center; padding: 30px 0; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
          ご不明な点がございましたら、お気軽にお問い合わせください
        </p>
        <p style="margin: 0;">
          <a href="mailto:support@lastminutestay.jp" style="color: #667eea; text-decoration: none;">
            support@lastminutestay.jp
          </a>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a1a; color: #999; padding: 30px 20px; text-align: center; font-size: 12px;">
      <p style="margin: 0 0 10px 0;">LastMinuteStay - 高級ホテルの直前予約</p>
      <p style="margin: 0;">© 2025 LastMinuteStay. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate payment confirmation HTML
   * @private
   */
  generatePaymentConfirmationHTML({ booking, user, paymentDetails }) {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>決済完了</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: #28a745; color: white; padding: 40px 20px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
      <h1 style="margin: 0; font-size: 28px;">決済が完了しました</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 30px;">
        ${user.full_name || user.email} 様<br><br>
        決済が正常に完了しました。<br>
        ご予約いただき、誠にありがとうございます。
      </p>

      <!-- Payment Details -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">決済情報</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">予約番号</td>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">${booking.booking_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">決済金額</td>
            <td style="padding: 8px 0; color: #28a745; font-size: 20px; font-weight: bold;">¥${paymentDetails.amount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">決済日時</td>
            <td style="padding: 8px 0; color: #333;">${new Date().toLocaleString('ja-JP')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">決済方法</td>
            <td style="padding: 8px 0; color: #333;">クレジットカード</td>
          </tr>
        </table>
      </div>

      <p style="text-align: center; color: #666; font-size: 14px;">
        この決済確認メールは大切に保管してください
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a1a; color: #999; padding: 30px 20px; text-align: center; font-size: 12px;">
      <p style="margin: 0;">© 2025 LastMinuteStay. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate cancellation HTML
   * @private
   */
  generateCancellationHTML({ booking, user, refundAmount }) {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>予約キャンセル確認</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: #dc3545; color: white; padding: 40px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">予約キャンセル確認</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 30px;">
        ${user.full_name || user.email} 様<br><br>
        以下の予約がキャンセルされました。
      </p>

      <!-- Cancellation Details -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">キャンセル詳細</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666;">予約番号</td>
            <td style="padding: 8px 0; font-weight: bold; color: #333;">${booking.booking_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">キャンセル日時</td>
            <td style="padding: 8px 0; color: #333;">${new Date().toLocaleString('ja-JP')}</td>
          </tr>
          ${refundAmount ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">返金額</td>
            <td style="padding: 8px 0; color: #dc3545; font-size: 18px; font-weight: bold;">¥${refundAmount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">返金予定</td>
            <td style="padding: 8px 0; color: #333;">5-10営業日以内</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p style="text-align: center; color: #666; font-size: 14px;">
        またのご利用をお待ちしております
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a1a; color: #999; padding: 30px 20px; text-align: center; font-size: 12px;">
      <p style="margin: 0;">© 2025 LastMinuteStay. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

module.exports = new EmailService();