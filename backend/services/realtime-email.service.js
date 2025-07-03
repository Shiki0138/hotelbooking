/**
 * リアルタイム通知メールサービス
 * Worker3: 15分間隔価格監視・即時通知担当
 * Created: 2025-07-02
 */

const { Resend } = require('resend');
const supabase = require('./supabase-client');

class RealtimeEmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromAddress = process.env.FROM_EMAIL || 'noreply@lastminutestay.com';
    this.domain = process.env.DOMAIN || 'lastminutestay.com';
  }

  /**
   * 価格下落アラート送信
   */
  async sendPriceDropAlert(alertData) {
    const {
      to,
      user_name,
      hotel_name,
      checkin_date,
      checkout_date,
      previous_price,
      current_price,
      price_drop,
      drop_percentage,
      room_info,
      booking_url,
    } = alertData;

    const subject = `🔥 ${Math.round(drop_percentage)}%OFF! ${hotel_name} - 価格下落アラート`;
    
    const htmlContent = this.generatePriceDropTemplate({
      user_name,
      hotel_name,
      checkin_date,
      checkout_date,
      previous_price,
      current_price,
      price_drop,
      drop_percentage,
      room_info,
      booking_url,
    });

    return this.sendEmail({
      to,
      subject,
      html: htmlContent,
    });
  }

  /**
   * 新規空室アラート送信
   */
  async sendAvailabilityAlert(alertData) {
    const {
      to,
      user_name,
      hotel_name,
      checkin_date,
      checkout_date,
      current_price,
      room_info,
      booking_url,
    } = alertData;

    const subject = `✨ 空室発見! ${hotel_name} - 予約可能になりました`;
    
    const htmlContent = this.generateAvailabilityTemplate({
      user_name,
      hotel_name,
      checkin_date,
      checkout_date,
      current_price,
      room_info,
      booking_url,
    });

    return this.sendEmail({
      to,
      subject,
      html: htmlContent,
    });
  }

  /**
   * 残室わずかアラート送信
   */
  async sendLastRoomAlert(alertData) {
    const {
      to,
      user_name,
      hotel_name,
      checkin_date,
      checkout_date,
      current_price,
      remaining_rooms,
      room_info,
      booking_url,
    } = alertData;

    const subject = `⚡ 残り${remaining_rooms}室! ${hotel_name} - 急いで予約を`;
    
    const htmlContent = this.generateLastRoomTemplate({
      user_name,
      hotel_name,
      checkin_date,
      checkout_date,
      current_price,
      remaining_rooms,
      room_info,
      booking_url,
    });

    return this.sendEmail({
      to,
      subject,
      html: htmlContent,
    });
  }

  /**
   * 日次サマリー送信
   */
  async sendDailySummary(summaryData) {
    const {
      to,
      user_name,
      date,
      alerts_count,
      total_savings,
      alerts,
    } = summaryData;

    const subject = `📊 ${date} 価格監視サマリー - ${alerts_count}件のアラート`;
    
    const htmlContent = this.generateDailySummaryTemplate({
      user_name,
      date,
      alerts_count,
      total_savings,
      alerts,
    });

    return this.sendEmail({
      to,
      subject,
      html: htmlContent,
    });
  }

  /**
   * 価格下落アラートHTMLテンプレート
   */
  generatePriceDropTemplate(data) {
    const {
      user_name,
      hotel_name,
      checkin_date,
      checkout_date,
      previous_price,
      current_price,
      price_drop,
      drop_percentage,
      room_info,
      booking_url,
    } = data;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>価格下落アラート</title>
    <style>
        body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #ff6b6b, #ff8e8e); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .price-alert { background-color: #fff5f5; border-left: 4px solid #ff6b6b; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .price-comparison { display: flex; justify-content: space-between; align-items: center; margin: 20px 0; }
        .price-old { text-decoration: line-through; color: #999; font-size: 18px; }
        .price-new { color: #ff6b6b; font-size: 24px; font-weight: bold; }
        .savings { background-color: #e8f5e8; color: #2d5a2d; padding: 10px 15px; border-radius: 25px; font-weight: bold; }
        .hotel-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .cta-button { display: inline-block; background-color: #ff6b6b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔥 価格下落アラート</h1>
            <p>お待たせしました！価格が下落しました</p>
        </div>
        
        <div class="content">
            <p>こんにちは、${user_name}さん</p>
            
            <div class="price-alert">
                <h2>${hotel_name}</h2>
                <p><strong>宿泊日程：</strong>${checkin_date} 〜 ${checkout_date}</p>
                
                <div class="price-comparison">
                    <div>
                        <div class="price-old">¥${previous_price?.toLocaleString()}</div>
                        <div class="price-new">¥${current_price?.toLocaleString()}</div>
                    </div>
                    <div class="savings">
                        ${Math.round(drop_percentage)}%OFF<br>
                        ¥${price_drop?.toLocaleString()} お得！
                    </div>
                </div>
                
                ${room_info ? `
                <div class="hotel-info">
                    <p><strong>部屋タイプ：</strong>${room_info.room_name || '詳細は予約サイトで確認'}</p>
                    <p><strong>プラン：</strong>${room_info.plan_name || '基本プラン'}</p>
                </div>
                ` : ''}
                
                <div style="text-align: center;">
                    <a href="${booking_url}" class="cta-button" target="_blank">
                        今すぐ予約する
                    </a>
                </div>
            </div>
            
            <p>⚡ この価格は変動する可能性があります。お早めにご予約ください！</p>
            <p>📱 スマートフォンからでも簡単に予約できます。</p>
        </div>
        
        <div class="footer">
            <p>LastMinuteStay 価格監視システム</p>
            <p>このメールは自動送信されています。</p>
            <p>配信停止は<a href="${this.domain}/unsubscribe">こちら</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 空室アラートHTMLテンプレート
   */
  generateAvailabilityTemplate(data) {
    const {
      user_name,
      hotel_name,
      checkin_date,
      checkout_date,
      current_price,
      room_info,
      booking_url,
    } = data;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>空室発見アラート</title>
    <style>
        body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #4ecdc4, #6fd5cd); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .availability-alert { background-color: #f0ffff; border-left: 4px solid #4ecdc4; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .price-display { text-align: center; font-size: 28px; color: #4ecdc4; font-weight: bold; margin: 20px 0; }
        .hotel-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .cta-button { display: inline-block; background-color: #4ecdc4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✨ 空室発見！</h1>
            <p>ご希望のホテルに空室が出ました</p>
        </div>
        
        <div class="content">
            <p>こんにちは、${user_name}さん</p>
            
            <div class="availability-alert">
                <h2>${hotel_name}</h2>
                <p><strong>宿泊日程：</strong>${checkin_date} 〜 ${checkout_date}</p>
                
                <div class="price-display">
                    ¥${current_price?.toLocaleString()}
                </div>
                
                ${room_info ? `
                <div class="hotel-info">
                    <p><strong>部屋タイプ：</strong>${room_info.room_name || '詳細は予約サイトで確認'}</p>
                    <p><strong>プラン：</strong>${room_info.plan_name || '基本プラン'}</p>
                </div>
                ` : ''}
                
                <div style="text-align: center;">
                    <a href="${booking_url}" class="cta-button" target="_blank">
                        今すぐ予約する
                    </a>
                </div>
            </div>
            
            <p>🎯 ウォッチリストに登録いただいていたホテルに空室が出ました！</p>
            <p>⏰ 人気のホテルのため、お早めのご予約をおすすめします。</p>
        </div>
        
        <div class="footer">
            <p>LastMinuteStay 価格監視システム</p>
            <p>このメールは自動送信されています。</p>
            <p>配信停止は<a href="${this.domain}/unsubscribe">こちら</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 残室わずかアラートHTMLテンプレート
   */
  generateLastRoomTemplate(data) {
    const {
      user_name,
      hotel_name,
      checkin_date,
      checkout_date,
      current_price,
      remaining_rooms,
      room_info,
      booking_url,
    } = data;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>残室わずかアラート</title>
    <style>
        body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #ffa726, #ffb74d); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .urgency-alert { background-color: #fff8e1; border-left: 4px solid #ffa726; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .remaining-rooms { text-align: center; font-size: 36px; color: #ffa726; font-weight: bold; margin: 20px 0; }
        .hotel-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .cta-button { display: inline-block; background-color: #ffa726; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ 残室わずか！</h1>
            <p>急いでご予約ください</p>
        </div>
        
        <div class="content">
            <p>こんにちは、${user_name}さん</p>
            
            <div class="urgency-alert">
                <h2>${hotel_name}</h2>
                <p><strong>宿泊日程：</strong>${checkin_date} 〜 ${checkout_date}</p>
                
                <div class="remaining-rooms">
                    残り${remaining_rooms}室
                </div>
                
                <p style="text-align: center; font-size: 24px; color: #ffa726; font-weight: bold;">
                    ¥${current_price?.toLocaleString()}
                </p>
                
                ${room_info ? `
                <div class="hotel-info">
                    <p><strong>部屋タイプ：</strong>${room_info.room_name || '詳細は予約サイトで確認'}</p>
                    <p><strong>プラン：</strong>${room_info.plan_name || '基本プラン'}</p>
                </div>
                ` : ''}
                
                <div style="text-align: center;">
                    <a href="${booking_url}" class="cta-button" target="_blank">
                        急いで予約する！
                    </a>
                </div>
            </div>
            
            <p>🔥 このホテルの残室数が少なくなっています！</p>
            <p>⏰ 満室になる前に、お早めにご予約ください。</p>
            <p>📱 今すぐスマートフォンからでも予約可能です。</p>
        </div>
        
        <div class="footer">
            <p>LastMinuteStay 価格監視システム</p>
            <p>このメールは自動送信されています。</p>
            <p>配信停止は<a href="${this.domain}/unsubscribe">こちら</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 日次サマリーHTMLテンプレート
   */
  generateDailySummaryTemplate(data) {
    const {
      user_name,
      date,
      alerts_count,
      total_savings,
      alerts,
    } = data;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>日次価格監視サマリー</title>
    <style>
        body { font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .summary-stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-item { text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
        .alert-item { border-bottom: 1px solid #eee; padding: 15px 0; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 日次サマリー</h1>
            <p>${date} の価格監視レポート</p>
        </div>
        
        <div class="content">
            <p>こんにちは、${user_name}さん</p>
            
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-number">${alerts_count}</div>
                    <div>アラート数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">¥${total_savings?.toLocaleString()}</div>
                    <div>節約額</div>
                </div>
            </div>
            
            ${alerts_count > 0 ? `
            <h3>主なアラート</h3>
            ${alerts.map(alert => `
            <div class="alert-item">
                <h4>${alert.watchlist_extended.hotel_name}</h4>
                <p>${alert.watchlist_extended.checkin_date} 〜 ${alert.watchlist_extended.checkout_date}</p>
                <p><strong>価格下落：</strong>¥${alert.price_difference?.toLocaleString()} (${alert.price_drop_percentage}%)</p>
            </div>
            `).join('')}
            ` : '<p>昨日はアラートがありませんでした。</p>'}
            
            <p>💡 価格監視を続けて、お得な旅行を実現しましょう！</p>
        </div>
        
        <div class="footer">
            <p>LastMinuteStay 価格監視システム</p>
            <p>このメールは自動送信されています。</p>
            <p>配信停止は<a href="${this.domain}/unsubscribe">こちら</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * メール送信実行
   */
  async sendEmail({ to, subject, html }) {
    try {
      const result = await this.resend.emails.send({
        from: this.fromAddress,
        to: [to],
        subject,
        html,
      });

      console.log(`✅ メール送信成功: ${to} - ${subject}`);
      return {
        success: true,
        messageId: result.data?.id,
      };

    } catch (error) {
      console.error('メール送信エラー:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * アラート送信（統合メソッド）
   */
  async sendAlert(alertData) {
    const { type } = alertData;

    switch (type) {
      case 'price_drop':
        return this.sendPriceDropAlert(alertData.data);
      case 'new_availability':
        return this.sendAvailabilityAlert(alertData.data);
      case 'last_room':
        return this.sendLastRoomAlert(alertData.data);
      default:
        throw new Error(`未対応のアラートタイプ: ${type}`);
    }
  }
}

module.exports = new RealtimeEmailService();