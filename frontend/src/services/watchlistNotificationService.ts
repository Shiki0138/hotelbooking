import { websocketService, NotificationData } from './websocketService';
import { emailNotificationService, EmailNotificationData } from './emailNotificationService';

interface WatchlistItem {
  id: string;
  userId: string;
  hotelId: string;
  hotelName: string;
  location: string;
  targetPrice?: number;
  checkIn?: string;
  checkOut?: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    websocket: boolean;
    priceDropThreshold: number; // パーセンテージ
    availabilityAlert: boolean;
  };
  createdAt: Date;
  lastNotified?: Date;
}

interface FavoriteItem {
  id: string;
  userId: string;
  hotelId: string;
  hotelName: string;
  location: string;
  addedAt: Date;
  notificationEnabled: boolean;
}

interface NotificationRule {
  id: string;
  userId: string;
  type: 'price_drop' | 'availability' | 'weekly_digest' | 'booking_reminder';
  enabled: boolean;
  conditions: {
    minPriceDropPercentage?: number;
    maxPriceThreshold?: number;
    preferredDays?: string[];
    advanceNoticeDays?: number;
  };
  delivery: {
    email: boolean;
    push: boolean;
    websocket: boolean;
    immediateNotification: boolean;
  };
}

class WatchlistNotificationService {
  private watchlist: WatchlistItem[] = [];
  private favorites: FavoriteItem[] = [];
  private notificationRules: NotificationRule[] = [];
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
    this.startPeriodicChecks();
  }

  // ウォッチリスト管理
  public async addToWatchlist(item: Omit<WatchlistItem, 'id' | 'createdAt'>): Promise<string> {
    const watchlistItem: WatchlistItem = {
      ...item,
      id: this.generateId(),
      createdAt: new Date()
    };

    this.watchlist.push(watchlistItem);
    this.saveToStorage();
    
    // 即座に監視開始
    this.startMonitoring(watchlistItem);
    
    // サーバーに同期
    await this.syncToServer('watchlist', 'add', watchlistItem);
    
    return watchlistItem.id;
  }

  public async removeFromWatchlist(itemId: string): Promise<boolean> {
    const index = this.watchlist.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    const item = this.watchlist[index];
    this.watchlist.splice(index, 1);
    this.saveToStorage();
    
    // 監視停止
    this.stopMonitoring(itemId);
    
    // サーバーから削除
    await this.syncToServer('watchlist', 'remove', { id: itemId });
    
    return true;
  }

  public async updateWatchlistItem(itemId: string, updates: Partial<WatchlistItem>): Promise<boolean> {
    const item = this.watchlist.find(item => item.id === itemId);
    if (!item) return false;

    Object.assign(item, updates);
    this.saveToStorage();
    
    // 監視設定を更新
    this.restartMonitoring(item);
    
    // サーバーに同期
    await this.syncToServer('watchlist', 'update', item);
    
    return true;
  }

  // お気に入り管理
  public async addToFavorites(item: Omit<FavoriteItem, 'id' | 'addedAt'>): Promise<string> {
    const favoriteItem: FavoriteItem = {
      ...item,
      id: this.generateId(),
      addedAt: new Date()
    };

    this.favorites.push(favoriteItem);
    this.saveToStorage();
    
    if (favoriteItem.notificationEnabled) {
      this.startFavoriteMonitoring(favoriteItem);
    }
    
    await this.syncToServer('favorites', 'add', favoriteItem);
    
    return favoriteItem.id;
  }

  public async removeFromFavorites(itemId: string): Promise<boolean> {
    const index = this.favorites.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    this.favorites.splice(index, 1);
    this.saveToStorage();
    
    // 監視停止
    this.stopMonitoring(itemId);
    
    await this.syncToServer('favorites', 'remove', { id: itemId });
    
    return true;
  }

  // 通知ルール管理
  public async addNotificationRule(rule: Omit<NotificationRule, 'id'>): Promise<string> {
    const notificationRule: NotificationRule = {
      ...rule,
      id: this.generateId()
    };

    this.notificationRules.push(notificationRule);
    this.saveToStorage();
    
    await this.syncToServer('notification_rules', 'add', notificationRule);
    
    return notificationRule.id;
  }

  public async updateNotificationRule(ruleId: string, updates: Partial<NotificationRule>): Promise<boolean> {
    const rule = this.notificationRules.find(rule => rule.id === ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    this.saveToStorage();
    
    await this.syncToServer('notification_rules', 'update', rule);
    
    return true;
  }

  // 監視機能
  private startMonitoring(item: WatchlistItem): void {
    if (this.monitoringIntervals.has(item.id)) {
      this.stopMonitoring(item.id);
    }

    const interval = setInterval(async () => {
      await this.checkHotelUpdates(item);
    }, 5 * 60 * 1000); // 5分ごとにチェック

    this.monitoringIntervals.set(item.id, interval);
  }

  private startFavoriteMonitoring(item: FavoriteItem): void {
    if (!item.notificationEnabled) return;

    const interval = setInterval(async () => {
      await this.checkFavoriteUpdates(item);
    }, 15 * 60 * 1000); // 15分ごとにチェック

    this.monitoringIntervals.set(item.id, interval);
  }

  private stopMonitoring(itemId: string): void {
    const interval = this.monitoringIntervals.get(itemId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(itemId);
    }
  }

  private restartMonitoring(item: WatchlistItem): void {
    this.stopMonitoring(item.id);
    this.startMonitoring(item);
  }

  private async checkHotelUpdates(item: WatchlistItem): Promise<void> {
    try {
      const hotelData = await this.fetchHotelData(item.hotelId, item.checkIn, item.checkOut);
      
      if (!hotelData) return;

      // 価格変動チェック
      if (item.targetPrice && hotelData.currentPrice <= item.targetPrice) {
        await this.sendPriceTargetNotification(item, hotelData);
      }

      // 価格下落チェック
      if (hotelData.priceChanged && hotelData.priceChangePercentage >= item.notificationPreferences.priceDropThreshold) {
        await this.sendPriceDropNotification(item, hotelData);
      }

      // 空室チェック
      if (item.notificationPreferences.availabilityAlert && hotelData.availabilityChanged) {
        await this.sendAvailabilityNotification(item, hotelData);
      }

    } catch (error) {
      console.error(`Error checking updates for watchlist item ${item.id}:`, error);
    }
  }

  private async checkFavoriteUpdates(item: FavoriteItem): Promise<void> {
    try {
      const hotelData = await this.fetchHotelData(item.hotelId);
      
      if (!hotelData) return;

      // お気に入りホテルの更新通知
      if (hotelData.hasUpdates) {
        await this.sendFavoriteUpdateNotification(item, hotelData);
      }

    } catch (error) {
      console.error(`Error checking updates for favorite item ${item.id}:`, error);
    }
  }

  private async fetchHotelData(hotelId: string, checkIn?: string, checkOut?: string): Promise<any> {
    const params = new URLSearchParams({
      hotelId,
      ...(checkIn && { checkIn }),
      ...(checkOut && { checkOut })
    });

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/hotels/monitor?${params}`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) return null;
    
    return response.json();
  }

  // 通知送信
  private async sendPriceTargetNotification(item: WatchlistItem, hotelData: any): Promise<void> {
    const notificationData: NotificationData = {
      type: 'price_drop',
      hotelId: item.hotelId,
      message: `${item.hotelName}が目標価格¥${item.targetPrice?.toLocaleString()}以下になりました！`,
      timestamp: Date.now(),
      metadata: {
        newPrice: hotelData.currentPrice,
        originalPrice: hotelData.originalPrice
      }
    };

    await this.deliverNotification(item.notificationPreferences, notificationData, item.userId);
    
    // 最終通知時刻を更新
    item.lastNotified = new Date();
    this.saveToStorage();
  }

  private async sendPriceDropNotification(item: WatchlistItem, hotelData: any): Promise<void> {
    const notificationData: NotificationData = {
      type: 'price_drop',
      hotelId: item.hotelId,
      message: `${item.hotelName}の価格が${hotelData.priceChangePercentage}%下がりました！`,
      timestamp: Date.now(),
      metadata: {
        oldPrice: hotelData.oldPrice,
        newPrice: hotelData.currentPrice,
        priceChange: hotelData.priceChange,
        percentageChange: hotelData.priceChangePercentage
      }
    };

    await this.deliverNotification(item.notificationPreferences, notificationData, item.userId);
    
    item.lastNotified = new Date();
    this.saveToStorage();
  }

  private async sendAvailabilityNotification(item: WatchlistItem, hotelData: any): Promise<void> {
    const notificationData: NotificationData = {
      type: 'availability',
      hotelId: item.hotelId,
      message: `${item.hotelName}に空室が見つかりました！`,
      timestamp: Date.now(),
      metadata: {
        availabilityCount: hotelData.availableRooms
      }
    };

    await this.deliverNotification(item.notificationPreferences, notificationData, item.userId);
    
    item.lastNotified = new Date();
    this.saveToStorage();
  }

  private async sendFavoriteUpdateNotification(item: FavoriteItem, hotelData: any): Promise<void> {
    const notificationData: NotificationData = {
      type: 'favorite_update',
      hotelId: item.hotelId,
      message: `お気に入りの${item.hotelName}に更新があります`,
      timestamp: Date.now()
    };

    const preferences = {
      email: true,
      push: true,
      websocket: true,
      priceDropThreshold: 0,
      availabilityAlert: true
    };

    await this.deliverNotification(preferences, notificationData, item.userId);
  }

  private async deliverNotification(
    preferences: WatchlistItem['notificationPreferences'] | any,
    notificationData: NotificationData,
    userId: string
  ): Promise<void> {
    // WebSocket通知
    if (preferences.websocket) {
      websocketService.send({
        topic: `notifications:${userId}`,
        event: 'notification',
        payload: notificationData
      });
    }

    // メール通知
    if (preferences.email) {
      const user = await this.getUserData(userId);
      if (user?.email) {
        const emailData: EmailNotificationData = {
          userId,
          email: user.email,
          type: notificationData.type as any,
          hotelData: {
            id: notificationData.hotelId,
            name: '', // ホテル名は別途取得
            price: notificationData.metadata?.newPrice || 0,
            originalPrice: notificationData.metadata?.oldPrice,
            location: ''
          }
        };

        if (notificationData.type === 'price_drop') {
          await emailNotificationService.sendPriceDropNotification(emailData);
        } else if (notificationData.type === 'availability') {
          await emailNotificationService.sendAvailabilityNotification(emailData);
        }
      }
    }

    // プッシュ通知
    if (preferences.push) {
      await this.sendPushNotification(notificationData, userId);
    }
  }

  private async sendPushNotification(notificationData: NotificationData, userId: string): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(notificationData.message, {
          icon: '/icons/notification-icon.png',
          badge: '/icons/badge-icon.png',
          tag: `hotel-${notificationData.hotelId}`,
          renotify: true,
          actions: [
            {
              action: 'view',
              title: '詳細を見る'
            }
          ]
        });
      } catch (error) {
        console.error('Push notification failed:', error);
      }
    }
  }

  // ユーティリティ
  private async getUserData(userId: string): Promise<any> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      return response.ok ? response.json() : null;
    } catch {
      return null;
    }
  }

  private async syncToServer(table: string, action: string, data: any): Promise<void> {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/sync/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action, data })
      });
    } catch (error) {
      console.error('Server sync failed:', error);
    }
  }

  private setupEventListeners(): void {
    websocketService.addEventListener('watchlist_alert', (data) => {
      console.log('Received watchlist alert:', data);
    });

    websocketService.addEventListener('favorite_update', (data) => {
      console.log('Received favorite update:', data);
    });
  }

  private startPeriodicChecks(): void {
    // 毎時0分に一括チェック
    setInterval(() => {
      const now = new Date();
      if (now.getMinutes() === 0) {
        this.performBulkCheck();
      }
    }, 60 * 1000);

    // 週次ダイジェスト送信（日曜日9時）
    setInterval(() => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 9 && now.getMinutes() === 0) {
        this.sendWeeklyDigest();
      }
    }, 60 * 1000);
  }

  private async performBulkCheck(): Promise<void> {
    console.log('Performing bulk check for all monitored items');
    
    // すべてのウォッチリストアイテムをチェック
    const checkPromises = this.watchlist.map(item => this.checkHotelUpdates(item));
    await Promise.allSettled(checkPromises);
  }

  private async sendWeeklyDigest(): Promise<void> {
    const users = [...new Set([
      ...this.watchlist.map(item => item.userId),
      ...this.favorites.map(item => item.userId)
    ])];

    for (const userId of users) {
      const userData = await this.getUserData(userId);
      if (userData?.email) {
        const emailData: EmailNotificationData = {
          userId,
          email: userData.email,
          type: 'weekly_digest'
        };
        
        await emailNotificationService.sendWeeklyDigest(emailData);
      }
    }
  }

  private loadFromStorage(): void {
    try {
      const watchlistData = localStorage.getItem('watchlist');
      const favoritesData = localStorage.getItem('favorites');
      const rulesData = localStorage.getItem('notification_rules');

      if (watchlistData) {
        this.watchlist = JSON.parse(watchlistData);
      }
      if (favoritesData) {
        this.favorites = JSON.parse(favoritesData);
      }
      if (rulesData) {
        this.notificationRules = JSON.parse(rulesData);
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
      localStorage.setItem('favorites', JSON.stringify(this.favorites));
      localStorage.setItem('notification_rules', JSON.stringify(this.notificationRules));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 公開メソッド
  public getWatchlist(): WatchlistItem[] {
    return [...this.watchlist];
  }

  public getFavorites(): FavoriteItem[] {
    return [...this.favorites];
  }

  public getNotificationRules(): NotificationRule[] {
    return [...this.notificationRules];
  }

  public getMonitoringStatus() {
    return {
      activeWatchlistItems: this.watchlist.length,
      activeFavorites: this.favorites.filter(f => f.notificationEnabled).length,
      activeMonitors: this.monitoringIntervals.size,
      notificationRules: this.notificationRules.filter(r => r.enabled).length
    };
  }
}

export const watchlistNotificationService = new WatchlistNotificationService();
export type { WatchlistItem, FavoriteItem, NotificationRule };