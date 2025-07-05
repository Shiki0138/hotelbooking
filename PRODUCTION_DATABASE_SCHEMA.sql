-- LastMinuteStay Production Database Schema for Supabase
-- Version: 1.0.0
-- Created: 2025-07-04
-- Author: Worker2

-- =====================================================
-- STEP 1: Enable Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- For scheduled jobs

-- =====================================================
-- STEP 2: Core Tables
-- =====================================================

-- Hotels table (Rakuten API data cache)
CREATE TABLE IF NOT EXISTS hotels (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rakuten_hotel_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    location VARCHAR(255) NOT NULL,
    prefecture VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    description TEXT,
    star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
    amenities JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    policies JSONB DEFAULT '{}'::jsonb,
    rakuten_data JSONB, -- Raw API response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    phone_number VARCHAR(50),
    preferred_language VARCHAR(10) DEFAULT 'ja',
    preferred_areas TEXT[],
    marketing_consent BOOLEAN DEFAULT false,
    notification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist for price monitoring
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hotel_id VARCHAR(50) NOT NULL, -- Rakuten hotel ID
    hotel_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests_count INTEGER NOT NULL DEFAULT 2,
    target_price DECIMAL(10, 2),
    max_price DECIMAL(10, 2),
    alert_enabled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_watchlist_dates CHECK (check_out > check_in),
    UNIQUE(user_id, hotel_id, check_in, check_out)
);

-- Hotel price monitoring history
CREATE TABLE IF NOT EXISTS hotel_price_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id VARCHAR(50) NOT NULL,
    hotel_name VARCHAR(255) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests_count INTEGER NOT NULL,
    current_price DECIMAL(10, 2),
    previous_price DECIMAL(10, 2),
    availability_status VARCHAR(20) NOT NULL, -- 'available', 'limited', 'unavailable'
    room_types_available INTEGER DEFAULT 0,
    raw_api_response JSONB,
    check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, check_in, check_out, guests_count, DATE(check_timestamp))
);

-- Notification queue
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    watchlist_id UUID REFERENCES watchlist(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    subject VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_notification_type CHECK (notification_type IN ('availability', 'price_drop', 'booking_reminder', 'system')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high')),
    CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'processing', 'sent', 'failed'))
);

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    availability_alerts BOOLEAN DEFAULT true,
    price_drop_alerts BOOLEAN DEFAULT true,
    price_drop_threshold INTEGER DEFAULT 10, -- percentage
    price_drop_amount INTEGER DEFAULT 1000, -- JPY
    daily_digest BOOLEAN DEFAULT false,
    instant_alerts BOOLEAN DEFAULT true,
    max_alerts_per_day INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Notification history
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    watchlist_id UUID REFERENCES watchlist(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    hotel_data JSONB NOT NULL,
    price_info JSONB,
    email_subject VARCHAR(255) NOT NULL,
    email_status VARCHAR(50) NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- STEP 3: Indexes for Performance
-- =====================================================

-- Hotels indexes
CREATE INDEX idx_hotels_rakuten_id ON hotels(rakuten_hotel_id);
CREATE INDEX idx_hotels_prefecture ON hotels(prefecture);
CREATE INDEX idx_hotels_location ON hotels(location);

-- Watchlist indexes
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watchlist_hotel_id ON watchlist(hotel_id);
CREATE INDEX idx_watchlist_active ON watchlist(is_active) WHERE is_active = true;
CREATE INDEX idx_watchlist_dates ON watchlist(check_in, check_out);

-- Price history indexes
CREATE INDEX idx_price_history_hotel_dates ON hotel_price_history(hotel_id, check_in, check_out);
CREATE INDEX idx_price_history_timestamp ON hotel_price_history(check_timestamp DESC);

-- Notification indexes
CREATE INDEX idx_notification_queue_status ON notification_queue(status) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX idx_notification_history_user ON notification_history(user_id);
CREATE INDEX idx_notification_history_sent ON notification_history(sent_at DESC);

-- =====================================================
-- STEP 4: Functions and Triggers
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlist_updated_at BEFORE UPDATE ON watchlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate price drop percentage
CREATE OR REPLACE FUNCTION calculate_price_drop_percentage(
    current_price DECIMAL,
    previous_price DECIMAL
)
RETURNS INTEGER AS $$
BEGIN
    IF previous_price IS NULL OR previous_price = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND(((previous_price - current_price)::DECIMAL / previous_price) * 100);
END;
$$ LANGUAGE plpgsql;

-- Function to clean old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete price history older than 30 days
    DELETE FROM hotel_price_history 
    WHERE check_timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete processed notifications older than 90 days
    DELETE FROM notification_queue 
    WHERE status IN ('sent', 'failed') 
    AND processed_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    -- Delete notification history older than 180 days
    DELETE FROM notification_history 
    WHERE sent_at < CURRENT_TIMESTAMP - INTERVAL '180 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Hotels are public read
CREATE POLICY "Hotels are viewable by everyone" ON hotels
    FOR SELECT USING (true);

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Watchlist policies
CREATE POLICY "Users can view own watchlist" ON watchlist
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own watchlist items" ON watchlist
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist items" ON watchlist
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist items" ON watchlist
    FOR DELETE USING (auth.uid() = user_id);

-- Price history is public read (for statistics)
CREATE POLICY "Price history is viewable by everyone" ON hotel_price_history
    FOR SELECT USING (true);

-- Notification queue policies
CREATE POLICY "Users can view own notifications" ON notification_queue
    FOR SELECT USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can view own preferences" ON user_notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notification history policies
CREATE POLICY "Users can view own notification history" ON notification_history
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- STEP 6: Views for Common Queries
-- =====================================================

-- Active watchlist with user info
CREATE OR REPLACE VIEW active_watchlist AS
SELECT 
    w.*,
    u.email,
    p.full_name,
    np.price_drop_threshold,
    np.instant_alerts,
    np.availability_alerts
FROM watchlist w
JOIN auth.users u ON w.user_id = u.id
LEFT JOIN user_profiles p ON w.user_id = p.id
LEFT JOIN user_notification_preferences np ON w.user_id = np.user_id
WHERE w.is_active = true 
AND w.check_in >= CURRENT_DATE;

-- Recent price drops
CREATE OR REPLACE VIEW recent_price_drops AS
SELECT 
    hotel_id,
    hotel_name,
    check_in,
    check_out,
    guests_count,
    current_price,
    previous_price,
    calculate_price_drop_percentage(current_price, previous_price) as drop_percentage,
    (previous_price - current_price) as drop_amount,
    availability_status,
    check_timestamp
FROM hotel_price_history
WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
AND previous_price IS NOT NULL
AND current_price < previous_price
ORDER BY check_timestamp DESC;

-- =====================================================
-- STEP 7: Initial Configuration
-- =====================================================

-- Create cron job for price monitoring (runs every 15 minutes)
SELECT cron.schedule(
    'monitor-hotel-prices',
    '*/15 * * * *',
    $$
    SELECT pg_notify('hotel_monitor', 'check_prices');
    $$
);

-- Create cron job for daily cleanup (runs at 3 AM JST)
SELECT cron.schedule(
    'cleanup-old-data',
    '0 18 * * *', -- 3 AM JST = 6 PM UTC
    $$
    SELECT cleanup_old_data();
    $$
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
-- Schema created successfully!
-- Next steps:
-- 1. Update .env with Supabase credentials
-- 2. Configure authentication settings in Supabase dashboard
-- 3. Test database connectivity
-- 4. Apply seed data if needed