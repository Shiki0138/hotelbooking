/**
 * Supabase Client Configuration for Production
 * Provides centralized Supabase client instances
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate environment variables
const validateConfig = () => {
    const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate URL format
    try {
        new URL(process.env.SUPABASE_URL);
    } catch (error) {
        throw new Error('Invalid SUPABASE_URL format');
    }
    
    // Validate key format (basic check)
    if (!process.env.SUPABASE_ANON_KEY.startsWith('eyJ')) {
        throw new Error('Invalid SUPABASE_ANON_KEY format');
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
        throw new Error('Invalid SUPABASE_SERVICE_ROLE_KEY format');
    }
};

// Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client options
const clientOptions = {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: { 'x-application-name': 'lastminutestay-backend' }
    }
};

// Service client options (for server-side operations)
const serviceClientOptions = {
    ...clientOptions,
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
};

// Create clients
let supabaseClient = null;
let supabaseServiceClient = null;

/**
 * Get public Supabase client (uses anon key)
 * For client-side operations and public data access
 */
const getSupabaseClient = () => {
    if (!supabaseClient) {
        validateConfig();
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
    }
    return supabaseClient;
};

/**
 * Get service Supabase client (uses service role key)
 * For server-side operations with elevated privileges
 */
const getSupabaseServiceClient = () => {
    if (!supabaseServiceClient) {
        validateConfig();
        supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey, serviceClientOptions);
    }
    return supabaseServiceClient;
};

/**
 * Test database connection
 */
const testConnection = async () => {
    try {
        const client = getSupabaseServiceClient();
        const { data, error } = await client
            .from('hotels')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
        
        console.log('Database connection successful');
        return true;
    } catch (error) {
        console.error('Database connection error:', error);
        return false;
    }
};

/**
 * Get user from token
 */
const getUserFromToken = async (token) => {
    try {
        const client = getSupabaseServiceClient();
        const { data: { user }, error } = await client.auth.getUser(token);
        
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Error getting user from token:', error);
        return null;
    }
};

/**
 * Create or update user profile
 */
const upsertUserProfile = async (userId, profileData) => {
    try {
        const client = getSupabaseServiceClient();
        const { data, error } = await client
            .from('user_profiles')
            .upsert({
                id: userId,
                ...profileData,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error upserting user profile:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get watchlist for user
 */
const getUserWatchlist = async (userId) => {
    try {
        const client = getSupabaseServiceClient();
        const { data, error } = await client
            .from('watchlist')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error getting watchlist:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Add item to watchlist
 */
const addToWatchlist = async (userId, watchlistItem) => {
    try {
        const client = getSupabaseServiceClient();
        const { data, error } = await client
            .from('watchlist')
            .insert({
                user_id: userId,
                ...watchlistItem,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Log price history
 */
const logPriceHistory = async (priceData) => {
    try {
        const client = getSupabaseServiceClient();
        const { data, error } = await client
            .from('hotel_price_history')
            .insert(priceData)
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error logging price history:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Queue notification
 */
const queueNotification = async (notification) => {
    try {
        const client = getSupabaseServiceClient();
        const { data, error } = await client
            .from('notification_queue')
            .insert({
                ...notification,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error queuing notification:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get pending notifications
 */
const getPendingNotifications = async (limit = 10) => {
    try {
        const client = getSupabaseServiceClient();
        const { data, error } = await client
            .from('notification_queue')
            .select('*')
            .eq('status', 'pending')
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(limit);
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error getting pending notifications:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update notification status
 */
const updateNotificationStatus = async (notificationId, status, errorMessage = null) => {
    try {
        const client = getSupabaseServiceClient();
        const updateData = {
            status,
            processed_at: new Date().toISOString()
        };
        
        if (errorMessage) {
            updateData.error_message = errorMessage;
        }
        
        const { data, error } = await client
            .from('notification_queue')
            .update(updateData)
            .eq('id', notificationId)
            .select()
            .single();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating notification status:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    getSupabaseClient,
    getSupabaseServiceClient,
    testConnection,
    getUserFromToken,
    upsertUserProfile,
    getUserWatchlist,
    addToWatchlist,
    logPriceHistory,
    queueNotification,
    getPendingNotifications,
    updateNotificationStatus
};