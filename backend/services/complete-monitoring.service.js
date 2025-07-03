/**
 * 完全システム監視サービス
 * Worker3: プロダクションレベル完成目標
 * Created: 2025-07-02
 */

const supabase = require('./supabase-client');
const emailService = require('./realtime-email.service');
const axios = require('axios');

class CompleteMonitoringService {
  constructor() {
    this.isRunning = false;
    this.monitoringStats = {
      totalChecks: 0,
      successfulChecks: 0,
      alertsSent: 0,
      errorsEncountered: 0,
      startTime: null
    };
  }

  /**
   * 監視システム開始
   */
  async startMonitoring() {
    if (this.isRunning) {
      console.log('⚠️  監視システムは既に実行中です');
      return;
    }

    this.isRunning = true;
    this.monitoringStats.startTime = new Date();
    
    console.log('🚀 完全システム監視開始');
    console.log(`📊 開始時刻: ${this.monitoringStats.startTime.toISOString()}`);

    // メイン監視ループ
    while (this.isRunning) {
      try {
        await this.runMonitoringCycle();
        await this.sleep(15 * 60 * 1000); // 15分間隔
      } catch (error) {
        console.error('監視サイクルエラー:', error);
        this.monitoringStats.errorsEncountered++;
        await this.sleep(60 * 1000); // エラー時は1分待機
      }
    }
  }

  /**
   * 監視サイクル実行
   */
  async runMonitoringCycle() {
    const cycleStart = new Date();
    console.log(`\n⏰ [${cycleStart.toISOString()}] 監視サイクル開始`);

    try {
      // 1. アクティブなウォッチリスト取得
      const watchlists = await this.getActiveWatchlists();
      console.log(`📋 アクティブウォッチリスト: ${watchlists.length}件`);

      if (watchlists.length === 0) {
        console.log('✅ 監視対象なし - サイクル完了');
        return;
      }

      // 2. 価格チェック実行
      let checkedCount = 0;
      let alertsSent = 0;

      for (const watchlist of watchlists) {
        try {
          const alerts = await this.checkWatchlistItem(watchlist);
          alertsSent += alerts;
          checkedCount++;
          
          // API レート制限対応
          await this.sleep(200);
        } catch (error) {
          console.error(`ウォッチリスト ${watchlist.id} チェック失敗:`, error.message);
        }
      }

      // 3. 統計更新
      this.monitoringStats.totalChecks++;
      this.monitoringStats.successfulChecks++;
      this.monitoringStats.alertsSent += alertsSent;

      const cycleEnd = new Date();
      const duration = (cycleEnd - cycleStart) / 1000;

      console.log(`✅ 監視サイクル完了 - ${duration}秒`);
      console.log(`📊 チェック完了: ${checkedCount}/${watchlists.length}`);
      console.log(`📧 送信アラート: ${alertsSent}件`);

      // 4. システムメトリクス記録
      await this.recordSystemMetrics({
        cycle_duration: duration,
        watchlists_checked: checkedCount,
        alerts_sent: alertsSent,
        timestamp: cycleStart
      });

    } catch (error) {
      this.monitoringStats.errorsEncountered++;
      throw error;
    }
  }

  /**
   * アクティブウォッチリスト取得
   */
  async getActiveWatchlists() {
    const { data, error } = await supabase
      .from('watchlist')
      .select(`
        *,
        users!inner(
          id,
          email,
          name,
          notification_enabled
        )
      `)
      .eq('is_active', true)
      .eq('users.notification_enabled', true)
      .gte('checkin_date', new Date().toISOString().split('T')[0])
      .order('priority_level', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`ウォッチリスト取得エラー: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 個別ウォッチリストアイテムチェック
   */
  async checkWatchlistItem(watchlist) {
    console.log(`🔍 チェック中: ${watchlist.hotel_name} (${watchlist.hotel_no})`);

    try {
      // 1. 現在の価格・空室状況取得
      const currentData = await this.fetchCurrentHotelData(watchlist);
      
      if (!currentData.success) {
        console.warn(`価格取得失敗: ${watchlist.hotel_no} - ${currentData.error}`);
        return 0;
      }

      // 2. 価格履歴に記録
      await this.recordPriceHistory(watchlist, currentData.data);

      // 3. アラート条件チェック
      const alerts = await this.checkAlertConditions(watchlist, currentData.data);

      // 4. アラート送信
      let sentCount = 0;
      for (const alert of alerts) {
        try {
          await this.sendAlert(alert);
          sentCount++;
        } catch (error) {
          console.error('アラート送信失敗:', error);
        }
      }

      // 5. ウォッチリスト更新
      await this.updateWatchlistStatus(watchlist.id, {
        last_checked_at: new Date().toISOString(),
        alert_count: watchlist.alert_count + sentCount
      });

      return sentCount;

    } catch (error) {
      console.error(`ウォッチリストチェックエラー: ${watchlist.id}`, error);
      return 0;
    }
  }

  /**
   * 現在のホテルデータ取得
   */
  async fetchCurrentHotelData(watchlist) {
    try {
      const response = await axios.get('https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426', {
        params: {
          applicationId: process.env.RAKUTEN_APPLICATION_ID,
          affiliateId: process.env.RAKUTEN_AFFILIATE_ID,
          format: 'json',
          hotelNo: watchlist.hotel_no,
          checkinDate: watchlist.checkin_date,
          checkoutDate: watchlist.checkout_date,
          adultNum: watchlist.adult_num,
          childNum: watchlist.child_num || 0,
          squeezeCondition: 'OR',
          responseType: 'large'
        },
        timeout: 10000
      });

      if (!response.data || !response.data.hotels || response.data.hotels.length === 0) {
        return {
          success: false,
          error: '空室なし'
        };
      }

      const hotel = response.data.hotels[0];
      const hotelInfo = hotel.hotelBasicInfo;
      const roomInfo = hotel.roomInfo?.[0];

      return {
        success: true,
        data: {
          hotel_no: hotelInfo.hotelNo,
          hotel_name: hotelInfo.hotelName,
          min_charge: hotelInfo.hotelMinCharge,
          max_charge: hotelInfo.hotelMaxCharge,
          availability_status: roomInfo ? 'available' : 'unavailable',
          room_info: roomInfo ? {
            room_name: roomInfo.roomBasicInfo?.roomName,
            plan_name: roomInfo.dailyCharge?.planName,
            plan_id: roomInfo.dailyCharge?.planId,
            price: roomInfo.dailyCharge?.total,
            original_price: roomInfo.dailyCharge?.rakutenCharge,
            remaining_rooms: roomInfo.roomBasicInfo?.maxOccupancy,
            meal_plan: roomInfo.dailyCharge?.mealPlan,
            bed_type: roomInfo.roomBasicInfo?.bedType,
            room_size: roomInfo.roomBasicInfo?.roomSize
          } : null,
          hotel_thumbnail_url: hotelInfo.hotelThumbnailUrl,
          special_url: hotelInfo.hotelSpecialUrl,
          review_average: hotelInfo.reviewAverage,
          review_count: hotelInfo.reviewCount
        }
      };

    } catch (error) {
      if (error.response?.status === 429) {
        await this.sleep(5000);
        return { success: false, error: 'レート制限 - 再試行必要' };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 価格履歴記録
   */
  async recordPriceHistory(watchlist, hotelData) {
    const roomInfo = hotelData.room_info;
    
    const historyData = {
      hotel_no: watchlist.hotel_no,
      room_type: roomInfo?.room_name || null,
      room_name: roomInfo?.room_name || null,
      plan_name: roomInfo?.plan_name || null,
      plan_id: roomInfo?.plan_id || null,
      price: roomInfo?.price || hotelData.min_charge,
      original_price: roomInfo?.original_price || null,
      discount_rate: roomInfo?.original_price && roomInfo?.price ? 
        Math.round(((roomInfo.original_price - roomInfo.price) / roomInfo.original_price) * 100) : null,
      availability_status: hotelData.availability_status,
      remaining_rooms: roomInfo?.remaining_rooms || null,
      max_occupancy: roomInfo?.remaining_rooms || null,
      bed_type: roomInfo?.bed_type || null,
      meal_plan: roomInfo?.meal_plan || null,
      checkin_date: watchlist.checkin_date,
      checkout_date: watchlist.checkout_date,
      adult_num: watchlist.adult_num,
      child_num: watchlist.child_num || 0,
      data_source: 'rakuten_api',
      api_response_time_ms: 1000,
      data_freshness_score: 100
    };

    const { error } = await supabase
      .from('price_history')
      .insert(historyData);

    if (error) {
      console.warn('価格履歴記録警告:', error.message);
    }

    // ホテル基本情報更新
    await this.updateHotelInfo(hotelData);
  }

  /**
   * ホテル基本情報更新
   */
  async updateHotelInfo(hotelData) {
    const { error } = await supabase
      .from('hotels_realtime')
      .upsert({
        hotel_no: hotelData.hotel_no,
        hotel_name: hotelData.hotel_name,
        min_charge: hotelData.min_charge,
        max_charge: hotelData.max_charge,
        review_average: hotelData.review_average,
        review_count: hotelData.review_count,
        hotel_thumbnail_url: hotelData.hotel_thumbnail_url,
        rakuten_travel_url: hotelData.special_url,
        last_updated_from_api: new Date().toISOString()
      });

    if (error) {
      console.warn('ホテル情報更新警告:', error.message);
    }
  }

  /**
   * アラート条件チェック
   */
  async checkAlertConditions(watchlist, currentData) {
    const alerts = [];
    const alertConditions = watchlist.alert_conditions || {};
    const roomInfo = currentData.room_info;
    const currentPrice = roomInfo?.price || currentData.min_charge;

    // 価格下落チェック
    if (alertConditions.price_drop && currentPrice) {
      const priceDropAlert = await this.checkPriceDropCondition(watchlist, currentPrice);
      if (priceDropAlert) {
        alerts.push({
          type: 'price_drop',
          watchlist,
          currentData,
          alertData: priceDropAlert
        });
      }
    }

    // 目標価格到達チェック
    if (watchlist.target_price && currentPrice && currentPrice <= watchlist.target_price) {
      alerts.push({
        type: 'target_price_reached',
        watchlist,
        currentData,
        alertData: { target_price: watchlist.target_price, current_price: currentPrice }
      });
    }

    // 新規空室チェック
    if (alertConditions.new_availability && currentData.availability_status === 'available') {
      const wasUnavailable = await this.checkPreviousAvailability(watchlist.hotel_no, watchlist.checkin_date);
      if (wasUnavailable) {
        alerts.push({
          type: 'new_availability',
          watchlist,
          currentData,
          alertData: { previous_status: 'unavailable' }
        });
      }
    }

    // 残室わずかチェック
    if (alertConditions.last_room_alert && roomInfo?.remaining_rooms && roomInfo.remaining_rooms <= 3) {
      alerts.push({
        type: 'last_room',
        watchlist,
        currentData,
        alertData: { remaining_rooms: roomInfo.remaining_rooms }
      });
    }

    return alerts;
  }

  /**
   * 価格下落条件チェック
   */
  async checkPriceDropCondition(watchlist, currentPrice) {
    const { data: recentPrice, error } = await supabase
      .from('price_history')
      .select('price')
      .eq('hotel_no', watchlist.hotel_no)
      .eq('checkin_date', watchlist.checkin_date)
      .eq('checkout_date', watchlist.checkout_date)
      .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !recentPrice) return null;

    const priceDrop = recentPrice.price - currentPrice;
    const dropPercentage = (priceDrop / recentPrice.price) * 100;
    
    const conditions = watchlist.alert_conditions;
    const minDropAmount = conditions.price_drop_threshold || 1000;
    const minDropPercentage = conditions.price_drop_percentage || 10;

    if (priceDrop >= minDropAmount && dropPercentage >= minDropPercentage) {
      return {
        previous_price: recentPrice.price,
        current_price: currentPrice,
        price_drop: priceDrop,
        drop_percentage: dropPercentage
      };
    }

    return null;
  }

  /**
   * 前回の空室状況チェック
   */
  async checkPreviousAvailability(hotelNo, checkinDate) {
    const { data, error } = await supabase
      .from('price_history')
      .select('availability_status')
      .eq('hotel_no', hotelNo)
      .eq('checkin_date', checkinDate)
      .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    return !error && data?.availability_status === 'unavailable';
  }

  /**
   * アラート送信
   */
  async sendAlert(alert) {
    const { watchlist, currentData, alertData } = alert;
    const user = watchlist.users;

    // 通知制限チェック
    const canSend = await this.checkNotificationLimits(user.id);
    if (!canSend) {
      console.log(`通知制限により送信スキップ: ${user.email}`);
      return;
    }

    // 通知レコード作成
    const notificationData = {
      user_id: user.id,
      watchlist_id: watchlist.id,
      notification_type: alert.type,
      category: 'price_alert',
      title: this.generateAlertTitle(alert),
      message: this.generateAlertMessage(alert),
      hotel_no: watchlist.hotel_no,
      hotel_name: watchlist.hotel_name,
      price_data: alertData,
      alert_data: currentData,
      priority_level: this.getAlertPriority(alert.type),
      delivery_channels: ['email']
    };

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (error) {
      throw new Error(`通知記録作成エラー: ${error.message}`);
    }

    // メール送信
    try {
      await this.sendEmailAlert(user, alert, notification.id);
      
      // 送信ステータス更新
      await supabase
        .from('notifications')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          delivery_status: 'sent'
        })
        .eq('id', notification.id);

    } catch (error) {
      // 送信失敗ステータス更新
      await supabase
        .from('notifications')
        .update({
          delivery_status: 'failed',
          error_message: error.message,
          retry_count: 1
        })
        .eq('id', notification.id);
      
      throw error;
    }
  }

  /**
   * アラートタイトル生成
   */
  generateAlertTitle(alert) {
    const { type, watchlist, alertData } = alert;
    
    switch (type) {
      case 'price_drop':
        return `🔥 ${Math.round(alertData.drop_percentage)}%OFF! ${watchlist.hotel_name}`;
      case 'target_price_reached':
        return `🎯 目標価格到達! ${watchlist.hotel_name}`;
      case 'new_availability':
        return `✨ 空室発見! ${watchlist.hotel_name}`;
      case 'last_room':
        return `⚡ 残り${alertData.remaining_rooms}室! ${watchlist.hotel_name}`;
      default:
        return `📢 ${watchlist.hotel_name} - 価格アラート`;
    }
  }

  /**
   * アラートメッセージ生成
   */
  generateAlertMessage(alert) {
    const { type, watchlist, alertData } = alert;
    
    switch (type) {
      case 'price_drop':
        return `${watchlist.hotel_name}の価格が¥${alertData.price_drop.toLocaleString()}下落しました！\n現在価格: ¥${alertData.current_price.toLocaleString()}（${alertData.drop_percentage}%OFF）`;
      case 'target_price_reached':
        return `${watchlist.hotel_name}が目標価格に到達しました！\n現在価格: ¥${alertData.current_price.toLocaleString()}`;
      case 'new_availability':
        return `${watchlist.hotel_name}に空室が出ました！お早めにご予約ください。`;
      case 'last_room':
        return `${watchlist.hotel_name}は残り${alertData.remaining_rooms}室となりました。お早めにご予約ください！`;
      default:
        return `${watchlist.hotel_name}に関するアラートです。`;
    }
  }

  /**
   * アラート優先度取得
   */
  getAlertPriority(alertType) {
    const priorities = {
      'price_drop': 5,
      'target_price_reached': 5,
      'last_room': 4,
      'new_availability': 3,
      'special_plan': 2
    };
    
    return priorities[alertType] || 3;
  }

  /**
   * メールアラート送信
   */
  async sendEmailAlert(user, alert, notificationId) {
    const emailData = {
      to: user.email,
      subject: this.generateAlertTitle(alert),
      type: alert.type,
      data: {
        user_name: user.name,
        hotel_name: alert.watchlist.hotel_name,
        checkin_date: alert.watchlist.checkin_date,
        checkout_date: alert.watchlist.checkout_date,
        ...alert.alertData,
        room_info: alert.currentData.room_info,
        booking_url: alert.currentData.special_url || `https://travel.rakuten.co.jp/HOTEL/${alert.watchlist.hotel_no}/`
      }
    };

    await emailService.sendAlert(emailData);
  }

  /**
   * 通知制限チェック
   */
  async checkNotificationLimits(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('count(*)')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (error) return true;
    
    const todayCount = data?.count || 0;
    return todayCount < 20; // 1日20件まで
  }

  /**
   * ウォッチリストステータス更新
   */
  async updateWatchlistStatus(watchlistId, updates) {
    const { error } = await supabase
      .from('watchlist')
      .update(updates)
      .eq('id', watchlistId);

    if (error) {
      console.warn('ウォッチリスト更新警告:', error.message);
    }
  }

  /**
   * システムメトリクス記録
   */
  async recordSystemMetrics(metrics) {
    // 将来的にはメトリクス専用テーブルに記録
    console.log('📊 システムメトリクス:', metrics);
  }

  /**
   * 監視システム停止
   */
  stop() {
    this.isRunning = false;
    console.log('⏹️  完全システム監視停止');
    
    const endTime = new Date();
    const duration = (endTime - this.monitoringStats.startTime) / 1000;
    
    console.log('📊 監視統計:');
    console.log(`  - 実行時間: ${duration}秒`);
    console.log(`  - 総チェック数: ${this.monitoringStats.totalChecks}`);
    console.log(`  - 成功チェック数: ${this.monitoringStats.successfulChecks}`);
    console.log(`  - 送信アラート数: ${this.monitoringStats.alertsSent}`);
    console.log(`  - エラー数: ${this.monitoringStats.errorsEncountered}`);
  }

  /**
   * システム統計取得
   */
  getStats() {
    return {
      ...this.monitoringStats,
      isRunning: this.isRunning,
      uptime: this.monitoringStats.startTime ? 
        (new Date() - this.monitoringStats.startTime) / 1000 : 0
    };
  }

  /**
   * スリープ関数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new CompleteMonitoringService();