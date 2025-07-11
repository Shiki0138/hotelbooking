import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface HotelMatch {
  hotel: any;
  matchReason: string;
  discountPercentage?: number;
  previousPrice?: number;
  currentPrice?: number;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // 開発環境用の設定（本番環境では実際のSMTPサーバーを使用）
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // メールテンプレート生成
  private generateHotelMatchEmail(userName: string, matches: HotelMatch[]): EmailTemplate {
    const hotelListHtml = matches.map(match => `
      <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: #1a1a1a;">${match.hotel.name}</h3>
        <p style="margin: 0 0 8px 0; color: #666;">${match.hotel.city}</p>
        
        ${match.discountPercentage ? `
          <div style="background-color: #fee; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
            <strong style="color: #c41e3a;">${match.discountPercentage}%割引！</strong>
            <span style="text-decoration: line-through; color: #999;">¥${match.previousPrice?.toLocaleString()}</span>
            → <strong>¥${match.currentPrice?.toLocaleString()}</strong>
          </div>
        ` : `
          <p style="margin: 0 0 8px 0;">
            <strong>¥${match.hotel.minPrice?.toLocaleString() || match.hotel.price?.toLocaleString()}</strong>〜/泊
          </p>
        `}
        
        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
          ${match.matchReason}
        </p>
        
        <a href="${process.env.FRONTEND_URL}/hotel/${match.hotel.id}" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
          詳細を見る
        </a>
      </div>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>お得なホテル情報</title>
      </head>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">
          ${userName}様へのおすすめホテル
        </h1>
        
        <p>お客様の条件にマッチする${matches.length}件のホテルが見つかりました。</p>
        
        ${hotelListHtml}
        
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">
        
        <p style="font-size: 12px; color: #666;">
          このメールは、LastMinuteStayからお客様の設定に基づいて送信されています。<br>
          配信停止をご希望の場合は、<a href="${process.env.FRONTEND_URL}/unsubscribe">こちら</a>からお手続きください。
        </p>
      </body>
      </html>
    `;

    const text = `
${userName}様へのおすすめホテル

お客様の条件にマッチする${matches.length}件のホテルが見つかりました。

${matches.map(match => `
・${match.hotel.name}（${match.hotel.city}）
  ${match.currentPrice ? `¥${match.currentPrice.toLocaleString()}` : `¥${match.hotel.minPrice?.toLocaleString() || match.hotel.price?.toLocaleString()}`}〜/泊
  ${match.matchReason}
  詳細: ${process.env.FRONTEND_URL}/hotel/${match.hotel.id}
`).join('\n')}

配信停止をご希望の場合は、以下のURLからお手続きください。
${process.env.FRONTEND_URL}/unsubscribe
    `.trim();

    return {
      subject: `【LastMinuteStay】${matches[0].discountPercentage ? '最大' + matches[0].discountPercentage + '%割引！' : ''}お得なホテル情報`,
      html,
      text
    };
  }

  // ユーザーの条件にマッチするホテルを検索
  async findMatchingHotels(userId: string): Promise<HotelMatch[]> {
    try {
      // ユーザーの設定を取得
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!preferences) return [];

      const matches: HotelMatch[] = [];
      
      // TODO: 実際のホテル検索APIを呼び出す
      // ここでは仮のデータを返す
      
      return matches;
    } catch (error) {
      console.error('Error finding matching hotels:', error);
      return [];
    }
  }

  // 個別ユーザーへのメール送信
  async sendHotelMatchEmail(userId: string, userEmail: string, userName: string) {
    try {
      const matches = await this.findMatchingHotels(userId);
      
      if (matches.length === 0) {
        console.log(`No matches found for user ${userId}`);
        return;
      }

      const template = this.generateHotelMatchEmail(userName, matches);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@lastminutestay.com',
        to: userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      // 送信履歴を記録
      await supabase
        .from('notification_history')
        .insert({
          user_id: userId,
          notification_type: 'hotel_match',
          content: `${matches.length}件のマッチングホテル`,
          sent_at: new Date().toISOString()
        });

      console.log(`Email sent to ${userEmail}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // 価格アラートメール
  async sendPriceAlertEmail(userId: string, userEmail: string, userName: string, alert: any) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>価格アラート</title>
      </head>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">価格アラート通知</h1>
        
        <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h2 style="margin: 0 0 8px 0; color: #1e40af;">${alert.hotel_name}</h2>
          <p style="margin: 0;">
            目標価格 <strong>¥${alert.target_price.toLocaleString()}</strong> を下回りました！
          </p>
          <p style="margin: 8px 0 0 0;">
            現在の価格: <strong style="color: #dc2626;">¥${alert.current_price.toLocaleString()}</strong>
          </p>
        </div>
        
        <a href="${process.env.FRONTEND_URL}/hotel/${alert.hotel_id}" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
          今すぐ予約する
        </a>
      </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@lastminutestay.com',
      to: userEmail,
      subject: `【価格アラート】${alert.hotel_name}が目標価格を下回りました！`,
      html,
      text: `${alert.hotel_name}が目標価格¥${alert.target_price.toLocaleString()}を下回りました。現在の価格: ¥${alert.current_price.toLocaleString()}`
    });
  }

  // バッチ処理用：全ユーザーへの定期配信
  async sendBatchEmails() {
    try {
      // 通知が有効なユーザーを取得
      const { data: users } = await supabase
        .from('user_preferences')
        .select(`
          user_id,
          notification_frequency,
          auth.users!inner(email, raw_user_meta_data)
        `)
        .eq('notification_enabled', true);

      if (!users) return;

      for (const user of users) {
        try {
          const userEmail = user.auth.users.email;
          const userName = user.auth.users.raw_user_meta_data?.display_name || 'お客様';
          
          await this.sendHotelMatchEmail(user.user_id, userEmail, userName);
        } catch (error) {
          console.error(`Failed to send email to user ${user.user_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Batch email error:', error);
    }
  }
}

const emailService = new EmailService();

// Email template interface for structured emails
interface EmailOptions {
  to: string;
  subject: string;
  template?: string;
  data?: any;
  html?: string;
  text?: string;
}

// Export both the default instance and named exports for compatibility
export default emailService;

// Support both object-based and individual parameter calls
export const sendEmail = async (
  toOrOptions: string | EmailOptions, 
  subject?: string, 
  html?: string, 
  text?: string
) => {
  if (typeof toOrOptions === 'object') {
    // Handle object-based call
    const options = toOrOptions;
    const emailHtml = options.html || generateEmailFromTemplate(options.template, options.data);
    const emailText = options.text || emailHtml.replace(/<[^>]*>/g, '');
    
    return emailService.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@lastminutestay.com',
      to: options.to,
      subject: options.subject,
      html: emailHtml,
      text: emailText
    });
  } else {
    // Handle individual parameter call
    return emailService.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@lastminutestay.com',
      to: toOrOptions,
      subject: subject!,
      html: html!,
      text: text || html!.replace(/<[^>]*>/g, '')
    });
  }
};

// Simple template generator
function generateEmailFromTemplate(template?: string, data?: any): string {
  if (!template || !data) {
    return '<p>Email content</p>';
  }
  
  // Basic email templates
  const templates: Record<string, (data: any) => string> = {
    bookingStatusUpdate: (data) => `
      <h2>Hello ${data.userName},</h2>
      <p>Your booking status for ${data.hotelName} has been updated.</p>
      <p>Previous Status: ${data.previousStatus}</p>
      <p>New Status: ${data.newStatus}</p>
      ${data.notes ? `<p>Notes: ${data.notes}</p>` : ''}
      <p>Check-in: ${new Date(data.checkInDate).toLocaleDateString()}</p>
      <p>Check-out: ${new Date(data.checkOutDate).toLocaleDateString()}</p>
    `,
    bookingCancellation: (data) => `
      <h2>Hello ${data.userName},</h2>
      <p>Your booking for ${data.hotelName} has been cancelled.</p>
      <p>Check-in: ${new Date(data.checkInDate).toLocaleDateString()}</p>
      <p>Check-out: ${new Date(data.checkOutDate).toLocaleDateString()}</p>
      ${data.reason ? `<p>Reason: ${data.reason}</p>` : ''}
    `,
    refundConfirmation: (data) => `
      <h2>Hello ${data.userName},</h2>
      <p>Your refund for ${data.hotelName} has been processed.</p>
      <p>Refund Amount: ${data.refundAmount}</p>
      ${data.notes ? `<p>Notes: ${data.notes}</p>` : ''}
    `
  };
  
  const templateFn = templates[template];
  return templateFn ? templateFn(data) : '<p>Email content</p>';
}