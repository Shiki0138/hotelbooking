const cron = require('node-cron');
const hotelMonitorService = require('../services/hotel-monitor.service');

class HotelMonitorCron {
  constructor() {
    this.monitoringJob = null;
    this.notificationJob = null;
  }

  /**
   * Initialize all cron jobs
   */
  init() {
    console.log('[HotelMonitorCron] Initializing cron jobs...');
    
    // Monitor watchlist hotels every 5 minutes
    this.monitoringJob = cron.schedule('*/5 * * * *', async () => {
      console.log('[HotelMonitorCron] Running hotel monitoring job...');
      try {
        await hotelMonitorService.monitorWatchlistHotels();
      } catch (error) {
        console.error('[HotelMonitorCron] Error in monitoring job:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Tokyo'
    });

    // Process notification queue every minute
    this.notificationJob = cron.schedule('* * * * *', async () => {
      console.log('[HotelMonitorCron] Processing notification queue...');
      try {
        await hotelMonitorService.processPendingNotifications();
      } catch (error) {
        console.error('[HotelMonitorCron] Error processing notifications:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Tokyo'
    });

    console.log('[HotelMonitorCron] Cron jobs initialized successfully');
    
    // Run initial monitoring on startup
    this.runInitialMonitoring();
  }

  /**
   * Run initial monitoring on startup
   */
  async runInitialMonitoring() {
    console.log('[HotelMonitorCron] Running initial monitoring check...');
    try {
      await hotelMonitorService.monitorWatchlistHotels();
      await hotelMonitorService.processPendingNotifications();
    } catch (error) {
      console.error('[HotelMonitorCron] Error in initial monitoring:', error);
    }
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    console.log('[HotelMonitorCron] Stopping cron jobs...');
    
    if (this.monitoringJob) {
      this.monitoringJob.stop();
      this.monitoringJob = null;
    }
    
    if (this.notificationJob) {
      this.notificationJob.stop();
      this.notificationJob = null;
    }
    
    console.log('[HotelMonitorCron] Cron jobs stopped');
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      monitoring: {
        running: this.monitoringJob ? this.monitoringJob.running : false,
        schedule: '*/5 * * * * (every 5 minutes)'
      },
      notifications: {
        running: this.notificationJob ? this.notificationJob.running : false,
        schedule: '* * * * * (every minute)'
      }
    };
  }
}

// Export singleton instance
const hotelMonitorCron = new HotelMonitorCron();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[HotelMonitorCron] SIGTERM received, stopping cron jobs...');
  hotelMonitorCron.stop();
});

process.on('SIGINT', () => {
  console.log('[HotelMonitorCron] SIGINT received, stopping cron jobs...');
  hotelMonitorCron.stop();
  process.exit(0);
});

module.exports = hotelMonitorCron;