const sgMail = require('@sendgrid/mail');

class SendGridEmailService {
  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@lastminutestay.com';
    this.isInitialized = false;
    
    this.initialize();
  }

  initialize() {
    if (!this.apiKey) {
      console.error('SendGrid API key not found in environment variables');
      return;
    }
    
    sgMail.setApiKey(this.apiKey);
    this.isInitialized = true;
    console.log('SendGrid Email Service initialized successfully');
  }

  async sendPriceDropAlert(userEmail, hotelData) {
    const msg = {
      to: userEmail,
      from: {
        email: this.fromEmail,
        name: 'LastMinuteStay'
      },
      subject: `🎉 価格が下がりました！ ${hotelData.name}`,
      html: this.generatePriceDropHTML(hotelData),
      text: this.generatePriceDropText(hotelData),
      categories: ['price_alert', 'notification'],
      customArgs: {
        hotel_id: hotelData.id,
        alert_type: 'price_drop',
        user_email: userEmail
      }
    };

    return await this.sendEmail(msg);
  }

  async sendAvailabilityAlert(userEmail, hotelData) {
    const msg = {
      to: userEmail,
      from: {
        email: this.fromEmail,
        name: 'LastMinuteStay'
      },
      subject: `🏨 空室発見！ ${hotelData.name}`,
      html: this.generateAvailabilityHTML(hotelData),
      text: this.generateAvailabilityText(hotelData),
      categories: ['availability_alert', 'notification'],
      customArgs: {
        hotel_id: hotelData.id,
        alert_type: 'availability',
        user_email: userEmail
      }
    };

    return await this.sendEmail(msg);
  }

  async sendFavoriteUpdateAlert(userEmail, hotelData) {
    const msg = {
      to: userEmail,
      from: {
        email: this.fromEmail,
        name: 'LastMinuteStay'
      },
      subject: `⭐ お気に入りホテルの更新 - ${hotelData.name}`,
      html: this.generateFavoriteUpdateHTML(hotelData),
      text: this.generateFavoriteUpdateText(hotelData),
      categories: ['favorite_update', 'notification'],
      customArgs: {
        hotel_id: hotelData.id,
        alert_type: 'favorite_update',
        user_email: userEmail
      }
    };

    return await this.sendEmail(msg);
  }

  async sendBulkEmails(emailData) {
    if (!Array.isArray(emailData) || emailData.length === 0) {
      throw new Error('Email data must be a non-empty array');
    }

    const emails = emailData.map(data => ({
      to: data.userEmail,
      from: {
        email: this.fromEmail,
        name: 'LastMinuteStay'
      },
      subject: data.subject,
      html: data.html,
      text: data.text,
      categories: data.categories || ['bulk_notification'],
      customArgs: data.customArgs || {}
    }));

    return await sgMail.send(emails);
  }

  async sendWeeklyDigest(userEmail, digestData) {
    const msg = {
      to: userEmail,
      from: {
        email: this.fromEmail,
        name: 'LastMinuteStay'
      },
      subject: `📊 今週のおすすめホテル情報`,
      html: this.generateWeeklyDigestHTML(digestData),
      text: this.generateWeeklyDigestText(digestData),
      categories: ['weekly_digest', 'notification'],
      customArgs: {
        alert_type: 'weekly_digest',
        user_email: userEmail,
        digest_date: new Date().toISOString()
      }
    };

    return await this.sendEmail(msg);
  }

  async sendEmail(msg) {
    if (!this.isInitialized) {
      throw new Error('SendGrid Email Service not initialized');
    }

    try {
      const response = await sgMail.send(msg);
      console.log('Email sent successfully:', {
        to: msg.to,
        subject: msg.subject,
        messageId: response[0].headers['x-message-id']
      });
      
      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        statusCode: response[0].statusCode
      };
    } catch (error) {
      console.error('SendGrid email error:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.body);
      }
      
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  generatePriceDropHTML(hotelData) {
    const savings = hotelData.originalPrice - hotelData.currentPrice;
    const percentage = Math.round((savings / hotelData.originalPrice) * 100);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>価格下落通知</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .hotel-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin: 20px 0; }
    .hotel-image { width: 100%; height: 200px; object-fit: cover; }
    .hotel-info { padding: 20px; }
    .price-highlight { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center; }
    .old-price { text-decoration: line-through; color: #999; font-size: 18px; }
    .new-price { color: #28a745; font-size: 28px; font-weight: bold; margin: 10px 0; }
    .savings { color: #dc3545; font-weight: bold; font-size: 20px; }
    .cta-button { display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
    .urgency { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 価格下落通知</h1>
      <p>お気に入りのホテルの価格が大幅に下がりました！</p>
    </div>
    
    <div class="content">
      <div class="hotel-card">
        ${hotelData.imageUrl ? `<img src="${hotelData.imageUrl}" alt="${hotelData.name}" class="hotel-image">` : ''}
        <div class="hotel-info">
          <h2>${hotelData.name}</h2>
          <p>📍 ${hotelData.location}</p>
          
          <div class="price-highlight">
            <div class="old-price">元の価格: ¥${hotelData.originalPrice.toLocaleString()}</div>
            <div class="new-price">現在の価格: ¥${hotelData.currentPrice.toLocaleString()}</div>
            <div class="savings">🎯 ¥${savings.toLocaleString()}の節約 (${percentage}%オフ)</div>
          </div>
          
          ${hotelData.checkIn && hotelData.checkOut ? `
            <p><strong>宿泊日程:</strong> ${hotelData.checkIn} 〜 ${hotelData.checkOut}</p>
          ` : ''}
          
          <div class="urgency">
            <strong>⚡ 限定価格！</strong> この特別価格は限定的です。お早めにご予約ください。
          </div>
          
          <div style="text-align: center;">
            <a href="https://lastminutestay.com/hotel/${hotelData.id}" class="cta-button">
              今すぐ予約する 🏨
            </a>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6c757d;">
        <p>この価格は変動する可能性があります。人気ホテルは早く埋まってしまいますので、お早めにどうぞ。</p>
      </div>
    </div>
    
    <div class="footer">
      <p>LastMinuteStay - 最安値ホテル予約サービス</p>
      <p>通知設定の変更は<a href="https://lastminutestay.com/settings/notifications">こちら</a></p>
      <p>配信停止は<a href="https://lastminutestay.com/unsubscribe">こちら</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  generatePriceDropText(hotelData) {
    const savings = hotelData.originalPrice - hotelData.currentPrice;
    const percentage = Math.round((savings / hotelData.originalPrice) * 100);
    
    return `
🎉 価格下落通知

${hotelData.name}の価格が大幅に下がりました！

ホテル名: ${hotelData.name}
所在地: ${hotelData.location}
元の価格: ¥${hotelData.originalPrice.toLocaleString()}
現在の価格: ¥${hotelData.currentPrice.toLocaleString()}
節約額: ¥${savings.toLocaleString()} (${percentage}%オフ)

${hotelData.checkIn && hotelData.checkOut ? `宿泊日程: ${hotelData.checkIn} 〜 ${hotelData.checkOut}` : ''}

⚡ 限定価格！この特別価格は限定的です。

今すぐ予約: https://lastminutestay.com/hotel/${hotelData.id}

この価格は変動する可能性があります。人気ホテルは早く埋まってしまいますので、お早めにどうぞ。

---
LastMinuteStay
通知設定: https://lastminutestay.com/settings/notifications
配信停止: https://lastminutestay.com/unsubscribe
`;
  }

  generateAvailabilityHTML(hotelData) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>空室発見通知</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; }
    .header { background-color: #007bff; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .availability-alert { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 15px 0; text-align: center; }
    .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .urgency { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏨 空室発見通知</h1>
      <p>お探しのホテルに空室が見つかりました！</p>
    </div>
    
    <div class="content">
      <h2>${hotelData.name}</h2>
      <p>📍 ${hotelData.location}</p>
      
      <div class="availability-alert">
        <h3>✅ 空室あり</h3>
        <p style="font-size: 24px; margin: 10px 0;"><strong>¥${hotelData.price.toLocaleString()}</strong></p>
        ${hotelData.checkIn && hotelData.checkOut ? `<p>宿泊日程: ${hotelData.checkIn} 〜 ${hotelData.checkOut}</p>` : ''}
        ${hotelData.roomsAvailable ? `<p>残り${hotelData.roomsAvailable}室</p>` : ''}
      </div>
      
      <div class="urgency">
        <strong>🔥 お急ぎください！</strong><br>
        人気のホテルは早く埋まってしまいます。今すぐご予約を！
      </div>
      
      <div style="text-align: center;">
        <a href="https://lastminutestay.com/hotel/${hotelData.id}" class="cta-button">
          今すぐ予約する
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p>LastMinuteStay - 最安値ホテル予約サービス</p>
      <p>通知設定の変更は<a href="https://lastminutestay.com/settings/notifications">こちら</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  generateAvailabilityText(hotelData) {
    return `
🏨 空室発見通知

${hotelData.name}に空室が見つかりました！

ホテル名: ${hotelData.name}
所在地: ${hotelData.location}
価格: ¥${hotelData.price.toLocaleString()}
${hotelData.checkIn && hotelData.checkOut ? `宿泊日程: ${hotelData.checkIn} 〜 ${hotelData.checkOut}` : ''}
${hotelData.roomsAvailable ? `残り${hotelData.roomsAvailable}室` : ''}

🔥 お急ぎください！人気のホテルは早く埋まってしまいます。

今すぐ予約: https://lastminutestay.com/hotel/${hotelData.id}

---
LastMinuteStay
`;
  }

  generateFavoriteUpdateHTML(hotelData) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>お気に入りホテル更新</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); color: #333; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .update-info { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 15px 0; }
    .cta-button { display: inline-block; background-color: #ffc107; color: #333; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⭐ お気に入りホテルの更新</h1>
      <p>お気に入りに登録されたホテルに更新があります</p>
    </div>
    
    <div class="content">
      <h2>${hotelData.name}</h2>
      <p>📍 ${hotelData.location}</p>
      
      <div class="update-info">
        <h3>📢 更新情報</h3>
        ${hotelData.updates.map(update => `<p>• ${update}</p>`).join('')}
      </div>
      
      <div style="text-align: center;">
        <a href="https://lastminutestay.com/hotel/${hotelData.id}" class="cta-button">
          詳細を確認する
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p>LastMinuteStay - 最安値ホテル予約サービス</p>
      <p>通知設定の変更は<a href="https://lastminutestay.com/settings/notifications">こちら</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  generateFavoriteUpdateText(hotelData) {
    return `
⭐ お気に入りホテルの更新

${hotelData.name}に更新があります

ホテル名: ${hotelData.name}
所在地: ${hotelData.location}

📢 更新情報:
${hotelData.updates.map(update => `• ${update}`).join('\n')}

詳細確認: https://lastminutestay.com/hotel/${hotelData.id}

---
LastMinuteStay
`;
  }

  generateWeeklyDigestHTML(digestData) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>週次ダイジェスト</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .hotel-item { border-bottom: 1px solid #e5e7eb; padding: 20px 0; }
    .price-badge { background-color: #10b981; color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 今週のおすすめホテル情報</h1>
      <p>あなたにぴったりのお得な情報をお届けします</p>
    </div>
    
    <div class="content">
      <h3>🔥 今週の特別価格</h3>
      ${digestData.specialOffers.map(hotel => `
        <div class="hotel-item">
          <h4>${hotel.name}</h4>
          <p>📍 ${hotel.location}</p>
          <p><span class="price-badge">${hotel.discount}%オフ</span> ¥${hotel.price.toLocaleString()}</p>
        </div>
      `).join('')}
      
      <h3>⭐ お気に入りの最新情報</h3>
      ${digestData.favoriteUpdates.map(update => `
        <div class="hotel-item">
          <p>${update}</p>
        </div>
      `).join('')}
      
      <h3>📈 価格トレンド</h3>
      <p>${digestData.priceAnalysis}</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://lastminutestay.com" style="display: inline-block; background-color: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          おすすめホテルを見る
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p>LastMinuteStay - 最安値ホテル予約サービス</p>
      <p>配信停止は<a href="https://lastminutestay.com/unsubscribe">こちら</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  generateWeeklyDigestText(digestData) {
    return `
📊 今週のおすすめホテル情報

🔥 今週の特別価格:
${digestData.specialOffers.map(hotel => 
  `• ${hotel.name} (${hotel.location}) - ${hotel.discount}%オフ ¥${hotel.price.toLocaleString()}`
).join('\n')}

⭐ お気に入りの最新情報:
${digestData.favoriteUpdates.join('\n')}

📈 価格トレンド:
${digestData.priceAnalysis}

おすすめホテルを見る: https://lastminutestay.com

---
LastMinuteStay
配信停止: https://lastminutestay.com/unsubscribe
`;
  }

  // 配信統計取得
  async getEmailStatistics(dateRange = 7) {
    try {
      // SendGrid Statistics API を使用して配信統計を取得
      const response = await fetch(`https://api.sendgrid.com/v3/stats?start_date=${new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const stats = await response.json();
      
      return {
        delivered: stats.reduce((sum, stat) => sum + stat.stats.reduce((s, s2) => s + s2.metrics.delivered, 0), 0),
        opened: stats.reduce((sum, stat) => sum + stat.stats.reduce((s, s2) => s + s2.metrics.unique_opens, 0), 0),
        clicked: stats.reduce((sum, stat) => sum + stat.stats.reduce((s, s2) => s + s2.metrics.unique_clicks, 0), 0),
        bounced: stats.reduce((sum, stat) => sum + stat.stats.reduce((s, s2) => s + s2.metrics.bounces, 0), 0)
      };
    } catch (error) {
      console.error('Failed to get email statistics:', error);
      return null;
    }
  }
}

module.exports = SendGridEmailService;