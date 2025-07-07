import { websocketService, NotificationData } from './websocketService';
import { emailNotificationService, EmailNotificationData } from './emailNotificationService';

interface PriceAlert {
  id: string;
  userId: string;
  hotelId: string;
  hotelName: string;
  location: string;
  checkIn: string;
  checkOut: string;
  currentPrice: number;
  targetPrice: number;
  alertType: 'price_drop' | 'price_target' | 'percentage_drop';
  thresholdValue: number; // 目標価格または下落パーセンテージ
  isActive: boolean;
  notificationChannels: {
    email: boolean;
    push: boolean;
    websocket: boolean;
    sms: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily';
  createdAt: Date;
  lastChecked?: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

interface PriceHistory {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  price: number;
  timestamp: Date;
  source: string;
}

interface PricePrediction {
  hotelId: string;
  checkIn: string;
  checkOut: string;
  currentPrice: number;
  predictedPrices: {
    date: string;
    price: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  recommendation: 'buy_now' | 'wait' | 'uncertain';
  confidenceScore: number;
}

class PriceAlertService {
  private alerts: PriceAlert[] = [];
  private priceHistory: Map<string, PriceHistory[]> = new Map();
  private predictions: Map<string, PricePrediction> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly API_URL = import.meta.env.VITE_API_URL;

  constructor() {
    this.loadFromStorage();
    this.startPriceMonitoring();
    this.setupWebSocketListeners();
  }

  // アラート管理
  public async createPriceAlert(alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'triggerCount'>): Promise<string> {
    const alert: PriceAlert = {
      ...alertData,
      id: this.generateAlertId(),
      createdAt: new Date(),
      triggerCount: 0
    };

    this.alerts.push(alert);
    this.saveToStorage();
    
    // 即座に監視開始
    if (alert.isActive) {
      this.startIndividualMonitoring(alert);
    }
    
    // サーバーに保存
    await this.syncAlertToServer(alert);
    
    // 初回価格取得
    await this.updateAlertPrice(alert.id);
    
    return alert.id;
  }

  public async updatePriceAlert(alertId: string, updates: Partial<PriceAlert>): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    const wasActive = alert.isActive;
    Object.assign(alert, updates);
    
    this.saveToStorage();
    
    // 監視状態の変更
    if (wasActive && !alert.isActive) {
      this.stopIndividualMonitoring(alertId);
    } else if (!wasActive && alert.isActive) {
      this.startIndividualMonitoring(alert);
    }
    
    await this.syncAlertToServer(alert);
    
    return true;
  }

  public async deletePriceAlert(alertId: string): Promise<boolean> {
    const index = this.alerts.findIndex(a => a.id === alertId);
    if (index === -1) return false;

    this.alerts.splice(index, 1);
    this.stopIndividualMonitoring(alertId);
    this.saveToStorage();
    
    await this.deleteAlertFromServer(alertId);
    
    return true;
  }

  public getPriceAlerts(userId?: string): PriceAlert[] {
    return userId 
      ? this.alerts.filter(alert => alert.userId === userId)
      : [...this.alerts];
  }

  // 価格監視
  private startPriceMonitoring(): void {
    // 全体的な価格監視（1分ごと）
    setInterval(() => {
      this.checkAllActivePrices();
    }, 60 * 1000);

    // 高頻度監視（immediate設定のアラート用、10秒ごと）
    setInterval(() => {
      this.checkImmediateAlerts();
    }, 10 * 1000);

    // 価格履歴のクリーンアップ（1時間ごと）
    setInterval(() => {
      this.cleanupOldPriceHistory();
    }, 60 * 60 * 1000);
  }

  private startIndividualMonitoring(alert: PriceAlert): void {
    if (this.monitoringIntervals.has(alert.id)) {
      this.stopIndividualMonitoring(alert.id);
    }

    let interval: number;
    switch (alert.frequency) {
      case 'immediate':
        interval = 30 * 1000; // 30秒
        break;
      case 'hourly':
        interval = 60 * 60 * 1000; // 1時間
        break;
      case 'daily':
        interval = 24 * 60 * 60 * 1000; // 24時間
        break;
      default:
        interval = 5 * 60 * 1000; // 5分（デフォルト）
    }

    const timeout = setInterval(async () => {
      await this.checkAlertPrice(alert);
    }, interval);

    this.monitoringIntervals.set(alert.id, timeout);
  }

  private stopIndividualMonitoring(alertId: string): void {
    const interval = this.monitoringIntervals.get(alertId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(alertId);
    }
  }

  private async checkAllActivePrices(): Promise<void> {
    const activeAlerts = this.alerts.filter(alert => alert.isActive);
    const checkPromises = activeAlerts.map(alert => this.checkAlertPrice(alert));
    
    await Promise.allSettled(checkPromises);
  }

  private async checkImmediateAlerts(): Promise<void> {
    const immediateAlerts = this.alerts.filter(
      alert => alert.isActive && alert.frequency === 'immediate'
    );
    
    const checkPromises = immediateAlerts.map(alert => this.checkAlertPrice(alert));
    await Promise.allSettled(checkPromises);
  }

  private async checkAlertPrice(alert: PriceAlert): Promise<void> {
    try {
      const currentPrice = await this.fetchCurrentPrice(
        alert.hotelId, 
        alert.checkIn, 
        alert.checkOut
      );

      if (currentPrice === null) return;

      // 価格履歴に追加
      this.addPriceHistory(alert.hotelId, alert.checkIn, alert.checkOut, currentPrice);

      // 前回価格と比較
      const oldPrice = alert.currentPrice;
      alert.currentPrice = currentPrice;
      alert.lastChecked = new Date();

      // アラート条件チェック
      const shouldTrigger = this.shouldTriggerAlert(alert, oldPrice, currentPrice);
      
      if (shouldTrigger) {
        await this.triggerPriceAlert(alert, oldPrice, currentPrice);
      }

      this.saveToStorage();

    } catch (error) {
      console.error(`Error checking price for alert ${alert.id}:`, error);
    }
  }

  private shouldTriggerAlert(alert: PriceAlert, oldPrice: number, newPrice: number): boolean {
    switch (alert.alertType) {
      case 'price_target':
        return newPrice <= alert.targetPrice;
      
      case 'price_drop':
        return newPrice < oldPrice;
      
      case 'percentage_drop':
        const dropPercentage = ((oldPrice - newPrice) / oldPrice) * 100;
        return dropPercentage >= alert.thresholdValue;
      
      default:
        return false;
    }
  }

  private async triggerPriceAlert(alert: PriceAlert, oldPrice: number, newPrice: number): Promise<void> {
    alert.triggerCount++;
    alert.lastTriggered = new Date();

    const priceDrop = oldPrice - newPrice;
    const percentageChange = oldPrice > 0 ? (priceDrop / oldPrice) * 100 : 0;

    const notificationData: NotificationData = {
      type: 'price_drop',
      hotelId: alert.hotelId,
      message: this.generateAlertMessage(alert, oldPrice, newPrice),
      timestamp: Date.now(),
      metadata: {
        oldPrice,
        newPrice,
        priceChange: priceDrop,
        percentageChange
      }
    };

    // 各チャンネルで通知送信
    await this.sendMultiChannelNotification(alert, notificationData);

    // アラート履歴に記録
    await this.logAlertTrigger(alert, oldPrice, newPrice);
  }

  private generateAlertMessage(alert: PriceAlert, oldPrice: number, newPrice: number): string {
    const priceDrop = oldPrice - newPrice;
    const percentageChange = ((priceDrop / oldPrice) * 100).toFixed(1);

    switch (alert.alertType) {
      case 'price_target':
        return `🎯 ${alert.hotelName}が目標価格¥${alert.targetPrice.toLocaleString()}以下になりました！現在価格: ¥${newPrice.toLocaleString()}`;
      
      case 'price_drop':
        return `📉 ${alert.hotelName}の価格が下がりました！¥${oldPrice.toLocaleString()} → ¥${newPrice.toLocaleString()} (${percentageChange}%下落)`;
      
      case 'percentage_drop':
        return `🔥 ${alert.hotelName}の価格が${percentageChange}%下がりました！今がチャンスです！`;
      
      default:
        return `💰 ${alert.hotelName}の価格アラート`;
    }
  }

  private async sendMultiChannelNotification(alert: PriceAlert, notificationData: NotificationData): Promise<void> {
    const promises: Promise<any>[] = [];

    // WebSocket通知
    if (alert.notificationChannels.websocket) {
      websocketService.send({
        topic: `price_alerts:${alert.userId}`,
        event: 'price_alert',
        payload: notificationData
      });
    }

    // メール通知
    if (alert.notificationChannels.email) {
      const user = await this.getUserData(alert.userId);
      if (user?.email) {
        const emailData: EmailNotificationData = {
          userId: alert.userId,
          email: user.email,
          type: 'price_drop',
          hotelData: {
            id: alert.hotelId,
            name: alert.hotelName,
            price: notificationData.metadata!.newPrice,
            originalPrice: notificationData.metadata!.oldPrice,
            location: alert.location,
            checkIn: alert.checkIn,
            checkOut: alert.checkOut
          }
        };
        
        promises.push(emailNotificationService.sendPriceDropNotification(emailData));
      }
    }

    // プッシュ通知
    if (alert.notificationChannels.push) {
      promises.push(this.sendPushNotification(notificationData, alert.userId));
    }

    // SMS通知
    if (alert.notificationChannels.sms) {
      promises.push(this.sendSMSNotification(alert, notificationData));
    }

    await Promise.allSettled(promises);
  }

  private async sendPushNotification(notificationData: NotificationData, userId: string): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('価格アラート', {
          body: notificationData.message,
          icon: '/icons/price-alert-icon.png',
          badge: '/icons/badge-icon.png',
          tag: `price-alert-${notificationData.hotelId}`,
          renotify: true,
          requireInteraction: true,
          actions: [
            {
              action: 'book_now',
              title: '今すぐ予約',
              icon: '/icons/booking-icon.png'
            },
            {
              action: 'view_details',
              title: '詳細を見る',
              icon: '/icons/view-icon.png'
            }
          ],
          data: {
            hotelId: notificationData.hotelId,
            userId: userId,
            alertType: 'price_drop'
          }
        });
      } catch (error) {
        console.error('Push notification failed:', error);
      }
    }
  }

  private async sendSMSNotification(alert: PriceAlert, notificationData: NotificationData): Promise<void> {
    try {
      const user = await this.getUserData(alert.userId);
      if (!user?.phoneNumber) return;

      await fetch(`${this.API_URL}/api/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: user.phoneNumber,
          message: notificationData.message,
          alertId: alert.id
        })
      });
    } catch (error) {
      console.error('SMS notification failed:', error);
    }
  }

  // 価格履歴管理
  private addPriceHistory(hotelId: string, checkIn: string, checkOut: string, price: number): void {
    const key = `${hotelId}-${checkIn}-${checkOut}`;
    
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }
    
    const history = this.priceHistory.get(key)!;
    history.push({
      hotelId,
      checkIn,
      checkOut,
      price,
      timestamp: new Date(),
      source: 'price_alert_service'
    });

    // 最新100件まで保持
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private cleanupOldPriceHistory(): void {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7日前
    
    for (const [key, history] of this.priceHistory.entries()) {
      const filteredHistory = history.filter(entry => entry.timestamp > cutoffDate);
      
      if (filteredHistory.length === 0) {
        this.priceHistory.delete(key);
      } else {
        this.priceHistory.set(key, filteredHistory);
      }
    }
  }

  // 価格予測機能
  public async generatePricePrediction(hotelId: string, checkIn: string, checkOut: string): Promise<PricePrediction | null> {
    try {
      const key = `${hotelId}-${checkIn}-${checkOut}`;
      const history = this.priceHistory.get(key) || [];
      
      if (history.length < 5) {
        // 履歴が少ない場合は外部APIを使用
        return await this.fetchPredictionFromAPI(hotelId, checkIn, checkOut);
      }
      
      const prediction = this.calculateLocalPrediction(history);
      this.predictions.set(key, prediction);
      
      return prediction;
    } catch (error) {
      console.error('Price prediction failed:', error);
      return null;
    }
  }

  private calculateLocalPrediction(history: PriceHistory[]): PricePrediction {
    const prices = history.map(h => h.price);
    const currentPrice = prices[prices.length - 1];
    
    // 簡単な移動平均とトレンド分析
    const shortTermAvg = prices.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const longTermAvg = prices.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, prices.length);
    
    const trend = shortTermAvg > longTermAvg ? 'up' : shortTermAvg < longTermAvg ? 'down' : 'stable';
    
    // 7日間の予測生成
    const predictions = [];
    for (let i = 1; i <= 7; i++) {
      const fluctuation = (Math.random() - 0.5) * 0.1; // ±10%の変動
      const trendMultiplier = trend === 'up' ? 1.02 : trend === 'down' ? 0.98 : 1;
      
      const predictedPrice = Math.round(currentPrice * trendMultiplier * (1 + fluctuation));
      const confidence = Math.max(50, 90 - (i * 10)); // 日数が経つほど信頼度低下
      
      predictions.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: predictedPrice,
        confidence,
        trend: trend as any
      });
    }
    
    const recommendation = this.generateRecommendation(predictions, currentPrice);
    
    return {
      hotelId: history[0].hotelId,
      checkIn: history[0].checkIn,
      checkOut: history[0].checkOut,
      currentPrice,
      predictedPrices: predictions,
      recommendation,
      confidenceScore: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    };
  }

  private generateRecommendation(predictions: any[], currentPrice: number): 'buy_now' | 'wait' | 'uncertain' {
    const averageFuturePrice = predictions.reduce((sum, p) => sum + p.price, 0) / predictions.length;
    const nearTermPrice = predictions.slice(0, 3).reduce((sum, p) => sum + p.price, 0) / 3;
    
    if (nearTermPrice > currentPrice * 1.05) {
      return 'buy_now';
    } else if (averageFuturePrice < currentPrice * 0.95) {
      return 'wait';
    } else {
      return 'uncertain';
    }
  }

  private async fetchPredictionFromAPI(hotelId: string, checkIn: string, checkOut: string): Promise<PricePrediction | null> {
    try {
      const response = await fetch(`${this.API_URL}/api/price-prediction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ hotelId, checkIn, checkOut })
      });
      
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('API prediction failed:', error);
      return null;
    }
  }

  // ユーティリティメソッド
  private async fetchCurrentPrice(hotelId: string, checkIn: string, checkOut: string): Promise<number | null> {
    try {
      const response = await fetch(`${this.API_URL}/api/hotels/${hotelId}/price?checkIn=${checkIn}&checkOut=${checkOut}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.price;
    } catch (error) {
      console.error('Price fetch failed:', error);
      return null;
    }
  }

  private async updateAlertPrice(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;

    const currentPrice = await this.fetchCurrentPrice(alert.hotelId, alert.checkIn, alert.checkOut);
    if (currentPrice !== null) {
      alert.currentPrice = currentPrice;
      this.saveToStorage();
    }
  }

  private async getUserData(userId: string): Promise<any> {
    try {
      const response = await fetch(`${this.API_URL}/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  private async syncAlertToServer(alert: PriceAlert): Promise<void> {
    try {
      await fetch(`${this.API_URL}/api/price-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      console.error('Alert sync failed:', error);
    }
  }

  private async deleteAlertFromServer(alertId: string): Promise<void> {
    try {
      await fetch(`${this.API_URL}/api/price-alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
    } catch (error) {
      console.error('Alert deletion failed:', error);
    }
  }

  private async logAlertTrigger(alert: PriceAlert, oldPrice: number, newPrice: number): Promise<void> {
    try {
      await fetch(`${this.API_URL}/api/price-alerts/${alert.id}/triggers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          alertId: alert.id,
          oldPrice,
          newPrice,
          triggeredAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Alert trigger logging failed:', error);
    }
  }

  private setupWebSocketListeners(): void {
    websocketService.addEventListener('price_update', (data) => {
      // リアルタイム価格更新の処理
      this.handleRealtimePriceUpdate(data);
    });
  }

  private handleRealtimePriceUpdate(data: NotificationData): void {
    if (data.metadata?.newPrice && data.hotelId) {
      // 該当するアラートを即座にチェック
      const relevantAlerts = this.alerts.filter(
        alert => alert.hotelId === data.hotelId && alert.isActive
      );
      
      relevantAlerts.forEach(alert => {
        this.checkAlertPrice(alert);
      });
    }
  }

  private loadFromStorage(): void {
    try {
      const alertsData = localStorage.getItem('price_alerts');
      const historyData = localStorage.getItem('price_history');
      const predictionsData = localStorage.getItem('price_predictions');

      if (alertsData) {
        this.alerts = JSON.parse(alertsData);
        // アクティブなアラートの監視を再開
        this.alerts.filter(alert => alert.isActive).forEach(alert => {
          this.startIndividualMonitoring(alert);
        });
      }
      
      if (historyData) {
        const historyArray = JSON.parse(historyData);
        this.priceHistory = new Map(historyArray);
      }
      
      if (predictionsData) {
        const predictionsArray = JSON.parse(predictionsData);
        this.predictions = new Map(predictionsArray);
      }
    } catch (error) {
      console.error('Failed to load price alert data:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('price_alerts', JSON.stringify(this.alerts));
      localStorage.setItem('price_history', JSON.stringify([...this.priceHistory.entries()]));
      localStorage.setItem('price_predictions', JSON.stringify([...this.predictions.entries()]));
    } catch (error) {
      console.error('Failed to save price alert data:', error);
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 公開メソッド
  public getPriceHistory(hotelId: string, checkIn: string, checkOut: string): PriceHistory[] {
    const key = `${hotelId}-${checkIn}-${checkOut}`;
    return this.priceHistory.get(key) || [];
  }

  public getPricePrediction(hotelId: string, checkIn: string, checkOut: string): PricePrediction | null {
    const key = `${hotelId}-${checkIn}-${checkOut}`;
    return this.predictions.get(key) || null;
  }

  public getAlertStatistics() {
    return {
      totalAlerts: this.alerts.length,
      activeAlerts: this.alerts.filter(a => a.isActive).length,
      triggeredToday: this.alerts.filter(a => {
        if (!a.lastTriggered) return false;
        const today = new Date().toDateString();
        return a.lastTriggered.toDateString() === today;
      }).length,
      averageTargetPrice: this.alerts.reduce((sum, a) => sum + a.targetPrice, 0) / this.alerts.length || 0,
      monitoredHotels: new Set(this.alerts.map(a => a.hotelId)).size
    };
  }
}

export const priceAlertService = new PriceAlertService();
export type { PriceAlert, PriceHistory, PricePrediction };