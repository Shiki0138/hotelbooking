/**
 * WatchlistMonitorService - 価格監視とアラート送信サービス
 * 1時間ごとに価格をチェックし、条件に合致したらマルチチャネル通知を送信
 */

const { supabaseAdmin } = require('../src/config/supabase');
const UnifiedNotificationService = require('./UnifiedNotificationService');
const { createClient } = require('@supabase/supabase-js');

class WatchlistMonitorService {
  constructor() {
    this.notificationService = null;
    this.isRunning = false;
    this.checkInterval = 60 * 60 * 1000; // 1時間
    this.batchSize = 50;
    this.intervalId = null;
  }

  /**
   * サービス初期化
   */
  async initialize() {
    try {
      console.log('🔍 Initializing WatchlistMonitorService...');
      
      // 通知サービス初期化
      this.notificationService = new UnifiedNotificationService();
      await this.notificationService.initialize();
      
      // 定期実行開始
      if (process.env.ENABLE_WATCHLIST_MONITOR !== 'false') {
        this.startMonitoring();
      }
      
      console.log('✅ WatchlistMonitorService initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WatchlistMonitorService:', error);
      return false;
    }
  }

  /**
   * 監視開始
   */
  startMonitoring() {
    if (this.isRunning) {
      console.log('Monitor is already running');
      return;
    }

    console.log('🚀 Starting watchlist price monitoring...');
    this.isRunning = true;
    
    // 初回実行
    this.checkAllWatchlistItems();
    
    // 定期実行設定
    this.intervalId = setInterval(() => {
      this.checkAllWatchlistItems();
    }, this.checkInterval);
  }

  /**
   * 監視停止
   */
  stopMonitoring() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping watchlist price monitoring...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 全ウォッチリストアイテムをチェック
   */
  async checkAllWatchlistItems() {
    const startTime = Date.now();
    console.log('📊 Starting watchlist price check...');
    
    try {
      // アクティブなウォッチリストアイテムを取得
      const { data: watchlistItems, error } = await supabaseAdmin
        .from('watchlist_items')
        .select(`
          *,
          hotels (
            id,
            name,
            city,
            price,
            image_url
          ),
          rooms (
            id,
            name,
            price,
            max_occupancy,
            available_count
          )
        `)
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (error) {
        console.error('Error fetching watchlist items:', error);
        return;
      }

      if (!watchlistItems || watchlistItems.length === 0) {
        console.log('No active watchlist items to check');
        return;
      }

      console.log(`Found ${watchlistItems.length} active watchlist items`);

      // バッチ処理
      for (let i = 0; i < watchlistItems.length; i += this.batchSize) {
        const batch = watchlistItems.slice(i, i + this.batchSize);
        await Promise.all(batch.map(item => this.checkWatchlistItem(item)));
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Watchlist check completed in ${duration}ms`);
      
    } catch (error) {
      console.error('Error in watchlist check:', error);
    }
  }

  /**
   * 個別のウォッチリストアイテムをチェック
   */
  async checkWatchlistItem(item) {
    try {
      const { watch_type, watch_dates, weekend_only, days_of_week } = item;
      
      // 日付チェック
      if (!this.isWithinWatchDates(watch_dates)) {
        return;
      }

      // 曜日チェック
      if (days_of_week && !this.isAllowedDayOfWeek(days_of_week)) {
        return;
      }

      // 週末チェック
      if (weekend_only && !this.isWeekend()) {
        return;
      }

      // 監視タイプに応じてチェック
      const checks = [];
      
      if (watch_type === 'price' || watch_type === 'both') {
        checks.push(this.checkPriceCondition(item));
      }
      
      if (watch_type === 'availability' || watch_type === 'both') {
        checks.push(this.checkAvailabilityCondition(item));
      }

      const results = await Promise.all(checks);
      const shouldNotify = results.some(result => result === true);

      if (shouldNotify) {
        await this.sendWatchlistNotification(item);
      }

      // 価格履歴を記録
      await this.recordPriceHistory(item, shouldNotify);
      
    } catch (error) {
      console.error(`Error checking watchlist item ${item.id}:`, error);
    }
  }

  /**
   * 価格条件チェック
   */
  async checkPriceCondition(item) {
    const currentPrice = item.room_id ? item.rooms?.price : item.hotels?.price;
    
    if (!currentPrice) {
      return false;
    }

    // 初回の場合は初期価格を記録
    if (!item.initial_price) {
      await this.updateInitialPrice(item.id, currentPrice);
    }

    // 最安値更新チェック
    if (!item.lowest_price_seen || currentPrice < item.lowest_price_seen) {
      await this.updateLowestPrice(item.id, currentPrice);
    }

    // 目標価格チェック
    if (item.target_price && currentPrice <= item.target_price) {
      return true;
    }

    // 割引率チェック
    if (item.price_threshold_percentage && item.initial_price) {
      const discountPercentage = ((item.initial_price - currentPrice) / item.initial_price) * 100;
      if (discountPercentage >= item.price_threshold_percentage) {
        return true;
      }
    }

    return false;
  }

  /**
   * 空室状況チェック
   */
  async checkAvailabilityCondition(item) {
    if (!item.room_id || !item.rooms) {
      return false;
    }

    const availableCount = item.rooms.available_count || 0;
    
    // 残室数アラート
    if (item.room_threshold && availableCount > 0 && availableCount <= item.room_threshold) {
      return true;
    }
    
    // 満室から空室になった場合
    if (item.notify_on_availability && availableCount > 0) {
      const wasFullYesterday = await this.wasFullYesterday(item.room_id);
      if (wasFullYesterday) {
        return true;
      }
    }

    // 空室が出た場合
    if (availableCount > 0 && !item.room_threshold && !item.notify_on_availability) {
      return true;
    }

    return false;
  }

  /**
   * ウォッチリスト通知送信
   */
  async sendWatchlistNotification(item) {
    try {
      // 通知頻度チェック
      if (!this.shouldSendNotification(item)) {
        return;
      }

      const currentPrice = item.room_id ? item.rooms?.price : item.hotels?.price;
      const hotelName = item.hotels?.name || 'Unknown Hotel';
      const roomName = item.rooms?.name || '';
      
      // 割引率計算
      let discountPercentage = 0;
      let discountAmount = 0;
      if (item.initial_price && currentPrice) {
        discountAmount = item.initial_price - currentPrice;
        discountPercentage = Math.round((discountAmount / item.initial_price) * 100);
      }

      // 通知データ作成
      const notificationData = {
        watchlist_item_id: item.id,
        user_id: item.user_id,
        channel: item.notification_channels[0] || 'email',
        recipient: await this.getUserContact(item.user_id, item.notification_channels[0]),
        subject: `🎯 ${hotelName} - ウォッチリスト条件達成`,
        message: this.createNotificationMessage(item, currentPrice, discountPercentage),
        hotel_name: hotelName,
        room_name: roomName,
        original_price: item.initial_price,
        current_price: currentPrice,
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        metadata: {
          hotel_id: item.hotel_id,
          room_id: item.room_id,
          watch_type: item.watch_type,
          triggered_by: this.getTriggeredReason(item, currentPrice)
        }
      };

      // 通知をキューに追加
      await this.queueNotification(notificationData);

      // 複数チャンネルの場合
      if (item.notification_channels.length > 1) {
        for (let i = 1; i < item.notification_channels.length; i++) {
          const channel = item.notification_channels[i];
          await this.queueNotification({
            ...notificationData,
            channel,
            recipient: await this.getUserContact(item.user_id, channel)
          });
        }
      }

      // 通知送信を実行
      await this.processNotificationQueue(item.user_id);

      // 最終通知時刻を更新
      await this.updateLastNotified(item.id);
      
    } catch (error) {
      console.error('Error sending watchlist notification:', error);
    }
  }

  /**
   * 通知メッセージ作成
   */
  createNotificationMessage(item, currentPrice, discountPercentage) {
    const hotelName = item.hotels?.name || 'ホテル';
    const roomName = item.rooms?.name || '';
    
    let message = `${hotelName}`;
    if (roomName) {
      message += ` - ${roomName}`;
    }
    message += `\n\n`;

    if (item.watch_type === 'price' || item.watch_type === 'both') {
      if (item.target_price && currentPrice <= item.target_price) {
        message += `✅ 目標価格達成: ¥${currentPrice.toLocaleString()} (目標: ¥${item.target_price.toLocaleString()})\n`;
      }
      if (discountPercentage > 0) {
        message += `💰 ${discountPercentage}%OFF - ¥${currentPrice.toLocaleString()}\n`;
      }
    }

    if (item.watch_type === 'availability' || item.watch_type === 'both') {
      const availableCount = item.rooms?.available_count || 0;
      if (availableCount > 0) {
        message += `🏨 空室あり: ${availableCount}室\n`;
      }
    }

    message += `\n📅 対象期間: ${this.formatDateRange(item.watch_dates)}`;
    message += `\n🔗 今すぐ予約: ${process.env.FRONTEND_URL}/hotels/${item.hotel_id}`;

    return message;
  }

  /**
   * トリガー理由取得
   */
  getTriggeredReason(item, currentPrice) {
    const reasons = [];

    if (item.target_price && currentPrice <= item.target_price) {
      reasons.push('target_price_reached');
    }

    if (item.price_threshold_percentage && item.initial_price) {
      const discountPercentage = ((item.initial_price - currentPrice) / item.initial_price) * 100;
      if (discountPercentage >= item.price_threshold_percentage) {
        reasons.push('discount_threshold_reached');
      }
    }

    if (item.rooms?.available_count > 0) {
      reasons.push('availability_found');
    }

    return reasons;
  }

  /**
   * 通知をキューに追加
   */
  async queueNotification(notificationData) {
    try {
      const { error } = await supabaseAdmin
        .from('watchlist_notifications')
        .insert({
          ...notificationData,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error queueing notification:', error);
      }
    } catch (error) {
      console.error('Error in queueNotification:', error);
    }
  }

  /**
   * 通知キュー処理
   */
  async processNotificationQueue(userId) {
    try {
      // ペンディング通知を取得
      const { data: notifications, error } = await supabaseAdmin
        .from('watchlist_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error || !notifications) {
        return;
      }

      // 各通知を処理
      for (const notification of notifications) {
        await this.sendNotificationViaUnifiedService(notification);
      }
      
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  /**
   * 統合通知サービス経由で送信
   */
  async sendNotificationViaUnifiedService(notification) {
    try {
      const result = await this.notificationService.sendNotification({
        userId: notification.user_id,
        type: 'watchlist_alert',
        priority: 'high',
        notification: {
          title: notification.subject,
          body: notification.message,
          data: {
            watchlist_item_id: notification.watchlist_item_id,
            hotel_name: notification.hotel_name,
            current_price: notification.current_price,
            discount_percentage: notification.discount_percentage
          }
        },
        channels: [notification.channel],
        context: {
          category: 'watchlist',
          urgency: 'high'
        }
      });

      // 送信結果を更新
      await supabaseAdmin
        .from('watchlist_notifications')
        .update({
          status: result.success ? 'sent' : 'failed',
          sent_at: new Date().toISOString(),
          error_message: result.error
        })
        .eq('id', notification.id);
        
    } catch (error) {
      console.error('Error sending via unified service:', error);
      
      await supabaseAdmin
        .from('watchlist_notifications')
        .update({
          status: 'failed',
          error_message: error.message,
          retry_count: notification.retry_count + 1
        })
        .eq('id', notification.id);
    }
  }

  /**
   * 価格履歴記録
   */
  async recordPriceHistory(item, meetsCriteria) {
    try {
      const currentPrice = item.room_id ? item.rooms?.price : item.hotels?.price;
      const availableCount = item.rooms?.available_count || 0;
      
      let discountPercentage = 0;
      if (item.initial_price && currentPrice) {
        discountPercentage = Math.round(((item.initial_price - currentPrice) / item.initial_price) * 100);
      }

      await supabaseAdmin
        .from('watchlist_price_history')
        .insert({
          watchlist_item_id: item.id,
          room_id: item.room_id || item.hotel_id,
          date: new Date().toISOString().split('T')[0],
          price: currentPrice,
          discount_percentage: discountPercentage,
          available_count: availableCount,
          meets_criteria: meetsCriteria,
          notification_sent: meetsCriteria
        });
        
    } catch (error) {
      console.error('Error recording price history:', error);
    }
  }

  /**
   * ユーザー連絡先取得
   */
  async getUserContact(userId, channel) {
    try {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email, phone')
        .eq('id', userId)
        .single();

      if (!user) {
        return null;
      }

      switch (channel) {
        case 'email':
          return user.email;
        case 'sms':
          return user.phone;
        case 'push':
          return userId; // プッシュ通知はuserIdで管理
        case 'line':
          // LINE IDは別テーブルから取得する必要がある
          return userId;
        default:
          return user.email;
      }
    } catch (error) {
      console.error('Error getting user contact:', error);
      return null;
    }
  }

  /**
   * 通知送信可否チェック
   */
  shouldSendNotification(item) {
    if (!item.last_notified_at) {
      return true;
    }

    const lastNotified = new Date(item.last_notified_at);
    const now = new Date();
    const hoursSinceLastNotification = (now - lastNotified) / (1000 * 60 * 60);

    switch (item.notification_frequency) {
      case 'immediate':
        return hoursSinceLastNotification >= 1; // 1時間に1回まで
      case 'daily':
        return hoursSinceLastNotification >= 24;
      case 'weekly':
        return hoursSinceLastNotification >= 168;
      default:
        return true;
    }
  }

  /**
   * ヘルパーメソッド群
   */
  
  isWithinWatchDates(watchDates) {
    if (!watchDates) {
      return true;
    }

    const today = new Date();
    const [start, end] = watchDates.slice(1, -1).split(',');
    const startDate = new Date(start);
    const endDate = new Date(end);

    return today >= startDate && today <= endDate;
  }

  isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }

  isAllowedDayOfWeek(allowedDays) {
    if (!allowedDays || !Array.isArray(allowedDays)) {
      return true;
    }
    const today = new Date().getDay();
    return allowedDays.includes(today);
  }

  async wasFullYesterday(roomId) {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const { data } = await supabaseAdmin
        .from('watchlist_price_history')
        .select('available_count')
        .eq('room_id', roomId)
        .eq('date', yesterdayStr)
        .single();
        
      return data && data.available_count === 0;
    } catch (error) {
      return false;
    }
  }

  formatDateRange(watchDates) {
    if (!watchDates) {
      return '期間指定なし';
    }

    const [start, end] = watchDates.slice(1, -1).split(',');
    return `${start} 〜 ${end}`;
  }

  async updateInitialPrice(itemId, price) {
    await supabaseAdmin
      .from('watchlist_items')
      .update({ initial_price: price })
      .eq('id', itemId);
  }

  async updateLowestPrice(itemId, price) {
    await supabaseAdmin
      .from('watchlist_items')
      .update({ 
        lowest_price_seen: price,
        lowest_price_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', itemId);
  }

  async updateLastNotified(itemId) {
    await supabaseAdmin
      .from('watchlist_items')
      .update({ 
        last_notified_at: new Date().toISOString(),
        notification_count: supabaseAdmin.raw('notification_count + 1')
      })
      .eq('id', itemId);
  }

  /**
   * 統計情報取得
   */
  async getStatistics() {
    try {
      const stats = {
        isRunning: this.isRunning,
        checkInterval: this.checkInterval,
        lastCheck: null,
        totalChecked: 0,
        totalNotifications: 0
      };

      // 直近の価格履歴から統計取得
      const { data } = await supabaseAdmin
        .from('watchlist_price_history')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        stats.lastCheck = data[0].created_at;
      }

      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {};
    }
  }

  /**
   * サービス停止
   */
  async shutdown() {
    console.log('🛑 Shutting down WatchlistMonitorService...');
    this.stopMonitoring();
    
    if (this.notificationService) {
      await this.notificationService.shutdown();
    }
    
    console.log('✅ WatchlistMonitorService shutdown complete');
  }
}

module.exports = WatchlistMonitorService;