/**
 * 🛡️ エラーハンドリング・リトライシステム
 * 高級ホテルクローリングシステム専用エラー管理
 * 
 * 機能:
 * - 指数バックオフによるリトライ機能
 * - API制限・レート制限の自動処理
 * - エラー分類・ログ記録
 * - アラート・通知システム
 * 
 * @author worker1 (ホテルクローリング・データ収集システム担当)
 * @date 2025-07-05
 */

const { supabaseAdmin } = require('../config/supabase');

class ErrorHandler {
    constructor() {
        this.retryConfig = {
            maxAttempts: 3,
            baseDelay: 1000,      // 1秒
            maxDelay: 30000,      // 30秒
            backoffMultiplier: 2,
            jitterEnabled: true
        };

        this.errorCategories = {
            NETWORK_ERROR: 'network_error',
            API_RATE_LIMIT: 'api_rate_limit',
            API_QUOTA_EXCEEDED: 'api_quota_exceeded',
            AUTHENTICATION_ERROR: 'authentication_error',
            DATABASE_ERROR: 'database_error',
            VALIDATION_ERROR: 'validation_error',
            TIMEOUT_ERROR: 'timeout_error',
            UNKNOWN_ERROR: 'unknown_error'
        };

        this.severityLevels = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };

        this.alertThresholds = {
            error_rate: 0.20,        // 20%のエラー率でアラート
            consecutive_failures: 5,  // 連続5回失敗でアラート
            critical_errors: 1,      // クリティカルエラー1回でアラート
            database_errors: 3       // DB エラー3回でアラート
        };

        this.circuitBreakers = new Map();
        this.errorCounts = new Map();
        this.lastErrors = new Map();
    }

    /**
     * リトライ付きでfunction実行
     */
    async withRetry(operation, context = {}, customConfig = {}) {
        const config = { ...this.retryConfig, ...customConfig };
        let lastError;

        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            try {
                const result = await operation();
                
                // 成功時はエラーカウンターをリセット
                this.resetErrorCounter(context.operationId);
                
                return result;

            } catch (error) {
                lastError = error;
                
                // エラーを分類
                const errorCategory = this.categorizeError(error);
                const severity = this.determineSeverity(error, errorCategory);
                
                // エラー記録
                await this.logError(error, {
                    ...context,
                    attempt,
                    maxAttempts: config.maxAttempts,
                    errorCategory,
                    severity
                });

                // 最終試行でない場合はリトライ
                if (attempt < config.maxAttempts) {
                    const shouldRetry = this.shouldRetry(error, errorCategory, attempt);
                    
                    if (shouldRetry) {
                        const delay = this.calculateDelay(attempt, config);
                        console.log(`🔄 リトライ ${attempt}/${config.maxAttempts} - ${delay}ms後に再実行`);
                        await this.sleep(delay);
                        continue;
                    }
                }

                // リトライ回数上限に達した場合
                console.error(`❌ 最大リトライ回数到達: ${error.message}`);
                
                // エラーカウンター更新
                this.incrementErrorCounter(context.operationId);
                
                // サーキットブレーカー確認
                await this.checkCircuitBreaker(context.operationId, error);
                
                throw new RetryExhaustedError(error, attempt, context);
            }
        }
    }

    /**
     * エラー分類
     */
    categorizeError(error) {
        const message = error.message?.toLowerCase() || '';
        const status = error.response?.status;

        // ステータスコードベースの分類
        if (status === 429) return this.errorCategories.API_RATE_LIMIT;
        if (status === 401 || status === 403) return this.errorCategories.AUTHENTICATION_ERROR;
        if (status === 402 || status === 413) return this.errorCategories.API_QUOTA_EXCEEDED;
        if (status >= 500) return this.errorCategories.NETWORK_ERROR;

        // エラーメッセージベースの分類
        if (message.includes('timeout') || message.includes('etimedout')) {
            return this.errorCategories.TIMEOUT_ERROR;
        }
        if (message.includes('network') || message.includes('enotfound') || message.includes('econnreset')) {
            return this.errorCategories.NETWORK_ERROR;
        }
        if (message.includes('database') || message.includes('postgres') || message.includes('supabase')) {
            return this.errorCategories.DATABASE_ERROR;
        }
        if (message.includes('validation') || message.includes('invalid')) {
            return this.errorCategories.VALIDATION_ERROR;
        }

        return this.errorCategories.UNKNOWN_ERROR;
    }

    /**
     * 重要度判定
     */
    determineSeverity(error, category) {
        // カテゴリベースの重要度
        if (category === this.errorCategories.AUTHENTICATION_ERROR) return this.severityLevels.CRITICAL;
        if (category === this.errorCategories.DATABASE_ERROR) return this.severityLevels.HIGH;
        if (category === this.errorCategories.API_QUOTA_EXCEEDED) return this.severityLevels.HIGH;
        if (category === this.errorCategories.API_RATE_LIMIT) return this.severityLevels.MEDIUM;
        if (category === this.errorCategories.TIMEOUT_ERROR) return this.severityLevels.MEDIUM;
        if (category === this.errorCategories.NETWORK_ERROR) return this.severityLevels.LOW;
        
        return this.severityLevels.LOW;
    }

    /**
     * リトライ可否判定
     */
    shouldRetry(error, category, attempt) {
        // 認証エラーはリトライしない
        if (category === this.errorCategories.AUTHENTICATION_ERROR) return false;
        
        // バリデーションエラーはリトライしない
        if (category === this.errorCategories.VALIDATION_ERROR) return false;
        
        // レート制限は長い待機時間でリトライ
        if (category === this.errorCategories.API_RATE_LIMIT) return true;
        
        // その他のエラーは基本的にリトライ
        return true;
    }

    /**
     * 遅延時間計算（指数バックオフ + ジッター）
     */
    calculateDelay(attempt, config) {
        let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        
        // 最大遅延時間制限
        delay = Math.min(delay, config.maxDelay);
        
        // ジッター追加（ランダムな変動）
        if (config.jitterEnabled) {
            const jitter = delay * 0.1 * Math.random(); // ±10%のランダム変動
            delay += jitter;
        }
        
        return Math.floor(delay);
    }

    /**
     * 待機
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * エラーログ記録
     */
    async logError(error, context) {
        try {
            const errorLog = {
                error_category: context.errorCategory,
                severity: context.severity,
                error_message: error.message,
                error_stack: error.stack,
                context: {
                    operation_id: context.operationId,
                    operation_type: context.operationType,
                    attempt: context.attempt,
                    max_attempts: context.maxAttempts,
                    hotel_id: context.hotelId,
                    api_source: context.apiSource,
                    request_url: error.config?.url,
                    request_method: error.config?.method,
                    response_status: error.response?.status,
                    response_data: error.response?.data
                },
                occurred_at: new Date().toISOString()
            };

            const { error: logError } = await supabaseAdmin
                .from('error_logs')
                .insert(errorLog);

            if (logError) {
                console.error('エラーログ記録失敗:', logError);
            }

            // 重要度が高い場合はアラート送信
            if (context.severity === this.severityLevels.CRITICAL || 
                context.severity === this.severityLevels.HIGH) {
                await this.sendErrorAlert(error, context);
            }

        } catch (logError) {
            console.error('エラーログ記録例外:', logError);
        }
    }

    /**
     * エラーカウンター管理
     */
    incrementErrorCounter(operationId) {
        if (!operationId) return;
        
        const current = this.errorCounts.get(operationId) || 0;
        this.errorCounts.set(operationId, current + 1);
        this.lastErrors.set(operationId, new Date());
    }

    resetErrorCounter(operationId) {
        if (!operationId) return;
        
        this.errorCounts.delete(operationId);
        this.lastErrors.delete(operationId);
    }

    /**
     * サーキットブレーカー確認
     */
    async checkCircuitBreaker(operationId, error) {
        if (!operationId) return;

        const errorCount = this.errorCounts.get(operationId) || 0;
        
        // 連続失敗回数が閾値を超えた場合
        if (errorCount >= this.alertThresholds.consecutive_failures) {
            const circuitBreaker = {
                operation_id: operationId,
                error_count: errorCount,
                last_error: error.message,
                opened_at: new Date().toISOString(),
                status: 'open'
            };

            this.circuitBreakers.set(operationId, circuitBreaker);

            await this.sendCircuitBreakerAlert(operationId, errorCount);
            
            console.warn(`⚡ サーキットブレーカー作動: ${operationId} (連続${errorCount}回エラー)`);
        }
    }

    /**
     * エラーアラート送信
     */
    async sendErrorAlert(error, context) {
        try {
            const alertData = {
                alert_type: 'error_alert',
                severity: context.severity,
                title: `${context.severity.toUpperCase()} Error: ${context.operationType}`,
                message: this.formatErrorMessage(error, context),
                error_details: {
                    category: context.errorCategory,
                    operation_id: context.operationId,
                    attempt: context.attempt,
                    error_message: error.message,
                    timestamp: new Date().toISOString()
                },
                created_at: new Date().toISOString()
            };

            await supabaseAdmin
                .from('system_alerts')
                .insert(alertData);

            console.log(`🚨 エラーアラート送信: ${context.severity} - ${error.message}`);

        } catch (alertError) {
            console.error('エラーアラート送信失敗:', alertError);
        }
    }

    /**
     * サーキットブレーカーアラート送信
     */
    async sendCircuitBreakerAlert(operationId, errorCount) {
        try {
            const alertData = {
                alert_type: 'circuit_breaker',
                severity: this.severityLevels.CRITICAL,
                title: `Circuit Breaker Opened: ${operationId}`,
                message: `Operation ${operationId} has failed ${errorCount} consecutive times. Circuit breaker is now open.`,
                error_details: {
                    operation_id: operationId,
                    consecutive_failures: errorCount,
                    threshold: this.alertThresholds.consecutive_failures,
                    timestamp: new Date().toISOString()
                },
                created_at: new Date().toISOString()
            };

            await supabaseAdmin
                .from('system_alerts')
                .insert(alertData);

        } catch (alertError) {
            console.error('サーキットブレーカーアラート送信失敗:', alertError);
        }
    }

    /**
     * エラーメッセージフォーマット
     */
    formatErrorMessage(error, context) {
        let message = `Operation: ${context.operationType}\\n`;
        message += `Category: ${context.errorCategory}\\n`;
        message += `Attempt: ${context.attempt}/${context.maxAttempts}\\n`;
        message += `Error: ${error.message}\\n`;
        
        if (error.response?.status) {
            message += `HTTP Status: ${error.response.status}\\n`;
        }
        
        if (context.hotelId) {
            message += `Hotel ID: ${context.hotelId}\\n`;
        }
        
        message += `Timestamp: ${new Date().toLocaleString('ja-JP')}`;
        
        return message;
    }

    /**
     * エラー統計取得
     */
    async getErrorStatistics(timeWindow = '24h') {
        try {
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

            const { data: errorLogs, error } = await supabaseAdmin
                .from('error_logs')
                .select('*')
                .gte('occurred_at', timeFilter);

            if (error) {
                throw new Error(`エラー統計取得失敗: ${error.message}`);
            }

            // 統計計算
            const stats = {
                total_errors: errorLogs.length,
                by_category: {},
                by_severity: {},
                error_rate_by_hour: {},
                top_error_messages: {},
                time_window: timeWindow,
                generated_at: new Date().toISOString()
            };

            // カテゴリ別集計
            errorLogs.forEach(log => {
                stats.by_category[log.error_category] = (stats.by_category[log.error_category] || 0) + 1;
                stats.by_severity[log.severity] = (stats.by_severity[log.severity] || 0) + 1;
                
                const errorKey = log.error_message.substring(0, 100);
                stats.top_error_messages[errorKey] = (stats.top_error_messages[errorKey] || 0) + 1;
                
                const hour = new Date(log.occurred_at).getHours();
                stats.error_rate_by_hour[hour] = (stats.error_rate_by_hour[hour] || 0) + 1;
            });

            return stats;

        } catch (error) {
            console.error('エラー統計取得エラー:', error);
            return { error: error.message };
        }
    }

    /**
     * システムヘルスチェック
     */
    async healthCheck() {
        const health = {
            status: 'healthy',
            checks: {},
            timestamp: new Date().toISOString()
        };

        try {
            // データベース接続チェック
            const { error: dbError } = await supabaseAdmin
                .from('hotels_crawling')
                .select('id')
                .limit(1);

            health.checks.database = dbError ? 'unhealthy' : 'healthy';
            if (dbError) health.status = 'degraded';

            // エラー率チェック
            const recentStats = await this.getErrorStatistics('1h');
            const errorRate = recentStats.total_errors / 60; // 1時間あたりのエラー数
            
            health.checks.error_rate = {
                status: errorRate < 10 ? 'healthy' : errorRate < 20 ? 'warning' : 'unhealthy',
                errors_per_hour: errorRate
            };

            if (health.checks.error_rate.status === 'unhealthy') {
                health.status = 'unhealthy';
            } else if (health.checks.error_rate.status === 'warning') {
                health.status = 'degraded';
            }

            // サーキットブレーカー状態チェック
            const openCircuits = Array.from(this.circuitBreakers.values())
                .filter(cb => cb.status === 'open');

            health.checks.circuit_breakers = {
                status: openCircuits.length === 0 ? 'healthy' : 'warning',
                open_circuits: openCircuits.length
            };

            if (openCircuits.length > 0) {
                health.status = 'degraded';
            }

        } catch (error) {
            health.status = 'unhealthy';
            health.error = error.message;
        }

        return health;
    }
}

/**
 * カスタムエラークラス
 */
class RetryExhaustedError extends Error {
    constructor(originalError, attempts, context) {
        super(`Retry exhausted after ${attempts} attempts: ${originalError.message}`);
        this.name = 'RetryExhaustedError';
        this.originalError = originalError;
        this.attempts = attempts;
        this.context = context;
    }
}

class CircuitBreakerError extends Error {
    constructor(operationId) {
        super(`Circuit breaker is open for operation: ${operationId}`);
        this.name = 'CircuitBreakerError';
        this.operationId = operationId;
    }
}

// シングルトンインスタンス
const errorHandler = new ErrorHandler();

module.exports = {
    ErrorHandler,
    RetryExhaustedError,
    CircuitBreakerError,
    errorHandler
};