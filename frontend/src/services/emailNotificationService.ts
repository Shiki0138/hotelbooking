interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

interface EmailNotificationData {
  userId: string;
  email: string;
  type: 'price_drop' | 'availability' | 'booking_reminder' | 'weekly_digest' | 'custom';
  hotelData?: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    imageUrl?: string;
    checkIn?: string;
    checkOut?: string;
    location: string;
  };
  customData?: {
    subject: string;
    message: string;
  };
}

interface EmailBatch {
  id: string;
  emails: EmailNotificationData[];
  scheduledFor: Date;
  status: 'pending' | 'sending' | 'completed' | 'failed';
  priority: 'high' | 'medium' | 'low';
}

class EmailNotificationService {
  private apiUrl: string;
  private batchQueue: EmailBatch[] = [];
  private isProcessing = false;
  private readonly MAX_BATCH_SIZE = 50;
  private readonly RATE_LIMIT_DELAY = 1000; // 1秒間隔

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'https://nanleckihedkmikctltb.supabase.co';
    this.startBatchProcessor();
  }

  public async sendPriceDropNotification(data: EmailNotificationData): Promise<boolean> {
    const template = this.generatePriceDropTemplate(data);
    return this.sendEmail(data.email, template);
  }

  public async sendAvailabilityNotification(data: EmailNotificationData): Promise<boolean> {
    const template = this.generateAvailabilityTemplate(data);
    return this.sendEmail(data.email, template);
  }

  public async sendBookingReminder(data: EmailNotificationData): Promise<boolean> {
    const template = this.generateBookingReminderTemplate(data);
    return this.sendEmail(data.email, template);
  }

  public async sendWeeklyDigest(data: EmailNotificationData): Promise<boolean> {
    const template = this.generateWeeklyDigestTemplate(data);
    return this.sendEmail(data.email, template);
  }

  public async sendBulkNotifications(notifications: EmailNotificationData[]): Promise<void> {
    const batches = this.createBatches(notifications);
    
    for (const batch of batches) {
      this.batchQueue.push(batch);
    }
  }

  private createBatches(notifications: EmailNotificationData[]): EmailBatch[] {
    const batches: EmailBatch[] = [];
    
    for (let i = 0; i < notifications.length; i += this.MAX_BATCH_SIZE) {
      const batchEmails = notifications.slice(i, i + this.MAX_BATCH_SIZE);
      batches.push({
        id: `batch_${Date.now()}_${i}`,
        emails: batchEmails,
        scheduledFor: new Date(),
        status: 'pending',
        priority: this.determineBatchPriority(batchEmails)
      });
    }
    
    return batches.sort((a, b) => this.getPriorityScore(b.priority) - this.getPriorityScore(a.priority));
  }

  private determineBatchPriority(emails: EmailNotificationData[]): 'high' | 'medium' | 'low' {
    const highPriorityTypes = ['price_drop', 'availability'];
    const hasHighPriority = emails.some(email => highPriorityTypes.includes(email.type));
    
    if (hasHighPriority) return 'high';
    if (emails.some(email => email.type === 'booking_reminder')) return 'medium';
    return 'low';
  }

  private getPriorityScore(priority: string): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private async startBatchProcessor(): Promise<void> {
    setInterval(async () => {
      if (!this.isProcessing && this.batchQueue.length > 0) {
        await this.processBatch();
      }
    }, this.RATE_LIMIT_DELAY);
  }

  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    this.isProcessing = true;
    const batch = this.batchQueue.shift()!;
    batch.status = 'sending';

    try {
      const promises = batch.emails.map(emailData => this.sendNotificationEmail(emailData));
      await Promise.allSettled(promises);
      batch.status = 'completed';
      console.log(`Batch ${batch.id} completed successfully`);
    } catch (error) {
      batch.status = 'failed';
      console.error(`Batch ${batch.id} failed:`, error);
      // 失敗したバッチを再試行キューに追加（最大3回まで）
      if (!batch.id.includes('_retry')) {
        batch.id += '_retry_1';
        batch.status = 'pending';
        this.batchQueue.unshift(batch);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendNotificationEmail(data: EmailNotificationData): Promise<boolean> {
    let template: EmailTemplate;

    switch (data.type) {
      case 'price_drop':
        template = this.generatePriceDropTemplate(data);
        break;
      case 'availability':
        template = this.generateAvailabilityTemplate(data);
        break;
      case 'booking_reminder':
        template = this.generateBookingReminderTemplate(data);
        break;
      case 'weekly_digest':
        template = this.generateWeeklyDigestTemplate(data);
        break;
      case 'custom':
        template = this.generateCustomTemplate(data);
        break;
      default:
        throw new Error(`Unsupported email type: ${data.type}`);
    }

    return this.sendEmail(data.email, template);
  }

  private generatePriceDropTemplate(data: EmailNotificationData): EmailTemplate {
    const hotel = data.hotelData!;
    const savings = hotel.originalPrice ? hotel.originalPrice - hotel.price : 0;
    const percentageOff = hotel.originalPrice ? Math.round((savings / hotel.originalPrice) * 100) : 0;

    return {
      subject: `🎉 ${hotel.name}の価格が${percentageOff}%下がりました！`,
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>価格下落通知</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .hotel-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin: 20px 0; }
            .hotel-image { width: 100%; height: 200px; object-fit: cover; }
            .hotel-info { padding: 20px; }
            .price-highlight { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .old-price { text-decoration: line-through; color: #999; font-size: 14px; }
            .new-price { color: #28a745; font-size: 24px; font-weight: bold; }
            .savings { color: #dc3545; font-weight: bold; }
            .cta-button { display: inline-block; background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 価格下落通知</h1>
              <p>お気に入りのホテルの価格が下がりました！</p>
            </div>
            
            <div class="content">
              <div class="hotel-card">
                ${hotel.imageUrl ? `<img src="${hotel.imageUrl}" alt="${hotel.name}" class="hotel-image">` : ''}
                <div class="hotel-info">
                  <h2>${hotel.name}</h2>
                  <p>📍 ${hotel.location}</p>
                  
                  <div class="price-highlight">
                    ${hotel.originalPrice ? `<div class="old-price">元の価格: ¥${hotel.originalPrice.toLocaleString()}</div>` : ''}
                    <div class="new-price">現在の価格: ¥${hotel.price.toLocaleString()}</div>
                    ${savings > 0 ? `<div class="savings">🎯 ¥${savings.toLocaleString()}の節約 (${percentageOff}%オフ)</div>` : ''}
                  </div>
                  
                  ${hotel.checkIn && hotel.checkOut ? `
                    <p><strong>宿泊日程:</strong> ${hotel.checkIn} 〜 ${hotel.checkOut}</p>
                  ` : ''}
                  
                  <a href="${this.getHotelUrl(hotel.id)}" class="cta-button">
                    今すぐ予約する 🏨
                  </a>
                </div>
              </div>
              
              <p><strong>この価格は期間限定です！</strong><br>
              人気ホテルの割引価格は早く埋まってしまう可能性があります。</p>
            </div>
            
            <div class="footer">
              <p>LastMinuteStay - 最安値ホテル予約サービス</p>
              <p>通知設定の変更は<a href="${this.getUnsubscribeUrl(data.userId)}">こちら</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
        🎉 価格下落通知

        ${hotel.name}の価格が下がりました！

        ホテル名: ${hotel.name}
        所在地: ${hotel.location}
        ${hotel.originalPrice ? `元の価格: ¥${hotel.originalPrice.toLocaleString()}` : ''}
        現在の価格: ¥${hotel.price.toLocaleString()}
        ${savings > 0 ? `節約額: ¥${savings.toLocaleString()} (${percentageOff}%オフ)` : ''}
        ${hotel.checkIn && hotel.checkOut ? `宿泊日程: ${hotel.checkIn} 〜 ${hotel.checkOut}` : ''}

        今すぐ予約: ${this.getHotelUrl(hotel.id)}

        この価格は期間限定です。お早めにご予約ください。

        ---
        LastMinuteStay
        通知設定の変更: ${this.getUnsubscribeUrl(data.userId)}
      `
    };
  }

  private generateAvailabilityTemplate(data: EmailNotificationData): EmailTemplate {
    const hotel = data.hotelData!;

    return {
      subject: `🏨 ${hotel.name}に空室が見つかりました！`,
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>空室通知</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background-color: #007bff; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .availability-alert { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 15px 0; }
            .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏨 空室発見通知</h1>
              <p>お探しのホテルに空室が見つかりました！</p>
            </div>
            
            <div class="content">
              <h2>${hotel.name}</h2>
              <p>📍 ${hotel.location}</p>
              
              <div class="availability-alert">
                <strong>✅ 空室あり</strong><br>
                価格: ¥${hotel.price.toLocaleString()}
                ${hotel.checkIn && hotel.checkOut ? `<br>宿泊日程: ${hotel.checkIn} 〜 ${hotel.checkOut}` : ''}
              </div>
              
              <a href="${this.getHotelUrl(hotel.id)}" class="cta-button">
                今すぐ予約する
              </a>
              
              <p><strong>お急ぎください！</strong><br>
              人気のホテルは早く埋まってしまいます。</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
        🏨 空室発見通知

        ${hotel.name}に空室が見つかりました！

        ホテル名: ${hotel.name}
        所在地: ${hotel.location}
        価格: ¥${hotel.price.toLocaleString()}
        ${hotel.checkIn && hotel.checkOut ? `宿泊日程: ${hotel.checkIn} 〜 ${hotel.checkOut}` : ''}

        今すぐ予約: ${this.getHotelUrl(hotel.id)}

        お急ぎください！人気のホテルは早く埋まってしまいます。

        ---
        LastMinuteStay
      `
    };
  }

  private generateBookingReminderTemplate(data: EmailNotificationData): EmailTemplate {
    return {
      subject: `📅 ご予約のリマインダー`,
      htmlBody: `<!-- booking reminder HTML template -->`,
      textBody: `📅 ご予約のリマインダー`
    };
  }

  private generateWeeklyDigestTemplate(data: EmailNotificationData): EmailTemplate {
    return {
      subject: `📊 今週のホテル情報まとめ`,
      htmlBody: `<!-- weekly digest HTML template -->`,
      textBody: `📊 今週のホテル情報まとめ`
    };
  }

  private generateCustomTemplate(data: EmailNotificationData): EmailTemplate {
    const custom = data.customData!;
    return {
      subject: custom.subject,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1>LastMinuteStay</h1>
          </div>
          <div style="padding: 30px;">
            ${custom.message}
          </div>
        </div>
      `,
      textBody: custom.message
    };
  }

  private async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to,
          subject: template.subject,
          html: template.htmlBody,
          text: template.textBody
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Email send failed:', error);
      return false;
    }
  }

  private getHotelUrl(hotelId: string): string {
    return `${window.location.origin}/hotel/${hotelId}`;
  }

  private getUnsubscribeUrl(userId: string): string {
    return `${window.location.origin}/unsubscribe?user=${userId}`;
  }

  public getBatchQueueStatus() {
    return {
      pending: this.batchQueue.filter(b => b.status === 'pending').length,
      sending: this.batchQueue.filter(b => b.status === 'sending').length,
      completed: this.batchQueue.filter(b => b.status === 'completed').length,
      failed: this.batchQueue.filter(b => b.status === 'failed').length
    };
  }
}

export const emailNotificationService = new EmailNotificationService();
export type { EmailNotificationData, EmailTemplate, EmailBatch };