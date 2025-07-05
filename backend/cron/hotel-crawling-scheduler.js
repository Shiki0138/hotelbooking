/**
 * 🕐 ホテルクローリング・スケジューラー
 * 15分間隔での自動クローリング実行システム
 * 
 * 機能:
 * - 楽天トラベルAPIの定期実行
 * - 価格変動の自動追跡
 * - エラーハンドリング・リトライ機能
 * - ログ記録・モニタリング
 * 
 * @author worker1 (ホテルクローリング・データ収集システム担当)
 * @date 2025-07-05
 */

const cron = require('node-cron');
const RakutenTravelCrawler = require('../services/RakutenTravelCrawler');
const { supabaseAdmin } = require('../config/supabase');

class HotelCrawlingScheduler {
    constructor() {
        this.isRunning = false;
        this.crawler = new RakutenTravelCrawler();
        this.schedules = {
            // 15分間隔でクローリング実行（営業時間内）
            mainCrawling: '*/15 6-23 * * *', // 6:00-23:00の間、15分間隔
            
            // 1時間間隔で深夜クローリング（負荷軽減）
            nightCrawling: '0 0-5 * * *', // 0:00-5:00の間、1時間間隔
            
            // 毎日朝にフルクローリング
            fullCrawling: '0 5 * * *', // 毎日5:00にフル実行
            
            // ログクリーンアップ（週1回）
            logCleanup: '0 2 * * 0', // 毎週日曜日2:00
            
            // APIトークン更新（必要に応じて）
            tokenRefresh: '0 4 * * *' // 毎日4:00
        };

        this.maxConcurrentJobs = 1; // 同時実行数制限
        this.currentJobs = new Set();
        this.errorThreshold = 5; // 連続エラー閾値
        this.consecutiveErrors = 0;
    }

    /**
     * スケジューラー初期化・開始
     */
    start() {
        console.log('🕐 ホテルクローリング・スケジューラー開始...');

        // メインクローリング（15分間隔）
        cron.schedule(this.schedules.mainCrawling, async () => {
            await this.executeMainCrawling();
        }, {
            scheduled: true,
            timezone: "Asia/Tokyo"
        });

        // 深夜クローリング（1時間間隔）
        cron.schedule(this.schedules.nightCrawling, async () => {
            await this.executeNightCrawling();
        }, {
            scheduled: true,
            timezone: "Asia/Tokyo"
        });

        // フルクローリング（毎日朝）
        cron.schedule(this.schedules.fullCrawling, async () => {
            await this.executeFullCrawling();
        }, {
            scheduled: true,
            timezone: "Asia/Tokyo"
        });

        // ログクリーンアップ（週1回）
        cron.schedule(this.schedules.logCleanup, async () => {
            await this.executeLogCleanup();
        }, {
            scheduled: true,
            timezone: "Asia/Tokyo"
        });

        // API使用量レポート（毎日）
        cron.schedule('0 6 * * *', async () => {
            await this.generateDailyReport();
        }, {
            scheduled: true,
            timezone: "Asia/Tokyo"
        });

        console.log('✅ スケジューラー開始完了 - 次回実行時刻:');
        console.log(`  - メインクローリング: 15分間隔 (6:00-23:00)`);
        console.log(`  - 深夜クローリング: 1時間間隔 (0:00-5:00)`);
        console.log(`  - フルクローリング: 毎日5:00`);
        console.log(`  - ログクリーンアップ: 毎週日曜2:00`);
    }

    /**
     * ジョブ実行制御（同時実行制限）
     */
    async executeWithConcurrencyControl(jobName, jobFunction) {
        if (this.currentJobs.size >= this.maxConcurrentJobs) {
            console.log(`⚠️ ${jobName}: 同時実行制限により スキップ`);
            return;
        }

        if (this.currentJobs.has(jobName)) {
            console.log(`⚠️ ${jobName}: 既に実行中のため スキップ`);
            return;
        }

        this.currentJobs.add(jobName);
        const startTime = Date.now();

        try {
            console.log(`🚀 ${jobName} 開始: ${new Date().toLocaleString('ja-JP')}`);
            await jobFunction();
            
            this.consecutiveErrors = 0; // エラーカウンターリセット
            const duration = (Date.now() - startTime) / 1000;
            console.log(`✅ ${jobName} 完了: ${duration.toFixed(1)}秒`);

        } catch (error) {
            this.consecutiveErrors++;
            const duration = (Date.now() - startTime) / 1000;
            console.error(`❌ ${jobName} エラー (${duration.toFixed(1)}秒):`, error.message);

            // 連続エラーが閾値を超えた場合、アラート送信
            if (this.consecutiveErrors >= this.errorThreshold) {
                await this.sendErrorAlert(jobName, error);
            }

            // エラーログ記録
            await this.logError(jobName, error);

        } finally {
            this.currentJobs.delete(jobName);
        }
    }

    /**
     * メインクローリング実行（15分間隔）
     */
    async executeMainCrawling() {
        await this.executeWithConcurrencyControl('メインクローリング', async () => {
            // 空室・価格情報のみ更新（軽量版）
            await this.crawler.crawlAvailabilityAndPrices();
        });
    }

    /**
     * 深夜クローリング実行（1時間間隔）
     */
    async executeNightCrawling() {
        await this.executeWithConcurrencyControl('深夜クローリング', async () => {
            // 負荷を抑えた軽量クローリング
            const limitedCrawler = new RakutenTravelCrawler();
            limitedCrawler.rateLimitDelay = 2000; // 2秒間隔に延長
            await limitedCrawler.crawlAvailabilityAndPrices();
        });
    }

    /**
     * フルクローリング実行（毎日朝）
     */
    async executeFullCrawling() {
        await this.executeWithConcurrencyControl('フルクローリング', async () => {
            // ホテル基本情報 + 空室・価格情報の完全更新
            await this.crawler.runFullCrawling();
        });
    }

    /**
     * ログクリーンアップ実行
     */
    async executeLogCleanup() {
        await this.executeWithConcurrencyControl('ログクリーンアップ', async () => {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            // 古いクローリングログを削除
            const { error: logsError } = await supabaseAdmin
                .from('crawling_logs')
                .delete()
                .lt('created_at', oneWeekAgo);

            if (logsError) {
                throw new Error(`ログ削除エラー: ${logsError.message}`);
            }

            // 古いAPI使用量記録を削除（30日以上前）
            const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            const { error: usageError } = await supabaseAdmin
                .from('api_usage_tracking')
                .delete()
                .lt('date', oneMonthAgo);

            if (usageError) {
                throw new Error(`API使用量記録削除エラー: ${usageError.message}`);
            }

            // 古い価格履歴を削除（60日以上前）
            const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
            
            const { error: priceError } = await supabaseAdmin
                .from('price_history_crawling')
                .delete()
                .lt('crawled_at', twoMonthsAgo);

            if (priceError) {
                throw new Error(`価格履歴削除エラー: ${priceError.message}`);
            }

            console.log('📁 ログクリーンアップ完了');
        });
    }

    /**
     * 日次レポート生成
     */
    async generateDailyReport() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // 昨日のAPI使用量集計
            const { data: apiUsage } = await supabaseAdmin
                .from('api_usage_tracking')
                .select('*')
                .eq('date', yesterday)
                .eq('api_source', 'rakuten');

            // 昨日のクローリングログ集計
            const { data: crawlLogs } = await supabaseAdmin
                .from('crawling_logs')
                .select('*')
                .gte('started_at', `${yesterday}T00:00:00Z`)
                .lt('started_at', `${today}T00:00:00Z`)
                .eq('api_source', 'rakuten');

            // レポート生成
            const report = {
                date: yesterday,
                api_usage: {
                    total_calls: apiUsage?.reduce((sum, record) => sum + record.total_calls, 0) || 0,
                    successful_calls: apiUsage?.reduce((sum, record) => sum + record.successful_calls, 0) || 0,
                    failed_calls: apiUsage?.reduce((sum, record) => sum + record.failed_calls, 0) || 0,
                    avg_response_time: Math.round(apiUsage?.reduce((sum, record) => sum + (record.avg_response_time_ms || 0), 0) / (apiUsage?.length || 1))
                },
                crawling_summary: {
                    total_executions: crawlLogs?.length || 0,
                    successful_executions: crawlLogs?.filter(log => log.status === 'completed').length || 0,
                    failed_executions: crawlLogs?.filter(log => log.status === 'failed').length || 0,
                    total_items_processed: crawlLogs?.reduce((sum, log) => sum + (log.processed_items || 0), 0) || 0
                },
                timestamp: new Date().toISOString()
            };

            console.log('📊 日次レポート:', JSON.stringify(report, null, 2));

            // レポートをログとして保存
            await supabaseAdmin
                .from('crawling_logs')
                .insert({
                    crawl_type: 'daily_report',
                    api_source: 'system',
                    execution_id: `daily_report_${yesterday}`,
                    status: 'completed',
                    configuration: report
                });

        } catch (error) {
            console.error('📊 日次レポート生成エラー:', error);
        }
    }

    /**
     * エラーアラート送信
     */
    async sendErrorAlert(jobName, error) {
        try {
            const alertData = {
                job_name: jobName,
                error_message: error.message,
                consecutive_errors: this.consecutiveErrors,
                timestamp: new Date().toISOString(),
                server_info: {
                    node_version: process.version,
                    memory_usage: process.memoryUsage(),
                    uptime: process.uptime()
                }
            };

            // アラートログを記録
            await supabaseAdmin
                .from('crawling_logs')
                .insert({
                    crawl_type: 'error_alert',
                    api_source: 'system',
                    execution_id: `alert_${Date.now()}`,
                    status: 'failed',
                    error_message: `連続エラー${this.consecutiveErrors}回: ${jobName}`,
                    error_details: alertData
                });

            console.log(`🚨 エラーアラート送信: ${jobName} - 連続${this.consecutiveErrors}回エラー`);

        } catch (alertError) {
            console.error('🚨 アラート送信エラー:', alertError);
        }
    }

    /**
     * エラーログ記録
     */
    async logError(jobName, error) {
        try {
            await supabaseAdmin
                .from('crawling_logs')
                .insert({
                    crawl_type: 'error_log',
                    api_source: 'system',
                    execution_id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    status: 'failed',
                    error_message: error.message,
                    error_details: {
                        job_name: jobName,
                        stack_trace: error.stack,
                        timestamp: new Date().toISOString()
                    }
                });
        } catch (logError) {
            console.error('📝 エラーログ記録失敗:', logError);
        }
    }

    /**
     * スケジューラー停止
     */
    stop() {
        console.log('🛑 ホテルクローリング・スケジューラー停止中...');
        cron.destroy();
        console.log('✅ スケジューラー停止完了');
    }

    /**
     * 現在の状態取得
     */
    getStatus() {
        return {
            isRunning: this.currentJobs.size > 0,
            currentJobs: Array.from(this.currentJobs),
            consecutiveErrors: this.consecutiveErrors,
            maxConcurrentJobs: this.maxConcurrentJobs,
            schedules: this.schedules,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        };
    }

    /**
     * 手動実行（テスト用）
     */
    async manualExecute(jobType = 'main') {
        console.log(`🔧 手動実行: ${jobType}`);
        
        switch (jobType) {
            case 'main':
                await this.executeMainCrawling();
                break;
            case 'full':
                await this.executeFullCrawling();
                break;
            case 'night':
                await this.executeNightCrawling();
                break;
            case 'cleanup':
                await this.executeLogCleanup();
                break;
            case 'report':
                await this.generateDailyReport();
                break;
            default:
                throw new Error(`不明なジョブタイプ: ${jobType}`);
        }
    }
}

// シングルトンインスタンス
const scheduler = new HotelCrawlingScheduler();

module.exports = scheduler;

// 直接実行された場合
if (require.main === module) {
    console.log('🏨 ホテルクローリング・スケジューラー単体実行');
    
    // 環境変数チェック
    if (!process.env.RAKUTEN_API_KEY || !process.env.RAKUTEN_APPLICATION_ID) {
        console.error('❌ 環境変数エラー: RAKUTEN_API_KEY または RAKUTEN_APPLICATION_ID が設定されていません');
        process.exit(1);
    }

    // スケジューラー開始
    scheduler.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\\n🛑 シャットダウンシグナル受信...');
        scheduler.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\\n🛑 ターミネートシグナル受信...');
        scheduler.stop();
        process.exit(0);
    });

    // 未処理エラーキャッチ
    process.on('unhandledRejection', (reason, promise) => {
        console.error('🚨 未処理Promise拒否:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('🚨 未処理例外:', error);
        scheduler.stop();
        process.exit(1);
    });
}