/**
 * リアルタイム価格監視システム
 * Worker3: 15分間隔価格監視・即時通知担当
 * Created: 2025-07-02
 */

const supabase = require('../services/supabase-client');
const emailAlertsService = require('../services/email-alerts.service');
const axios = require('axios');

class RealtimePriceMonitor {
  constructor() {
    this.rakutenAppId = process.env.RAKUTEN_APPLICATION_ID;
    this.affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
    this.baseURL = 'https://app.rakuten.co.jp/services/api';
    this.monitoringActive = true;
    this.checkQueue = [];
  }

  /**
   * メイン監視プロセス開始
   */
  async startMonitoring() {
    console.log('🔍 リアルタイム価格監視開始 - 15分間隔');
    
    while (this.monitoringActive) {
      try {
        await this.processMonitoringCycle();
        await this.waitInterval(15 * 60 * 1000); // 15分待機
      } catch (error) {
        console.error('監視サイクルエラー:', error);
        await this.waitInterval(60 * 1000); // エラー時は1分待機
      }
    }
  }

  /**
   * 監視サイクル実行
   */
  async processMonitoringCycle() {
    const startTime = new Date();
    console.log(`\n⏰ [${startTime.toISOString()}] 監視サイクル開始`);

    // 1. 監視対象ホテル取得
    const { data: monitorTargets, error } = await supabase
      .rpc('get_hotels_to_monitor');

    if (error) {
      throw new Error(`監視対象取得エラー: ${error.message}`);
    }

    console.log(`📊 監視対象: ${monitorTargets?.length || 0}件`);

    if (!monitorTargets || monitorTargets.length === 0) {
      console.log('✅ 監視対象なし - サイクル完了');
      return;
    }

    // 2. 各ホテルの価格チェック
    let checkedCount = 0;
    let alertsSent = 0;

    for (const target of monitorTargets) {
      try {
        const alerts = await this.checkHotelPricing(target);
        alertsSent += alerts;
        checkedCount++;
        
        // レート制限対応（100ms待機）
        await this.waitInterval(100);
      } catch (error) {
        console.error(`ホテル ${target.hotel_no} チェック失敗:`, error.message);
      }
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ 監視サイクル完了 - ${duration}秒`);
    console.log(`📈 チェック完了: ${checkedCount}/${monitorTargets.length}`);
    console.log(`📧 送信アラート: ${alertsSent}件`);
  }

  /**
   * 個別ホテル価格チェック
   */
  async checkHotelPricing(target) {
    const { hotel_no, checkin_date, checkout_date, adult_num } = target;
    
    try {
      // 楽天APIから現在価格取得
      const currentData = await this.fetchHotelPricing(hotel_no, checkin_date, checkout_date, adult_num);
      
      if (!currentData.success) {
        throw new Error(currentData.error);
      }

      // 価格履歴に保存
      await this.savePriceHistory(hotel_no, currentData.data, checkin_date, checkout_date, adult_num);

      // 価格変動検知
      const changeResult = await this.detectPriceChanges(hotel_no, checkin_date, checkout_date, adult_num, currentData.data);

      // アラート送信
      let alertsSent = 0;
      if (changeResult.hasAlerts) {
        alertsSent = await this.sendPriceAlerts(changeResult.alerts);
      }

      return alertsSent;

    } catch (error) {
      // エラーをキューテーブルに記録
      await this.recordError(hotel_no, checkin_date, checkout_date, adult_num, error.message);
      throw error;
    }
  }

  /**
   * 楽天APIから価格データ取得
   */
  async fetchHotelPricing(hotelNo, checkinDate, checkoutDate, adultNum) {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const response = await axios.get(`${this.baseURL}/Travel/VacantHotelSearch/20170426`, {
          params: {
            applicationId: this.rakutenAppId,
            affiliateId: this.affiliateId,
            format: 'json',
            hotelNo: hotelNo,
            checkinDate: checkinDate,
            checkoutDate: checkoutDate,
            adultNum: adultNum,
            responseType: 'large',
          },
          timeout: 10000,
        });

        if (!response.data || !response.data.hotels || response.data.hotels.length === 0) {
          return {
            success: false,
            error: '空室なし',
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
            room_info: roomInfo ? {
              room_name: roomInfo.roomBasicInfo?.roomName,
              plan_name: roomInfo.dailyCharge?.planName,
              plan_id: roomInfo.dailyCharge?.planId,
              price: roomInfo.dailyCharge?.total,
              original_price: roomInfo.dailyCharge?.rakutenCharge,
              remaining_rooms: roomInfo.roomBasicInfo?.maxOccupancy,
            } : null,
            availability_status: roomInfo ? 'available' : 'unavailable',
            thumbnail_url: hotelInfo.hotelThumbnailUrl,
            special_url: hotelInfo.hotelSpecialUrl,
          },
        };

      } catch (error) {
        retryCount++;
        
        if (error.response?.status === 429) {
          console.warn(`レート制限 - 再試行 ${retryCount}/${maxRetries}`);
          await this.waitInterval(5000 * retryCount);
          continue;
        }
        
        if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
          console.warn(`ネットワークエラー - 再試行 ${retryCount}/${maxRetries}: ${error.message}`);
          await this.waitInterval(2000 * retryCount);
          continue;
        }
        
        if (retryCount >= maxRetries) {
          console.error(`API呼び出し失敗 - 最大試行回数に達しました: ${error.message}`);
          return {
            success: false,
            error: `API呼び出し失敗 (${retryCount}回試行): ${error.message}`,
          };
        }
        
        await this.waitInterval(1000 * retryCount);
      }
    }
    
    return {
      success: false,
      error: '最大試行回数に達しました',
    };
  }

  /**
   * 価格履歴保存
   */
  async savePriceHistory(hotelNo, hotelData, checkinDate, checkoutDate, adultNum) {
    const roomInfo = hotelData.room_info;
    
    const historyData = {
      hotel_no: hotelNo,
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
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      adult_num: adultNum,
    };

    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const { error } = await supabase
          .from('price_history_15min')
          .insert(historyData);

        if (error) {
          throw new Error(`価格履歴保存エラー: ${error.message}`);
        }
        
        break;
      } catch (error) {
        retryCount++;
        
        if (error.message.includes('connection') || error.message.includes('timeout')) {
          console.warn(`DB接続エラー - 再試行 ${retryCount}/${maxRetries}: ${error.message}`);
          await this.waitInterval(1000 * retryCount);
          continue;
        }
        
        if (retryCount >= maxRetries) {
          throw new Error(`価格履歴保存失敗 (${retryCount}回試行): ${error.message}`);
        }
        
        await this.waitInterval(500 * retryCount);
      }
    }

    // ホテル基本情報も更新
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
        hotel_thumbnail_url: hotelData.thumbnail_url,
        rakuten_travel_url: hotelData.special_url,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.warn('ホテル情報更新警告:', error.message);
    }
  }

  /**
   * 価格変動検知
   */
  async detectPriceChanges(hotelNo, checkinDate, checkoutDate, adultNum, currentData) {
    const roomInfo = currentData.room_info;
    const currentPrice = roomInfo?.price || currentData.min_charge;

    // 価格変動検知関数呼び出し
    const { data: changeData, error } = await supabase
      .rpc('detect_price_change', {
        p_hotel_no: hotelNo,
        p_checkin_date: checkinDate,
        p_checkout_date: checkoutDate,
        p_adult_num: adultNum,
        p_current_price: currentPrice,
      });

    if (error) {
      throw new Error(`価格変動検知エラー: ${error.message}`);
    }

    const changeResult = changeData?.[0];
    if (!changeResult?.has_change) {
      return { hasAlerts: false, alerts: [] };
    }

    // アクティブなウォッチリスト取得
    const { data: watchlists, error: watchlistError } = await supabase
      .from('active_price_monitors')
      .select('*')
      .eq('hotel_no', hotelNo)
      .eq('checkin_date', checkinDate)
      .eq('checkout_date', checkoutDate);

    if (watchlistError) {
      throw new Error(`ウォッチリスト取得エラー: ${watchlistError.message}`);
    }

    const alerts = [];
    
    for (const watchlist of watchlists || []) {
      const alertConditions = watchlist.alert_conditions || {};
      
      // 価格下落アラート判定
      if (this.shouldSendPriceDropAlert(watchlist, changeResult, alertConditions)) {
        alerts.push({
          type: 'price_drop',
          watchlist,
          changeData: changeResult,
          currentData,
        });
      }

      // 新規空室アラート判定
      if (this.shouldSendAvailabilityAlert(watchlist, currentData, alertConditions)) {
        alerts.push({
          type: 'new_availability',
          watchlist,
          currentData,
        });
      }
    }

    return { hasAlerts: alerts.length > 0, alerts };
  }

  /**
   * 価格下落アラート判定
   */
  shouldSendPriceDropAlert(watchlist, changeData, conditions) {
    if (!conditions.price_drop) return false;
    
    const priceDrop = changeData.price_difference;
    const dropPercentage = changeData.change_percentage;
    const minDropAmount = conditions.price_drop_threshold || 1000;
    const minDropPercentage = conditions.price_drop_percentage || 10;
    
    return priceDrop >= minDropAmount && dropPercentage >= minDropPercentage;
  }

  /**
   * 空室アラート判定
   */
  shouldSendAvailabilityAlert(watchlist, currentData, conditions) {
    if (!conditions.new_availability) return false;
    
    return currentData.availability_status === 'available';
  }

  /**
   * アラート送信
   */
  async sendPriceAlerts(alerts) {
    let sentCount = 0;

    for (const alert of alerts) {
      try {
        // 通知制限チェック
        const canSend = await this.checkNotificationLimits(alert.watchlist.user_id);
        if (!canSend) continue;

        // アラート記録
        const alertRecord = await this.recordAlert(alert);

        // メール送信
        await this.sendAlertEmail(alert, alertRecord.id);
        
        sentCount++;
        
        // 送信間隔調整
        await this.waitInterval(1000);

      } catch (error) {
        console.error('アラート送信エラー:', error.message);
      }
    }

    return sentCount;
  }

  /**
   * アラート記録
   */
  async recordAlert(alert) {
    const alertData = {
      watchlist_id: alert.watchlist.id,
      hotel_no: alert.watchlist.hotel_no,
      alert_type: alert.type,
      previous_price: alert.changeData?.previous_price || null,
      current_price: alert.changeData?.current_price || alert.currentData.min_charge,
      price_difference: alert.changeData?.price_difference || null,
      price_drop_percentage: alert.changeData?.change_percentage || null,
      room_info: alert.currentData.room_info || {},
    };

    const { data, error } = await supabase
      .from('price_alerts')
      .insert(alertData)
      .select()
      .single();

    if (error) {
      throw new Error(`アラート記録エラー: ${error.message}`);
    }

    return data;
  }

  /**
   * アラートメール送信
   */
  async sendAlertEmail(alert, alertId) {
    const { watchlist, currentData, changeData } = alert;
    
    const emailData = {
      to: watchlist.user_email,
      subject: `🔥 価格下落アラート - ${watchlist.hotel_name}`,
      type: alert.type,
      data: {
        user_name: watchlist.user_name,
        hotel_name: watchlist.hotel_name,
        checkin_date: watchlist.checkin_date,
        checkout_date: watchlist.checkout_date,
        previous_price: changeData?.previous_price,
        current_price: changeData?.current_price || currentData.min_charge,
        price_drop: changeData?.price_difference,
        drop_percentage: changeData?.change_percentage,
        room_info: currentData.room_info,
        booking_url: currentData.special_url || `https://travel.rakuten.co.jp/HOTEL/${watchlist.hotel_no}/`,
      },
    };

    await emailAlertsService.sendAlert(emailData);

    // 通知ログ記録
    await this.recordNotificationLog(watchlist.user_id, watchlist.id, alert.type, emailData);

    // アラート送信フラグ更新
    await supabase
      .from('price_alerts')
      .update({ 
        notification_sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', alertId);
  }

  /**
   * 通知制限チェック
   */
  async checkNotificationLimits(userId) {
    // 1日の通知制限（10件まで）
    const { data, error } = await supabase
      .from('realtime_notifications')
      .select('count(*)')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) return true; // エラー時は送信許可

    const todayCount = data?.[0]?.count || 0;
    return todayCount < 10;
  }

  /**
   * 通知ログ記録
   */
  async recordNotificationLog(userId, watchlistId, notificationType, emailData) {
    const { error } = await supabase
      .from('realtime_notifications')
      .insert({
        user_id: userId,
        watchlist_id: watchlistId,
        notification_type: notificationType,
        hotel_no: emailData.data.hotel_name,
        hotel_name: emailData.data.hotel_name,
        alert_data: emailData.data,
        email_subject: emailData.subject,
        email_sent: true,
        sent_at: new Date().toISOString(),
      });

    if (error) {
      console.warn('通知ログ記録警告:', error.message);
    }
  }

  /**
   * エラー記録
   */
  async recordError(hotelNo, checkinDate, checkoutDate, adultNum, errorMessage) {
    const { error } = await supabase
      .from('monitor_queue_15min')
      .upsert({
        hotel_no: hotelNo,
        checkin_date: checkinDate,
        checkout_date: checkoutDate,
        adult_num: adultNum,
        status: 'failed',
        error_count: 1,
        last_error: errorMessage,
        next_check_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30分後に再試行
      });

    if (error) {
      console.warn('エラー記録警告:', error.message);
    }
  }

  /**
   * 待機
   */
  async waitInterval(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 監視停止
   */
  stop() {
    this.monitoringActive = false;
    console.log('⏹️  リアルタイム価格監視停止');
  }
}

// CLIから実行された場合
if (require.main === module) {
  const monitor = new RealtimePriceMonitor();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 監視停止シグナル受信');
    monitor.stop();
    process.exit(0);
  });

  // 監視開始
  monitor.startMonitoring()
    .catch(error => {
      console.error('💥 監視システムエラー:', error);
      process.exit(1);
    });
}

module.exports = RealtimePriceMonitor;