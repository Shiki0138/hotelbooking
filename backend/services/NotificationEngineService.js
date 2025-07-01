/**
 * Real-time Notification Engine
 * Orchestrates all notification channels with intelligent routing and priority handling
 */

const Redis = require('redis');
const cron = require('node-cron');
const { Pool } = require('pg');
const EmailNotificationService = require('./EmailNotificationService');
const LineNotificationService = require('./LineNotificationService');
const envManager = require('../../production-config/env-manager');

class NotificationEngineService {
  constructor() {
    this.redisClient = null;
    this.dbPool = null;
    this.isInitialized = false;
    this.isProcessing = false;
    this.processingInterval = null;
    this.metrics = {
      totalSent: 0,
      totalFailed: 0,
      emailsSent: 0,
      lineMessagesSent: 0,
      averageProcessingTime: 0
    };
    
    // Channel priority (higher number = higher priority)
    this.channelPriority = {
      line: 10,
      email: 8,
      push: 6,
      sms: 4
    };
  }

  async initialize() {
    try {
      // Initialize Redis connection
      await this.initializeRedis();
      
      // Initialize database connection
      await this.initializeDatabase();
      
      // Initialize notification services
      await EmailNotificationService.initialize();
      await LineNotificationService.initialize();
      
      // Start processing engine
      this.startProcessingEngine();
      
      // Setup periodic cleanup
      this.setupPeriodicTasks();
      
      this.isInitialized = true;
      console.log('✅ Notification engine initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize notification engine:', error);
      throw error;
    }
  }

  async initializeRedis() {
    const redisConfig = envManager.getRedisConfig();
    this.redisClient = Redis.createClient(redisConfig);
    
    this.redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });
    
    this.redisClient.on('connect', () => {
      console.log('📦 Redis connected for notification queue');
    });
    
    await this.redisClient.connect();
  }

  async initializeDatabase() {
    const dbConfig = envManager.getDatabaseConfig();
    this.dbPool = new Pool(dbConfig);
    
    // Test connection
    const client = await this.dbPool.connect();
    client.release();
    console.log('🗄️ Database connected for notifications');
  }

  startProcessingEngine() {
    // Process notification queue every 10 seconds
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processNotificationQueue();
      }
    }, 10000);

    // Also process immediately
    setTimeout(() => this.processNotificationQueue(), 1000);
    
    console.log('🚀 Notification processing engine started');
  }

  setupPeriodicTasks() {
    // Check for new availability alerts every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.checkAvailabilityAlerts();
    });

    // Send daily digest at 9:00 AM JST
    cron.schedule('0 9 * * *', async () => {
      await this.sendDailyDigests();
    }, {
      timezone: 'Asia/Tokyo'
    });

    // Cleanup old data every day at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldData();
    }, {
      timezone: 'Asia/Tokyo'
    });

    // Update metrics every minute
    cron.schedule('* * * * *', async () => {
      await this.updateMetrics();
    });

    console.log('⏰ Periodic tasks scheduled');
  }

  async processNotificationQueue() {
    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      // Get pending notifications from database, sorted by priority
      const client = await this.dbPool.connect();
      
      try {
        const query = `
          SELECT 
            nq.*,
            np.email, np.line_user_id, np.phone,
            np.email_enabled, np.line_enabled, np.sms_enabled, np.push_enabled,
            np.timezone, np.quiet_hours_start, np.quiet_hours_end,
            np.max_notifications_per_day
          FROM notification_queue nq
          JOIN notification_preferences np ON nq.user_id = np.user_id
          WHERE nq.status = 'queued' 
          AND nq.scheduled_for <= NOW()
          ORDER BY nq.priority_score DESC, nq.created_at ASC
          LIMIT 100
        `;
        
        const result = await client.query(query);
        const notifications = result.rows;
        
        if (notifications.length === 0) {
          return;
        }
        
        console.log(`📋 Processing ${notifications.length} notifications`);
        
        // Group notifications by channel for batch processing
        const groupedNotifications = this.groupNotificationsByChannel(notifications);
        
        // Process each channel
        for (const [channel, channelNotifications] of Object.entries(groupedNotifications)) {
          await this.processChannelNotifications(channel, channelNotifications, client);
        }
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
      
      // Update processing time metric
      const processingTime = Date.now() - startTime;
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime + processingTime) / 2;
    }
  }

  groupNotificationsByChannel(notifications) {
    const grouped = {};
    
    for (const notification of notifications) {
      // Check if user is in quiet hours
      if (this.isInQuietHours(notification)) {
        continue;
      }
      
      // Check daily limit
      if (notification.user_daily_count >= notification.max_notifications_per_day) {
        continue;
      }
      
      // Check if channel is enabled
      const channelEnabled = this.isChannelEnabled(notification);
      if (!channelEnabled) {
        continue;
      }
      
      if (!grouped[notification.channel]) {
        grouped[notification.channel] = [];
      }
      
      grouped[notification.channel].push(notification);
    }
    
    return grouped;
  }

  async processChannelNotifications(channel, notifications, dbClient) {
    try {
      let results = [];
      
      switch (channel) {
        case 'email':
          results = await this.processEmailNotifications(notifications);
          break;
        case 'line':
          results = await this.processLineNotifications(notifications);
          break;
        case 'sms':
          results = await this.processSmsNotifications(notifications);
          break;
        case 'push':
          results = await this.processPushNotifications(notifications);
          break;
        default:
          console.warn(`Unknown notification channel: ${channel}`);
          return;
      }
      
      // Update notification status in database
      await this.updateNotificationStatus(results, dbClient);
      
    } catch (error) {
      console.error(`❌ Error processing ${channel} notifications:`, error);
    }
  }

  async processEmailNotifications(notifications) {
    const emailMessages = notifications.map(notification => {
      const data = notification.notification_data;
      
      return {
        to: notification.email,
        templateName: this.getEmailTemplate(data.type),
        subject: this.generateEmailSubject(data),
        templateData: {
          userName: data.userName || 'お客様',
          ...data
        },
        category: 'luxury-notification',
        customArgs: {
          notification_id: notification.id,
          user_id: notification.user_id,
          alert_type: data.type
        }
      };
    });
    
    const results = await EmailNotificationService.sendBulkNotifications(emailMessages);
    
    // Map results back to notifications
    return notifications.map((notification, index) => ({
      notificationId: notification.id,
      success: results[index]?.success || false,
      error: results[index]?.error,
      messageId: results[index]?.messageId,
      channel: 'email'
    }));
  }

  async processLineNotifications(notifications) {
    const lineMessages = notifications.map(notification => {
      const data = notification.notification_data;
      
      return {
        to: notification.line_user_id,
        messages: [this.createLineMessage(data)]
      };
    });
    
    const results = await LineNotificationService.sendBulkMessages(lineMessages);
    
    return notifications.map((notification, index) => ({
      notificationId: notification.id,
      success: results[index]?.success || false,
      error: results[index]?.error,
      messageId: results[index]?.messageId,
      channel: 'line'
    }));
  }

  async processSmsNotifications(notifications) {
    // SMS implementation placeholder
    // TODO: Integrate SMS service (Twilio, AWS SNS, etc.)
    return notifications.map(notification => ({
      notificationId: notification.id,
      success: false,
      error: 'SMS service not implemented',
      channel: 'sms'
    }));
  }

  async processPushNotifications(notifications) {
    // Push notification implementation placeholder
    // TODO: Integrate Firebase Cloud Messaging or similar
    return notifications.map(notification => ({
      notificationId: notification.id,
      success: false,
      error: 'Push notification service not implemented',
      channel: 'push'
    }));
  }

  async updateNotificationStatus(results, dbClient) {
    for (const result of results) {
      const status = result.success ? 'sent' : 'failed';
      const errorMessage = result.error || null;
      
      await dbClient.query(`
        UPDATE notification_queue 
        SET 
          status = $1,
          processed_at = NOW(),
          attempts = attempts + 1,
          error_details = $2
        WHERE id = $3
      `, [status, errorMessage, result.notificationId]);
      
      // Record in notification history
      await dbClient.query(`
        INSERT INTO notification_history (
          user_id, watch_list_id, hotel_id, notification_type, channel,
          status, title, message, sent_at, error_message
        )
        SELECT 
          nq.user_id, nq.watch_list_id, aa.hotel_id, 
          (nq.notification_data->>'type')::VARCHAR(50),
          nq.channel, $1,
          (nq.notification_data->>'title')::VARCHAR(200),
          (nq.notification_data->>'message')::TEXT,
          CASE WHEN $1 = 'sent' THEN NOW() ELSE NULL END,
          $2
        FROM notification_queue nq
        LEFT JOIN availability_alerts aa ON nq.alert_id = aa.id
        WHERE nq.id = $3
      `, [status, errorMessage, result.notificationId]);
      
      // Update metrics
      if (result.success) {
        this.metrics.totalSent++;
        if (result.channel === 'email') this.metrics.emailsSent++;
        if (result.channel === 'line') this.metrics.lineMessagesSent++;
      } else {
        this.metrics.totalFailed++;
      }
    }
  }

  async checkAvailabilityAlerts() {
    try {
      const client = await this.dbPool.connect();
      
      try {
        // Call the database function to check and create alerts
        const result = await client.query('SELECT * FROM check_availability_alerts()');
        const stats = result.rows[0];
        
        if (stats.alert_count > 0) {
          console.log(`🔔 Created ${stats.alert_count} availability alerts, queued ${stats.notifications_queued} notifications`);
        }
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ Error checking availability alerts:', error);
    }
  }

  async sendDailyDigests() {
    try {
      const client = await this.dbPool.connect();
      
      try {
        // Get users who have daily digest enabled
        const query = `
          SELECT DISTINCT
            np.user_id, np.email, np.line_user_id,
            np.email_enabled, np.line_enabled, np.timezone
          FROM notification_preferences np
          WHERE np.daily_digest = true
          AND (np.email_enabled = true OR np.line_enabled = true)
        `;
        
        const result = await client.query(query);
        const users = result.rows;
        
        for (const user of users) {
          await this.generateDailyDigest(user, client);
        }
        
        console.log(`📊 Sent daily digests to ${users.length} users`);
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ Error sending daily digests:', error);
    }
  }

  async generateDailyDigest(user, dbClient) {
    // Get user's recent notifications and watch lists
    const digestQuery = `
      SELECT 
        COUNT(*) as notification_count,
        COUNT(DISTINCT hwl.hotel_id) as watched_hotels,
        AVG(aa.discount_percentage) as avg_discount
      FROM hotel_watch_lists hwl
      LEFT JOIN availability_alerts aa ON hwl.hotel_id = aa.hotel_id
      LEFT JOIN notification_history nh ON nh.user_id = hwl.user_id
      WHERE hwl.user_id = $1 
      AND hwl.is_active = true
      AND nh.created_at >= CURRENT_DATE
    `;
    
    const digestResult = await dbClient.query(digestQuery, [user.user_id]);
    const digestData = digestResult.rows[0];
    
    if (digestData.notification_count > 0) {
      // Queue daily digest notification
      await this.queueNotification({
        userId: user.user_id,
        channel: user.email_enabled ? 'email' : 'line',
        type: 'daily_digest',
        priority: 3,
        data: {
          type: 'daily_digest',
          notificationCount: digestData.notification_count,
          watchedHotels: digestData.watched_hotels,
          avgDiscount: digestData.avg_discount
        }
      });
    }
  }

  async queueNotification(options) {
    const {
      userId,
      watchListId = null,
      alertId = null,
      channel,
      type,
      priority = 5,
      data,
      scheduledFor = new Date()
    } = options;
    
    const client = await this.dbPool.connect();
    
    try {
      // Calculate priority score
      const priorityScore = this.calculatePriorityScore(priority, data);
      
      // Insert into notification queue
      await client.query(`
        INSERT INTO notification_queue (
          user_id, watch_list_id, alert_id, channel, priority_score,
          scheduled_for, notification_data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued')
      `, [
        userId, watchListId, alertId, channel, priorityScore,
        scheduledFor, JSON.stringify(data)
      ]);
      
    } finally {
      client.release();
    }
  }

  calculatePriorityScore(basePriority, data) {
    let score = basePriority * 10;
    
    // Boost for luxury hotels
    if (data.isLuxurySuite) score += 20;
    
    // Boost for high discounts
    if (data.discountPercentage > 30) score += 15;
    if (data.discountPercentage > 50) score += 25;
    
    // Boost for urgency
    if (data.urgencyLevel >= 8) score += 30;
    
    // Time-sensitive boost
    if (data.expiresIn && data.expiresIn < 120) { // Less than 2 hours
      score += 20;
    }
    
    return Math.min(score, 200); // Cap at 200
  }

  // Utility methods
  isInQuietHours(notification) {
    if (!notification.quiet_hours_start || !notification.quiet_hours_end) {
      return false;
    }
    
    const userTime = new Date().toLocaleString('en-US', {
      timeZone: notification.timezone || 'Asia/Tokyo'
    });
    const currentHour = new Date(userTime).getHours();
    
    const quietStart = parseInt(notification.quiet_hours_start.split(':')[0]);
    const quietEnd = parseInt(notification.quiet_hours_end.split(':')[0]);
    
    if (quietStart > quietEnd) {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentHour >= quietStart || currentHour < quietEnd;
    } else {
      // Same day quiet hours
      return currentHour >= quietStart && currentHour < quietEnd;
    }
  }

  isChannelEnabled(notification) {
    switch (notification.channel) {
      case 'email':
        return notification.email_enabled && notification.email;
      case 'line':
        return notification.line_enabled && notification.line_user_id;
      case 'sms':
        return notification.sms_enabled && notification.phone;
      case 'push':
        return notification.push_enabled;
      default:
        return false;
    }
  }

  getEmailTemplate(type) {
    const templates = {
      luxury_availability: 'luxury-availability',
      price_drop: 'price-drop-alert',
      last_minute: 'last-minute-deal',
      daily_digest: 'daily-digest'
    };
    
    return templates[type] || 'luxury-availability';
  }

  generateEmailSubject(data) {
    switch (data.type) {
      case 'luxury_availability':
        return `🏨 ${data.hotelName} ${data.roomType} 空室アラート`;
      case 'price_drop':
        return `💰 ${data.hotelName} 価格下落 ${Math.round(data.discountPercentage)}%OFF`;
      case 'last_minute':
        return `⏰ ラストミニッツ特価情報`;
      case 'daily_digest':
        return `📊 本日の宿泊情報サマリー`;
      default:
        return 'Hotel Booking Premium 通知';
    }
  }

  createLineMessage(data) {
    // This would create appropriate LINE message based on type
    // For now, return a simple text message
    switch (data.type) {
      case 'luxury_availability':
        return {
          type: 'text',
          text: `🏨 ${data.hotelName}\n${data.roomType}\n💰 ${this.formatCurrency(data.currentPrice)}\n今すぐ予約: ${data.bookingUrl}`
        };
      default:
        return {
          type: 'text',
          text: 'Hotel Booking Premium からの通知です'
        };
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  }

  async updateMetrics() {
    try {
      // Store metrics in Redis for real-time dashboard
      await this.redisClient.hMSet('notification_metrics', {
        total_sent: this.metrics.totalSent,
        total_failed: this.metrics.totalFailed,
        emails_sent: this.metrics.emailsSent,
        line_messages_sent: this.metrics.lineMessagesSent,
        avg_processing_time: this.metrics.averageProcessingTime,
        last_updated: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  async cleanupOldData() {
    try {
      const client = await this.dbPool.connect();
      
      try {
        await client.query('SELECT cleanup_notification_data()');
        console.log('🧹 Cleaned up old notification data');
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ Error cleaning up old data:', error);
    }
  }

  async getMetrics() {
    try {
      const redisMetrics = await this.redisClient.hGetAll('notification_metrics');
      
      const client = await this.dbPool.connect();
      try {
        const dbMetrics = await client.query(`
          SELECT 
            COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_today,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_today,
            COUNT(CASE WHEN channel = 'email' AND status = 'sent' THEN 1 END) as emails_today,
            COUNT(CASE WHEN channel = 'line' AND status = 'sent' THEN 1 END) as line_today
          FROM notification_history 
          WHERE created_at >= CURRENT_DATE
        `);
        
        const todayStats = dbMetrics.rows[0];
        
        return {
          ...redisMetrics,
          today: todayStats,
          isProcessing: this.isProcessing,
          timestamp: new Date().toISOString()
        };
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Error getting metrics:', error);
      return null;
    }
  }

  async healthCheck() {
    try {
      const checks = {
        redis: false,
        database: false,
        email: false,
        line: false,
        processing: this.isInitialized && !this.isProcessing
      };
      
      // Check Redis
      try {
        await this.redisClient.ping();
        checks.redis = true;
      } catch (error) {
        console.error('Redis health check failed:', error);
      }
      
      // Check Database
      try {
        const client = await this.dbPool.connect();
        await client.query('SELECT 1');
        client.release();
        checks.database = true;
      } catch (error) {
        console.error('Database health check failed:', error);
      }
      
      // Check Email service
      try {
        const emailHealth = await EmailNotificationService.healthCheck();
        checks.email = emailHealth.status === 'healthy';
      } catch (error) {
        console.error('Email service health check failed:', error);
      }
      
      // Check LINE service
      try {
        const lineHealth = await LineNotificationService.healthCheck();
        checks.line = lineHealth.status === 'healthy';
      } catch (error) {
        console.error('LINE service health check failed:', error);
      }
      
      const healthy = Object.values(checks).every(check => check === true);
      
      return {
        status: healthy ? 'healthy' : 'degraded',
        checks,
        metrics: await this.getMetrics(),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down notification engine...');
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    if (this.dbPool) {
      await this.dbPool.end();
    }
    
    console.log('✅ Notification engine shutdown complete');
  }
}

// Export singleton instance
module.exports = new NotificationEngineService();