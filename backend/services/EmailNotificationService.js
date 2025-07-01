/**
 * Luxury Hotel Email Notification Service
 * Premium email notifications using SendGrid with advanced templating
 */

const sgMail = require('@sendgrid/mail');
const fs = require('fs').promises;
const path = require('path');
const Handlebars = require('handlebars');
const envManager = require('../../production-config/env-manager');

class EmailNotificationService {
  constructor() {
    this.isInitialized = false;
    this.templates = new Map();
    this.defaultSender = {
      email: 'noreply@hotelbooking.com',
      name: 'Hotel Booking Premium'
    };
    this.trackingDomain = 'track.hotelbooking.com';
  }

  async initialize() {
    try {
      // Initialize SendGrid with API key
      const apiKey = envManager.get('SENDGRID_API_KEY');
      if (!apiKey) {
        throw new Error('SendGrid API key not configured');
      }
      
      sgMail.setApiKey(apiKey);
      
      // Load and compile email templates
      await this.loadEmailTemplates();
      
      // Register Handlebars helpers
      this.registerHandlebarsHelpers();
      
      this.isInitialized = true;
      console.log('✅ Email notification service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      throw error;
    }
  }

  async loadEmailTemplates() {
    const templateDir = path.join(__dirname, '../templates/email');
    
    const templates = [
      'luxury-availability',
      'price-drop-alert',
      'last-minute-deal',
      'booking-confirmation',
      'welcome',
      'notification-preferences'
    ];

    for (const templateName of templates) {
      try {
        const htmlPath = path.join(templateDir, `${templateName}.html`);
        const textPath = path.join(templateDir, `${templateName}.txt`);
        
        const [htmlContent, textContent] = await Promise.all([
          fs.readFile(htmlPath, 'utf8').catch(() => null),
          fs.readFile(textPath, 'utf8').catch(() => null)
        ]);

        if (htmlContent || textContent) {
          this.templates.set(templateName, {
            html: htmlContent ? Handlebars.compile(htmlContent) : null,
            text: textContent ? Handlebars.compile(textContent) : null
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not load template ${templateName}:`, error.message);
      }
    }

    console.log(`📧 Loaded ${this.templates.size} email templates`);
  }

  registerHandlebarsHelpers() {
    // Currency formatting helper
    Handlebars.registerHelper('currency', function(amount, currency = 'JPY') {
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });

    // Date formatting helper
    Handlebars.registerHelper('formatDate', function(date, format = 'long') {
      const options = format === 'short' 
        ? { month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'long', day: 'numeric' };
      
      return new Intl.DateTimeFormat('ja-JP', options).format(new Date(date));
    });

    // Percentage helper
    Handlebars.registerHelper('percentage', function(value) {
      return Math.round(value) + '%';
    });

    // Urgency badge helper
    Handlebars.registerHelper('urgencyBadge', function(level) {
      if (level >= 8) return '<span class="badge urgent">🔥 Ultra Urgent</span>';
      if (level >= 6) return '<span class="badge high">⚡ High Priority</span>';
      if (level >= 4) return '<span class="badge medium">📍 Medium</span>';
      return '<span class="badge low">📌 Low</span>';
    });

    // Luxury indicator helper
    Handlebars.registerHelper('luxuryIndicator', function(isLuxury) {
      return isLuxury ? '<span class="luxury-badge">👑 Luxury Suite</span>' : '';
    });
  }

  async sendLuxuryAvailabilityAlert(data) {
    const {
      userEmail,
      userName,
      hotelName,
      hotelAddress,
      roomType,
      checkInDate,
      checkOutDate,
      originalPrice,
      currentPrice,
      discountPercentage,
      availableRooms,
      urgencyLevel,
      isLuxurySuite,
      amenities,
      bookingUrl,
      unsubscribeUrl
    } = data;

    const templateData = {
      userName,
      hotelName,
      hotelAddress,
      roomType,
      checkInDate,
      checkOutDate,
      originalPrice,
      currentPrice,
      discountPercentage,
      availableRooms,
      urgencyLevel,
      isLuxurySuite,
      amenities: amenities || [],
      bookingUrl,
      unsubscribeUrl,
      year: new Date().getFullYear(),
      companyName: 'Hotel Booking Premium'
    };

    const subject = this.generateSubject('luxury-availability', templateData);
    
    return await this.sendTemplatedEmail({
      to: userEmail,
      templateName: 'luxury-availability',
      subject,
      templateData,
      category: 'luxury-alert',
      customArgs: {
        hotel_id: data.hotelId,
        user_id: data.userId,
        alert_type: 'availability'
      }
    });
  }

  async sendPriceDropAlert(data) {
    const {
      userEmail,
      userName,
      hotelName,
      roomType,
      originalPrice,
      newPrice,
      discountAmount,
      discountPercentage,
      validUntil,
      bookingUrl,
      unsubscribeUrl
    } = data;

    const templateData = {
      userName,
      hotelName,
      roomType,
      originalPrice,
      newPrice,
      discountAmount,
      discountPercentage,
      validUntil,
      bookingUrl,
      unsubscribeUrl,
      year: new Date().getFullYear(),
      savings: originalPrice - newPrice
    };

    const subject = this.generateSubject('price-drop', templateData);

    return await this.sendTemplatedEmail({
      to: userEmail,
      templateName: 'price-drop-alert',
      subject,
      templateData,
      category: 'price-alert',
      customArgs: {
        hotel_id: data.hotelId,
        user_id: data.userId,
        alert_type: 'price_drop',
        discount_percentage: discountPercentage
      }
    });
  }

  async sendLastMinuteDeal(data) {
    const {
      userEmail,
      userName,
      deals,
      expiresIn,
      totalSavings,
      dealCode,
      unsubscribeUrl
    } = data;

    const templateData = {
      userName,
      deals,
      expiresIn,
      totalSavings,
      dealCode,
      unsubscribeUrl,
      year: new Date().getFullYear(),
      urgentDeadline: new Date(Date.now() + expiresIn * 60000).toLocaleString('ja-JP')
    };

    const subject = this.generateSubject('last-minute', templateData);

    return await this.sendTemplatedEmail({
      to: userEmail,
      templateName: 'last-minute-deal',
      subject,
      templateData,
      category: 'last-minute',
      customArgs: {
        user_id: data.userId,
        alert_type: 'last_minute',
        deal_count: deals.length
      }
    });
  }

  generateSubject(type, data) {
    const subjects = {
      'luxury-availability': () => {
        const urgency = data.urgencyLevel >= 8 ? '🔥 緊急' : 
                       data.urgencyLevel >= 6 ? '⚡ 高優先度' : '';
        const luxury = data.isLuxurySuite ? '👑 ' : '';
        const discount = data.discountPercentage > 0 ? ` (${Math.round(data.discountPercentage)}%OFF)` : '';
        
        return `${urgency}${luxury}${data.hotelName} ${data.roomType} 空室あり${discount}`;
      },
      
      'price-drop': () => {
        const savings = Math.round(data.discountPercentage);
        return `💰 ${data.hotelName} ${savings}%OFF! 期間限定価格下落アラート`;
      },
      
      'last-minute': () => {
        return `⏰ ラストミニッツ特価! ${data.deals.length}件の超お得プラン (残り${data.expiresIn}分)`;
      }
    };

    return subjects[type] ? subjects[type]() : `Hotel Booking Premium Notification`;
  }

  async sendTemplatedEmail(options) {
    const {
      to,
      templateName,
      subject,
      templateData,
      category = 'notification',
      customArgs = {},
      attachments = []
    } = options;

    if (!this.isInitialized) {
      await this.initialize();
    }

    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    try {
      const msg = {
        to: {
          email: to,
          name: templateData.userName || ''
        },
        from: this.defaultSender,
        subject,
        html: template.html ? template.html(templateData) : undefined,
        text: template.text ? template.text(templateData) : undefined,
        
        // Advanced SendGrid features
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: true
          },
          openTracking: {
            enable: true,
            substitutionTag: '%open_tracking_pixel%'
          },
          subscriptionTracking: {
            enable: true,
            text: 'Unsubscribe',
            html: '<a href="%unsubscribe_url%">Unsubscribe</a>',
            substitutionTag: '%unsubscribe_url%'
          }
        },
        
        // Analytics and segmentation
        categories: [category, 'automated'],
        customArgs: {
          ...customArgs,
          sent_at: new Date().toISOString(),
          template: templateName
        },
        
        // Attachments (if any)
        attachments,
        
        // Email metadata
        headers: {
          'X-Entity-ID': customArgs.user_id || 'unknown',
          'X-Message-Type': category
        }
      };

      // Add unsubscribe URL if provided
      if (templateData.unsubscribeUrl) {
        msg.asm = {
          groupId: 1, // Unsubscribe group ID (configure in SendGrid)
          groupsToDisplay: [1]
        };
      }

      const result = await sgMail.send(msg);
      
      console.log(`📧 Email sent successfully: ${templateName} to ${to}`);
      
      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
        timestamp: new Date().toISOString(),
        recipient: to,
        template: templateName
      };

    } catch (error) {
      console.error(`❌ Failed to send email ${templateName} to ${to}:`, error);
      
      return {
        success: false,
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        recipient: to,
        template: templateName
      };
    }
  }

  async sendBulkNotifications(notifications) {
    const results = [];
    const batchSize = 100; // SendGrid batch limit
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (notification) => {
        try {
          return await this.sendTemplatedEmail(notification);
        } catch (error) {
          return {
            success: false,
            error: error.message,
            notification: notification
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value || r.reason));
      
      // Rate limiting: wait between batches
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  async getEmailStats(messageId) {
    try {
      // This would typically use SendGrid's Event Webhook or Stats API
      // For now, return placeholder stats
      return {
        messageId,
        delivered: true,
        opened: false,
        clicked: false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get email stats:', error);
      return null;
    }
  }

  async validateEmailTemplate(templateName, sampleData) {
    const template = this.templates.get(templateName);
    if (!template) {
      return { valid: false, error: `Template ${templateName} not found` };
    }

    try {
      const html = template.html ? template.html(sampleData) : null;
      const text = template.text ? template.text(sampleData) : null;
      
      return {
        valid: true,
        html: html ? html.length : 0,
        text: text ? text.length : 0,
        template: templateName
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        template: templateName
      };
    }
  }

  async healthCheck() {
    try {
      // Test SendGrid API connectivity
      const testEmail = {
        to: 'test@example.com',
        from: this.defaultSender,
        subject: 'Health Check - Do Not Send',
        text: 'This is a health check email',
        mailSettings: {
          sandboxMode: {
            enable: true // This prevents actual sending
          }
        }
      };

      await sgMail.send(testEmail);
      
      return {
        status: 'healthy',
        templatesLoaded: this.templates.size,
        sendgridConnected: true,
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
}

// Export singleton instance
module.exports = new EmailNotificationService();