#!/usr/bin/env node

/**
 * Test script for hotel monitoring system
 * Usage: node scripts/test-monitoring.js
 */

require('dotenv').config();
const hotelMonitorService = require('../services/hotel-monitor.service');

async function testMonitoring() {
  console.log('=== Hotel Monitoring System Test ===\n');
  
  try {
    // Test 1: Monitor watchlist hotels
    console.log('1. Testing watchlist monitoring...');
    await hotelMonitorService.monitorWatchlistHotels();
    console.log('✅ Watchlist monitoring completed\n');

    // Test 2: Process pending notifications
    console.log('2. Testing notification processing...');
    await hotelMonitorService.processPendingNotifications();
    console.log('✅ Notification processing completed\n');

    // Test 3: Test specific hotel data fetch
    console.log('3. Testing hotel data fetch...');
    const testHotelId = '123456'; // Example hotel ID
    const testCheckIn = '2025-07-10';
    const testCheckOut = '2025-07-12';
    
    const hotelData = await hotelMonitorService.fetchHotelData(
      testHotelId,
      testCheckIn,
      testCheckOut
    );
    
    if (hotelData) {
      console.log('✅ Hotel data fetched successfully:');
      console.log(`   - Hotel: ${hotelData.hotelName}`);
      console.log(`   - Available: ${hotelData.isAvailable}`);
      console.log(`   - Lowest Price: ¥${hotelData.lowestPrice || 'N/A'}`);
      console.log(`   - Room Types: ${hotelData.availableRoomTypes}\n`);
    } else {
      console.log('⚠️  No data available for test hotel\n');
    }

    console.log('=== All tests completed ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testMonitoring();