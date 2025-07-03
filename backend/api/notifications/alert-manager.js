const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const emailAlertsService = require('../../services/email-alerts.service');
const SentryService = require('../../services/sentry.service');

// Initialize Supabase client with Supavisor URL (IPv6 compliance)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/notifications/check-alerts
 * Manual trigger for checking all active alerts
 */
router.post('/check-alerts', async (req, res) => {
  try {
    SentryService.addBreadcrumb('Alert check started', 'alert_system');
    
    const result = await checkAllAlerts();
    
    res.json({
      success: true,
      message: 'Alert check completed',
      stats: result,
    });
  } catch (error) {
    console.error('Alert check error:', error);
    SentryService.captureException(error);
    res.status(500).json({
      success: false,
      error: 'Alert check failed',
    });
  }
});

/**
 * GET /api/notifications/history/:userId
 * Get notification history for a user
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, type } = req.query;

    let query = supabase
      .from('demo_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('notification_type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      notifications: data,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: data.length,
      },
    });
  } catch (error) {
    console.error('Notification history error:', error);
    SentryService.logDatabaseError(error, 'select', 'demo_notifications');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification history',
    });
  }
});

/**
 * PUT /api/notifications/settings/:userId
 * Update user alert settings
 */
router.put('/settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;

    const { data, error } = await supabase
      .from('alert_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      settings: data,
    });
  } catch (error) {
    console.error('Settings update error:', error);
    SentryService.logDatabaseError(error, 'upsert', 'alert_settings');
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    });
  }
});

/**
 * POST /api/notifications/test-email
 * Send test email (development only)
 */
router.post('/test-email', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test emails not allowed in production',
    });
  }

  try {
    const { email, type = 'price_drop' } = req.body;

    const testData = {
      user: { id: 'test-user', email, name: 'テストユーザー' },
      watchlist: {
        id: 'test-watchlist',
        hotel_id: 'TEST001',
        check_in_date: '2025-07-15',
        check_out_date: '2025-07-16',
        guests_count: 2,
      },
      hotelData: {
        hotel_id: 'TEST001',
        hotel_name: 'テストホテル東京',
        area: 'テストエリア',
        current_price: 35000,
        availability: 'available',
      },
      priceInfo: {
        previous_price: 42000,
        current_price: 35000,
        drop_amount: 7000,
        drop_percentage: 17,
      },
    };

    let result;
    if (type === 'price_drop') {
      result = await emailAlertsService.sendPriceDropAlert(testData);
    } else if (type === 'availability') {
      result = await emailAlertsService.sendAvailabilityAlert({
        ...testData,
        availabilityInfo: {
          status_message: 'テスト空室アラート',
          rooms_available: 2,
        },
      });
    }

    res.json({
      success: true,
      message: 'Test email sent',
      result,
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
    });
  }
});

/**
 * Check all active alerts (main alert processing function)
 */
async function checkAllAlerts() {
  const stats = {
    watchlistChecked: 0,
    priceAlertsSent: 0,
    availabilityAlertsSent: 0,
    errors: 0,
  };

  try {
    // Get all active watchlist items with user and settings
    const { data: activeWatchlist, error } = await supabase
      .from('active_watchlist')
      .select('*');

    if (error) {
      throw error;
    }

    stats.watchlistChecked = activeWatchlist.length;

    // Process each watchlist item
    for (const watchlistItem of activeWatchlist) {
      try {
        await processWatchlistItem(watchlistItem, stats);
      } catch (error) {
        console.error(`Error processing watchlist ${watchlistItem.id}:`, error);
        stats.errors++;
        SentryService.captureException(error);
      }
    }

    // Clean up old check queue entries
    await cleanupCheckQueue();

    return stats;
  } catch (error) {
    console.error('Check alerts error:', error);
    SentryService.captureException(error);
    throw error;
  }
}

/**
 * Process individual watchlist item
 */
async function processWatchlistItem(watchlistItem, stats) {
  // Add to check queue if not already scheduled
  await addToCheckQueue(watchlistItem);

  // For demo mode, simulate hotel data checking
  const hotelData = await simulateHotelDataCheck(watchlistItem);
  
  if (!hotelData) {
    return;
  }

  // Get price history for comparison
  const priceHistory = await getPriceHistory(watchlistItem);
  
  // Check for price drops
  if (shouldSendPriceAlert(watchlistItem, hotelData, priceHistory)) {
    await sendPriceDropAlert(watchlistItem, hotelData, priceHistory);
    stats.priceAlertsSent++;
  }

  // Check for availability changes
  if (shouldSendAvailabilityAlert(watchlistItem, hotelData)) {
    await sendAvailabilityAlert(watchlistItem, hotelData);
    stats.availabilityAlertsSent++;
  }

  // Update price history
  await updatePriceHistory(watchlistItem, hotelData);
}

/**
 * Add watchlist item to check queue
 */
async function addToCheckQueue(watchlistItem) {
  const { error } = await supabase
    .from('hotel_check_queue')
    .upsert({
      hotel_id: watchlistItem.hotel_id,
      check_in_date: watchlistItem.check_in_date,
      check_out_date: watchlistItem.check_out_date,
      guests_count: watchlistItem.guests_count,
      priority: 1,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    }, {
      onConflict: 'hotel_id,check_in_date,check_out_date,guests_count',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('Queue add error:', error);
  }
}

/**
 * Simulate hotel data check (for demo mode)
 * In production, this would call actual Rakuten API
 */
async function simulateHotelDataCheck(watchlistItem) {
  // Simulate API response with random price variations
  const basePrice = Math.floor(Math.random() * 50000) + 20000;
  const priceVariation = Math.floor(Math.random() * 10000) - 5000;
  const currentPrice = Math.max(basePrice + priceVariation, 15000);
  
  const availabilityOptions = ['available', 'limited', 'unavailable'];
  const availability = availabilityOptions[Math.floor(Math.random() * availabilityOptions.length)];

  // Skip if unavailable
  if (availability === 'unavailable') {
    return null;
  }

  return {
    hotel_id: watchlistItem.hotel_id,
    hotel_name: watchlistItem.hotel_name,
    area: watchlistItem.area,
    current_price: currentPrice,
    availability,
    rooms_available: availability === 'limited' ? Math.floor(Math.random() * 3) + 1 : 5,
  };
}

/**
 * Get price history for comparison
 */
async function getPriceHistory(watchlistItem) {
  const { data, error } = await supabase
    .from('hotel_price_history')
    .select('*')
    .eq('hotel_id', watchlistItem.hotel_id)
    .eq('check_in_date', watchlistItem.check_in_date)
    .eq('check_out_date', watchlistItem.check_out_date)
    .eq('guests_count', watchlistItem.guests_count)
    .order('check_timestamp', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Price history error:', error);
    return null;
  }

  return data[0] || null;
}

/**
 * Check if price alert should be sent
 */
function shouldSendPriceAlert(watchlistItem, hotelData, priceHistory) {
  if (!watchlistItem.alert_price_drop || !priceHistory) {
    return false;
  }

  const priceDrop = priceHistory.current_price - hotelData.current_price;
  const dropPercentage = (priceDrop / priceHistory.current_price) * 100;

  // Check thresholds
  const thresholdAmount = watchlistItem.price_drop_threshold || 1000;
  const thresholdPercentage = watchlistItem.price_drop_percentage || 10;

  return priceDrop >= thresholdAmount && dropPercentage >= thresholdPercentage;
}

/**
 * Check if availability alert should be sent
 */
function shouldSendAvailabilityAlert(watchlistItem, hotelData) {
  return watchlistItem.alert_availability && hotelData.availability === 'limited';
}

/**
 * Send price drop alert
 */
async function sendPriceDropAlert(watchlistItem, hotelData, priceHistory) {
  const priceInfo = {
    previous_price: priceHistory.current_price,
    current_price: hotelData.current_price,
    drop_amount: priceHistory.current_price - hotelData.current_price,
    drop_percentage: Math.round(((priceHistory.current_price - hotelData.current_price) / priceHistory.current_price) * 100),
  };

  await emailAlertsService.sendPriceDropAlert({
    user: {
      id: watchlistItem.user_id,
      email: watchlistItem.email,
      name: watchlistItem.user_name,
    },
    watchlist: watchlistItem,
    hotelData,
    priceInfo,
  });
}

/**
 * Send availability alert
 */
async function sendAvailabilityAlert(watchlistItem, hotelData) {
  const availabilityInfo = {
    status_message: hotelData.availability === 'limited' ? '残り僅か' : '空室あり',
    rooms_available: hotelData.rooms_available,
  };

  await emailAlertsService.sendAvailabilityAlert({
    user: {
      id: watchlistItem.user_id,
      email: watchlistItem.email,
      name: watchlistItem.user_name,
    },
    watchlist: watchlistItem,
    hotelData,
    availabilityInfo,
  });
}

/**
 * Update price history
 */
async function updatePriceHistory(watchlistItem, hotelData) {
  const { error } = await supabase
    .from('hotel_price_history')
    .insert({
      hotel_id: watchlistItem.hotel_id,
      hotel_name: watchlistItem.hotel_name,
      area: watchlistItem.area,
      check_in_date: watchlistItem.check_in_date,
      check_out_date: watchlistItem.check_out_date,
      guests_count: watchlistItem.guests_count,
      current_price: hotelData.current_price,
      availability_status: hotelData.availability,
      check_timestamp: new Date().toISOString(),
    });

  if (error) {
    console.error('Price history update error:', error);
  }
}

/**
 * Clean up old check queue entries
 */
async function cleanupCheckQueue() {
  const { error } = await supabase
    .from('hotel_check_queue')
    .delete()
    .lt('scheduled_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    console.error('Queue cleanup error:', error);
  }
}

module.exports = router;