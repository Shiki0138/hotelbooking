-- LastMinuteStay Demo Mode Database Schema
-- Worker3: Phase1 - Database Design (1.5h)
-- Created: 2025-07-02

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Demo Users table (simplified version for demo mode)
CREATE TABLE IF NOT EXISTS demo_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    preferred_areas TEXT[], -- Array of preferred areas
    notification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hotel Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES demo_users(id) ON DELETE CASCADE,
    hotel_id VARCHAR(100) NOT NULL, -- Rakuten Hotel ID
    hotel_name VARCHAR(255) NOT NULL,
    area VARCHAR(100) NOT NULL,
    prefecture VARCHAR(50) NOT NULL,
    max_price INTEGER, -- Maximum price user is willing to pay
    min_price INTEGER DEFAULT 0, -- Minimum price threshold
    check_in_date DATE,
    check_out_date DATE,
    guests_count INTEGER DEFAULT 2,
    alert_price_drop BOOLEAN DEFAULT true,
    alert_availability BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hotel Price History (for tracking price changes)
CREATE TABLE IF NOT EXISTS hotel_price_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id VARCHAR(100) NOT NULL,
    hotel_name VARCHAR(255) NOT NULL,
    area VARCHAR(100) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guests_count INTEGER NOT NULL,
    current_price INTEGER NOT NULL,
    previous_price INTEGER,
    availability_status VARCHAR(20) NOT NULL, -- 'available', 'limited', 'unavailable'
    check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, check_in_date, check_out_date, guests_count, DATE(check_timestamp))
);

-- Notification History table
CREATE TABLE IF NOT EXISTS demo_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES demo_users(id) ON DELETE CASCADE,
    watchlist_id UUID REFERENCES watchlist(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'price_drop', 'availability', 'price_alert'
    hotel_data JSONB NOT NULL, -- Store hotel information at time of notification
    price_info JSONB, -- Store price comparison data
    email_subject VARCHAR(255) NOT NULL,
    email_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_notification_type CHECK (notification_type IN ('price_drop', 'availability', 'price_alert', 'new_deals')),
    CONSTRAINT valid_email_status CHECK (email_status IN ('pending', 'sent', 'failed'))
);

-- Alert Settings table (for user preferences)
CREATE TABLE IF NOT EXISTS alert_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES demo_users(id) ON DELETE CASCADE,
    price_drop_threshold INTEGER DEFAULT 1000, -- Minimum price drop in JPY to trigger alert
    price_drop_percentage INTEGER DEFAULT 10, -- Minimum percentage drop to trigger alert
    availability_alert BOOLEAN DEFAULT true,
    daily_digest BOOLEAN DEFAULT false,
    instant_alerts BOOLEAN DEFAULT true,
    max_alerts_per_day INTEGER DEFAULT 5,
    preferred_notification_time TIME DEFAULT '09:00:00', -- For daily digest
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Hotel Check Queue (for batch processing)
CREATE TABLE IF NOT EXISTS hotel_check_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id VARCHAR(100) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guests_count INTEGER NOT NULL,
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for performance optimization
CREATE INDEX idx_demo_users_email ON demo_users(email);
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watchlist_hotel_area ON watchlist(hotel_id, area);
CREATE INDEX idx_watchlist_active ON watchlist(is_active) WHERE is_active = true;
CREATE INDEX idx_watchlist_dates ON watchlist(check_in_date, check_out_date);

CREATE INDEX idx_price_history_hotel_date ON hotel_price_history(hotel_id, check_in_date, check_out_date);
CREATE INDEX idx_price_history_timestamp ON hotel_price_history(check_timestamp);

CREATE INDEX idx_notifications_user_id ON demo_notifications(user_id);
CREATE INDEX idx_notifications_type ON demo_notifications(notification_type);
CREATE INDEX idx_notifications_status ON demo_notifications(email_status);
CREATE INDEX idx_notifications_sent ON demo_notifications(sent_at);

CREATE INDEX idx_check_queue_status ON hotel_check_queue(status);
CREATE INDEX idx_check_queue_scheduled ON hotel_check_queue(scheduled_at);
CREATE INDEX idx_check_queue_priority ON hotel_check_queue(priority, scheduled_at);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_demo_users_updated_at BEFORE UPDATE ON demo_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlist_updated_at BEFORE UPDATE ON watchlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_settings_updated_at BEFORE UPDATE ON alert_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean old price history (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_price_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM hotel_price_history 
    WHERE check_timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get price drop percentage
CREATE OR REPLACE FUNCTION calculate_price_drop_percentage(
    current_price INTEGER,
    previous_price INTEGER
)
RETURNS INTEGER AS $$
BEGIN
    IF previous_price IS NULL OR previous_price = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND(((previous_price - current_price)::DECIMAL / previous_price) * 100);
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE demo_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

-- Price history and check queue are service-level tables (no RLS needed)
ALTER TABLE hotel_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_check_queue ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON demo_users
    FOR SELECT USING (true); -- Public read for demo mode

CREATE POLICY "Users can insert own profile" ON demo_users
    FOR INSERT WITH CHECK (true); -- Allow registration

CREATE POLICY "Users can update own profile" ON demo_users
    FOR UPDATE USING (true); -- Allow updates for demo

-- Watchlist policies
CREATE POLICY "Users can view own watchlist" ON watchlist
    FOR SELECT USING (true); -- Public read for demo

CREATE POLICY "Users can manage own watchlist" ON watchlist
    FOR ALL USING (true); -- Allow full access for demo

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON demo_notifications
    FOR SELECT USING (true); -- Public read for demo

-- Alert settings policies
CREATE POLICY "Users can manage own alert settings" ON alert_settings
    FOR ALL USING (true); -- Allow full access for demo

-- Public read for service tables
CREATE POLICY "Public read price history" ON hotel_price_history
    FOR SELECT USING (true);

CREATE POLICY "Service can manage price history" ON hotel_price_history
    FOR ALL USING (true);

CREATE POLICY "Service can manage check queue" ON hotel_check_queue
    FOR ALL USING (true);