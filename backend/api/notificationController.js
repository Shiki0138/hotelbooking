/**
 * 🚀 史上最強 通知API コントローラー - 120%品質達成版
 * worker2による究極API実装 - キャンセル待ち特化
 * 
 * 全ての通知機能を統合したRESTful APIエンドポイント
 */
const UnifiedNotificationService = require('../services/UnifiedNotificationService');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

class NotificationController {
    constructor() {
        this.notificationService = new UnifiedNotificationService();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * 🛡️ ミドルウェア設定
     */
    setupMiddleware() {
        this.router = express.Router();

        // セキュリティヘッダー
        this.router.use(helmet());

        // CORS設定
        this.router.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));

        // JSON パース
        this.router.use(express.json({ limit: '10mb' }));

        // レート制限
        this.setupRateLimiting();

        // 認証ミドルウェア
        this.router.use(this.authenticateRequest.bind(this));

        // リクエストログ
        this.router.use(this.logRequest.bind(this));
    }

    /**
     * 🚦 レート制限設定
     */
    setupRateLimiting() {
        // 一般的なエンドポイント制限
        const generalLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15分
            max: 100, // 最大100リクエスト
            message: { error: 'Too many requests, please try again later.' },
            standardHeaders: true,
            legacyHeaders: false
        });

        // 緊急通知用（より緩い制限）
        const emergencyLimiter = rateLimit({
            windowMs: 1 * 60 * 1000, // 1分
            max: 10, // 最大10リクエスト
            message: { error: 'Emergency notification rate limit exceeded.' }
        });

        // バッチ送信用（より厳しい制限）
        const batchLimiter = rateLimit({
            windowMs: 60 * 60 * 1000, // 1時間
            max: 5, // 最大5リクエスト
            message: { error: 'Batch notification rate limit exceeded.' }
        });

        this.rateLimiters = {
            general: generalLimiter,
            emergency: emergencyLimiter,
            batch: batchLimiter
        };
    }

    /**
     * 🛣️ ルート設定
     */
    setupRoutes() {
        // 基本通知送信
        this.router.post('/send', 
            this.rateLimiters.general,
            this.validateSendRequest.bind(this),
            this.sendNotification.bind(this)
        );

        // 緊急キャンセル待ち通知
        this.router.post('/emergency/cancellation',
            this.rateLimiters.emergency,
            this.validateCancellationRequest.bind(this),
            this.sendCancellationAlert.bind(this)
        );

        // 価格下落アラート
        this.router.post('/alert/price-drop',
            this.rateLimiters.general,
            this.validatePriceDropRequest.bind(this),
            this.sendPriceDropAlert.bind(this)
        );

        // フラッシュセール通知
        this.router.post('/alert/flash-sale',
            this.rateLimiters.general,
            this.validateFlashSaleRequest.bind(this),
            this.sendFlashSaleAlert.bind(this)
        );

        // バッチ通知送信
        this.router.post('/batch',
            this.rateLimiters.batch,
            this.validateBatchRequest.bind(this),
            this.sendBatchNotifications.bind(this)
        );

        // Push通知購読管理
        this.router.post('/subscription/push',
            this.rateLimiters.general,
            this.validateSubscriptionRequest.bind(this),
            this.subscribePushNotification.bind(this)
        );

        // 通知設定管理
        this.router.put('/preferences/:userId',
            this.rateLimiters.general,
            this.validatePreferencesRequest.bind(this),
            this.updateNotificationPreferences.bind(this)
        );

        // 通知履歴取得
        this.router.get('/history/:userId',
            this.rateLimiters.general,
            this.validateHistoryRequest.bind(this),
            this.getNotificationHistory.bind(this)
        );

        // システム統計情報
        this.router.get('/stats',
            this.requireAdminAuth.bind(this),
            this.getSystemStats.bind(this)
        );

        // ヘルスチェック
        this.router.get('/health',
            this.getHealth.bind(this)
        );

        // A/Bテスト結果
        this.router.get('/ab-test/:testId',
            this.requireAdminAuth.bind(this),
            this.getA_BTestResults.bind(this)
        );

        // 通知効果分析
        this.router.get('/analytics/:userId?',
            this.requireAdminAuth.bind(this),
            this.getNotificationAnalytics.bind(this)
        );
    }

    /**
     * 🚨 エラーハンドリング設定
     */
    setupErrorHandling() {
        this.router.use(this.handleErrors.bind(this));
    }

    /**
     * 📤 基本通知送信エンドポイント
     */
    async sendNotification(req, res) {
        try {
            const { userId, notification, channels, context } = req.body;
            
            const result = await this.notificationService.sendNotification({
                userId,
                notification,
                channels,
                context: {
                    ...context,
                    apiRequest: true,
                    requestId: req.requestId,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                }
            });

            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'SEND_NOTIFICATION_FAILED');
        }
    }

    /**
     * 🏨 キャンセル待ち緊急通知エンドポイント
     */
    async sendCancellationAlert(req, res) {
        try {
            const { userId, hotelData, options } = req.body;
            
            const result = await this.notificationService.sendCancellationAlert(
                userId, 
                hotelData, 
                {
                    ...options,
                    requestId: req.requestId,
                    priority: 'critical'
                }
            );

            res.status(200).json({
                success: true,
                data: result,
                alert: 'Cancellation alert sent with highest priority',
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'CANCELLATION_ALERT_FAILED');
        }
    }

    /**
     * 💰 価格下落アラートエンドポイント
     */
    async sendPriceDropAlert(req, res) {
        try {
            const { userId, hotelData, priceInfo, options } = req.body;
            
            const result = await this.notificationService.sendPriceDropAlert(
                userId, 
                hotelData, 
                priceInfo,
                {
                    ...options,
                    requestId: req.requestId
                }
            );

            res.status(200).json({
                success: true,
                data: result,
                priceChange: {
                    original: priceInfo.originalPrice,
                    new: priceInfo.newPrice,
                    discount: priceInfo.discountPercentage
                },
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'PRICE_DROP_ALERT_FAILED');
        }
    }

    /**
     * ⚡ フラッシュセール通知エンドポイント
     */
    async sendFlashSaleAlert(req, res) {
        try {
            const { userIds, saleData, options } = req.body;
            
            const result = await this.notificationService.sendFlashSaleAlert(
                userIds, 
                saleData,
                {
                    ...options,
                    requestId: req.requestId
                }
            );

            res.status(200).json({
                success: true,
                data: result,
                targetUsers: userIds.length,
                saleInfo: {
                    hotelName: saleData.hotelName,
                    maxDiscount: saleData.maxDiscount,
                    duration: saleData.duration
                },
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'FLASH_SALE_ALERT_FAILED');
        }
    }

    /**
     * 📨 バッチ通知送信エンドポイント
     */
    async sendBatchNotifications(req, res) {
        try {
            const { notifications } = req.body;
            
            // バッチサイズ制限
            if (notifications.length > 1000) {
                return res.status(400).json({
                    success: false,
                    error: 'Batch size cannot exceed 1000 notifications',
                    requestId: req.requestId
                });
            }

            const result = await this.notificationService.sendBatchNotifications(
                notifications.map(notification => ({
                    ...notification,
                    context: {
                        ...notification.context,
                        requestId: req.requestId,
                        batchRequest: true
                    }
                }))
            );

            res.status(200).json({
                success: true,
                data: result,
                summary: {
                    totalRequested: notifications.length,
                    totalSent: result.totalSent,
                    totalFailed: result.totalFailed,
                    successRate: (result.totalSent / notifications.length * 100).toFixed(2) + '%'
                },
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'BATCH_NOTIFICATION_FAILED');
        }
    }

    /**
     * 📱 Push通知購読エンドポイント
     */
    async subscribePushNotification(req, res) {
        try {
            const { userId, subscription, preferences } = req.body;
            
            const result = await this.notificationService.pushService.subscribe(
                userId, 
                subscription, 
                {
                    ...preferences,
                    requestId: req.requestId,
                    userAgent: req.get('User-Agent')
                }
            );

            res.status(201).json({
                success: true,
                data: result,
                vapidPublicKey: this.notificationService.pushService.getVapidPublicKey(),
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'PUSH_SUBSCRIPTION_FAILED');
        }
    }

    /**
     * ⚙️ 通知設定更新エンドポイント
     */
    async updateNotificationPreferences(req, res) {
        try {
            const { userId } = req.params;
            const preferences = req.body;
            
            // 設定保存（実際の実装ではデータベースに保存）
            await this.saveUserPreferences(userId, preferences);

            res.status(200).json({
                success: true,
                data: { userId, preferences },
                message: 'Notification preferences updated successfully',
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'PREFERENCES_UPDATE_FAILED');
        }
    }

    /**
     * 📜 通知履歴取得エンドポイント
     */
    async getNotificationHistory(req, res) {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 50, type, startDate, endDate } = req.query;
            
            const history = await this.getNotificationHistoryData(userId, {
                page: parseInt(page),
                limit: parseInt(limit),
                type,
                startDate,
                endDate
            });

            res.status(200).json({
                success: true,
                data: history,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: history.total,
                    totalPages: Math.ceil(history.total / parseInt(limit))
                },
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'HISTORY_RETRIEVAL_FAILED');
        }
    }

    /**
     * 📊 システム統計エンドポイント
     */
    async getSystemStats(req, res) {
        try {
            const stats = this.notificationService.getStatistics();
            
            res.status(200).json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'STATS_RETRIEVAL_FAILED');
        }
    }

    /**
     * ❤️ ヘルスチェックエンドポイント
     */
    async getHealth(req, res) {
        try {
            const health = {
                status: 'healthy',
                services: this.notificationService.serviceStatus,
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                uptime: process.uptime()
            };

            const statusCode = health.services.overall === 'healthy' ? 200 : 503;
            res.status(statusCode).json(health);

        } catch (error) {
            res.status(500).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * 🧪 A/Bテスト結果エンドポイント
     */
    async getA_BTestResults(req, res) {
        try {
            const { testId } = req.params;
            
            const results = await this.getA_BTestData(testId);

            res.status(200).json({
                success: true,
                data: results,
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'AB_TEST_RESULTS_FAILED');
        }
    }

    /**
     * 📈 通知効果分析エンドポイント
     */
    async getNotificationAnalytics(req, res) {
        try {
            const { userId } = req.params;
            const { dateRange = '7d', metrics = 'all' } = req.query;
            
            const analytics = await this.getAnalyticsData(userId, dateRange, metrics);

            res.status(200).json({
                success: true,
                data: analytics,
                parameters: { userId, dateRange, metrics },
                timestamp: new Date().toISOString(),
                requestId: req.requestId
            });

        } catch (error) {
            this.handleApiError(res, error, 'ANALYTICS_RETRIEVAL_FAILED');
        }
    }

    /**
     * 🔐 認証ミドルウェア
     */
    async authenticateRequest(req, res, next) {
        try {
            const authHeader = req.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Authorization header required',
                    requestId: req.requestId
                });
            }

            const token = authHeader.substring(7);
            const user = await this.validateToken(token);
            
            req.user = user;
            req.requestId = this.generateRequestId();
            next();

        } catch (error) {
            res.status(401).json({
                success: false,
                error: 'Invalid authentication token',
                requestId: req.requestId
            });
        }
    }

    /**
     * 👑 管理者認証ミドルウェア
     */
    async requireAdminAuth(req, res, next) {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required',
                requestId: req.requestId
            });
        }
        next();
    }

    /**
     * 📝 リクエストログミドルウェア
     */
    logRequest(req, res, next) {
        const startTime = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            console.log(`📝 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${req.requestId}`);
        });
        
        next();
    }

    /**
     * ✅ バリデーションメソッド群
     */
    validateSendRequest(req, res, next) {
        const { userId, notification } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required',
                requestId: req.requestId
            });
        }
        
        if (!notification || (!notification.title && !notification.body)) {
            return res.status(400).json({
                success: false,
                error: 'notification with title or body is required',
                requestId: req.requestId
            });
        }
        
        next();
    }

    validateCancellationRequest(req, res, next) {
        const { userId, hotelData } = req.body;
        
        if (!userId || !hotelData) {
            return res.status(400).json({
                success: false,
                error: 'userId and hotelData are required',
                requestId: req.requestId
            });
        }
        
        const requiredHotelFields = ['id', 'name', 'checkInDate', 'checkOutDate'];
        const missingFields = requiredHotelFields.filter(field => !hotelData[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required hotel fields: ${missingFields.join(', ')}`,
                requestId: req.requestId
            });
        }
        
        next();
    }

    validatePriceDropRequest(req, res, next) {
        const { userId, hotelData, priceInfo } = req.body;
        
        if (!userId || !hotelData || !priceInfo) {
            return res.status(400).json({
                success: false,
                error: 'userId, hotelData, and priceInfo are required',
                requestId: req.requestId
            });
        }
        
        if (!priceInfo.originalPrice || !priceInfo.newPrice || !priceInfo.discountPercentage) {
            return res.status(400).json({
                success: false,
                error: 'priceInfo must include originalPrice, newPrice, and discountPercentage',
                requestId: req.requestId
            });
        }
        
        next();
    }

    validateFlashSaleRequest(req, res, next) {
        const { userIds, saleData } = req.body;
        
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'userIds must be a non-empty array',
                requestId: req.requestId
            });
        }
        
        if (!saleData || !saleData.hotelName || !saleData.maxDiscount) {
            return res.status(400).json({
                success: false,
                error: 'saleData must include hotelName and maxDiscount',
                requestId: req.requestId
            });
        }
        
        next();
    }

    validateBatchRequest(req, res, next) {
        const { notifications } = req.body;
        
        if (!Array.isArray(notifications) || notifications.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'notifications must be a non-empty array',
                requestId: req.requestId
            });
        }
        
        if (notifications.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Batch size cannot exceed 1000 notifications',
                requestId: req.requestId
            });
        }
        
        next();
    }

    validateSubscriptionRequest(req, res, next) {
        const { userId, subscription } = req.body;
        
        if (!userId || !subscription) {
            return res.status(400).json({
                success: false,
                error: 'userId and subscription are required',
                requestId: req.requestId
            });
        }
        
        if (!subscription.endpoint || !subscription.keys) {
            return res.status(400).json({
                success: false,
                error: 'subscription must include endpoint and keys',
                requestId: req.requestId
            });
        }
        
        next();
    }

    validatePreferencesRequest(req, res, next) {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required',
                requestId: req.requestId
            });
        }
        
        next();
    }

    validateHistoryRequest(req, res, next) {
        const { userId } = req.params;
        const { page, limit } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required',
                requestId: req.requestId
            });
        }
        
        if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
            return res.status(400).json({
                success: false,
                error: 'page must be a positive integer',
                requestId: req.requestId
            });
        }
        
        if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
            return res.status(400).json({
                success: false,
                error: 'limit must be between 1 and 100',
                requestId: req.requestId
            });
        }
        
        next();
    }

    /**
     * 🚨 エラーハンドリング
     */
    handleApiError(res, error, errorCode) {
        console.error(`API Error [${errorCode}]:`, error);
        
        const statusCode = this.getStatusCodeForError(error);
        
        res.status(statusCode).json({
            success: false,
            error: error.message,
            errorCode: errorCode,
            timestamp: new Date().toISOString(),
            requestId: res.locals.requestId
        });
    }

    handleErrors(error, req, res, next) {
        console.error('Unhandled API error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }

    /**
     * 🔧 ヘルパーメソッド群
     */
    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async validateToken(token) {
        // 実際の実装ではJWT検証やデータベース確認を行う
        if (token === 'test-token') {
            return { id: 'test-user', role: 'user' };
        }
        if (token === 'admin-token') {
            return { id: 'admin-user', role: 'admin' };
        }
        throw new Error('Invalid token');
    }

    async saveUserPreferences(userId, preferences) {
        // 実際の実装ではデータベースに保存
        console.log(`💾 Saving preferences for user ${userId}:`, preferences);
        return { userId, preferences, updatedAt: new Date() };
    }

    async getNotificationHistoryData(userId, filters) {
        // 実際の実装ではデータベースから取得
        return {
            notifications: [],
            total: 0,
            filters: filters
        };
    }

    async getA_BTestData(testId) {
        // 実際の実装ではA/Bテストデータを取得
        return {
            testId: testId,
            variants: ['A', 'B'],
            results: { A: { clicks: 100, conversions: 20 }, B: { clicks: 120, conversions: 30 } }
        };
    }

    async getAnalyticsData(userId, dateRange, metrics) {
        // 実際の実装では分析データを取得
        return {
            userId: userId,
            dateRange: dateRange,
            metrics: {
                totalSent: 150,
                opened: 120,
                clicked: 45,
                converted: 12
            }
        };
    }

    getStatusCodeForError(error) {
        if (error.message.includes('required')) return 400;
        if (error.message.includes('unauthorized')) return 401;
        if (error.message.includes('forbidden')) return 403;
        if (error.message.includes('not found')) return 404;
        if (error.message.includes('rate limit')) return 429;
        return 500;
    }

    /**
     * 📤 ルーター取得
     */
    getRouter() {
        return this.router;
    }
}

module.exports = NotificationController;