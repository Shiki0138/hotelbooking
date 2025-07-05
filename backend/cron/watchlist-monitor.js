#!/usr/bin/env node

/**
 * Watchlist Monitor Cron Job
 * 15分ごとに価格監視を実行
 */

const WatchlistMonitorService = require('../services/WatchlistMonitorService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function runWatchlistMonitor() {
  console.log('🕒 Starting watchlist monitor cron job...');
  const startTime = Date.now();
  
  try {
    const monitor = new WatchlistMonitorService();
    
    // Initialize the service
    await monitor.initialize();
    
    // Run single check (not continuous monitoring)
    await monitor.checkAllWatchlistItems();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Watchlist monitor completed in ${duration}ms`);
    
    // Cleanup
    await monitor.shutdown();
    
  } catch (error) {
    console.error('❌ Error in watchlist monitor cron:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the monitor
runWatchlistMonitor();