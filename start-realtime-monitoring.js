#!/usr/bin/env node
/**
 * リアルタイム価格監視システム起動スクリプト
 * Worker3: 15分間隔価格監視・即時通知担当
 * Created: 2025-07-02
 */

const RealtimeScheduler = require('./backend/cron/realtime-scheduler');
const { checkEnvironment } = require('./backend/utils/env-checker');
const supabase = require('./backend/services/supabase-client');

class RealtimeMonitoringSystem {
  constructor() {
    this.scheduler = null;
    this.isShuttingDown = false;
  }

  /**
   * システム起動
   */
  async start() {
    console.log('🚀 リアルタイム価格監視システム起動中...\n');

    try {
      // 1. 環境変数チェック
      if (!this.checkRequiredEnvironment()) {
        process.exit(1);
      }

      // 2. データベース接続確認
      if (!await this.checkDatabaseConnection()) {
        process.exit(1);
      }

      // 3. スケジューラー開始
      this.scheduler = new RealtimeScheduler();
      this.scheduler.start();

      // 4. システム情報表示
      await this.displaySystemInfo();

      // 5. Graceful shutdown設定
      this.setupGracefulShutdown();

      console.log('\n✅ リアルタイム価格監視システム稼働開始');
      console.log('📋 システム制御:');
      console.log('  - Ctrl+C: 停止');
      console.log('  - SIGTERM: 正常終了');
      console.log('');

    } catch (error) {
      console.error('💥 システム起動エラー:', error);
      process.exit(1);
    }
  }

  /**
   * 必須環境変数チェック
   */
  checkRequiredEnvironment() {
    console.log('🔧 環境変数チェック中...');

    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'RAKUTEN_APPLICATION_ID',
      'RESEND_API_KEY',
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      console.error('❌ 必須環境変数が不足しています:');
      missing.forEach(varName => console.error(`  - ${varName}`));
      console.error('\n.env ファイルを確認してください。');
      return false;
    }

    console.log('✅ 環境変数チェック完了');
    return true;
  }

  /**
   * データベース接続確認
   */
  async checkDatabaseConnection() {
    console.log('🗄️  データベース接続確認中...');

    try {
      const { data, error } = await supabase
        .from('watchlist_extended')
        .select('count(*)')
        .limit(1);

      if (error) {
        throw error;
      }

      console.log('✅ データベース接続成功');
      return true;

    } catch (error) {
      console.error('❌ データベース接続失敗:', error.message);
      console.error('Supabaseの設定を確認してください。');
      return false;
    }
  }

  /**
   * システム情報表示
   */
  async displaySystemInfo() {
    console.log('\n📊 システム情報:');

    try {
      // アクティブ監視数取得
      const { data: activeMonitors, error: monitorsError } = await supabase
        .from('watchlist_extended')
        .select('count(*)')
        .eq('is_active', true)
        .single();

      // 今日のアラート数取得
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAlerts, error: alertsError } = await supabase
        .from('price_alerts')
        .select('count(*)')
        .gte('created_at', `${today}T00:00:00Z`)
        .single();

      console.log(`  - アクティブ監視: ${activeMonitors?.count || 0}件`);
      console.log(`  - 今日のアラート: ${todayAlerts?.count || 0}件`);
      console.log(`  - 監視間隔: 15分`);
      console.log(`  - タイムゾーン: Asia/Tokyo`);

      // 楽天API接続テスト
      try {
        const axios = require('axios');
        await axios.get('https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426', {
          params: {
            applicationId: process.env.RAKUTEN_APPLICATION_ID,
            format: 'json',
            largeClassCode: 'japan',
            hits: 1,
          },
          timeout: 5000,
        });
        console.log('  - 楽天API: ✅ 接続OK');
      } catch (error) {
        console.log('  - 楽天API: ❌ 接続エラー');
      }

    } catch (error) {
      console.warn('⚠️  システム情報取得エラー:', error.message);
    }
  }

  /**
   * Graceful shutdown設定
   */
  setupGracefulShutdown() {
    const shutdown = (signal) => {
      if (this.isShuttingDown) return;
      
      this.isShuttingDown = true;
      console.log(`\n🛑 ${signal} シグナル受信 - システム停止中...`);
      
      if (this.scheduler) {
        this.scheduler.stop();
      }
      
      console.log('✅ システム停止完了');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // 予期しないエラー処理
    process.on('uncaughtException', (error) => {
      console.error('💥 予期しないエラー:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 未処理のPromise拒否:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }
}

// CLIから実行された場合
if (require.main === module) {
  const system = new RealtimeMonitoringSystem();
  
  // コマンドライン引数処理
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
リアルタイム価格監視システム

使用方法:
  node start-realtime-monitoring.js [オプション]

オプション:
  --help     このヘルプを表示
  --check    環境チェックのみ実行

環境変数:
  SUPABASE_URL              Supabase URL
  SUPABASE_SERVICE_ROLE_KEY Supabase サービスロールキー
  RAKUTEN_APPLICATION_ID    楽天アプリケーションID
  RESEND_API_KEY           Resend APIキー

機能:
  - 15分間隔でホテル価格監視
  - 価格下落時の即時通知
  - 空室発見時のアラート
  - 日次サマリーレポート
`);
    process.exit(0);
  }

  if (args.includes('--check')) {
    // 環境チェックのみ実行
    system.checkRequiredEnvironment() && 
    system.checkDatabaseConnection()
      .then(dbOk => {
        if (dbOk) {
          console.log('✅ 全ての環境チェック完了');
          process.exit(0);
        } else {
          process.exit(1);
        }
      });
  } else {
    // 通常起動
    system.start();
  }
}

module.exports = RealtimeMonitoringSystem;