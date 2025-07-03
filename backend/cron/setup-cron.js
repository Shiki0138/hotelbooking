/**
 * Cron Job Setup for LastMinuteStay Demo Mode
 * Worker3: Alert Logic Implementation
 * 
 * Sets up scheduled tasks for hotel checking and alert processing
 */

const cron = require('node-cron');
const HotelChecker = require('../scripts/hotel-checker');
const emailAlertsService = require('../services/email-alerts.service');
const { createClient } = require('@supabase/supabase-js');
const SentryService = require('../services/sentry.service');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class CronManager {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize all cron jobs
   */
  init() {
    if (this.isInitialized) {
      console.log('Cron jobs already initialized');
      return;
    }

    console.log('🕒 Setting up cron jobs for LastMinuteStay...');

    // Main hotel checker - runs every 30 minutes
    this.setupHotelChecker();

    // Daily digest - runs every day at 9 AM JST
    this.setupDailyDigest();

    // Cleanup job - runs every day at 2 AM JST
    this.setupCleanupJob();

    // Health check - runs every 5 minutes
    this.setupHealthCheck();

    this.isInitialized = true;
    console.log('✅ All cron jobs initialized successfully');
  }

  /**
   * Setup main hotel price/availability checker
   */
  setupHotelChecker() {
    // Run every 30 minutes
    const job = cron.schedule('*/30 * * * *', async () => {
      console.log('🏨 Starting scheduled hotel check...');
      
      try {
        const checker = new HotelChecker();
        await checker.run();
        
        SentryService.addBreadcrumb('Scheduled hotel check completed', 'cron');
      } catch (error) {
        console.error('❌ Scheduled hotel check failed:', error);
        SentryService.captureException(error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    this.jobs.set('hotel_checker', job);
    console.log('📅 Hotel checker scheduled: every 30 minutes');
  }

  /**
   * Setup daily digest email sender
   */
  setupDailyDigest() {
    // Run every day at 9:00 AM JST
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('📧 Starting daily digest generation...');
      
      try {
        await this.sendDailyDigests();
        
        SentryService.addBreadcrumb('Daily digest sent', 'cron');
      } catch (error) {
        console.error('❌ Daily digest failed:', error);
        SentryService.captureException(error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    this.jobs.set('daily_digest', job);
    console.log('📅 Daily digest scheduled: 9:00 AM JST');
  }

  /**
   * Setup cleanup job for old data
   */
  setupCleanupJob() {
    // Run every day at 2:00 AM JST
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Starting data cleanup...');
      
      try {
        await this.performCleanup();
        
        SentryService.addBreadcrumb('Data cleanup completed', 'cron');
      } catch (error) {
        console.error('❌ Data cleanup failed:', error);
        SentryService.captureException(error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    this.jobs.set('cleanup', job);
    console.log('📅 Cleanup job scheduled: 2:00 AM JST');
  }

  /**
   * Setup health check job
   */
  setupHealthCheck() {
    // Run every 5 minutes
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Health check failed:', error);
        SentryService.captureException(error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    this.jobs.set('health_check', job);
    console.log('📅 Health check scheduled: every 5 minutes');
  }

  /**
   * Send daily digest emails to users
   */
  async sendDailyDigests() {
    // Get users who have daily digest enabled
    const { data: users, error } = await supabase
      .from('demo_users')
      .select(`
        *,
        alert_settings!inner(daily_digest)
      `)
      .eq('notification_enabled', true)
      .eq('alert_settings.daily_digest', true);

    if (error) {
      throw new Error(`Failed to fetch users for digest: ${error.message}`);
    }

    console.log(`📧 Sending daily digest to ${users.length} users`);

    for (const user of users) {
      try {
        // Get user's watchlist updates from last 24 hours
        const watchlistUpdates = await this.getWatchlistUpdates(user.id);
        
        // Get new deals in user's preferred areas
        const newDeals = await this.getNewDeals(user.preferred_areas);

        // Send digest if there's content
        if (watchlistUpdates.length > 0 || newDeals.length > 0) {
          await emailAlertsService.sendDailyDigest({
            user,
            watchlistUpdates,
            newDeals,
          });
          
          console.log(`✅ Daily digest sent to ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Failed to send digest to ${user.email}:`, error);
        SentryService.logEmailError(error, {
          recipient_email: user.email,
          email_type: 'daily_digest',
        });
      }
    }
  }

  /**
   * Get watchlist updates for user
   */
  async getWatchlistUpdates(userId) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data, error } = await supabase
      .from('hotel_price_history')
      .select(`
        *,
        watchlist!inner(user_id, hotel_name, area)
      `)
      .eq('watchlist.user_id', userId)
      .gte('check_timestamp', yesterday.toISOString())
      .order('check_timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching watchlist updates:', error);
      return [];
    }

    // Process data to show changes
    const updates = [];
    const hotelGroups = new Map();

    data.forEach(record => {
      const key = `${record.hotel_id}_${record.check_in_date}_${record.check_out_date}`;
      if (!hotelGroups.has(key)) {
        hotelGroups.set(key, []);
      }
      hotelGroups.get(key).push(record);
    });

    hotelGroups.forEach((records, key) => {
      if (records.length > 1) {
        const latest = records[0];
        const previous = records[records.length - 1];
        
        const priceChanged = latest.current_price !== previous.current_price;
        const availabilityChanged = latest.availability_status !== previous.availability_status;

        if (priceChanged || availabilityChanged) {
          updates.push({
            hotel_name: latest.hotel_name,
            area: latest.area,
            current_price: latest.current_price,
            price_change: priceChanged,
            availability: latest.availability_status,
            availability_change: availabilityChanged,
          });
        }
      }
    });

    return updates;
  }

  /**
   * Get new deals in user's preferred areas
   */
  async getNewDeals(preferredAreas) {
    if (!preferredAreas || preferredAreas.length === 0) {
      return [];
    }

    // For demo mode, simulate new deals
    const mockDeals = [
      {
        hotel_name: 'ザ・リッツ・カールトン東京',
        area: '六本木',
        price: 35000,
        discount: 30,
      },
      {
        hotel_name: 'マンダリン オリエンタル 東京',
        area: '日本橋',
        price: 42000,
        discount: 25,
      },
    ];

    // Filter by preferred areas
    return mockDeals.filter(deal => 
      preferredAreas.some(area => deal.area.includes(area) || area.includes(deal.area))
    );
  }

  /**
   * Perform data cleanup
   */
  async performCleanup() {
    const stats = {
      priceHistoryDeleted: 0,
      notificationsDeleted: 0,
      queueEntriesDeleted: 0,
    };

    // Clean old price history (> 30 days)
    const { data: priceCleanup } = await supabase.rpc('cleanup_old_price_history');
    stats.priceHistoryDeleted = priceCleanup || 0;

    // Clean old notifications (> 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: notifData, error: notifError } = await supabase
      .from('demo_notifications')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString());

    if (!notifError) {
      stats.notificationsDeleted = notifData?.length || 0;
    }

    // Clean old queue entries (> 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: queueData, error: queueError } = await supabase
      .from('hotel_check_queue')
      .delete()
      .lt('scheduled_at', oneDayAgo.toISOString());

    if (!queueError) {
      stats.queueEntriesDeleted = queueData?.length || 0;
    }

    console.log('🧹 Cleanup completed:', stats);
    
    SentryService.captureMessage('Data cleanup completed', 'info', {
      stats,
    });
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    const healthData = {
      timestamp: new Date().toISOString(),
      database: false,
      email: false,
      cron_jobs: this.jobs.size,
    };

    try {
      // Check database connection
      const { data, error } = await supabase
        .from('demo_users')
        .select('count(*)')
        .limit(1);
      
      healthData.database = !error;

      // Check email service (simplified)
      healthData.email = !!process.env.RESEND_API_KEY;

      // Log health status every hour (12 cycles of 5 minutes)
      const minute = new Date().getMinutes();
      if (minute % 60 === 0) {
        console.log('💚 Health check:', healthData);
      }

    } catch (error) {
      console.error('❌ Health check error:', error);
      SentryService.captureException(error);
    }
  }

  /**
   * Start all cron jobs
   */
  start() {
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`▶️  Started: ${name}`);
    });
    
    console.log('🚀 All cron jobs started');
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️  Stopped: ${name}`);
    });
    
    console.log('⏹️  All cron jobs stopped');
  }

  /**
   * Get job status
   */
  getStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        scheduled: job.scheduled,
      };
    });
    return status;
  }
}

// Export singleton instance
const cronManager = new CronManager();

// Initialize and start if this file is run directly
if (require.main === module) {
  cronManager.init();
  cronManager.start();
  
  console.log('🕒 Cron manager running...');
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📪 Shutting down cron manager...');
    cronManager.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('📪 Shutting down cron manager...');
    cronManager.stop();
    process.exit(0);
  });
}

module.exports = cronManager;