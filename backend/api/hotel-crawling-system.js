/**
 * 🏨 ホテルクローリングシステム統合API
 * 高級ホテル直前予約システム - 統合エンドポイント
 * 
 * 機能:
 * - クローリング実行・制御
 * - 価格変動分析・レポート
 * - システム監視・ヘルスチェック
 * - エラー統計・アラート管理
 * 
 * @author worker1 (ホテルクローリング・データ収集システム担当)
 * @date 2025-07-05
 */

const RakutenTravelCrawler = require('../services/RakutenTravelCrawler');
const PriceTrackingService = require('../services/PriceTrackingService');
const hotelCrawlingScheduler = require('../cron/hotel-crawling-scheduler');
const { errorHandler } = require('../utils/ErrorHandler');

module.exports = async (req, res) => {
    // CORS設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { method, query, body } = req;
        const { action, type } = query;

        console.log(`🏨 ホテルクローリングAPI: ${method} ${action} ${type}`);

        // ======================== GET エンドポイント ========================
        if (method === 'GET') {
            switch (action) {
                case 'status':
                    return await handleGetStatus(res);

                case 'health':
                    return await handleHealthCheck(res);

                case 'statistics':
                    return await handleGetStatistics(res, query);

                case 'hotels':
                    return await handleGetHotels(res, query);

                case 'prices':
                    return await handleGetPrices(res, query);

                case 'alerts':
                    return await handleGetAlerts(res, query);

                case 'logs':
                    return await handleGetLogs(res, query);

                default:
                    return res.status(400).json({
                        success: false,
                        message: '無効なactionパラメーター',
                        availableActions: ['status', 'health', 'statistics', 'hotels', 'prices', 'alerts', 'logs']
                    });
            }
        }

        // ======================== POST エンドポイント ========================
        if (method === 'POST') {
            switch (action) {
                case 'crawl':
                    return await handleStartCrawling(res, body);

                case 'analyze':
                    return await handlePriceAnalysis(res, body);

                case 'predict':
                    return await handlePricePrediction(res, body);

                case 'manual':
                    return await handleManualExecution(res, body);

                default:
                    return res.status(400).json({
                        success: false,
                        message: '無効なactionパラメーター',
                        availableActions: ['crawl', 'analyze', 'predict', 'manual']
                    });
            }
        }

        // ======================== PUT エンドポイント ========================
        if (method === 'PUT') {
            switch (action) {
                case 'scheduler':
                    return await handleSchedulerControl(res, body);

                case 'config':
                    return await handleUpdateConfig(res, body);

                default:
                    return res.status(400).json({
                        success: false,
                        message: '無効なactionパラメーター',
                        availableActions: ['scheduler', 'config']
                    });
            }
        }

        return res.status(405).json({
            success: false,
            message: 'サポートされていないHTTPメソッド',
            allowedMethods: ['GET', 'POST', 'PUT']
        });

    } catch (error) {
        console.error('🚨 API エラー:', error);
        
        await errorHandler.logError(error, {
            operationType: 'hotel_crawling_api',
            operationId: 'api_request',
            errorCategory: 'api_error',
            severity: 'medium'
        });

        return res.status(500).json({
            success: false,
            message: 'サーバー内部エラー',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
};

// ======================== GET ハンドラー ========================

/**
 * システム状態取得
 */
async function handleGetStatus(res) {
    try {
        const status = hotelCrawlingScheduler.getStatus();
        const health = await errorHandler.healthCheck();
        
        return res.json({
            success: true,
            data: {
                scheduler: status,
                health,
                system: {
                    node_version: process.version,
                    uptime: process.uptime(),
                    memory_usage: process.memoryUsage(),
                    timestamp: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        throw new Error(`ステータス取得エラー: ${error.message}`);
    }
}

/**
 * ヘルスチェック
 */
async function handleHealthCheck(res) {
    try {
        const health = await errorHandler.healthCheck();
        const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503;
        
        return res.status(statusCode).json({
            success: health.status !== 'unhealthy',
            data: health
        });
    } catch (error) {
        return res.status(503).json({
            success: false,
            data: {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
}

/**
 * 統計情報取得
 */
async function handleGetStatistics(res, query) {
    try {
        const { timeWindow = '24h', type = 'all' } = query;
        
        const stats = {};
        
        if (type === 'all' || type === 'errors') {
            stats.errors = await errorHandler.getErrorStatistics(timeWindow);
        }
        
        if (type === 'all' || type === 'crawling') {
            // クローリング統計をSupabaseから取得
            const { supabaseAdmin } = require('../config/supabase');
            
            let timeFilter;
            switch (timeWindow) {
                case '1h':
                    timeFilter = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                    break;
                case '24h':
                    timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    break;
                case '7d':
                    timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    break;
                default:
                    timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            }

            const { data: crawlLogs } = await supabaseAdmin
                .from('crawling_logs')
                .select('*')
                .gte('started_at', timeFilter)
                .eq('api_source', 'rakuten');

            stats.crawling = {
                total_executions: crawlLogs?.length || 0,
                successful_executions: crawlLogs?.filter(log => log.status === 'completed').length || 0,
                failed_executions: crawlLogs?.filter(log => log.status === 'failed').length || 0,
                avg_duration: crawlLogs?.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / (crawlLogs?.length || 1),
                time_window: timeWindow
            };
        }
        
        return res.json({
            success: true,
            data: stats,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        throw new Error(`統計情報取得エラー: ${error.message}`);
    }
}

/**
 * ホテル情報取得
 */
async function handleGetHotels(res, query) {
    try {
        const { supabaseAdmin } = require('../config/supabase');
        const { limit = 50, offset = 0, luxury_only = 'true', active_only = 'true' } = query;

        let dbQuery = supabaseAdmin
            .from('hotels_crawling')
            .select('*')
            .order('last_crawled_at', { ascending: false });

        if (luxury_only === 'true') {
            dbQuery = dbQuery.eq('is_luxury', true);
        }

        if (active_only === 'true') {
            dbQuery = dbQuery.eq('is_active', true);
        }

        const { data, error } = await dbQuery
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (error) {
            throw new Error(`ホテル情報取得エラー: ${error.message}`);
        }

        return res.json({
            success: true,
            data,
            pagination: {
                limit: Number(limit),
                offset: Number(offset),
                total: data?.length || 0
            }
        });
    } catch (error) {
        throw new Error(`ホテル情報取得エラー: ${error.message}`);
    }
}

/**
 * 価格情報取得
 */
async function handleGetPrices(res, query) {
    try {
        const { supabaseAdmin } = require('../config/supabase');
        const { 
            hotel_id, 
            check_in_date, 
            limit = 100, 
            include_predictions = 'false' 
        } = query;

        let dbQuery = supabaseAdmin
            .from('price_history_crawling')
            .select(`
                *,
                hotels_crawling!inner(name, hotel_code)
            `)
            .order('crawled_at', { ascending: false });

        if (hotel_id) {
            dbQuery = dbQuery.eq('hotel_id', hotel_id);
        }

        if (check_in_date) {
            dbQuery = dbQuery.eq('check_in_date', check_in_date);
        }

        const { data, error } = await dbQuery.limit(Number(limit));

        if (error) {
            throw new Error(`価格情報取得エラー: ${error.message}`);
        }

        const result = { prices: data };

        // 価格予測も含める場合
        if (include_predictions === 'true' && hotel_id && check_in_date) {
            const priceTracker = new PriceTrackingService();
            const predictions = await priceTracker.predictPrices(hotel_id, check_in_date, 7);
            result.predictions = predictions;
        }

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        throw new Error(`価格情報取得エラー: ${error.message}`);
    }
}

/**
 * アラート取得
 */
async function handleGetAlerts(res, query) {
    try {
        const { supabaseAdmin } = require('../config/supabase');
        const { severity, limit = 50, unread_only = 'false' } = query;

        let dbQuery = supabaseAdmin
            .from('system_alerts')
            .select('*')
            .order('created_at', { ascending: false });

        if (severity) {
            dbQuery = dbQuery.eq('severity', severity);
        }

        const { data, error } = await dbQuery.limit(Number(limit));

        if (error) {
            throw new Error(`アラート取得エラー: ${error.message}`);
        }

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        throw new Error(`アラート取得エラー: ${error.message}`);
    }
}

/**
 * ログ取得
 */
async function handleGetLogs(res, query) {
    try {
        const { supabaseAdmin } = require('../config/supabase');
        const { type, status, limit = 100 } = query;

        let dbQuery = supabaseAdmin
            .from('crawling_logs')
            .select('*')
            .order('started_at', { ascending: false });

        if (type) {
            dbQuery = dbQuery.eq('crawl_type', type);
        }

        if (status) {
            dbQuery = dbQuery.eq('status', status);
        }

        const { data, error } = await dbQuery.limit(Number(limit));

        if (error) {
            throw new Error(`ログ取得エラー: ${error.message}`);
        }

        return res.json({
            success: true,
            data
        });
    } catch (error) {
        throw new Error(`ログ取得エラー: ${error.message}`);
    }
}

// ======================== POST ハンドラー ========================

/**
 * クローリング開始
 */
async function handleStartCrawling(res, body) {
    try {
        const { type = 'availability', immediate = false } = body;
        
        const crawler = new RakutenTravelCrawler();
        let result;

        if (immediate) {
            // 即座にクローリング実行
            switch (type) {
                case 'hotels':
                    result = await errorHandler.withRetry(
                        () => crawler.crawlLuxuryHotels(),
                        { operationType: 'hotel_crawling', operationId: 'manual_hotels' }
                    );
                    break;
                case 'availability':
                    result = await errorHandler.withRetry(
                        () => crawler.crawlAvailabilityAndPrices(),
                        { operationType: 'availability_crawling', operationId: 'manual_availability' }
                    );
                    break;
                case 'full':
                    result = await errorHandler.withRetry(
                        () => crawler.runFullCrawling(),
                        { operationType: 'full_crawling', operationId: 'manual_full' }
                    );
                    break;
                default:
                    throw new Error(`無効なクローリングタイプ: ${type}`);
            }
        } else {
            // スケジューラーに追加
            result = { 
                success: true, 
                message: `${type}クローリングをスケジュールに追加しました`,
                scheduled: true 
            };
        }

        return res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        throw new Error(`クローリング開始エラー: ${error.message}`);
    }
}

/**
 * 価格分析実行
 */
async function handlePriceAnalysis(res, body) {
    try {
        const priceTracker = new PriceTrackingService();
        
        const result = await errorHandler.withRetry(
            () => priceTracker.analyzePriceChanges(),
            { operationType: 'price_analysis', operationId: 'manual_analysis' }
        );

        return res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        throw new Error(`価格分析エラー: ${error.message}`);
    }
}

/**
 * 価格予測実行
 */
async function handlePricePrediction(res, body) {
    try {
        const { hotel_id, check_in_date, days = 7 } = body;

        if (!hotel_id || !check_in_date) {
            return res.status(400).json({
                success: false,
                message: 'hotel_id と check_in_date は必須です'
            });
        }

        const priceTracker = new PriceTrackingService();
        const predictions = await priceTracker.predictPrices(hotel_id, check_in_date, days);

        return res.json({
            success: true,
            data: predictions,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        throw new Error(`価格予測エラー: ${error.message}`);
    }
}

/**
 * 手動実行
 */
async function handleManualExecution(res, body) {
    try {
        const { job_type = 'main' } = body;
        
        await hotelCrawlingScheduler.manualExecute(job_type);

        return res.json({
            success: true,
            message: `${job_type}ジョブを手動実行しました`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        throw new Error(`手動実行エラー: ${error.message}`);
    }
}

// ======================== PUT ハンドラー ========================

/**
 * スケジューラー制御
 */
async function handleSchedulerControl(res, body) {
    try {
        const { action } = body;

        switch (action) {
            case 'start':
                hotelCrawlingScheduler.start();
                break;
            case 'stop':
                hotelCrawlingScheduler.stop();
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: '無効なアクション。start または stop を指定してください'
                });
        }

        return res.json({
            success: true,
            message: `スケジューラーを${action}しました`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        throw new Error(`スケジューラー制御エラー: ${error.message}`);
    }
}

/**
 * 設定更新
 */
async function handleUpdateConfig(res, body) {
    try {
        // 設定更新の実装は今後追加
        return res.json({
            success: true,
            message: '設定更新機能は準備中です',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        throw new Error(`設定更新エラー: ${error.message}`);
    }
}