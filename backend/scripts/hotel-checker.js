#!/usr/bin/env node

/**
 * Hotel Price & Availability Checker
 * Worker3: Phase3 - Alert Logic Implementation
 * 
 * This script runs periodically to check hotel prices and availability
 * for all active watchlist items and sends alerts when conditions are met.
 */

const { createClient } = require('@supabase/supabase-js');
const emailAlertsService = require('../services/email-alerts.service');
const SentryService = require('../services/sentry.service');

// Initialize Sentry for background job monitoring
SentryService.init();

// Initialize Supabase client with Supavisor URL (IPv6 compliance)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class HotelChecker {
  constructor() {
    this.isRunning = false;
    this.stats = {
      totalChecked: 0,
      priceAlertsSent: 0,
      availabilityAlertsSent: 0,
      errors: 0,
      startTime: null,
      endTime: null,
    };
  }

  /**
   * Main entry point for hotel checking
   */
  async run() {
    if (this.isRunning) {
      console.log('Hotel checker is already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.stats.startTime = new Date();
    
    console.log('🏨 Starting hotel price and availability check...');
    
    try {
      SentryService.addBreadcrumb('Hotel check started', 'batch_job');
      
      await this.checkAllWatchlistItems();
      await this.cleanupOldData();
      
      this.stats.endTime = new Date();
      const duration = this.stats.endTime - this.stats.startTime;
      
      console.log('✅ Hotel check completed successfully');
      console.log(`📊 Stats: ${this.stats.totalChecked} checked, ${this.stats.priceAlertsSent} price alerts, ${this.stats.availabilityAlertsSent} availability alerts, ${this.stats.errors} errors`);
      console.log(`⏱️  Duration: ${Math.round(duration / 1000)}s`);

      // Log success to Sentry
      SentryService.captureMessage('Hotel check completed', 'info', {
        stats: this.stats,
        duration: duration,
      });

    } catch (error) {
      console.error('❌ Hotel check failed:', error);
      SentryService.captureException(error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check all active watchlist items
   */
  async checkAllWatchlistItems() {
    // Get all active watchlist items with user data
    const { data: watchlistItems, error } = await supabase
      .from('active_watchlist')
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch watchlist: ${error.message}`);
    }

    console.log(`📋 Found ${watchlistItems.length} active watchlist items`);

    // Process items in batches to avoid overwhelming APIs
    const batchSize = 5;
    for (let i = 0; i < watchlistItems.length; i += batchSize) {
      const batch = watchlistItems.slice(i, i + batchSize);
      await Promise.all(batch.map(item => this.processWatchlistItem(item)));
      
      // Small delay between batches
      if (i + batchSize < watchlistItems.length) {
        await this.sleep(1000);
      }
    }
  }

  /**
   * Process individual watchlist item
   */
  async processWatchlistItem(watchlistItem) {
    try {
      this.stats.totalChecked++;
      
      console.log(`🔍 Checking: ${watchlistItem.hotel_name} for ${watchlistItem.user_name}`);

      // Get current hotel data (simulate for demo mode)
      const currentHotelData = await this.getCurrentHotelData(watchlistItem);
      
      if (!currentHotelData) {
        console.log(`⚠️  No data available for ${watchlistItem.hotel_name}`);
        return;
      }

      // Get price history for comparison
      const lastPriceData = await this.getLastPriceData(watchlistItem);

      // Check for price drops
      if (await this.shouldSendPriceAlert(watchlistItem, currentHotelData, lastPriceData)) {
        await this.sendPriceAlert(watchlistItem, currentHotelData, lastPriceData);
        this.stats.priceAlertsSent++;
      }

      // Check for availability changes
      if (await this.shouldSendAvailabilityAlert(watchlistItem, currentHotelData, lastPriceData)) {
        await this.sendAvailabilityAlert(watchlistItem, currentHotelData);
        this.stats.availabilityAlertsSent++;
      }

      // Update price history
      await this.updatePriceHistory(watchlistItem, currentHotelData, lastPriceData);

    } catch (error) {
      console.error(`❌ Error processing ${watchlistItem.hotel_name}:`, error);
      this.stats.errors++;
      
      SentryService.withScope((scope) => {
        scope.setTag('operation', 'watchlist_check');
        scope.setContext('watchlist_item', {
          id: watchlistItem.id,
          hotel_id: watchlistItem.hotel_id,
          user_id: watchlistItem.user_id,
        });
        SentryService.captureException(error);
      });
    }
  }

  /**
   * Get current hotel data (simulated for demo mode)
   * In production, this would call Rakuten Travel API
   */
  async getCurrentHotelData(watchlistItem) {
    // Simulate API call delay
    await this.sleep(200 + Math.random() * 300);

    // Get last known price for realistic simulation
    const lastPrice = await this.getLastKnownPrice(watchlistItem);
    const basePrice = lastPrice || (Math.floor(Math.random() * 50000) + 20000);

    // Simulate price variations (-20% to +15%)
    const variation = (Math.random() - 0.6) * 0.35;
    const currentPrice = Math.max(Math.floor(basePrice * (1 + variation)), 10000);

    // Simulate availability
    const availabilityOptions = ['available', 'limited', 'unavailable'];
    const weights = [0.6, 0.3, 0.1]; // 60% available, 30% limited, 10% unavailable
    const availability = this.weightedRandom(availabilityOptions, weights);

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
      rooms_available: availability === 'limited' ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 8) + 3,
      check_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get last price data for comparison
   */
  async getLastPriceData(watchlistItem) {
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
      console.error('Error fetching price history:', error);
      return null;
    }

    return data[0] || null;
  }

  /**
   * Get last known price for realistic simulation
   */
  async getLastKnownPrice(watchlistItem) {
    const lastData = await this.getLastPriceData(watchlistItem);
    return lastData ? lastData.current_price : null;
  }

  /**
   * Check if price alert should be sent
   */
  async shouldSendPriceAlert(watchlistItem, currentData, lastData) {
    // Must have price drop alerts enabled
    if (!watchlistItem.alert_price_drop) {
      return false;
    }

    // Must have previous data for comparison
    if (!lastData) {
      return false;
    }

    // Calculate price drop
    const priceDrop = lastData.current_price - currentData.current_price;
    const dropPercentage = (priceDrop / lastData.current_price) * 100;

    // Check user's thresholds
    const minDropAmount = watchlistItem.price_drop_threshold || 1000;
    const minDropPercentage = watchlistItem.price_drop_percentage || 10;

    const significantDrop = priceDrop >= minDropAmount && dropPercentage >= minDropPercentage;

    // Check if within user's price range
    const withinBudget = !watchlistItem.max_price || currentData.current_price <= watchlistItem.max_price;

    // Check rate limiting (max alerts per day)
    const dailyLimitOk = await this.checkDailyLimit(watchlistItem.user_id);

    return significantDrop && withinBudget && dailyLimitOk;
  }

  /**
   * Check if availability alert should be sent
   */
  async shouldSendAvailabilityAlert(watchlistItem, currentData, lastData) {
    // Must have availability alerts enabled
    if (!watchlistItem.alert_availability) {
      return false;
    }

    // Check if availability changed to limited
    const becameLimited = currentData.availability === 'limited' && 
                         (!lastData || lastData.availability_status !== 'limited');

    // Check rate limiting
    const dailyLimitOk = await this.checkDailyLimit(watchlistItem.user_id);

    return becameLimited && dailyLimitOk;
  }

  /**
   * Check daily alert limit for user
   */
  async checkDailyLimit(userId) {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('demo_notifications')
      .select('id')
      .eq('user_id', userId)
      .gte('sent_at', `${today}T00:00:00Z`)
      .lt('sent_at', `${today}T23:59:59Z`);

    if (error) {
      console.error('Error checking daily limit:', error);
      return true; // Allow on error
    }

    // Get user's max alerts per day setting
    const { data: settings } = await supabase
      .from('alert_settings')
      .select('max_alerts_per_day')
      .eq('user_id', userId)
      .single();

    const maxPerDay = settings?.max_alerts_per_day || 5;
    return data.length < maxPerDay;
  }

  /**
   * Send price drop alert
   */
  async sendPriceAlert(watchlistItem, currentData, lastData) {
    const priceInfo = {
      previous_price: lastData.current_price,
      current_price: currentData.current_price,
      drop_amount: lastData.current_price - currentData.current_price,
      drop_percentage: Math.round(((lastData.current_price - currentData.current_price) / lastData.current_price) * 100),
    };

    console.log(`💰 Sending price alert: ${watchlistItem.hotel_name} dropped ¥${priceInfo.drop_amount} (${priceInfo.drop_percentage}%)`);

    await emailAlertsService.sendPriceDropAlert({
      user: {
        id: watchlistItem.user_id,
        email: watchlistItem.email,
        name: watchlistItem.user_name,
      },
      watchlist: watchlistItem,
      hotelData: currentData,
      priceInfo,
    });
  }

  /**
   * Send availability alert
   */
  async sendAvailabilityAlert(watchlistItem, currentData) {
    const availabilityInfo = {
      status_message: '残り僅か',
      rooms_available: currentData.rooms_available,
    };

    console.log(`🏨 Sending availability alert: ${watchlistItem.hotel_name} - ${availabilityInfo.rooms_available} rooms left`);

    await emailAlertsService.sendAvailabilityAlert({
      user: {
        id: watchlistItem.user_id,
        email: watchlistItem.email,
        name: watchlistItem.user_name,
      },
      watchlist: watchlistItem,
      hotelData: currentData,
      availabilityInfo,
    });
  }

  /**
   * Update price history
   */
  async updatePriceHistory(watchlistItem, currentData, lastData) {
    const { error } = await supabase
      .from('hotel_price_history')
      .insert({
        hotel_id: watchlistItem.hotel_id,
        hotel_name: watchlistItem.hotel_name,
        area: watchlistItem.area,
        check_in_date: watchlistItem.check_in_date,
        check_out_date: watchlistItem.check_out_date,
        guests_count: watchlistItem.guests_count,
        current_price: currentData.current_price,
        previous_price: lastData ? lastData.current_price : null,
        availability_status: currentData.availability,
        check_timestamp: currentData.check_timestamp,
      });

    if (error) {
      console.error('Error updating price history:', error);
    }
  }

  /**
   * Clean up old data
   */
  async cleanupOldData() {
    console.log('🧹 Cleaning up old data...');

    // Clean old price history (keep 30 days)
    const { data: cleanupResult } = await supabase.rpc('cleanup_old_price_history');
    
    if (cleanupResult !== null) {
      console.log(`🗑️  Cleaned up ${cleanupResult} old price history records`);
    }

    // Clean old check queue entries
    const { error } = await supabase
      .from('hotel_check_queue')
      .delete()
      .lt('scheduled_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('Error cleaning check queue:', error);
    }
  }

  /**
   * Utility functions
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  weightedRandom(items, weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
}

// CLI execution
if (require.main === module) {
  const checker = new HotelChecker();
  
  checker.run()
    .then(() => {
      console.log('🎉 Hotel checker completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Hotel checker failed:', error);
      process.exit(1);
    });
}

module.exports = HotelChecker;