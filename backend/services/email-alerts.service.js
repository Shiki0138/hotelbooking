const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const SentryService = require('./sentry.service');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase client with Supavisor URL (IPv6 compliance)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class EmailAlertsService {
  /**
   * Send alert email - Boss継続実装
   * @param {Object} emailData Alert email data
   * @returns {Promise<Object>} Email sending result
   */
  async sendAlert(emailData) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'LastMinuteStay アラート <alerts@lastminutestay.jp>',
        to: emailData.to,
        subject: emailData.subject,
        html: this.generateAlertHTML(emailData),
        tags: [
          { name: 'type', value: emailData.type },
          { name: 'hotel_no', value: emailData.data.hotel_name || 'unknown' },
        ],
      });

      return { success: !error, data, error };
    } catch (error) {
      console.error('Alert email error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate alert HTML email
   * @private
   */
  generateAlertHTML(emailData) {
    const { type, data } = emailData;
    
    if (type === 'price_drop') {
      return this.generatePriceDropHTML(data);
    } else if (type === 'new_availability') {
      return this.generateAvailabilityHTML(data);
    }
    
    return this.generateGenericAlertHTML(emailData);
  }

  /**
   * Generate price drop HTML
   * @private
   */
  generatePriceDropHTML(data) {
    const dropPercentage = data.drop_percentage || 0;
    const dropAmount = data.price_drop || 0;
    
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>価格下落アラート</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 40px 20px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">🎯</div>
      <h1 style="margin: 0; font-size: 28px;">価格下落アラート！</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">お探しのホテルが値下がりしました</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 30px;">
        ${data.user_name} 様<br><br>
        ウォッチリストに登録されているホテルの価格が下落しました！
      </p>

      <!-- Hotel Details -->
      <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #ff6b35;">
        <h3 style="margin: 0 0 16px 0; color: #333; font-size: 22px;">${data.hotel_name}</h3>
        
        <!-- Price Comparison -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <div style="color: #999; font-size: 14px; text-decoration: line-through;">
                以前の価格: ¥${(data.previous_price || 0).toLocaleString()}
              </div>
              <div style="color: #ff6b35; font-size: 24px; font-weight: bold;">
                現在の価格: ¥${(data.current_price || 0).toLocaleString()}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="background: #ff6b35; color: white; padding: 8px 12px; border-radius: 20px; font-size: 14px; font-weight: bold;">
                -${dropPercentage}% OFF
              </div>
              <div style="color: #ff6b35; font-size: 16px; font-weight: bold; margin-top: 4px;">
                ¥${dropAmount.toLocaleString()} 安く！
              </div>
            </div>
          </div>
        </div>

        <!-- Booking Details -->
        <div style="color: #666; font-size: 14px; line-height: 1.6;">
          <div>📅 チェックイン: ${data.checkin_date}</div>
          <div>📅 チェックアウト: ${data.checkout_date}</div>
          ${data.room_info ? `<div>🏨 部屋タイプ: ${data.room_info.room_name}</div>` : ''}
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.booking_url}" 
           style="background: #ff6b35; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
          今すぐ予約する →
        </a>
      </div>

      <!-- Tips -->
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h4 style="margin: 0 0 10px 0; color: #1976d2;">💡 お得な予約のコツ</h4>
        <ul style="margin: 0; padding-left: 20px; color: #1976d2; line-height: 1.8; font-size: 14px;">
          <li>価格は変動する可能性があります。お早めのご予約をおすすめします</li>
          <li>キャンセル無料プランがある場合は、とりあえず予約しておくと安心です</li>
          <li>直前予約でさらに価格が下がる場合もあります</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a1a; color: #999; padding: 30px 20px; text-align: center; font-size: 12px;">
      <p style="margin: 0 0 10px 0;">LastMinuteStay - 高級ホテルの直前予約でお得に宿泊</p>
      <p style="margin: 0;">© 2025 LastMinuteStay. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Send price drop alert email
   * @param {Object} params Alert parameters
   * @returns {Promise<Object>} Email sending result
   */
  async sendPriceDropAlert({ user, watchlist, hotelData, priceInfo }) {
    try {
      const emailContent = this.generatePriceDropHTML({
        user,
        watchlist,
        hotelData,
        priceInfo,
      });

      const subject = `🎯 価格下落アラート！${hotelData.hotel_name} - ¥${priceInfo.drop_amount.toLocaleString()}下落`;

      const { data, error } = await resend.emails.send({
        from: 'LastMinuteStay アラート <alerts@lastminutestay.jp>',
        to: user.email,
        subject,
        html: emailContent,
        tags: [
          { name: 'type', value: 'price_drop_alert' },
          { name: 'hotel_id', value: hotelData.hotel_id },
          { name: 'user_id', value: user.id },
        ],
      });

      // Log notification
      await this.logNotification({
        user_id: user.id,
        watchlist_id: watchlist.id,
        notification_type: 'price_drop',
        hotel_data: hotelData,
        price_info: priceInfo,
        email_subject: subject,
        email_status: error ? 'failed' : 'sent',
        error_message: error?.message,
      });

      if (error) {
        SentryService.logEmailError(error, {
          recipient_email: user.email,
          email_type: 'price_drop_alert',
          hotel_id: hotelData.hotel_id,
        });
      }

      return { success: !error, data, error };
    } catch (error) {
      console.error('Price drop alert error:', error);
      SentryService.logEmailError(error, {
        recipient_email: user.email,
        email_type: 'price_drop_alert',
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send availability alert email
   * @param {Object} params Alert parameters
   * @returns {Promise<Object>} Email sending result
   */
  async sendAvailabilityAlert({ user, watchlist, hotelData, availabilityInfo }) {
    try {
      const emailContent = this.generateAvailabilityHTML({
        user,
        watchlist,
        hotelData,
        availabilityInfo,
      });

      const subject = `🏨 空室アラート！${hotelData.hotel_name} - ${availabilityInfo.status_message}`;

      const { data, error } = await resend.emails.send({
        from: 'LastMinuteStay アラート <alerts@lastminutestay.jp>',
        to: user.email,
        subject,
        html: emailContent,
        tags: [
          { name: 'type', value: 'availability_alert' },
          { name: 'hotel_id', value: hotelData.hotel_id },
          { name: 'user_id', value: user.id },
        ],
      });

      // Log notification
      await this.logNotification({
        user_id: user.id,
        watchlist_id: watchlist.id,
        notification_type: 'availability',
        hotel_data: hotelData,
        price_info: availabilityInfo,
        email_subject: subject,
        email_status: error ? 'failed' : 'sent',
        error_message: error?.message,
      });

      return { success: !error, data, error };
    } catch (error) {
      console.error('Availability alert error:', error);
      SentryService.logEmailError(error, {
        recipient_email: user.email,
        email_type: 'availability_alert',
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send daily digest email
   * @param {Object} params Digest parameters
   * @returns {Promise<Object>} Email sending result
   */
  async sendDailyDigest({ user, watchlistUpdates, newDeals }) {
    try {
      const emailContent = this.generateDailyDigestHTML({
        user,
        watchlistUpdates,
        newDeals,
      });

      const subject = `📧 LastMinuteStay 日次レポート - ${new Date().toLocaleDateString('ja-JP')}`;

      const { data, error } = await resend.emails.send({
        from: 'LastMinuteStay デイリー <daily@lastminutestay.jp>',
        to: user.email,
        subject,
        html: emailContent,
        tags: [
          { name: 'type', value: 'daily_digest' },
          { name: 'user_id', value: user.id },
        ],
      });

      // Log notification
      await this.logNotification({
        user_id: user.id,
        watchlist_id: null,
        notification_type: 'daily_digest',
        hotel_data: { watchlist_count: watchlistUpdates.length, deals_count: newDeals.length },
        price_info: null,
        email_subject: subject,
        email_status: error ? 'failed' : 'sent',
        error_message: error?.message,
      });

      return { success: !error, data, error };
    } catch (error) {
      console.error('Daily digest error:', error);
      SentryService.logEmailError(error, {
        recipient_email: user.email,
        email_type: 'daily_digest',
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Log notification to database
   * @private
   */
  async logNotification(notificationData) {
    try {
      const { error } = await supabase
        .from('demo_notifications')
        .insert({
          ...notificationData,
          sent_at: notificationData.email_status === 'sent' ? new Date().toISOString() : null,
        });

      if (error) {
        console.error('Notification log error:', error);
        SentryService.logDatabaseError(error, 'insert', 'demo_notifications');
      }
    } catch (error) {
      console.error('Notification logging error:', error);
      SentryService.logDatabaseError(error, 'insert', 'demo_notifications');
    }
  }

  /**
   * Generate price drop alert HTML
   * @private
   */
  generatePriceDropHTML({ user, watchlist, hotelData, priceInfo }) {
    const dropPercentage = priceInfo.drop_percentage;
    const dropAmount = priceInfo.drop_amount;
    
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>価格下落アラート</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 40px 20px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">🎯</div>
      <h1 style="margin: 0; font-size: 28px;">価格下落アラート！</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">お探しのホテルが値下がりしました</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 30px;">
        ${user.name} 様<br><br>
        ウォッチリストに登録されているホテルの価格が下落しました！
      </p>

      <!-- Hotel Details -->
      <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #ff6b35;">
        <h3 style="margin: 0 0 16px 0; color: #333; font-size: 22px;">${hotelData.hotel_name}</h3>
        
        <div style="margin-bottom: 20px;">
          <span style="color: #666; font-size: 14px;">📍 ${hotelData.area}</span>
        </div>

        <!-- Price Comparison -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <div style="color: #999; font-size: 14px; text-decoration: line-through;">
                以前の価格: ¥${priceInfo.previous_price.toLocaleString()}
              </div>
              <div style="color: #ff6b35; font-size: 24px; font-weight: bold;">
                現在の価格: ¥${priceInfo.current_price.toLocaleString()}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="background: #ff6b35; color: white; padding: 8px 12px; border-radius: 20px; font-size: 14px; font-weight: bold;">
                -${dropPercentage}% OFF
              </div>
              <div style="color: #ff6b35; font-size: 16px; font-weight: bold; margin-top: 4px;">
                ¥${dropAmount.toLocaleString()} 安く！
              </div>
            </div>
          </div>
        </div>

        <!-- Booking Details -->
        <div style="color: #666; font-size: 14px; line-height: 1.6;">
          <div>📅 チェックイン: ${new Date(watchlist.check_in_date).toLocaleDateString('ja-JP')}</div>
          <div>📅 チェックアウト: ${new Date(watchlist.check_out_date).toLocaleDateString('ja-JP')}</div>
          <div>👥 ゲスト数: ${watchlist.guests_count}名</div>
          <div style="margin-top: 8px;">
            <span style="background: ${hotelData.availability === 'limited' ? '#ffc107' : '#28a745'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
              ${hotelData.availability === 'limited' ? '残り僅か' : '空室あり'}
            </span>
          </div>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://travel.rakuten.co.jp/HOTEL/${hotelData.hotel_id}/" 
           style="background: #ff6b35; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
          今すぐ予約する →
        </a>
      </div>

      <!-- Tips -->
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h4 style="margin: 0 0 10px 0; color: #1976d2;">💡 お得な予約のコツ</h4>
        <ul style="margin: 0; padding-left: 20px; color: #1976d2; line-height: 1.8; font-size: 14px;">
          <li>価格は変動する可能性があります。お早めのご予約をおすすめします</li>
          <li>キャンセル無料プランがある場合は、とりあえず予約しておくと安心です</li>
          <li>直前予約でさらに価格が下がる場合もあります</li>
        </ul>
      </div>

      <!-- Unsubscribe -->
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
        <p style="margin: 0 0 10px 0;">このアラートが不要な場合は、マイページから設定を変更できます</p>
        <a href="https://lastminutestay.jp/unsubscribe?token=${user.id}" style="color: #999; text-decoration: none;">
          配信停止
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a1a; color: #999; padding: 30px 20px; text-align: center; font-size: 12px;">
      <p style="margin: 0 0 10px 0;">LastMinuteStay - 高級ホテルの直前予約でお得に宿泊</p>
      <p style="margin: 0;">© 2025 LastMinuteStay. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate availability alert HTML
   * @private
   */
  generateAvailabilityHTML({ user, watchlist, hotelData, availabilityInfo }) {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>空室アラート</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 40px 20px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">🏨</div>
      <h1 style="margin: 0; font-size: 28px;">空室アラート！</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">${availabilityInfo.status_message}</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 30px;">
        ${user.name} 様<br><br>
        ウォッチリストに登録されているホテルの空室状況が変わりました！
      </p>

      <!-- Hotel Details -->
      <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #28a745;">
        <h3 style="margin: 0 0 16px 0; color: #333; font-size: 22px;">${hotelData.hotel_name}</h3>
        
        <div style="margin-bottom: 20px;">
          <span style="color: #666; font-size: 14px;">📍 ${hotelData.area}</span>
        </div>

        <!-- Availability Status -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <div style="font-size: 20px; margin-bottom: 10px;">
            ${availabilityInfo.rooms_available ? `残り${availabilityInfo.rooms_available}室` : '空室状況変更'}
          </div>
          <div style="background: ${hotelData.availability === 'limited' ? '#ffc107' : '#28a745'}; color: white; padding: 12px 24px; border-radius: 24px; font-size: 16px; font-weight: bold; display: inline-block;">
            ${hotelData.availability === 'limited' ? '残り僅か - お急ぎください！' : '空室あり'}
          </div>
        </div>

        <!-- Current Price -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="color: #666; font-size: 14px;">現在の価格</div>
          <div style="color: #28a745; font-size: 28px; font-weight: bold;">
            ¥${hotelData.current_price.toLocaleString()}
          </div>
        </div>

        <!-- Booking Details -->
        <div style="color: #666; font-size: 14px; line-height: 1.6;">
          <div>📅 チェックイン: ${new Date(watchlist.check_in_date).toLocaleDateString('ja-JP')}</div>
          <div>📅 チェックアウト: ${new Date(watchlist.check_out_date).toLocaleDateString('ja-JP')}</div>
          <div>👥 ゲスト数: ${watchlist.guests_count}名</div>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://travel.rakuten.co.jp/HOTEL/${hotelData.hotel_id}/" 
           style="background: #28a745; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
          今すぐ予約する →
        </a>
      </div>

      <!-- Urgency Message -->
      ${hotelData.availability === 'limited' ? `
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ お急ぎください</h4>
        <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
          残り室数が少なくなっています。人気のホテルのため、満室になる可能性があります。
          ご予約はお早めにどうぞ。
        </p>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="background: #1a1a1a; color: #999; padding: 30px 20px; text-align: center; font-size: 12px;">
      <p style="margin: 0 0 10px 0;">LastMinuteStay - 高級ホテルの直前予約でお得に宿泊</p>
      <p style="margin: 0;">© 2025 LastMinuteStay. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate daily digest HTML
   * @private
   */
  generateDailyDigestHTML({ user, watchlistUpdates, newDeals }) {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>デイリーレポート</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">📧</div>
      <h1 style="margin: 0; font-size: 28px;">デイリーレポート</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">${new Date().toLocaleDateString('ja-JP')}</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 20px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 30px;">
        ${user.name} 様<br><br>
        本日のホテル情報をお届けします。
      </p>

      <!-- Watchlist Updates -->
      ${watchlistUpdates.length > 0 ? `
      <div style="margin-bottom: 40px;">
        <h3 style="color: #333; font-size: 20px; margin-bottom: 20px;">📋 ウォッチリスト更新情報</h3>
        ${watchlistUpdates.map(update => `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 10px 0; color: #333;">${update.hotel_name}</h4>
          <div style="color: #666; font-size: 14px;">
            ${update.price_change ? `価格変動: ¥${update.current_price.toLocaleString()}` : ''}
            ${update.availability_change ? `空室状況: ${update.availability}` : ''}
          </div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- New Deals -->
      ${newDeals.length > 0 ? `
      <div style="margin-bottom: 40px;">
        <h3 style="color: #333; font-size: 20px; margin-bottom: 20px;">🎯 新着お得情報</h3>
        ${newDeals.map(deal => `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 10px 0; color: #333;">${deal.hotel_name}</h4>
          <div style="color: #ff6b35; font-weight: bold;">¥${deal.price.toLocaleString()} (-${deal.discount}%)</div>
        </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Summary -->
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h4 style="margin: 0 0 10px 0; color: #1976d2;">📊 今日のサマリー</h4>
        <ul style="margin: 0; padding-left: 20px; color: #1976d2; line-height: 1.8; font-size: 14px;">
          <li>ウォッチリスト: ${watchlistUpdates.length}件の更新</li>
          <li>新着お得情報: ${newDeals.length}件</li>
          <li>最適な予約タイミング: ${this.getRecommendationMessage()}</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a1a; color: #999; padding: 30px 20px; text-align: center; font-size: 12px;">
      <p style="margin: 0 0 10px 0;">LastMinuteStay - 高級ホテルの直前予約でお得に宿泊</p>
      <p style="margin: 0;">© 2025 LastMinuteStay. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Get recommendation message for daily digest
   * @private
   */
  getRecommendationMessage() {
    const hour = new Date().getHours();
    if (hour < 12) {
      return '午前中は比較的空室が多い傾向です';
    } else if (hour < 18) {
      return '平日午後は価格変動が活発な時間帯です';
    } else {
      return '夜間の直前予約でお得な価格が見つかることがあります';
    }
  }
}

module.exports = new EmailAlertsService();