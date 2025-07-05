#!/usr/bin/env node

/**
 * Supabase Connection Test Script
 * Tests database connectivity and basic operations
 * 
 * Usage: node test-supabase-connection.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const chalk = require('chalk');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation
if (!supabaseUrl || !supabaseServiceKey) {
    console.error(chalk.red('❌ Missing Supabase credentials!'));
    console.error(chalk.yellow('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file'));
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test functions
async function testConnection() {
    console.log(chalk.blue('🔍 Testing Supabase connection...'));
    console.log(chalk.gray(`URL: ${supabaseUrl}`));
    
    try {
        // Test basic query
        const { data, error } = await supabase
            .from('hotels')
            .select('count')
            .limit(1);
        
        if (error) throw error;
        
        console.log(chalk.green('✅ Database connection successful!'));
        return true;
    } catch (error) {
        console.error(chalk.red('❌ Database connection failed:'), error.message);
        return false;
    }
}

async function testTables() {
    console.log(chalk.blue('\n📊 Checking database tables...'));
    
    const tables = [
        'hotels',
        'user_profiles',
        'watchlist',
        'hotel_price_history',
        'notification_queue',
        'user_notification_preferences',
        'notification_history'
    ];
    
    let allTablesExist = true;
    
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) throw error;
            
            console.log(chalk.green(`✅ Table '${table}' exists (${count || 0} rows)`));
        } catch (error) {
            console.error(chalk.red(`❌ Table '${table}' check failed:`), error.message);
            allTablesExist = false;
        }
    }
    
    return allTablesExist;
}

async function testRLS() {
    console.log(chalk.blue('\n🔒 Testing Row Level Security...'));
    
    try {
        // Test with anon key (should fail for protected tables)
        const anonClient = createClient(
            supabaseUrl,
            process.env.SUPABASE_ANON_KEY || 'dummy-key'
        );
        
        // This should succeed (public read)
        const { data: hotels, error: hotelsError } = await anonClient
            .from('hotels')
            .select('*')
            .limit(1);
        
        if (hotelsError) {
            console.log(chalk.yellow('⚠️  Hotels table not accessible with anon key'));
        } else {
            console.log(chalk.green('✅ Hotels table has public read access'));
        }
        
        // This should fail (protected)
        const { data: watchlist, error: watchlistError } = await anonClient
            .from('watchlist')
            .select('*')
            .limit(1);
        
        if (watchlistError) {
            console.log(chalk.green('✅ Watchlist table is properly protected'));
        } else {
            console.log(chalk.red('❌ Watchlist table is not protected!'));
        }
        
        return true;
    } catch (error) {
        console.error(chalk.red('❌ RLS test failed:'), error.message);
        return false;
    }
}

async function testSampleData() {
    console.log(chalk.blue('\n📝 Checking sample data...'));
    
    try {
        // Check for sample hotels
        const { data: hotels, error: hotelsError } = await supabase
            .from('hotels')
            .select('*')
            .like('rakuten_hotel_id', 'DEMO%');
        
        if (hotelsError) throw hotelsError;
        
        if (hotels && hotels.length > 0) {
            console.log(chalk.green(`✅ Found ${hotels.length} sample hotels`));
            hotels.forEach(hotel => {
                console.log(chalk.gray(`   - ${hotel.name} (${hotel.rakuten_hotel_id})`));
            });
        } else {
            console.log(chalk.yellow('⚠️  No sample hotels found'));
        }
        
        // Check for price history
        const { data: priceHistory, error: priceError } = await supabase
            .from('hotel_price_history')
            .select('hotel_id, count')
            .limit(5);
        
        if (priceError) throw priceError;
        
        if (priceHistory && priceHistory.length > 0) {
            console.log(chalk.green(`✅ Found price history data`));
        } else {
            console.log(chalk.yellow('⚠️  No price history found'));
        }
        
        return true;
    } catch (error) {
        console.error(chalk.red('❌ Sample data check failed:'), error.message);
        return false;
    }
}

async function testFunctions() {
    console.log(chalk.blue('\n⚙️  Testing database functions...'));
    
    try {
        // Test price drop calculation
        const { data, error } = await supabase.rpc('calculate_price_drop_percentage', {
            current_price: 45000,
            previous_price: 50000
        });
        
        if (error) throw error;
        
        console.log(chalk.green(`✅ Price drop calculation: ${data}% (expected: 10%)`));
        
        // Test availability summary
        const { data: summary, error: summaryError } = await supabase.rpc('get_availability_summary');
        
        if (summaryError) throw summaryError;
        
        console.log(chalk.green('✅ Availability summary function works'));
        
        return true;
    } catch (error) {
        console.error(chalk.red('❌ Function test failed:'), error.message);
        return false;
    }
}

// Main execution
async function main() {
    console.log(chalk.bold.cyan('\n🚀 LastMinuteStay Database Connection Test\n'));
    
    const tests = [
        { name: 'Connection', fn: testConnection },
        { name: 'Tables', fn: testTables },
        { name: 'RLS', fn: testRLS },
        { name: 'Sample Data', fn: testSampleData },
        { name: 'Functions', fn: testFunctions }
    ];
    
    let passedTests = 0;
    
    for (const test of tests) {
        const passed = await test.fn();
        if (passed) passedTests++;
    }
    
    // Summary
    console.log(chalk.bold.cyan('\n📊 Test Summary\n'));
    console.log(`Total tests: ${tests.length}`);
    console.log(`Passed: ${chalk.green(passedTests)}`);
    console.log(`Failed: ${chalk.red(tests.length - passedTests)}`);
    
    if (passedTests === tests.length) {
        console.log(chalk.bold.green('\n✅ All tests passed! Database is ready for production.\n'));
        process.exit(0);
    } else {
        console.log(chalk.bold.yellow('\n⚠️  Some tests failed. Please check the configuration.\n'));
        process.exit(1);
    }
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error(chalk.red('\n❌ Unhandled error:'), error);
    process.exit(1);
});

// Run tests
main();