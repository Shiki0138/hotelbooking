/**
 * Watchlist Monitor Cron Job
 * 1時間ごとにウォッチリストの価格を監視
 */

const WatchlistMonitorService = require('../services/WatchlistMonitorService');

let monitorService = null;

/**
 * Cron job handler function
 * Vercel Cronまたは他のcronシステムから呼び出される
 */
async function runWatchlistMonitor() {
  console.log('⏰ Starting watchlist monitor cron job...');
  const startTime = Date.now();
  
  try {
    // サービスが初期化されていない場合は初期化
    if (!monitorService) {
      monitorService = new WatchlistMonitorService();
      await monitorService.initialize();
    }

    // ウォッチリストチェック実行
    await monitorService.checkAllWatchlistItems();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Watchlist monitor completed in ${duration}ms`);
    
    return {
      success: true,
      duration,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Watchlist monitor cron job failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Vercel Edge Function handler
 */
async function handler(req, res) {
  // 認証チェック（Vercel Cron Secret）
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await runWatchlistMonitor();
  return res.status(result.success ? 200 : 500).json(result);
}

// スタンドアロン実行用
if (require.main === module) {
  runWatchlistMonitor()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  runWatchlistMonitor,
  handler
};