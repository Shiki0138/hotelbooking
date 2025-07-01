import { EventEmitter } from 'events';
import nodemailer from 'nodemailer';
import { LastMinuteAlert, InventoryUpdate, UserSubscription } from './realTimeInventoryService';

/**
 * 直前予約アラートサービス
 * LastMinuteStay特化の緊急通知システム
 */

interface AlertRule {
  id: string;
  name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  conditions: {
    priceDropPercentage?: number;  // 価格下落率
    maxPrice?: number;             // 最大価格
    timeThreshold?: number;        // 時間閾値（分）
    roomThreshold?: number;        // 残室数閾値
    urgencyLevels?: ('low' | 'medium' | 'high' | 'critical')[];
    hotelPattern?: string;         // ホテル名パターン
    areaPattern?: string;          // エリアパターン
  };
  actions: {
    sendEmail?: boolean;
    sendPush?: boolean;
    sendWebSocket?: boolean;
    playSound?: boolean;
    flashBadge?: boolean;
  };
  cooldownMinutes: number;  // 同一ホテルの再通知間隔
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

interface AlertTemplate {
  type: 'price_drop' | 'last_chance' | 'flash_sale' | 'limited_rooms';
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  icon: string;
  color: string;
  sound?: string;
  actionButton?: {
    text: string;
    url: string;
  };
}

interface NotificationHistory {
  id: string;
  userId: string;
  alertType: string;
  hotelNo: number;
  hotelName: string;
  message: string;
  sentAt: Date;
  methods: string[];
  success: boolean;
  error?: string;
}

interface AlertMetrics {
  totalAlerts: number;
  alertsByType: Record<string, number>;
  successRate: number;
  averageResponseTime: number;
  activeRules: number;
  subscribedUsers: number;
}

class LastMinuteAlertService extends EventEmitter {
  private rules = new Map<string, AlertRule>();
  private templates = new Map<string, AlertTemplate>();
  private notificationHistory: NotificationHistory[] = [];
  private cooldownTracker = new Map<string, Date>(); // `${ruleId}:${hotelNo}` -> lastSent
  private maxHistorySize = 10000;
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    super();
    this.initializeDefaultTemplates();
    this.initializeEmailTransporter();
  }

  /**
   * デフォルトアラートテンプレート初期化
   */
  private initializeDefaultTemplates(): void {
    const templates: AlertTemplate[] = [
      {
        type: 'price_drop',
        title: '🔥 価格急降下！',
        message: '{hotelName}の料金が{discount}%OFF！今なら{currentPrice}円',
        urgency: 'high',
        icon: '💰',
        color: '#ff4757',
        sound: 'price-alert.mp3',
        actionButton: { text: '今すぐ予約', url: '/book/{hotelNo}' }
      },
      {
        type: 'last_chance',
        title: '⚡ 最後のチャンス！',
        message: '{hotelName}の残室数わずか{remainingRooms}室！',
        urgency: 'critical',
        icon: '⚡',
        color: '#ff3838',
        sound: 'urgent-alert.mp3',
        actionButton: { text: '即予約', url: '/book/{hotelNo}' }
      },
      {
        type: 'flash_sale',
        title: '⚡ フラッシュセール開始！',
        message: '{hotelName}が期間限定{discount}%OFF！あと{timeLeft}分',
        urgency: 'high',
        icon: '⚡',
        color: '#ffa502',
        sound: 'flash-sale.mp3',
        actionButton: { text: 'セールを見る', url: '/flash-sale/{hotelNo}' }
      },
      {
        type: 'limited_rooms',
        title: '🏨 残室わずか',
        message: '{hotelName}の空室残り{remainingRooms}室のみ',
        urgency: 'medium',
        icon: '🏨',
        color: '#ff6b00',
        sound: 'room-alert.mp3',
        actionButton: { text: '確認する', url: '/hotel/{hotelNo}' }
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.type, template);
    });
  }

  /**
   * メール送信設定初期化
   */
  private initializeEmailTransporter(): void {
    try {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } catch (error) {
      console.error('メール送信設定エラー:', error);
    }
  }

  /**
   * アラートルール追加
   */
  addAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertRule: AlertRule = {
      id,
      createdAt: new Date(),
      ...rule
    };

    this.rules.set(id, alertRule);
    console.log(`アラートルール追加: ${alertRule.name} (${id})`);
    
    this.emit('rule-added', alertRule);
    return id;
  }

  /**
   * アラートルール削除
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      console.log(`アラートルール削除: ${ruleId}`);
      this.emit('rule-removed', ruleId);
    }
    return removed;
  }

  /**
   * アラートルール更新
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    this.rules.set(ruleId, rule);
    
    console.log(`アラートルール更新: ${ruleId}`);
    this.emit('rule-updated', rule);
    return true;
  }

  /**
   * アラート処理
   */
  async processAlert(alert: LastMinuteAlert, inventoryUpdate?: InventoryUpdate): Promise<void> {
    console.log(`アラート処理開始: ${alert.hotelName} (${alert.alertType})`);

    // 適用可能なルールを検索
    const applicableRules = this.findApplicableRules(alert, inventoryUpdate);

    for (const rule of applicableRules) {
      // クールダウンチェック
      if (!this.checkCooldown(rule.id, alert.hotelNo)) {
        continue;
      }

      try {
        // アラート送信
        await this.sendAlert(rule, alert, inventoryUpdate);
        
        // クールダウン更新
        this.updateCooldown(rule.id, alert.hotelNo);
        
        // ルール最終実行時間更新
        rule.lastTriggered = new Date();

      } catch (error) {
        console.error(`アラート送信エラー (ルール: ${rule.id}):`, error);
        this.emit('alert-error', { rule, alert, error });
      }
    }
  }

  /**
   * 適用可能ルール検索
   */
  private findApplicableRules(alert: LastMinuteAlert, inventoryUpdate?: InventoryUpdate): AlertRule[] {
    const applicable: AlertRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;

      const conditions = rule.conditions;
      let matches = true;

      // 価格下落率チェック
      if (conditions.priceDropPercentage !== undefined && 
          alert.discount < conditions.priceDropPercentage) {
        matches = false;
      }

      // 最大価格チェック
      if (conditions.maxPrice !== undefined && 
          alert.currentPrice > conditions.maxPrice) {
        matches = false;
      }

      // 時間閾値チェック
      if (conditions.timeThreshold !== undefined && 
          alert.timeLeft > conditions.timeThreshold) {
        matches = false;
      }

      // 残室数チェック
      if (conditions.roomThreshold !== undefined && 
          alert.remainingRooms > conditions.roomThreshold) {
        matches = false;
      }

      // ホテル名パターンチェック
      if (conditions.hotelPattern) {
        const pattern = new RegExp(conditions.hotelPattern, 'i');
        if (!pattern.test(alert.hotelName)) {
          matches = false;
        }
      }

      // 緊急度チェック
      if (inventoryUpdate && conditions.urgencyLevels && 
          !conditions.urgencyLevels.includes(inventoryUpdate.urgencyLevel)) {
        matches = false;
      }

      if (matches) {
        applicable.push(rule);
      }
    }

    return applicable.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * クールダウンチェック
   */
  private checkCooldown(ruleId: string, hotelNo: number): boolean {
    const key = `${ruleId}:${hotelNo}`;
    const lastSent = this.cooldownTracker.get(key);
    
    if (!lastSent) return true;
    
    const rule = this.rules.get(ruleId);
    if (!rule) return true;
    
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    return Date.now() - lastSent.getTime() >= cooldownMs;
  }

  /**
   * クールダウン更新
   */
  private updateCooldown(ruleId: string, hotelNo: number): void {
    const key = `${ruleId}:${hotelNo}`;
    this.cooldownTracker.set(key, new Date());
  }

  /**
   * アラート送信
   */
  private async sendAlert(rule: AlertRule, alert: LastMinuteAlert, inventoryUpdate?: InventoryUpdate): Promise<void> {
    const template = this.templates.get(alert.alertType);
    if (!template) {
      throw new Error(`テンプレートが見つかりません: ${alert.alertType}`);
    }

    // メッセージ生成
    const message = this.generateMessage(template, alert);
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notification: NotificationHistory = {
      id: notificationId,
      userId: 'system', // TODO: ユーザー特定ロジック
      alertType: alert.alertType,
      hotelNo: alert.hotelNo,
      hotelName: alert.hotelName,
      message,
      sentAt: new Date(),
      methods: [],
      success: false
    };

    try {
      const promises: Promise<any>[] = [];

      // WebSocket通知
      if (rule.actions.sendWebSocket) {
        promises.push(this.sendWebSocketNotification(rule, alert, template, message));
        notification.methods.push('websocket');
      }

      // メール通知
      if (rule.actions.sendEmail && this.emailTransporter) {
        promises.push(this.sendEmailNotification(rule, alert, template, message));
        notification.methods.push('email');
      }

      // プッシュ通知
      if (rule.actions.sendPush) {
        promises.push(this.sendPushNotification(rule, alert, template, message));
        notification.methods.push('push');
      }

      await Promise.all(promises);
      notification.success = true;

      console.log(`アラート送信成功: ${alert.hotelName} via ${notification.methods.join(', ')}`);
      this.emit('alert-sent', { rule, alert, notification });

    } catch (error) {
      notification.success = false;
      notification.error = error.message;
      
      console.error(`アラート送信失敗: ${alert.hotelName}:`, error);
      throw error;

    } finally {
      // 履歴に追加
      this.notificationHistory.unshift(notification);
      
      // 履歴サイズ制限
      if (this.notificationHistory.length > this.maxHistorySize) {
        this.notificationHistory = this.notificationHistory.slice(0, this.maxHistorySize);
      }
    }
  }

  /**
   * メッセージ生成
   */
  private generateMessage(template: AlertTemplate, alert: LastMinuteAlert): string {
    return template.message
      .replace('{hotelName}', alert.hotelName)
      .replace('{discount}', alert.discount.toString())
      .replace('{currentPrice}', alert.currentPrice.toLocaleString())
      .replace('{originalPrice}', alert.originalPrice.toLocaleString())
      .replace('{remainingRooms}', alert.remainingRooms.toString())
      .replace('{timeLeft}', Math.round(alert.timeLeft / 60).toString())
      .replace('{hotelNo}', alert.hotelNo.toString());
  }

  /**
   * WebSocket通知送信
   */
  private async sendWebSocketNotification(
    rule: AlertRule, 
    alert: LastMinuteAlert, 
    template: AlertTemplate, 
    message: string
  ): Promise<void> {
    const payload = {
      type: 'last-minute-alert',
      alertType: alert.alertType,
      priority: rule.priority,
      urgency: template.urgency,
      data: {
        hotelNo: alert.hotelNo,
        hotelName: alert.hotelName,
        title: template.title,
        message,
        icon: template.icon,
        color: template.color,
        sound: template.sound,
        actionButton: template.actionButton ? {
          text: template.actionButton.text,
          url: template.actionButton.url.replace('{hotelNo}', alert.hotelNo.toString())
        } : undefined,
        timestamp: new Date().toISOString()
      }
    };

    this.emit('websocket-notification', payload);
  }

  /**
   * メール通知送信
   */
  private async sendEmailNotification(
    rule: AlertRule, 
    alert: LastMinuteAlert, 
    template: AlertTemplate, 
    message: string
  ): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('メール送信が設定されていません');
    }

    const subject = `${template.icon} ${template.title} - ${alert.hotelName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${template.color}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${template.icon} ${template.title}</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: ${template.color}; margin-top: 0;">${alert.hotelName}</h2>
          <p style="font-size: 16px; line-height: 1.5;">${message}</p>
          ${template.actionButton ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${template.actionButton.url.replace('{hotelNo}', alert.hotelNo.toString())}" 
                 style="background: ${template.color}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                ${template.actionButton.text}
              </a>
            </div>
          ` : ''}
          <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 15px; font-size: 12px; color: #666;">
            <p>このメールはLastMinuteStayのアラート機能からお送りしています。</p>
          </div>
        </div>
      </div>
    `;

    // TODO: 実際のユーザーメールアドレス取得
    const emailOptions = {
      from: process.env.SMTP_FROM || 'noreply@lastminutestay.com',
      to: 'user@example.com', // TODO: ユーザーメールアドレス
      subject,
      html
    };

    await this.emailTransporter.sendMail(emailOptions);
  }

  /**
   * プッシュ通知送信
   */
  private async sendPushNotification(
    rule: AlertRule, 
    alert: LastMinuteAlert, 
    template: AlertTemplate, 
    message: string
  ): Promise<void> {
    // TODO: Web Push API実装
    const payload = {
      title: `${template.icon} ${template.title}`,
      body: message,
      icon: '/icons/hotel-alert.png',
      badge: '/icons/badge.png',
      tag: `hotel-${alert.hotelNo}`,
      data: {
        hotelNo: alert.hotelNo,
        alertType: alert.alertType,
        url: template.actionButton?.url.replace('{hotelNo}', alert.hotelNo.toString())
      }
    };

    this.emit('push-notification', payload);
  }

  /**
   * アラート統計取得
   */
  getMetrics(): AlertMetrics {
    const last24h = this.notificationHistory.filter(
      n => Date.now() - n.sentAt.getTime() < 24 * 60 * 60 * 1000
    );

    const alertsByType = last24h.reduce((acc, n) => {
      acc[n.alertType] = (acc[n.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const successfulAlerts = last24h.filter(n => n.success);

    return {
      totalAlerts: last24h.length,
      alertsByType,
      successRate: last24h.length > 0 ? (successfulAlerts.length / last24h.length) * 100 : 0,
      averageResponseTime: 0, // TODO: 実装
      activeRules: Array.from(this.rules.values()).filter(r => r.isActive).length,
      subscribedUsers: 0 // TODO: 実装
    };
  }

  /**
   * 通知履歴取得
   */
  getNotificationHistory(limit: number = 100): NotificationHistory[] {
    return this.notificationHistory.slice(0, limit);
  }

  /**
   * アクティブルール取得
   */
  getActiveRules(): AlertRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.isActive);
  }

  /**
   * デフォルトルール作成
   */
  createDefaultRules(): void {
    const defaultRules = [
      {
        name: '価格大幅下落アラート',
        priority: 'high' as const,
        conditions: { priceDropPercentage: 20 },
        actions: { sendWebSocket: true, sendPush: true, playSound: true },
        cooldownMinutes: 30,
        isActive: true
      },
      {
        name: '残室数緊急アラート',
        priority: 'critical' as const,
        conditions: { roomThreshold: 2, timeThreshold: 12 * 60 },
        actions: { sendWebSocket: true, sendEmail: true, sendPush: true, flashBadge: true },
        cooldownMinutes: 15,
        isActive: true
      },
      {
        name: 'フラッシュセールアラート',
        priority: 'high' as const,
        conditions: { priceDropPercentage: 15, timeThreshold: 6 * 60 },
        actions: { sendWebSocket: true, sendPush: true, playSound: true },
        cooldownMinutes: 60,
        isActive: true
      }
    ];

    defaultRules.forEach(rule => this.addAlertRule(rule));
    console.log('デフォルトアラートルールを作成しました');
  }
}

export default LastMinuteAlertService;
export type { AlertRule, AlertTemplate, NotificationHistory, AlertMetrics };