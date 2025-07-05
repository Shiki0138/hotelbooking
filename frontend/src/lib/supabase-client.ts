/**
 * Supabase Client Configuration for Frontend
 * Provides centralized Supabase client instance
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// Environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. Please check REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY'
    );
}

// Client options
const options = {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'lastminutestay-auth',
        flowType: 'pkce' as const,
    },
    db: {
        schema: 'public',
    },
    global: {
        headers: { 'x-application-name': 'lastminutestay-frontend' },
    },
};

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, options);

// Auth helpers
export const auth = {
    /**
     * Sign up new user
     */
    signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        });
        return { data, error };
    },

    /**
     * Sign in user
     */
    signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    },

    /**
     * Sign out user
     */
    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    /**
     * Get current user
     */
    getUser: async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        return { user, error };
    },

    /**
     * Get session
     */
    getSession: async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        return { session, error };
    },

    /**
     * Reset password
     */
    resetPassword: async (email: string) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        return { data, error };
    },

    /**
     * Update password
     */
    updatePassword: async (newPassword: string) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        return { data, error };
    },

    /**
     * Listen to auth state changes
     */
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
        return supabase.auth.onAuthStateChange(callback);
    },
};

// Database helpers
export const db = {
    /**
     * Get user profile
     */
    getUserProfile: async (userId: string) => {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
        return { data, error };
    },

    /**
     * Update user profile
     */
    updateUserProfile: async (userId: string, updates: Partial<any>) => {
        const { data, error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        return { data, error };
    },

    /**
     * Get user watchlist
     */
    getWatchlist: async (userId: string) => {
        const { data, error } = await supabase
            .from('watchlist')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        return { data, error };
    },

    /**
     * Add to watchlist
     */
    addToWatchlist: async (watchlistItem: any) => {
        const { data, error } = await supabase
            .from('watchlist')
            .insert(watchlistItem)
            .select()
            .single();
        return { data, error };
    },

    /**
     * Remove from watchlist
     */
    removeFromWatchlist: async (watchlistId: string) => {
        const { data, error } = await supabase
            .from('watchlist')
            .update({ is_active: false })
            .eq('id', watchlistId)
            .select()
            .single();
        return { data, error };
    },

    /**
     * Get hotels
     */
    getHotels: async (filters?: any) => {
        let query = supabase.from('hotels').select('*');
        
        if (filters?.prefecture) {
            query = query.eq('prefecture', filters.prefecture);
        }
        
        if (filters?.location) {
            query = query.ilike('location', `%${filters.location}%`);
        }
        
        const { data, error } = await query.order('name');
        return { data, error };
    },

    /**
     * Get price history
     */
    getPriceHistory: async (hotelId: string, days: number = 7) => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data, error } = await supabase
            .from('hotel_price_history')
            .select('*')
            .eq('hotel_id', hotelId)
            .gte('check_timestamp', startDate.toISOString())
            .order('check_timestamp', { ascending: false });
        return { data, error };
    },

    /**
     * Get notification history
     */
    getNotificationHistory: async (userId: string) => {
        const { data, error } = await supabase
            .from('notification_history')
            .select('*')
            .eq('user_id', userId)
            .order('sent_at', { ascending: false })
            .limit(50);
        return { data, error };
    },

    /**
     * Get user preferences
     */
    getUserPreferences: async (userId: string) => {
        const { data, error } = await supabase
            .from('user_notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();
        return { data, error };
    },

    /**
     * Update user preferences
     */
    updateUserPreferences: async (userId: string, preferences: any) => {
        const { data, error } = await supabase
            .from('user_notification_preferences')
            .upsert({
                user_id: userId,
                ...preferences,
            })
            .select()
            .single();
        return { data, error };
    },
};

// Realtime subscriptions
export const realtime = {
    /**
     * Subscribe to watchlist changes
     */
    subscribeToWatchlist: (userId: string, callback: (payload: any) => void) => {
        return supabase
            .channel(`watchlist:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'watchlist',
                    filter: `user_id=eq.${userId}`,
                },
                callback
            )
            .subscribe();
    },

    /**
     * Subscribe to notifications
     */
    subscribeToNotifications: (userId: string, callback: (payload: any) => void) => {
        return supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notification_queue',
                    filter: `user_id=eq.${userId}`,
                },
                callback
            )
            .subscribe();
    },

    /**
     * Unsubscribe from channel
     */
    unsubscribe: async (channel: any) => {
        await supabase.removeChannel(channel);
    },
};

// Storage helpers
export const storage = {
    /**
     * Upload user avatar
     */
    uploadAvatar: async (userId: string, file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { data, error } = await supabase.storage
            .from('user-content')
            .upload(filePath, file);

        if (error) return { error };

        const { data: { publicUrl } } = supabase.storage
            .from('user-content')
            .getPublicUrl(filePath);

        return { data: { path: filePath, url: publicUrl }, error: null };
    },

    /**
     * Delete file
     */
    deleteFile: async (bucket: string, path: string) => {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);
        return { error };
    },
};

export default supabase;