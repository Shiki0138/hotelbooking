/**
 * リアルタイム価格監視スケジューラー
 * Worker3: 15分間隔価格監視・即時通知担当
 * Created: 2025-07-02
 */

const cron = require('node-cron');
const RealtimePriceMonitor = require('../scripts/realtime-price-monitor');
const supabase = require('../services/supabase-client');

class RealtimeScheduler {
  constructor() {
    this.monitor = new RealtimePriceMonitor();
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * スケジューラー開始
   */
  start() {
    console.log('🕐 リアルタイム価格監視スケジューラー開始');

    // 15分間隔価格チェック（毎時0,15,30,45分）
    const priceCheckJob = cron.schedule('0,15,30,45 * * * *', async () => {
      if (this.isRunning) {
        console.log('⏭️  前回の監視サイクルが実行中 - スキップ');
        return;
      }

      this.isRunning = true;
      try {
        await this.runPriceCheck();
      } catch (error) {
        console.error('価格チェックエラー:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    // 毎朝9時：日次サマリー送信
    const dailySummaryJob = cron.schedule('0 9 * * *', async () => {
      try {
        await this.sendDailySummary();
      } catch (error) {
        console.error('日次サマリーエラー:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    // 5分毎：システムヘルスチェック
    const healthCheckJob = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('ヘルスチェックエラー:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    // 深夜2時：メンテナンス（古いデータ削除）
    const maintenanceJob = cron.schedule('0 2 * * *', async () => {
      try {
        await this.performMaintenance();
      } catch (error) {
        console.error('メンテナンスエラー:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    this.jobs = [
      { name: 'priceCheck', job: priceCheckJob },
      { name: 'dailySummary', job: dailySummaryJob },
      { name: 'healthCheck', job: healthCheckJob },
      { name: 'maintenance', job: maintenanceJob },
    ];

    // 全ジョブ開始
    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`✅ ${name} ジョブ開始`);
    });

    console.log('🚀 全スケジュールジョブ開始完了');
  }

  /**
   * 価格チェック実行
   */
  async runPriceCheck() {
    const startTime = new Date();
    console.log(`\n🔍 [${startTime.toISOString()}] 価格チェック開始`);

    // 監視対象ホテル取得
    const { data: targets, error } = await supabase
      .rpc('get_hotels_to_monitor');

    if (error) {
      throw new Error(`監視対象取得エラー: ${error.message}`);
    }

    if (!targets || targets.length === 0) {
      console.log('📊 監視対象なし');
      return;
    }

    console.log(`📊 監視対象: ${targets.length}件`);

    // バッチ処理（10件ずつ）
    const batchSize = 10;
    let processedCount = 0;
    let alertsSent = 0;

    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (target) => {
        try {
          const alerts = await this.monitor.checkHotelPricing(target);
          return alerts;
        } catch (error) {
          console.error(`ホテル ${target.hotel_no} エラー:`, error.message);
          return 0;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          alertsSent += result.value;
          processedCount++;
        }
      });

      // レート制限対応（バッチ間で1秒待機）
      if (i + batchSize < targets.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    console.log(`✅ 価格チェック完了 - ${duration}秒`);
    console.log(`📈 処理完了: ${processedCount}/${targets.length}`);
    console.log(`📧 送信アラート: ${alertsSent}件`);

    // 実行統計記録
    await this.recordExecutionStats('price_check', {
      targets_total: targets.length,
      processed: processedCount,
      alerts_sent: alertsSent,
      duration_seconds: duration,
    });
  }

  /**
   * 日次サマリー送信
   */
  async sendDailySummary() {
    console.log('📊 日次サマリー送信開始');

    // 昨日の統計取得
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: stats, error } = await supabase
      .from('price_alerts')
      .select(`
        alert_type,
        price_difference,
        price_drop_percentage,
        watchlist_id,
        watchlist_extended!inner(
          user_id,
          hotel_name,
          demo_users!inner(email, name)
        )
      `)
      .gte('created_at', `${yesterdayStr}T00:00:00Z`)
      .lt('created_at', `${yesterdayStr}T23:59:59Z`);

    if (error) {
      throw new Error(`統計取得エラー: ${error.message}`);
    }

    // ユーザー毎にサマリー集計
    const userSummaries = {};
    
    stats?.forEach(alert => {
      const user = alert.watchlist_extended.demo_users;
      const userId = alert.watchlist_extended.user_id;

      if (!userSummaries[userId]) {
        userSummaries[userId] = {
          email: user.email,
          name: user.name,
          alerts: [],
          total_savings: 0,
        };
      }

      userSummaries[userId].alerts.push(alert);
      if (alert.price_difference) {
        userSummaries[userId].total_savings += alert.price_difference;
      }
    });

    // 各ユーザーにサマリーメール送信
    const emailAlertsService = require('../services/email-alerts.service');
    
    for (const [userId, summary] of Object.entries(userSummaries)) {
      try {
        await emailAlertsService.sendDailySummary({
          to: summary.email,
          data: {
            user_name: summary.name,
            date: yesterdayStr,
            alerts_count: summary.alerts.length,
            total_savings: summary.total_savings,
            alerts: summary.alerts.slice(0, 5), // 上位5件
          },
        });
      } catch (error) {
        console.error(`ユーザー ${userId} サマリー送信エラー:`, error.message);
      }
    }

    console.log(`✅ 日次サマリー送信完了: ${Object.keys(userSummaries).length}名`);
  }

  /**
   * システムヘルスチェック
   */
  async performHealthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      database: false,
      rakuten_api: false,
      email_service: false,
      active_monitors: 0,
    };

    try {
      // データベース接続チェック
      const { data, error } = await supabase
        .from('watchlist_extended')
        .select('count(*)')
        .eq('is_active', true)
        .single();

      if (!error) {
        healthStatus.database = true;
        healthStatus.active_monitors = data?.count || 0;
      }

      // 楽天API接続チェック（軽量リクエスト）
      try {
        const axios = require('axios');
        const response = await axios.get(`https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426`, {
          params: {
            applicationId: process.env.RAKUTEN_APPLICATION_ID,
            format: 'json',
            largeClassCode: 'japan',
            hits: 1,
          },
          timeout: 5000,
        });
        
        if (response.status === 200) {
          healthStatus.rakuten_api = true;
        }
      } catch (error) {
        console.warn('楽天API接続チェック失敗:', error.message);
      }

      // メールサービスチェック（実際の送信はしない）
      const emailAlertsService = require('../services/email-alerts.service');
      if (emailAlertsService && typeof emailAlertsService.sendAlert === 'function') {
        healthStatus.email_service = true;
      }

      // ヘルス状態をログ出力（エラー時のみ）
      const isHealthy = healthStatus.database && healthStatus.rakuten_api && healthStatus.email_service;
      
      if (!isHealthy) {
        console.warn('⚠️  システムヘルス異常:', healthStatus);
      }

    } catch (error) {
      console.error('ヘルスチェックエラー:', error.message);
    }
  }

  /**
   * メンテナンス実行
   */
  async performMaintenance() {
    console.log('🧹 定期メンテナンス開始');

    try {
      // 1. 30日以上古い価格履歴削除
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { error: historyError } = await supabase
        .from('price_history_15min')
        .delete()
        .lt('checked_at', thirtyDaysAgo.toISOString());

      if (historyError) {
        console.warn('価格履歴削除警告:', historyError.message);
      } else {
        console.log('✅ 古い価格履歴削除完了');
      }

      // 2. 送信済み通知の古いデータ削除（90日以上）
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      const { error: notificationError } = await supabase
        .from('realtime_notifications')
        .delete()
        .lt('created_at', ninetyDaysAgo.toISOString());

      if (notificationError) {
        console.warn('通知ログ削除警告:', notificationError.message);
      } else {
        console.log('✅ 古い通知ログ削除完了');
      }

      // 3. 無効なウォッチリスト削除（チェックイン日が過去）
      const today = new Date().toISOString().split('T')[0];
      
      const { error: watchlistError } = await supabase
        .from('watchlist_extended')
        .update({ is_active: false })
        .lt('checkin_date', today);

      if (watchlistError) {
        console.warn('無効ウォッチリスト削除警告:', watchlistError.message);
      } else {
        console.log('✅ 無効ウォッチリスト無効化完了');
      }

      console.log('✅ 定期メンテナンス完了');

    } catch (error) {
      console.error('メンテナンスエラー:', error.message);
    }
  }

  /**
   * 実行統計記録
   */
  async recordExecutionStats(jobType, stats) {
    // 簡易統計記録（将来的にはより詳細な監視システムに移行）
    console.log(`📊 ${jobType} 統計:`, stats);
  }

  /**
   * スケジューラー停止
   */
  stop() {
    console.log('⏹️  スケジューラー停止中...');
    
    this.jobs.forEach(({ name, job }) => {
      job.destroy();
      console.log(`🛑 ${name} ジョブ停止`);
    });

    this.monitor.stop();
    console.log('✅ スケジューラー停止完了');
  }

  /**
   * 手動価格チェック実行
   */
  async runManualCheck() {
    console.log('🔧 手動価格チェック実行');
    await this.runPriceCheck();
  }

  /**
   * スケジューラー状態取得
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: this.jobs.map(({ name, job }) => ({
        name,
        running: job.running,
      })),
    };
  }
}

// CLIから実行された場合
if (require.main === module) {
  const scheduler = new RealtimeScheduler();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 スケジューラー停止シグナル受信');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 スケジューラー終了シグナル受信');
    scheduler.stop();
    process.exit(0);
  });

  // コマンドライン引数処理
  const args = process.argv.slice(2);
  
  if (args.includes('--manual-check')) {
    // 手動チェック実行
    scheduler.runManualCheck()
      .then(() => {
        console.log('✅ 手動チェック完了');
        process.exit(0);
      })
      .catch(error => {
        console.error('💥 手動チェックエラー:', error);
        process.exit(1);
      });
  } else {
    // 通常のスケジューラー開始
    try {
      scheduler.start();
      console.log('🎯 リアルタイム価格監視システム稼働中...');
      console.log('Ctrl+C で停止');
    } catch (error) {
      console.error('💥 スケジューラー開始エラー:', error);
      process.exit(1);
    }
  }
}

module.exports = RealtimeScheduler;