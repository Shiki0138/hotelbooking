// Real-time Email Notification Service
// 史上最強のリアルタイム通知システム - worker4実装
// Created: 2025-06-29

const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const EventEmitter = require('events');
const WebSocket = require('ws');
const Redis = require('redis');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class EmailNotificationService extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            // Email providers
            providers: {
                primary: 'ses',    // ses, smtp, sendgrid
                fallback: 'smtp'
            },
            
            // SES Configuration
            ses: {
                region: process.env.AWS_REGION || 'us-east-1',
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                fromEmail: process.env.SES_FROM_EMAIL || 'noreply@hotelbooking.com',
                fromName: process.env.SES_FROM_NAME || 'Hotel Booking System'
            },
            
            // SMTP Configuration
            smtp: {
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
                fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@hotelbooking.com',
                fromName: process.env.SMTP_FROM_NAME || 'Hotel Booking System'
            },
            
            // Real-time features
            realtime: {
                enableWebSocket: true,
                enableRedisUpdates: true,
                enablePushNotifications: true,
                updateInterval: 1000, // 1 second
                maxRetries: 3,
                retryDelay: 2000
            },
            
            // Template settings
            templates: {
                baseDir: process.env.TEMPLATE_DIR || './templates',
                defaultLanguage: 'en',
                enableHTMLTemplates: true,
                enableTextTemplates: true
            },
            
            // Queue settings
            queue: {
                enableQueue: true,
                redisUrl: process.env.REDIS_URL,
                maxConcurrent: 10,
                defaultDelay: 0,
                maxRetries: 3
            },
            
            // Analytics
            analytics: {
                trackOpens: true,
                trackClicks: true,
                trackDelivery: true,
                trackBounces: true
            },
            
            ...config
        };
        
        this.transporters = new Map();
        this.templates = new Map();
        this.queue = [];
        this.processing = false;
        this.redisClient = null;
        this.wsServer = null;
        this.connectedClients = new Set();
        
        this.initializeService();
    }

    // 🚀 Initialize Service
    async initializeService() {
        try {
            console.log('🚀 Initializing Email Notification Service...');
            
            // Initialize email transporters
            await this.initializeTransporters();
            
            // Initialize Redis connection
            if (this.config.realtime.enableRedisUpdates) {
                await this.initializeRedis();
            }
            
            // Initialize WebSocket server
            if (this.config.realtime.enableWebSocket) {
                await this.initializeWebSocket();
            }
            
            // Load email templates
            await this.loadTemplates();
            
            // Start queue processor
            if (this.config.queue.enableQueue) {
                this.startQueueProcessor();
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('✅ Email Notification Service initialized successfully');
            this.emit('service:ready');
            
        } catch (error) {
            console.error('❌ Failed to initialize Email Notification Service:', error);
            this.emit('service:error', error);
        }
    }

    // 📧 Initialize Email Transporters
    async initializeTransporters() {
        console.log('📧 Initializing email transporters...');
        
        // AWS SES Transporter
        if (this.config.providers.primary === 'ses' || this.config.providers.fallback === 'ses') {
            try {
                AWS.config.update({
                    region: this.config.ses.region,
                    accessKeyId: this.config.ses.accessKeyId,
                    secretAccessKey: this.config.ses.secretAccessKey
                });
                
                const sesTransporter = nodemailer.createTransporter({
                    SES: new AWS.SES({ apiVersion: '2010-12-01' }),
                    sendingRate: 14 // SES sending rate limit
                });
                
                // Verify SES transporter
                await sesTransporter.verify();
                this.transporters.set('ses', sesTransporter);
                console.log('✅ SES transporter initialized');
                
            } catch (error) {
                console.warn('⚠️ SES transporter failed to initialize:', error.message);
            }
        }
        
        // SMTP Transporter
        if (this.config.providers.primary === 'smtp' || this.config.providers.fallback === 'smtp') {
            try {
                const smtpTransporter = nodemailer.createTransporter({
                    host: this.config.smtp.host,
                    port: this.config.smtp.port,
                    secure: this.config.smtp.secure,
                    auth: {
                        user: this.config.smtp.user,
                        pass: this.config.smtp.pass
                    },
                    pool: true,
                    maxConnections: 5,
                    maxMessages: 100
                });
                
                // Verify SMTP transporter
                await smtpTransporter.verify();
                this.transporters.set('smtp', smtpTransporter);
                console.log('✅ SMTP transporter initialized');
                
            } catch (error) {
                console.warn('⚠️ SMTP transporter failed to initialize:', error.message);
            }
        }
        
        if (this.transporters.size === 0) {
            throw new Error('No email transporters could be initialized');
        }
    }

    // 🔗 Initialize Redis Connection
    async initializeRedis() {
        try {
            this.redisClient = Redis.createClient({
                url: this.config.queue.redisUrl,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        return new Error('Redis server connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });
            
            await this.redisClient.connect();
            console.log('✅ Redis connection established');
            
            // Subscribe to notification events
            const subscriber = this.redisClient.duplicate();
            await subscriber.connect();
            
            await subscriber.subscribe('notifications:email', (message) => {
                try {
                    const notification = JSON.parse(message);
                    this.handleRedisNotification(notification);
                } catch (error) {
                    console.error('Error processing Redis notification:', error);
                }
            });
            
        } catch (error) {
            console.warn('⚠️ Redis connection failed:', error.message);
            this.redisClient = null;
        }
    }

    // 🌐 Initialize WebSocket Server
    async initializeWebSocket() {
        try {
            const WebSocket = require('ws');
            this.wsServer = new WebSocket.Server({
                port: process.env.NOTIFICATION_WS_PORT || 8081,
                path: '/notifications'
            });
            
            this.wsServer.on('connection', (ws, req) => {
                console.log('📡 New WebSocket connection established');
                
                // Add client to connected clients
                this.connectedClients.add(ws);
                
                // Send welcome message
                ws.send(JSON.stringify({
                    type: 'connection',
                    status: 'connected',
                    timestamp: new Date().toISOString()
                }));
                
                // Handle client messages
                ws.on('message', (message) => {
                    try {
                        const data = JSON.parse(message);
                        this.handleWebSocketMessage(ws, data);
                    } catch (error) {
                        console.error('Error processing WebSocket message:', error);
                    }
                });
                
                // Handle client disconnect
                ws.on('close', () => {
                    console.log('📡 WebSocket connection closed');
                    this.connectedClients.delete(ws);
                });
                
                // Handle errors
                ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.connectedClients.delete(ws);
                });
            });
            
            console.log(`✅ WebSocket server listening on port ${process.env.NOTIFICATION_WS_PORT || 8081}`);
            
        } catch (error) {
            console.warn('⚠️ WebSocket server failed to initialize:', error.message);
        }
    }

    // 📄 Load Email Templates
    async loadTemplates() {
        try {
            console.log('📄 Loading email templates...');
            
            const templateDir = this.config.templates.baseDir;
            const templateFiles = await fs.readdir(templateDir);
            
            for (const file of templateFiles) {
                if (file.endsWith('.html') || file.endsWith('.txt')) {
                    const templateName = path.parse(file).name;
                    const templatePath = path.join(templateDir, file);
                    const templateContent = await fs.readFile(templatePath, 'utf8');
                    
                    if (!this.templates.has(templateName)) {
                        this.templates.set(templateName, {});
                    }
                    
                    const fileType = path.parse(file).ext.substring(1);
                    this.templates.get(templateName)[fileType] = templateContent;
                }
            }
            
            console.log(`✅ Loaded ${this.templates.size} email templates`);
            
        } catch (error) {
            console.warn('⚠️ Failed to load email templates:', error.message);
        }
    }

    // 🔄 Queue Processor
    startQueueProcessor() {
        setInterval(async () => {
            if (!this.processing && this.queue.length > 0) {
                await this.processQueue();
            }
        }, this.config.realtime.updateInterval);
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        try {
            const batch = this.queue.splice(0, this.config.queue.maxConcurrent);
            const promises = batch.map(notification => this.processNotification(notification));
            
            await Promise.allSettled(promises);
            
        } catch (error) {
            console.error('Error processing notification queue:', error);
        } finally {
            this.processing = false;
        }
    }

    // 📤 Send Email Notification
    async sendEmail(notification) {
        try {
            const emailData = await this.prepareEmail(notification);
            const result = await this.deliverEmail(emailData);
            
            // Emit success event
            this.emit('email:sent', {
                id: notification.id,
                recipient: notification.recipient,
                subject: notification.subject,
                timestamp: new Date().toISOString(),
                messageId: result.messageId
            });
            
            // Broadcast real-time update
            this.broadcastUpdate({
                type: 'email:sent',
                notification: {
                    id: notification.id,
                    status: 'sent',
                    timestamp: new Date().toISOString()
                }
            });
            
            return result;
            
        } catch (error) {
            console.error('Failed to send email:', error);
            
            // Emit error event
            this.emit('email:error', {
                id: notification.id,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            // Retry if configured
            if (notification.retryCount < this.config.queue.maxRetries) {
                notification.retryCount = (notification.retryCount || 0) + 1;
                notification.scheduledAt = Date.now() + (this.config.realtime.retryDelay * notification.retryCount);
                this.queue.push(notification);
            }
            
            throw error;
        }
    }

    // 📧 Prepare Email Data
    async prepareEmail(notification) {
        const template = this.templates.get(notification.template);
        
        if (!template) {
            throw new Error(`Template '${notification.template}' not found`);
        }
        
        // Compile HTML template
        let htmlContent = template.html || '';
        if (htmlContent && notification.data) {
            htmlContent = this.compileTemplate(htmlContent, notification.data);
        }
        
        // Compile text template
        let textContent = template.txt || '';
        if (textContent && notification.data) {
            textContent = this.compileTemplate(textContent, notification.data);
        }
        
        // Add tracking pixels if enabled
        if (this.config.analytics.trackOpens && htmlContent) {
            const trackingPixel = `<img src="${process.env.BASE_URL}/api/email/track/open/${notification.id}" width="1" height="1" style="display:none;">`;
            htmlContent += trackingPixel;
        }
        
        const emailData = {
            from: `${this.getFromName()} <${this.getFromEmail()}>`,
            to: notification.recipient,
            subject: this.compileTemplate(notification.subject, notification.data),
            html: htmlContent,
            text: textContent,
            headers: {
                'X-Notification-ID': notification.id,
                'X-Notification-Type': notification.type
            }
        };
        
        // Add attachments if any
        if (notification.attachments) {
            emailData.attachments = notification.attachments;
        }
        
        return emailData;
    }

    // 🚚 Deliver Email
    async deliverEmail(emailData) {
        let lastError;
        
        // Try primary transporter
        const primaryTransporter = this.transporters.get(this.config.providers.primary);
        if (primaryTransporter) {
            try {
                return await primaryTransporter.sendMail(emailData);
            } catch (error) {
                console.warn(`Primary transporter (${this.config.providers.primary}) failed:`, error.message);
                lastError = error;
            }
        }
        
        // Try fallback transporter
        const fallbackTransporter = this.transporters.get(this.config.providers.fallback);
        if (fallbackTransporter) {
            try {
                return await fallbackTransporter.sendMail(emailData);
            } catch (error) {
                console.warn(`Fallback transporter (${this.config.providers.fallback}) failed:`, error.message);
                lastError = error;
            }
        }
        
        throw lastError || new Error('No available email transporters');
    }

    // 🎨 Compile Template
    compileTemplate(template, data) {
        if (!template || !data) return template;
        
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    // 📡 WebSocket Message Handler
    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'subscribe':
                ws.subscriptions = data.channels || [];
                break;
                
            case 'unsubscribe':
                ws.subscriptions = [];
                break;
                
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                break;
        }
    }

    // 🔄 Redis Notification Handler
    handleRedisNotification(notification) {
        this.broadcastUpdate({
            type: 'notification:update',
            notification
        });
    }

    // 📢 Broadcast Update to WebSocket Clients
    broadcastUpdate(update) {
        const message = JSON.stringify({
            ...update,
            timestamp: new Date().toISOString()
        });
        
        this.connectedClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(message);
                } catch (error) {
                    console.error('Error broadcasting to client:', error);
                    this.connectedClients.delete(client);
                }
            }
        });
    }

    // 🏨 Hotel Booking Specific Notifications
    async sendBookingConfirmation(booking) {
        const notification = {
            id: this.generateId(),
            type: 'booking_confirmation',
            template: 'booking-confirmation',
            recipient: booking.guestEmail,
            subject: 'Booking Confirmation - {{hotelName}}',
            data: {
                guestName: booking.guestName,
                hotelName: booking.hotelName,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                roomType: booking.roomType,
                totalAmount: booking.totalAmount,
                bookingId: booking.id,
                confirmationCode: booking.confirmationCode
            },
            priority: 'high',
            scheduledAt: Date.now()
        };
        
        return this.queueNotification(notification);
    }

    async sendBookingReminder(booking) {
        const notification = {
            id: this.generateId(),
            type: 'booking_reminder',
            template: 'booking-reminder',
            recipient: booking.guestEmail,
            subject: 'Upcoming Stay Reminder - {{hotelName}}',
            data: {
                guestName: booking.guestName,
                hotelName: booking.hotelName,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                roomType: booking.roomType,
                bookingId: booking.id
            },
            priority: 'normal',
            scheduledAt: Date.now()
        };
        
        return this.queueNotification(notification);
    }

    async sendBookingCancellation(booking) {
        const notification = {
            id: this.generateId(),
            type: 'booking_cancellation',
            template: 'booking-cancellation',
            recipient: booking.guestEmail,
            subject: 'Booking Cancellation Confirmation - {{hotelName}}',
            data: {
                guestName: booking.guestName,
                hotelName: booking.hotelName,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                bookingId: booking.id,
                cancellationDate: new Date().toLocaleDateString(),
                refundAmount: booking.refundAmount
            },
            priority: 'high',
            scheduledAt: Date.now()
        };
        
        return this.queueNotification(notification);
    }

    async sendPasswordReset(user, resetToken) {
        const notification = {
            id: this.generateId(),
            type: 'password_reset',
            template: 'password-reset',
            recipient: user.email,
            subject: 'Password Reset Request',
            data: {
                userName: user.name,
                resetLink: `${process.env.BASE_URL}/reset-password?token=${resetToken}`,
                expiresIn: '1 hour'
            },
            priority: 'high',
            scheduledAt: Date.now()
        };
        
        return this.queueNotification(notification);
    }

    async sendWelcomeEmail(user) {
        const notification = {
            id: this.generateId(),
            type: 'welcome',
            template: 'welcome',
            recipient: user.email,
            subject: 'Welcome to Hotel Booking System!',
            data: {
                userName: user.name,
                loginUrl: `${process.env.BASE_URL}/login`,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@hotelbooking.com'
            },
            priority: 'normal',
            scheduledAt: Date.now()
        };
        
        return this.queueNotification(notification);
    }

    // 📝 Queue Notification
    queueNotification(notification) {
        notification.id = notification.id || this.generateId();
        notification.createdAt = Date.now();
        notification.retryCount = 0;
        
        this.queue.push(notification);
        
        // Store in Redis for persistence
        if (this.redisClient) {
            this.redisClient.setex(
                `notification:${notification.id}`,
                3600, // 1 hour TTL
                JSON.stringify(notification)
            );
        }
        
        // Emit event
        this.emit('notification:queued', notification);
        
        // Broadcast to WebSocket clients
        this.broadcastUpdate({
            type: 'notification:queued',
            notification: {
                id: notification.id,
                type: notification.type,
                recipient: notification.recipient,
                status: 'queued'
            }
        });
        
        return notification.id;
    }

    // 🔄 Process Single Notification
    async processNotification(notification) {
        try {
            // Check if scheduled time has arrived
            if (notification.scheduledAt > Date.now()) {
                this.queue.push(notification); // Re-queue for later
                return;
            }
            
            await this.sendEmail(notification);
            
            // Update Redis status
            if (this.redisClient) {
                await this.redisClient.setex(
                    `notification:${notification.id}:status`,
                    86400, // 24 hours TTL
                    'sent'
                );
            }
            
        } catch (error) {
            console.error(`Failed to process notification ${notification.id}:`, error);
            
            // Update Redis status
            if (this.redisClient) {
                await this.redisClient.setex(
                    `notification:${notification.id}:status`,
                    86400, // 24 hours TTL
                    'failed'
                );
            }
        }
    }

    // 🔧 Event Listeners Setup
    setupEventListeners() {
        // Handle service shutdown gracefully
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
        
        // Monitor queue size
        setInterval(() => {
            if (this.queue.length > 100) {
                console.warn(`⚠️ Email queue size is high: ${this.queue.length} items`);
                this.emit('queue:high', { size: this.queue.length });
            }
        }, 30000); // Check every 30 seconds
    }

    // 📊 Get Service Statistics
    getStatistics() {
        return {
            transporters: Array.from(this.transporters.keys()),
            queueSize: this.queue.length,
            connectedClients: this.connectedClients.size,
            templatesLoaded: this.templates.size,
            redisConnected: this.redisClient ? this.redisClient.isReady : false,
            wsServerActive: this.wsServer ? true : false
        };
    }

    // 🔍 Helper Methods
    generateId() {
        return crypto.randomBytes(16).toString('hex');
    }
    
    getFromEmail() {
        return this.config.providers.primary === 'ses' 
            ? this.config.ses.fromEmail 
            : this.config.smtp.fromEmail;
    }
    
    getFromName() {
        return this.config.providers.primary === 'ses' 
            ? this.config.ses.fromName 
            : this.config.smtp.fromName;
    }

    // 🛑 Graceful Shutdown
    async shutdown() {
        console.log('🛑 Shutting down Email Notification Service...');
        
        try {
            // Close WebSocket server
            if (this.wsServer) {
                this.wsServer.close();
            }
            
            // Close Redis connection
            if (this.redisClient) {
                await this.redisClient.quit();
            }
            
            // Close email transporters
            for (const transporter of this.transporters.values()) {
                if (transporter.close) {
                    transporter.close();
                }
            }
            
            console.log('✅ Email Notification Service shutdown complete');
            
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    }
}

module.exports = EmailNotificationService;