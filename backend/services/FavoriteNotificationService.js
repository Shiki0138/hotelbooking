const SendGridEmailService = require('./SendGridEmailService');
const { createClient } = require('@supabase/supabase-js');

class FavoriteNotificationService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.emailService = new SendGridEmailService();
    
    // 監視間隔設定
    this.checkInterval = 5 * 60 * 1000; // 5分
    this.batchSize = 100;
    this.isMonitoring = false;
    
    this.startMonitoring();
  }

  async startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Favorite notification monitoring started');
    
    // 定期監視開始
    this.monitoringInterval = setInterval(async () => {
      await this.checkFavoriteUpdates();
    }, this.checkInterval);
    
    // 初回実行
    await this.checkFavoriteUpdates();
  }

  async stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    console.log('Favorite notification monitoring stopped');
  }

  async checkFavoriteUpdates() {
    try {
      console.log('Checking favorite updates...');
      
      // アクティブなお気に入り一覧取得
      const favorites = await this.getActiveFavorites();
      
      if (favorites.length === 0) {
        console.log('No active favorites found');
        return;
      }
      
      console.log(`Found ${favorites.length} active favorites`);
      
      // バッチ処理で監視
      const batches = this.createBatches(favorites, this.batchSize);
      
      for (const batch of batches) {
        await this.processFavoriteBatch(batch);
        // API制限回避のため少し待機
        await this.sleep(1000);
      }
      
    } catch (error) {
      console.error('Error checking favorite updates:', error);
    }
  }

  async getActiveFavorites() {
    const { data, error } = await this.supabase
      .from('user_favorites')
      .select(`
        *,
        users!inner(email, notification_preferences)
      `)
      .eq('notification_enabled', true)
      .eq('users.email_notifications', true);
    
    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }
    
    return data || [];
  }

  async processFavoriteBatch(favorites) {
    const updatePromises = favorites.map(favorite => 
      this.checkSingleFavorite(favorite)
    );
    
    await Promise.allSettled(updatePromises);
  }

  async checkSingleFavorite(favorite) {
    try {
      // ホテル情報の最新状態を取得
      const currentHotelData = await this.fetchHotelData(favorite.hotel_id);
      
      if (!currentHotelData) {
        console.log(`Hotel data not found for favorite ${favorite.id}`);
        return;
      }
      
      // 前回の状態と比較
      const lastSnapshot = await this.getLastSnapshot(favorite.id);
      const hasUpdates = this.detectUpdates(currentHotelData, lastSnapshot);
      
      if (hasUpdates.length > 0) {
        console.log(`Updates detected for favorite ${favorite.id}:`, hasUpdates);
        
        // 通知送信
        await this.sendFavoriteUpdateNotification(favorite, currentHotelData, hasUpdates);
        
        // スナップショット更新
        await this.updateSnapshot(favorite.id, currentHotelData);
        
        // 最終通知時刻更新
        await this.updateLastNotified(favorite.id);
      }
      
    } catch (error) {
      console.error(`Error checking favorite ${favorite.id}:`, error);
    }
  }

  async fetchHotelData(hotelId) {
    try {
      // 楽天トラベルAPIまたは内部APIからホテル情報取得
      const response = await fetch(`${process.env.API_BASE_URL}/api/hotels/${hotelId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.API_TOKEN}`
        }
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching hotel data for ${hotelId}:`, error);
      return null;
    }
  }

  async getLastSnapshot(favoriteId) {
    const { data, error } = await this.supabase
      .from('favorite_snapshots')
      .select('*')
      .eq('favorite_id', favoriteId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    return data[0];
  }

  detectUpdates(currentData, lastSnapshot) {
    const updates = [];
    
    if (!lastSnapshot) {
      // 初回の場合はスナップショットのみ保存
      return [];
    }
    
    const lastData = lastSnapshot.hotel_data;
    
    // 価格変動チェック
    if (currentData.price !== lastData.price) {
      const change = currentData.price - lastData.price;
      const changePercent = ((change / lastData.price) * 100).toFixed(1);
      
      if (change < 0) {
        updates.push({
          type: 'price_drop',
          message: `価格が¥${Math.abs(change).toLocaleString()}下がりました (${Math.abs(changePercent)}%オフ)`,
          oldValue: lastData.price,
          newValue: currentData.price
        });
      } else if (change > 0) {
        updates.push({
          type: 'price_increase',
          message: `価格が¥${change.toLocaleString()}上がりました`,
          oldValue: lastData.price,
          newValue: currentData.price
        });
      }
    }
    
    // 空室状況チェック
    if (currentData.availability !== lastData.availability) {
      if (currentData.availability && !lastData.availability) {
        updates.push({
          type: 'availability_restored',
          message: '空室が復活しました！',
          newValue: currentData.availability
        });
      } else if (!currentData.availability && lastData.availability) {
        updates.push({
          type: 'sold_out',
          message: '満室になりました',
          oldValue: lastData.availability
        });
      }
    }
    
    // レビュー評価チェック
    if (currentData.rating !== lastData.rating) {
      const change = currentData.rating - lastData.rating;
      updates.push({
        type: 'rating_change',
        message: `評価が${change > 0 ? '向上' : '変更'}されました (${lastData.rating} → ${currentData.rating})`,
        oldValue: lastData.rating,
        newValue: currentData.rating
      });
    }
    
    // 特別オファーチェック
    if (currentData.special_offers && (!lastData.special_offers || 
        JSON.stringify(currentData.special_offers) !== JSON.stringify(lastData.special_offers))) {
      updates.push({
        type: 'special_offer',
        message: '新しい特別オファーが追加されました',
        newValue: currentData.special_offers
      });
    }
    
    // アメニティ更新チェック
    if (currentData.amenities && lastData.amenities && 
        JSON.stringify(currentData.amenities) !== JSON.stringify(lastData.amenities)) {
      updates.push({
        type: 'amenities_update',
        message: 'アメニティ情報が更新されました',
        newValue: currentData.amenities
      });
    }
    
    return updates;
  }

  async sendFavoriteUpdateNotification(favorite, hotelData, updates) {
    try {
      // ユーザーの通知設定確認
      const user = favorite.users;
      if (!user.email || !user.notification_preferences?.favorites) {
        return;
      }
      
      // 通知頻度制限チェック
      const canSend = await this.checkNotificationThrottle(favorite.id, 'favorite_update');
      if (!canSend) {
        console.log(`Notification throttled for favorite ${favorite.id}`);
        return;
      }
      
      // メール通知データ準備
      const emailData = {
        name: hotelData.name,
        location: hotelData.location,
        id: hotelData.id,
        imageUrl: hotelData.images?.[0],
        updates: updates.map(update => update.message),
        price: hotelData.price,
        rating: hotelData.rating,
        specialOffers: hotelData.special_offers
      };
      
      // SendGrid経由でメール送信
      const result = await this.emailService.sendFavoriteUpdateAlert(user.email, emailData);
      
      if (result.success) {
        console.log(`Favorite update notification sent to ${user.email}`);
        
        // 通知履歴記録
        await this.recordNotificationHistory({
          favorite_id: favorite.id,
          user_id: favorite.user_id,
          notification_type: 'favorite_update',
          updates: updates,
          email_message_id: result.messageId,
          sent_at: new Date()
        });
      } else {
        console.error(`Failed to send favorite notification: ${result.error}`);
      }
      
      // WebSocket通知も送信
      await this.sendWebSocketNotification(favorite.user_id, {
        type: 'favorite_update',
        hotelId: hotelData.id,
        hotelName: hotelData.name,
        updates: updates,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error sending favorite update notification:', error);
    }
  }

  async checkNotificationThrottle(favoriteId, notificationType) {
    // 同じお気に入りホテルの同じタイプの通知を1時間以内に送信しないように制限
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { data, error } = await this.supabase
      .from('notification_history')
      .select('id')
      .eq('favorite_id', favoriteId)
      .eq('notification_type', notificationType)
      .gte('sent_at', oneHourAgo.toISOString())
      .limit(1);
    
    if (error) {
      console.error('Error checking notification throttle:', error);
      return true; // エラー時は送信を許可
    }
    
    return !data || data.length === 0;
  }

  async updateSnapshot(favoriteId, hotelData) {
    const { error } = await this.supabase
      .from('favorite_snapshots')
      .upsert({
        favorite_id: favoriteId,
        hotel_data: hotelData,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error updating favorite snapshot:', error);
    }
  }

  async updateLastNotified(favoriteId) {
    const { error } = await this.supabase
      .from('user_favorites')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('id', favoriteId);
    
    if (error) {
      console.error('Error updating last notified time:', error);
    }
  }

  async recordNotificationHistory(historyData) {
    const { error } = await this.supabase
      .from('notification_history')
      .insert(historyData);
    
    if (error) {
      console.error('Error recording notification history:', error);
    }
  }

  async sendWebSocketNotification(userId, notificationData) {
    try {
      // WebSocket経由でリアルタイム通知
      const { error } = await this.supabase
        .from('realtime_notifications')
        .insert({
          user_id: userId,
          notification_data: notificationData,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error sending WebSocket notification:', error);
      }
    } catch (error) {
      console.error('Error in WebSocket notification:', error);
    }
  }

  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 手動でお気に入りの更新チェックをトリガー
  async triggerFavoriteCheck(favoriteId) {
    try {
      const { data: favorite, error } = await this.supabase
        .from('user_favorites')
        .select(`
          *,
          users!inner(email, notification_preferences)
        `)
        .eq('id', favoriteId)
        .single();
      
      if (error) {
        throw new Error(`Favorite not found: ${error.message}`);
      }
      
      await this.checkSingleFavorite(favorite);
      return { success: true };
    } catch (error) {
      console.error('Error in manual favorite check:', error);
      return { success: false, error: error.message };
    }
  }

  // ユーザーの全お気に入りの一括更新チェック
  async checkUserFavorites(userId) {
    try {
      const { data: favorites, error } = await this.supabase
        .from('user_favorites')
        .select(`
          *,
          users!inner(email, notification_preferences)
        `)
        .eq('user_id', userId)
        .eq('notification_enabled', true);
      
      if (error) {
        throw new Error(`Error fetching user favorites: ${error.message}`);
      }
      
      const checkPromises = favorites.map(favorite => 
        this.checkSingleFavorite(favorite)
      );
      
      await Promise.allSettled(checkPromises);
      
      return { 
        success: true, 
        checkedCount: favorites.length 
      };
    } catch (error) {
      console.error('Error checking user favorites:', error);
      return { success: false, error: error.message };
    }
  }

  // 統計情報取得
  async getNotificationStatistics(days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const { data, error } = await this.supabase
        .from('notification_history')
        .select('notification_type, sent_at')
        .gte('sent_at', startDate.toISOString());
      
      if (error) {
        throw new Error(`Error fetching statistics: ${error.message}`);
      }
      
      const stats = {
        total: data.length,
        byType: {},
        byDay: {}
      };
      
      data.forEach(notification => {
        const type = notification.notification_type;
        const day = notification.sent_at.split('T')[0];
        
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        stats.byDay[day] = (stats.byDay[day] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting notification statistics:', error);
      return null;
    }
  }
}

module.exports = FavoriteNotificationService;