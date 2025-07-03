/**
 * 完全システム統合API
 * Worker3: プロダクションレベル完成目標
 * Created: 2025-07-02
 */

const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const supabase = require('../services/supabase-client');
const completeMonitoringService = require('../services/complete-monitoring.service');
const emailService = require('../services/realtime-email.service');

const router = express.Router();

// =========================================
// ユーザー管理API
// =========================================

/**
 * ユーザープロフィール取得
 */
router.get('/users/profile', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        phone,
        date_of_birth,
        preferred_language,
        notification_enabled,
        privacy_settings,
        subscription_tier,
        last_login_at,
        login_count,
        created_at
      `)
      .eq('id', req.user.id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('プロフィール取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ユーザープロフィール更新
 */
router.put('/users/profile', requireAuth, async (req, res) => {
  try {
    const {
      name,
      phone,
      date_of_birth,
      preferred_language,
      notification_enabled,
      privacy_settings
    } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({
        name,
        phone,
        date_of_birth,
        preferred_language,
        notification_enabled,
        privacy_settings
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data,
      message: 'プロフィールを更新しました'
    });

  } catch (error) {
    console.error('プロフィール更新エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================================
// ウォッチリスト管理API
// =========================================

/**
 * ウォッチリスト一覧取得
 */
router.get('/watchlist', requireAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'active',
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('watchlist')
      .select(`
        *,
        hotels_realtime(
          hotel_name,
          area,
          prefecture,
          min_charge,
          max_charge,
          review_average,
          hotel_thumbnail_url
        )
      `)
      .eq('user_id', req.user.id);

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data, error, count } = await query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('ウォッチリスト取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ウォッチリスト作成
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
      child_num = 0,
      room_num = 1,
      alert_conditions,
      notification_frequency = 'immediate',
      priority_level = 3,
      notes,
      expires_at
    } = req.body;

    // 入力検証
    if (!hotel_no || !hotel_name || !checkin_date || !checkout_date) {
      return res.status(400).json({
        success: false,
        error: 'ホテル番号、ホテル名、チェックイン日、チェックアウト日は必須です'
      });
    }

    // 日付検証
    const checkinDate = new Date(checkin_date);
    const checkoutDate = new Date(checkout_date);
    const today = new Date();

    if (checkinDate <= today) {
      return res.status(400).json({
        success: false,
        error: 'チェックイン日は明日以降を指定してください'
      });
    }

    if (checkoutDate <= checkinDate) {
      return res.status(400).json({
        success: false,
        error: 'チェックアウト日はチェックイン日より後を指定してください'
      });
    }

    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        user_id: req.user.id,
        hotel_no,
        hotel_name,
        target_price,
        max_acceptable_price,
        checkin_date,
        checkout_date,
        adult_num,
        child_num,
        room_num,
        alert_conditions: alert_conditions || {
          price_drop: true,
          price_drop_threshold: 1000,
          price_drop_percentage: 10,
          new_availability: true,
          last_room_alert: true,
          special_plan_alert: false,
          daily_summary: false
        },
        notification_frequency,
        priority_level,
        notes,
        expires_at
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data,
      message: 'ウォッチリストに追加しました'
    });

  } catch (error) {
    console.error('ウォッチリスト作成エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ウォッチリスト更新
 */
router.put('/watchlist/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // ユーザー所有権確認
    const { data: existing, error: existingError } = await supabase
      .from('watchlist')
      .select('user_id')
      .eq('id', id)
      .single();

    if (existingError || existing.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        error: 'ウォッチリストが見つかりません'
      });
    }

    const { data, error } = await supabase
      .from('watchlist')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data,
      message: 'ウォッチリストを更新しました'
    });

  } catch (error) {
    console.error('ウォッチリスト更新エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
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
      .from('watchlist')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      message: 'ウォッチリストから削除しました'
    });

  } catch (error) {
    console.error('ウォッチリスト削除エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================================
// 価格履歴・統計API
// =========================================

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
      hours = 168, // 1週間デフォルト
      granularity = 'hour'
    } = req.query;

    if (!checkin_date || !checkout_date) {
      return res.status(400).json({
        success: false,
        error: 'チェックイン日、チェックアウト日は必須です'
      });
    }

    const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('price_history')
      .select(`
        price,
        original_price,
        availability_status,
        room_name,
        plan_name,
        checked_at
      `)
      .eq('hotel_no', hotel_no)
      .eq('checkin_date', checkin_date)
      .eq('checkout_date', checkout_date)
      .eq('adult_num', adult_num)
      .gte('checked_at', sinceTime.toISOString())
      .order('checked_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // 価格統計計算
    const prices = data.map(record => record.price).filter(price => price > 0);
    const stats = {
      min_price: prices.length > 0 ? Math.min(...prices) : null,
      max_price: prices.length > 0 ? Math.max(...prices) : null,
      avg_price: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
      current_price: prices.length > 0 ? prices[prices.length - 1] : null,
      price_changes: data.length > 1 ? data.length - 1 : 0,
      data_points: data.length,
      last_updated: data.length > 0 ? data[data.length - 1].checked_at : null
    };

    res.json({
      success: true,
      data,
      stats
    });

  } catch (error) {
    console.error('価格履歴取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 価格統計取得（関数使用）
 */
router.get('/price-statistics/:hotel_no', optionalAuth, async (req, res) => {
  try {
    const { hotel_no } = req.params;
    const {
      checkin_date,
      checkout_date,
      days_back = 30
    } = req.query;

    if (!checkin_date || !checkout_date) {
      return res.status(400).json({
        success: false,
        error: 'チェックイン日、チェックアウト日は必須です'
      });
    }

    const { data, error } = await supabase
      .rpc('get_price_statistics', {
        p_hotel_no: hotel_no,
        p_checkin_date: checkin_date,
        p_checkout_date: checkout_date,
        p_days_back: parseInt(days_back)
      });

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data: data[0] || null
    });

  } catch (error) {
    console.error('価格統計取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================================
// 通知管理API
// =========================================

/**
 * 通知一覧取得
 */
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      read_status,
      priority_level
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id);

    if (category) {
      query = query.eq('category', category);
    }

    if (read_status === 'read') {
      query = query.not('read_at', 'is', null);
    } else if (read_status === 'unread') {
      query = query.is('read_at', null);
    }

    if (priority_level) {
      query = query.eq('priority_level', parseInt(priority_level));
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('通知取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 通知既読マーク
 */
router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      message: '通知を既読にしました'
    });

  } catch (error) {
    console.error('通知既読エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 全通知既読マーク
 */
router.put('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .is('read_at', null);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      message: '全ての通知を既読にしました'
    });

  } catch (error) {
    console.error('全通知既読エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================================
// システム監視API
// =========================================

/**
 * システム統計取得
 */
router.get('/system/stats', async (req, res) => {
  try {
    // アクティブユーザー数
    const { data: activeUsers, error: usersError } = await supabase
      .from('users')
      .select('count(*)')
      .eq('is_active', true)
      .single();

    // アクティブウォッチリスト数
    const { data: activeWatchlists, error: watchlistsError } = await supabase
      .from('watchlist')
      .select('count(*)')
      .eq('is_active', true)
      .single();

    // 本日の通知数
    const today = new Date().toISOString().split('T')[0];
    const { data: todayNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('count(*)')
      .gte('created_at', `${today}T00:00:00Z`)
      .single();

    // ホテル数
    const { data: hotelsCount, error: hotelsError } = await supabase
      .from('hotels_realtime')
      .select('count(*)')
      .eq('is_active', true)
      .single();

    // 監視サービス統計
    const monitoringStats = completeMonitoringService.getStats();

    const stats = {
      users: {
        active: activeUsers?.count || 0
      },
      watchlists: {
        active: activeWatchlists?.count || 0
      },
      notifications: {
        today: todayNotifications?.count || 0
      },
      hotels: {
        total: hotelsCount?.count || 0
      },
      monitoring: monitoringStats,
      system: {
        status: 'operational',
        last_updated: new Date().toISOString()
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('システム統計取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * システムヘルスチェック
 */
router.get('/system/health', async (req, res) => {
  try {
    const healthChecks = {
      database: false,
      monitoring_service: false,
      email_service: false
    };

    // データベース接続確認
    try {
      const { error } = await supabase
        .from('users')
        .select('count(*)')
        .limit(1);
      healthChecks.database = !error;
    } catch (error) {
      healthChecks.database = false;
    }

    // 監視サービス確認
    healthChecks.monitoring_service = completeMonitoringService.getStats().isRunning;

    // メールサービス確認
    healthChecks.email_service = !!emailService && typeof emailService.sendAlert === 'function';

    const allHealthy = Object.values(healthChecks).every(status => status === true);

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      data: {
        status: allHealthy ? 'healthy' : 'degraded',
        checks: healthChecks,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('ヘルスチェックエラー:', error);
    res.status(503).json({
      success: false,
      error: error.message
    });
  }
});

// =========================================
// 手動操作API
// =========================================

/**
 * 手動価格チェック実行
 */
router.post('/manual/price-check', requireAuth, async (req, res) => {
  try {
    const { watchlist_id } = req.body;

    if (!watchlist_id) {
      return res.status(400).json({
        success: false,
        error: 'ウォッチリストIDが必要です'
      });
    }

    // ウォッチリスト取得
    const { data: watchlist, error } = await supabase
      .from('watchlist')
      .select(`
        *,
        users!inner(id, email, name, notification_enabled)
      `)
      .eq('id', watchlist_id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !watchlist) {
      return res.status(404).json({
        success: false,
        error: 'ウォッチリストが見つかりません'
      });
    }

    // 手動チェック実行
    const alertsSent = await completeMonitoringService.checkWatchlistItem(watchlist);

    res.json({
      success: true,
      message: '手動価格チェックを実行しました',
      alerts_sent: alertsSent
    });

  } catch (error) {
    console.error('手動価格チェックエラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;