import { EventEmitter } from 'events';
import Redis from 'ioredis';
import RakutenTravelService, { HotelAvailability, LastMinuteAlert } from './rakutenTravelService';

/**
 * リアルタイム在庫更新システム
 * LastMinuteStay特化の即座在庫管理
 */

interface InventoryUpdate {
  hotelNo: number;
  hotelName: string;
  roomType: string;
  availableRooms: number;
  price: number;
  previousPrice?: number;
  priceChange: number;
  priceChangePercentage: number;
  lastUpdated: Date;
  checkInDate: string;
  checkOutDate: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  timeUntilCheckIn: number; // 分単位
}

interface InventorySnapshot {
  timestamp: Date;
  totalHotels: number;
  availableHotels: number;
  averagePrice: number;
  priceRange: { min: number; max: number };
  urgencyDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  topDeals: InventoryUpdate[];
  priceDrops: InventoryUpdate[];
}

interface UserSubscription {
  userId: string;
  filters: {
    maxPrice?: number;
    minPrice?: number;
    area?: string;
    checkInDate?: string;
    urgencyLevels?: ('low' | 'medium' | 'high' | 'critical')[];
    priceDropThreshold?: number; // パーセンテージ
  };
  notificationMethods: ('websocket' | 'email' | 'push')[];
  createdAt: Date;
  lastNotified?: Date;
}

class RealTimeInventoryService extends EventEmitter {
  private redis: Redis;
  private rakutenService: RakutenTravelService;
  private isRunning = false;
  private updateInterval = 30000; // 30秒間隔
  private updateTimer?: NodeJS.Timeout;
  private inventoryCache = new Map<number, InventoryUpdate>();
  private subscribers = new Map<string, UserSubscription>();
  private alertHistory: LastMinuteAlert[] = [];
  private maxHistorySize = 1000;

  constructor(redisConfig: any, rakutenConfig: any) {
    super();
    this.redis = new Redis(redisConfig);
    this.rakutenService = new RakutenTravelService(rakutenConfig);
    
    // Redis接続エラーハンドリング
    this.redis.on('error', (error) => {
      console.error('Redis接続エラー:', error);
      this.emit('error', error);
    });
    
    // Redis接続成功
    this.redis.on('connect', () => {
      console.log('Redis接続成功');
      this.emit('redis-connected');
    });
  }

  /**
   * リアルタイム更新開始
   */
  async startRealTimeUpdates(): Promise<void> {
    if (this.isRunning) {
      console.log('リアルタイム更新は既に実行中です');
      return;
    }

    this.isRunning = true;
    console.log('リアルタイム在庫更新システム開始');

    // 初回更新
    await this.performInventoryUpdate();

    // 定期更新設定
    this.updateTimer = setInterval(async () => {
      try {
        await this.performInventoryUpdate();
      } catch (error) {
        console.error('在庫更新エラー:', error);
        this.emit('update-error', error);
      }
    }, this.updateInterval);

    this.emit('started');
  }

  /**
   * リアルタイム更新停止
   */
  stopRealTimeUpdates(): void {
    if (!this.isRunning) {
      console.log('リアルタイム更新は既に停止中です');
      return;
    }

    this.isRunning = false;
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    console.log('リアルタイム在庫更新システム停止');
    this.emit('stopped');
  }

  /**
   * 在庫更新実行
   */
  private async performInventoryUpdate(): Promise<void> {
    try {
      console.log('在庫更新開始:', new Date().toISOString());

      // 人気エリアの直前予約ホテル取得
      const hotels = await this.rakutenService.getPopularAreaLastMinute();
      
      const updates: InventoryUpdate[] = [];
      const alerts: LastMinuteAlert[] = [];

      for (const hotel of hotels) {
        const previous = this.inventoryCache.get(hotel.hotelNo);
        
        // チェックイン日時計算
        const checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + 1);
        const timeUntilCheckIn = Math.round((checkInDate.getTime() - Date.now()) / (1000 * 60));

        const update: InventoryUpdate = {
          hotelNo: hotel.hotelNo,
          hotelName: hotel.hotelName,
          roomType: 'スタンダード', // 簡略化
          availableRooms: hotel.availableRooms,
          price: hotel.hotelMinCharge,
          previousPrice: previous?.price,
          priceChange: previous ? hotel.hotelMinCharge - previous.price : 0,
          priceChangePercentage: previous 
            ? Math.round(((hotel.hotelMinCharge - previous.price) / previous.price) * 100 * 100) / 100
            : 0,
          lastUpdated: new Date(),
          checkInDate: checkInDate.toISOString().split('T')[0],
          checkOutDate: new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          urgencyLevel: hotel.urgencyLevel,
          timeUntilCheckIn
        };

        updates.push(update);
        this.inventoryCache.set(hotel.hotelNo, update);

        // アラート生成
        const alert = this.rakutenService.generateLastMinuteAlert(hotel, previous?.price);
        if (alert) {
          alerts.push(alert);
          this.alertHistory.unshift(alert);
        }

        // Redis に保存
        await this.redis.setex(
          `hotel:${hotel.hotelNo}`,
          300, // 5分間有効
          JSON.stringify(update)
        );
      }

      // 履歴サイズ制限
      if (this.alertHistory.length > this.maxHistorySize) {
        this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
      }

      // 在庫スナップショット生成
      const snapshot = this.generateInventorySnapshot(updates);
      
      // Redis に全体サマリ保存
      await this.redis.setex(
        'inventory:snapshot',
        300,
        JSON.stringify(snapshot)
      );

      // イベント発火
      this.emit('inventory-updated', { updates, alerts, snapshot });

      // ユーザー通知処理
      await this.processUserNotifications(updates, alerts);

      console.log(`在庫更新完了: ${updates.length}件のホテル, ${alerts.length}件のアラート`);

    } catch (error) {
      console.error('在庫更新エラー:', error);
      throw error;
    }
  }

  /**
   * 在庫スナップショット生成
   */
  private generateInventorySnapshot(updates: InventoryUpdate[]): InventorySnapshot {
    const availableHotels = updates.filter(u => u.availableRooms > 0);
    const prices = availableHotels.map(u => u.price);
    
    const urgencyDistribution = {
      critical: updates.filter(u => u.urgencyLevel === 'critical').length,
      high: updates.filter(u => u.urgencyLevel === 'high').length,
      medium: updates.filter(u => u.urgencyLevel === 'medium').length,
      low: updates.filter(u => u.urgencyLevel === 'low').length
    };

    // トップディール（価格の安い順）
    const topDeals = availableHotels
      .sort((a, b) => a.price - b.price)
      .slice(0, 10);

    // 価格下落（下落率の高い順）
    const priceDrops = updates
      .filter(u => u.priceChangePercentage < -5) // 5%以上の下落
      .sort((a, b) => a.priceChangePercentage - b.priceChangePercentage)
      .slice(0, 10);

    return {
      timestamp: new Date(),
      totalHotels: updates.length,
      availableHotels: availableHotels.length,
      averagePrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      priceRange: prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 },
      urgencyDistribution,
      topDeals,
      priceDrops
    };
  }

  /**
   * ユーザー通知処理
   */
  private async processUserNotifications(updates: InventoryUpdate[], alerts: LastMinuteAlert[]): Promise<void> {
    for (const [userId, subscription] of this.subscribers) {
      try {
        const relevantUpdates = this.filterUpdatesForUser(updates, subscription);
        const relevantAlerts = this.filterAlertsForUser(alerts, subscription);

        if (relevantUpdates.length > 0 || relevantAlerts.length > 0) {
          this.emit('user-notification', {
            userId,
            updates: relevantUpdates,
            alerts: relevantAlerts,
            subscription
          });

          // 最終通知時間更新
          subscription.lastNotified = new Date();
        }
      } catch (error) {
        console.error(`ユーザー ${userId} への通知エラー:`, error);
      }
    }
  }

  /**
   * ユーザー向け更新フィルタリング
   */
  private filterUpdatesForUser(updates: InventoryUpdate[], subscription: UserSubscription): InventoryUpdate[] {
    return updates.filter(update => {
      // 価格フィルタ
      if (subscription.filters.maxPrice && update.price > subscription.filters.maxPrice) {
        return false;
      }
      if (subscription.filters.minPrice && update.price < subscription.filters.minPrice) {
        return false;
      }

      // 緊急度フィルタ
      if (subscription.filters.urgencyLevels && 
          !subscription.filters.urgencyLevels.includes(update.urgencyLevel)) {
        return false;
      }

      // 価格下落フィルタ
      if (subscription.filters.priceDropThreshold && 
          update.priceChangePercentage > -subscription.filters.priceDropThreshold) {
        return false;
      }

      // チェックイン日フィルタ
      if (subscription.filters.checkInDate && 
          update.checkInDate !== subscription.filters.checkInDate) {
        return false;
      }

      return true;
    });
  }

  /**
   * ユーザー向けアラートフィルタリング
   */
  private filterAlertsForUser(alerts: LastMinuteAlert[], subscription: UserSubscription): LastMinuteAlert[] {
    return alerts.filter(alert => {
      // 価格フィルタ
      if (subscription.filters.maxPrice && alert.currentPrice > subscription.filters.maxPrice) {
        return false;
      }
      if (subscription.filters.minPrice && alert.currentPrice < subscription.filters.minPrice) {
        return false;
      }

      // 割引率フィルタ
      if (subscription.filters.priceDropThreshold && 
          alert.discount < subscription.filters.priceDropThreshold) {
        return false;
      }

      return true;
    });
  }

  /**
   * ユーザー購読登録
   */
  async subscribeUser(userId: string, subscription: Omit<UserSubscription, 'userId' | 'createdAt'>): Promise<void> {
    const userSubscription: UserSubscription = {
      userId,
      ...subscription,
      createdAt: new Date()
    };

    this.subscribers.set(userId, userSubscription);
    
    // Redis に保存
    await this.redis.setex(
      `subscription:${userId}`,
      86400, // 24時間有効
      JSON.stringify(userSubscription)
    );

    console.log(`ユーザー ${userId} の購読を登録しました`);
    this.emit('user-subscribed', userSubscription);
  }

  /**
   * ユーザー購読解除
   */
  async unsubscribeUser(userId: string): Promise<void> {
    this.subscribers.delete(userId);
    await this.redis.del(`subscription:${userId}`);
    
    console.log(`ユーザー ${userId} の購読を解除しました`);
    this.emit('user-unsubscribed', userId);
  }

  /**
   * 現在の在庫状況取得
   */
  async getCurrentInventory(): Promise<InventorySnapshot | null> {
    try {
      const snapshotData = await this.redis.get('inventory:snapshot');
      return snapshotData ? JSON.parse(snapshotData) : null;
    } catch (error) {
      console.error('在庫状況取得エラー:', error);
      return null;
    }
  }

  /**
   * 特定ホテルの詳細情報取得
   */
  async getHotelDetail(hotelNo: number): Promise<InventoryUpdate | null> {
    try {
      const hotelData = await this.redis.get(`hotel:${hotelNo}`);
      return hotelData ? JSON.parse(hotelData) : null;
    } catch (error) {
      console.error('ホテル詳細取得エラー:', error);
      return null;
    }
  }

  /**
   * アラート履歴取得
   */
  getAlertHistory(limit: number = 50): LastMinuteAlert[] {
    return this.alertHistory.slice(0, limit);
  }

  /**
   * 購読ユーザー一覧取得
   */
  getSubscribers(): UserSubscription[] {
    return Array.from(this.subscribers.values());
  }

  /**
   * 統計情報取得
   */
  getStatistics(): {
    totalUpdates: number;
    totalAlerts: number;
    totalSubscribers: number;
    isRunning: boolean;
    updateInterval: number;
    cacheSize: number;
  } {
    return {
      totalUpdates: this.inventoryCache.size,
      totalAlerts: this.alertHistory.length,
      totalSubscribers: this.subscribers.size,
      isRunning: this.isRunning,
      updateInterval: this.updateInterval,
      cacheSize: this.inventoryCache.size
    };
  }

  /**
   * クリーンアップ
   */
  async cleanup(): Promise<void> {
    this.stopRealTimeUpdates();
    await this.redis.quit();
    this.removeAllListeners();
    console.log('リアルタイム在庫サービスをクリーンアップしました');
  }
}

export default RealTimeInventoryService;
export type { InventoryUpdate, InventorySnapshot, UserSubscription };