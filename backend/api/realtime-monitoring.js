/**
 * リアルタイム監視API
 * Worker3: 15分間隔価格監視・即時通知担当
 * Created: 2025-07-02
 */

const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const supabase = require('../services/supabase-client');
const RealtimeScheduler = require('../cron/realtime-scheduler');

const router = express.Router();

// スケジューラーインスタンス（シングルトン）
let schedulerInstance = null;

/**
 * ウォッチリスト追加/更新
 */
router.post('/watchlist', requireAuth, async (req, res) => {
  try {
    const {
      hotel_no,
      hotel_name,
      target_price,
      max_acceptable_price,
      checkin_date,
      checkout_date,
      adult_num = 2,
      alert_conditions = {
        price_drop: true,
        price_drop_threshold: 1000,
        price_drop_percentage: 10,
        new_availability: true,
        last_room_alert: true,
        special_plan_alert: false,
        daily_summary: false
      }
    } = req.body;

    // 入力検証
    if (!hotel_no || !hotel_name || !checkin_date || !checkout_date) {
      return res.status(400).json({
        success: false,
        error: 'ホテル番号、ホテル名、チェックイン日、チェックアウト日は必須です',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 型と値の検証
    if (typeof hotel_no !== 'string' || typeof hotel_name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'ホテル番号とホテル名は文字列である必要があります',
        code: 'INVALID_DATA_TYPE'
      });
    }

    if (target_price && (typeof target_price !== 'number' || target_price <= 0)) {
      return res.status(400).json({
        success: false,
        error: '目標価格は正の数値である必要があります',
        code: 'INVALID_TARGET_PRICE'
      });
    }

    if (adult_num && (typeof adult_num !== 'number' || adult_num < 1 || adult_num > 10)) {
      return res.status(400).json({
        success: false,
        error: '大人数は1-10の範囲で指定してください',
        code: 'INVALID_ADULT_NUM'
      });
    }

    // 日付検証
    const checkinDate = new Date(checkin_date);
    const checkoutDate = new Date(checkout_date);
    const today = new Date();

    if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: '有効な日付形式を指定してください',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    if (checkinDate <= today) {
      return res.status(400).json({
        success: false,
        error: 'チェックイン日は明日以降を指定してください',
        code: 'INVALID_CHECKIN_DATE'
      });
    }

    if (checkoutDate <= checkinDate) {
      return res.status(400).json({
        success: false,
        error: 'チェックアウト日はチェックイン日より後を指定してください',
        code: 'INVALID_CHECKOUT_DATE'
      });
    }

    // 最大監視期間チェック (90日間)
    const maxMonitoringDays = 90;
    const daysDiff = Math.ceil((checkoutDate - today) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxMonitoringDays) {
      return res.status(400).json({
        success: false,
        error: `監視期間は${maxMonitoringDays}日以内に設定してください`,
        code: 'MONITORING_PERIOD_TOO_LONG'
      });
    }

    // ユーザーの監視制限チェック
    const { data: existingWatchlists, error: countError } = await supabase
      .from('watchlist_extended')
      .select('count(*)', { count: 'exact' })
      .eq('user_id', req.user.id)
      .eq('is_active', true);

    if (countError) {
      throw new Error(`監視制限チェックエラー: ${countError.message}`);
    }

    const maxWatchlistsPerUser = 20;
    if (existingWatchlists.count >= maxWatchlistsPerUser) {
      return res.status(400).json({
        success: false,
        error: `ウォッチリストは最大${maxWatchlistsPerUser}件まで追加できます`,
        code: 'WATCHLIST_LIMIT_EXCEEDED'
      });
    }

    // ウォッチリスト追加
    const { data, error } = await supabase
      .from('watchlist_extended')
      .insert({
        user_id: req.user.id,
        hotel_no,
        hotel_name,
        target_price,
        max_acceptable_price,
        checkin_date,
        checkout_date,
        adult_num,
        alert_conditions,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // 監視キューに追加
    await supabase
      .from('monitor_queue_15min')
      .upsert({
        hotel_no,
        checkin_date,
        checkout_date,
        adult_num,
        priority: 1,
        status: 'pending',
        next_check_at: new Date().toISOString(),
      });

    res.json({
      success: true,
      data,
      message: 'ウォッチリストに追加しました。15分以内に価格監視を開始します。',
    });

  } catch (error) {
    console.error('ウォッチリスト追加エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * ウォッチリスト一覧取得
 */
router.get('/watchlist', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('watchlist_extended')
      .select(`
        *,
        price_alerts!inner(
          id,
          alert_type,
          current_price,
          price_difference,
          created_at
        )
      `)
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('ウォッチリスト取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ウォッチリスト削除
 */
router.delete('/watchlist/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('watchlist_extended')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      message: 'ウォッチリストから削除しました',
    });

  } catch (error) {
    console.error('ウォッチリスト削除エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 価格履歴取得
 */
router.get('/price-history/:hotel_no', optionalAuth, async (req, res) => {
  try {
    const { hotel_no } = req.params;
    const { 
      checkin_date, 
      checkout_date, 
      adult_num = 2,
      hours = 24 
    } = req.query;

    if (!checkin_date || !checkout_date) {
      return res.status(400).json({
        success: false,
        error: 'チェックイン日、チェックアウト日は必須です',
      });
    }

    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('price_history_15min')
      .select('*')
      .eq('hotel_no', hotel_no)
      .eq('checkin_date', checkin_date)
      .eq('checkout_date', checkout_date)
      .eq('adult_num', adult_num)
      .gte('checked_at', sinceTime.toISOString())
      .order('checked_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // 価格変動統計計算
    const prices = data.map(record => record.price).filter(price => price > 0);
    const stats = {
      min_price: prices.length > 0 ? Math.min(...prices) : null,
      max_price: prices.length > 0 ? Math.max(...prices) : null,
      current_price: prices.length > 0 ? prices[prices.length - 1] : null,
      price_changes: data.length > 1 ? data.length - 1 : 0,
      last_updated: data.length > 0 ? data[data.length - 1].checked_at : null,
    };

    res.json({
      success: true,
      data,
      stats,
    });

  } catch (error) {
    console.error('価格履歴取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 最新価格変動取得
 */
router.get('/price-changes', optionalAuth, async (req, res) => {
  try {
    const { hours = 1 } = req.query;
    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('recent_price_changes')
      .select('*')
      .gte('checked_at', sinceTime.toISOString())
      .order('drop_percentage', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('価格変動取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * アラート履歴取得
 */
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('price_alerts')
      .select(`
        *,
        watchlist_extended!inner(
          hotel_name,
          checkin_date,
          checkout_date
        )
      `)
      .eq('watchlist_extended.user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('アラート履歴取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 監視システム状態取得
 */
router.get('/system/status', async (req, res) => {
  try {
    // アクティブな監視対象数
    const { data: activeMonitors, error: monitorsError } = await supabase
      .from('watchlist_extended')
      .select('count(*)')
      .eq('is_active', true)
      .single();

    // 本日のアラート数
    const today = new Date().toISOString().split('T')[0];
    const { data: todayAlerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select('count(*)')
      .gte('created_at', `${today}T00:00:00Z`)
      .single();

    // 最新の価格チェック時刻
    const { data: lastCheck, error: lastCheckError } = await supabase
      .from('price_history_15min')
      .select('checked_at')
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    // スケジューラー状態
    const schedulerStatus = schedulerInstance ? schedulerInstance.getStatus() : {
      isRunning: false,
      jobs: [],
    };

    const status = {
      active_monitors: activeMonitors?.count || 0,
      todays_alerts: todayAlerts?.count || 0,
      last_check: lastCheck?.checked_at || null,
      scheduler: schedulerStatus,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: status,
    });

  } catch (error) {
    console.error('システム状態取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 手動価格チェック実行
 */
router.post('/system/manual-check', requireAuth, async (req, res) => {
  try {
    const { hotel_no, checkin_date, checkout_date, adult_num = 2 } = req.body;

    if (!hotel_no || !checkin_date || !checkout_date) {
      return res.status(400).json({
        success: false,
        error: 'ホテル番号、チェックイン日、チェックアウト日は必須です',
      });
    }

    // 手動チェック用の一時的な監視ターゲット作成
    const RealtimePriceMonitor = require('../scripts/realtime-price-monitor');
    const monitor = new RealtimePriceMonitor();

    const target = {
      hotel_no,
      checkin_date,
      checkout_date,
      adult_num,
      priority: 1,
    };

    const alertsSent = await monitor.checkHotelPricing(target);

    res.json({
      success: true,
      message: '手動価格チェックを実行しました',
      alerts_sent: alertsSent,
    });

  } catch (error) {
    console.error('手動価格チェックエラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * スケジューラー制御
 */
router.post('/system/scheduler/:action', async (req, res) => {
  try {
    const { action } = req.params;

    switch (action) {
      case 'start':
        if (!schedulerInstance) {
          schedulerInstance = new RealtimeScheduler();
        }
        schedulerInstance.start();
        
        res.json({
          success: true,
          message: 'スケジューラーを開始しました',
        });
        break;

      case 'stop':
        if (schedulerInstance) {
          schedulerInstance.stop();
          schedulerInstance = null;
        }
        
        res.json({
          success: true,
          message: 'スケジューラーを停止しました',
        });
        break;

      case 'restart':
        if (schedulerInstance) {
          schedulerInstance.stop();
        }
        schedulerInstance = new RealtimeScheduler();
        schedulerInstance.start();
        
        res.json({
          success: true,
          message: 'スケジューラーを再起動しました',
        });
        break;

      default:
        res.status(400).json({
          success: false,
          error: '無効なアクション: start, stop, restart のいずれかを指定してください',
        });
    }

  } catch (error) {
    console.error('スケジューラー制御エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 通知履歴取得
 */
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('realtime_notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('通知履歴取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;