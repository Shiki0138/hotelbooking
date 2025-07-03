-- 完全システム実装 - DB・監視系6テーブル
-- Worker3: プロダクションレベル完成目標
-- Created: 2025-07-02

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ユーザー管理テーブル
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    date_of_birth DATE,
    preferred_language VARCHAR(5) DEFAULT 'ja',
    notification_enabled BOOLEAN DEFAULT TRUE,
    privacy_settings JSONB DEFAULT '{"email_notifications": true, "sms_notifications": false, "data_sharing": false}'::jsonb,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ホテル情報テーブル（リアルタイム）
CREATE TABLE IF NOT EXISTS hotels_realtime (
    hotel_no VARCHAR(20) PRIMARY KEY,
    hotel_name TEXT NOT NULL,
    hotel_name_kana TEXT,
    area VARCHAR(100),
    prefecture VARCHAR(50),
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    min_charge INTEGER,
    max_charge INTEGER,
    review_average DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    hotel_thumbnail_url TEXT,
    hotel_image_urls JSONB DEFAULT '[]'::jsonb,
    rakuten_travel_url TEXT,
    hotel_special_url TEXT,
    amenities JSONB DEFAULT '[]'::jsonb,
    room_facilities JSONB DEFAULT '[]'::jsonb,
    hotel_facilities JSONB DEFAULT '[]'::jsonb,
    access_info TEXT,
    checkin_time VARCHAR(10) DEFAULT '15:00',
    checkout_time VARCHAR(10) DEFAULT '10:00',
    parking_info TEXT,
    wifi_info TEXT,
    cancellation_policy TEXT,
    hotel_grade INTEGER,
    hotel_chain VARCHAR(100),
    business_registration_number VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    official_website TEXT,
    social_media JSONB DEFAULT '{}'::jsonb,
    seasonal_info JSONB DEFAULT '{}'::jsonb,
    last_updated_from_api TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ウォッチリストテーブル
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hotel_no VARCHAR(20) NOT NULL REFERENCES hotels_realtime(hotel_no),
    hotel_name TEXT NOT NULL,
    target_price INTEGER,
    max_acceptable_price INTEGER,
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    adult_num INTEGER DEFAULT 2 CHECK (adult_num > 0),
    child_num INTEGER DEFAULT 0 CHECK (child_num >= 0),
    room_num INTEGER DEFAULT 1 CHECK (room_num > 0),
    alert_conditions JSONB DEFAULT '{
        "price_drop": true,
        "price_drop_threshold": 1000,
        "price_drop_percentage": 10,
        "new_availability": true,
        "last_room_alert": true,
        "special_plan_alert": false,
        "daily_summary": false,
        "weekly_report": false
    }'::jsonb,
    notification_frequency VARCHAR(20) DEFAULT 'immediate',
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    notes TEXT,
    search_criteria JSONB DEFAULT '{}'::jsonb,
    alert_count INTEGER DEFAULT 0,
    last_alerted_at TIMESTAMP WITH TIME ZONE,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 価格履歴テーブル
CREATE TABLE IF NOT EXISTS price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_no VARCHAR(20) NOT NULL,
    room_type TEXT,
    room_name TEXT,
    plan_name TEXT,
    plan_id VARCHAR(50),
    price INTEGER NOT NULL CHECK (price > 0),
    original_price INTEGER,
    discount_rate INTEGER,
    availability_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
    remaining_rooms INTEGER,
    room_size_sqm DECIMAL(6,2),
    max_occupancy INTEGER,
    bed_type VARCHAR(50),
    meal_plan VARCHAR(100),
    amenities_included JSONB DEFAULT '[]'::jsonb,
    cancellation_policy_code VARCHAR(10),
    early_checkin_available BOOLEAN DEFAULT FALSE,
    late_checkout_available BOOLEAN DEFAULT FALSE,
    smoking_policy VARCHAR(20),
    view_type VARCHAR(50),
    floor_info VARCHAR(20),
    special_offers JSONB DEFAULT '[]'::jsonb,
    booking_engine VARCHAR(50) DEFAULT 'rakuten',
    currency_code VARCHAR(3) DEFAULT 'JPY',
    tax_included BOOLEAN DEFAULT TRUE,
    service_charge_included BOOLEAN DEFAULT TRUE,
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    adult_num INTEGER NOT NULL DEFAULT 2,
    child_num INTEGER DEFAULT 0,
    search_radius_km INTEGER,
    search_latitude DECIMAL(10,8),
    search_longitude DECIMAL(11,8),
    api_response_time_ms INTEGER,
    data_source VARCHAR(50) DEFAULT 'rakuten_api',
    data_freshness_score INTEGER DEFAULT 100,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 通知履歴テーブル
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    watchlist_id UUID REFERENCES watchlist(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    category VARCHAR(30) DEFAULT 'price_alert',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    short_message TEXT,
    hotel_no VARCHAR(20),
    hotel_name TEXT,
    price_data JSONB DEFAULT '{}'::jsonb,
    alert_data JSONB DEFAULT '{}'::jsonb,
    action_url TEXT,
    deep_link TEXT,
    image_url TEXT,
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    delivery_channels JSONB DEFAULT '["email"]'::jsonb,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    email_opened_at TIMESTAMP WITH TIME ZONE,
    email_clicked_at TIMESTAMP WITH TIME ZONE,
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP WITH TIME ZONE,
    push_opened_at TIMESTAMP WITH TIME ZONE,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMP WITH TIME ZONE,
    in_app_displayed BOOLEAN DEFAULT FALSE,
    in_app_displayed_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    delivery_status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    tracking_id VARCHAR(100),
    campaign_id VARCHAR(100),
    user_agent TEXT,
    ip_address INET,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. セッション管理テーブル
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    access_token_hash VARCHAR(255),
    session_type VARCHAR(20) DEFAULT 'web',
    device_id VARCHAR(255),
    device_name VARCHAR(100),
    device_type VARCHAR(50),
    os_name VARCHAR(50),
    os_version VARCHAR(50),
    browser_name VARCHAR(50),
    browser_version VARCHAR(50),
    user_agent TEXT,
    ip_address INET,
    ip_country VARCHAR(2),
    ip_region VARCHAR(100),
    ip_city VARCHAR(100),
    login_method VARCHAR(50) DEFAULT 'email_password',
    mfa_verified BOOLEAN DEFAULT FALSE,
    security_level INTEGER DEFAULT 1,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    logout_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    force_logout BOOLEAN DEFAULT FALSE,
    suspicious_activity BOOLEAN DEFAULT FALSE,
    login_attempts INTEGER DEFAULT 1,
    geolocation JSONB DEFAULT '{}'::jsonb,
    session_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成（パフォーマンス最適化）

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_created ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login_at DESC);

-- Hotels table indexes
CREATE INDEX idx_hotels_area ON hotels_realtime(area);
CREATE INDEX idx_hotels_prefecture ON hotels_realtime(prefecture);
CREATE INDEX idx_hotels_price_range ON hotels_realtime(min_charge, max_charge);
CREATE INDEX idx_hotels_review ON hotels_realtime(review_average DESC, review_count DESC);
CREATE INDEX idx_hotels_location ON hotels_realtime(latitude, longitude);
CREATE INDEX idx_hotels_updated ON hotels_realtime(updated_at DESC);
CREATE INDEX idx_hotels_active ON hotels_realtime(is_active) WHERE is_active = TRUE;

-- Watchlist table indexes
CREATE INDEX idx_watchlist_user ON watchlist(user_id);
CREATE INDEX idx_watchlist_hotel ON watchlist(hotel_no);
CREATE INDEX idx_watchlist_dates ON watchlist(checkin_date, checkout_date);
CREATE INDEX idx_watchlist_active ON watchlist(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_watchlist_alerts ON watchlist(last_alerted_at);
CREATE INDEX idx_watchlist_priority ON watchlist(priority_level DESC);
CREATE INDEX idx_watchlist_expires ON watchlist(expires_at) WHERE expires_at IS NOT NULL;

-- Price history table indexes
CREATE INDEX idx_price_history_hotel_dates ON price_history(hotel_no, checkin_date, checkout_date);
CREATE INDEX idx_price_history_checked ON price_history(checked_at DESC);
CREATE INDEX idx_price_history_price ON price_history(price);
CREATE INDEX idx_price_history_availability ON price_history(availability_status);
CREATE INDEX idx_price_history_plan ON price_history(plan_id) WHERE plan_id IS NOT NULL;
CREATE INDEX idx_price_history_location ON price_history(search_latitude, search_longitude) WHERE search_latitude IS NOT NULL;

-- Notifications table indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read_at) WHERE read_at IS NOT NULL;
CREATE INDEX idx_notifications_priority ON notifications(priority_level DESC);
CREATE INDEX idx_notifications_delivery ON notifications(delivery_status);
CREATE INDEX idx_notifications_hotel ON notifications(hotel_no) WHERE hotel_no IS NOT NULL;

-- Sessions table indexes
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_refresh ON user_sessions(refresh_token) WHERE refresh_token IS NOT NULL;
CREATE INDEX idx_sessions_active ON user_sessions(is_active, expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_sessions_device ON user_sessions(device_id) WHERE device_id IS NOT NULL;
CREATE INDEX idx_sessions_ip ON user_sessions(ip_address);
CREATE INDEX idx_sessions_last_activity ON user_sessions(last_activity_at DESC);

-- 複合インデックス（よく使われるクエリ最適化）
CREATE INDEX idx_watchlist_user_active ON watchlist(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_price_history_hotel_time ON price_history(hotel_no, checked_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, is_active, last_activity_at DESC) WHERE is_active = TRUE;

-- トリガー関数：updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガー設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_realtime_updated_at BEFORE UPDATE ON hotels_realtime
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlist_updated_at BEFORE UPDATE ON watchlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- データベース関数：よく使う処理を最適化

-- アクティブなウォッチリスト取得
CREATE OR REPLACE FUNCTION get_active_watchlist_for_user(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    hotel_no VARCHAR,
    hotel_name TEXT,
    target_price INTEGER,
    checkin_date DATE,
    checkout_date DATE,
    alert_conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.hotel_no,
        w.hotel_name,
        w.target_price,
        w.checkin_date,
        w.checkout_date,
        w.alert_conditions,
        w.created_at
    FROM watchlist w
    WHERE w.user_id = p_user_id
      AND w.is_active = TRUE
      AND w.checkin_date >= CURRENT_DATE
      AND (w.expires_at IS NULL OR w.expires_at > CURRENT_TIMESTAMP)
    ORDER BY w.priority_level DESC, w.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 価格履歴統計取得
CREATE OR REPLACE FUNCTION get_price_statistics(
    p_hotel_no VARCHAR,
    p_checkin_date DATE,
    p_checkout_date DATE,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    min_price INTEGER,
    max_price INTEGER,
    avg_price DECIMAL,
    current_price INTEGER,
    price_trend VARCHAR,
    data_points INTEGER
) AS $$
DECLARE
    v_current_price INTEGER;
    v_previous_price INTEGER;
    v_trend VARCHAR;
BEGIN
    -- 現在価格取得
    SELECT price INTO v_current_price
    FROM price_history
    WHERE hotel_no = p_hotel_no
      AND checkin_date = p_checkin_date
      AND checkout_date = p_checkout_date
      AND checked_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    ORDER BY checked_at DESC
    LIMIT 1;

    -- 前日価格取得
    SELECT price INTO v_previous_price
    FROM price_history
    WHERE hotel_no = p_hotel_no
      AND checkin_date = p_checkin_date
      AND checkout_date = p_checkout_date
      AND checked_at >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
      AND checked_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
    ORDER BY checked_at DESC
    LIMIT 1;

    -- トレンド判定
    IF v_current_price IS NULL THEN
        v_trend := 'no_data';
    ELSIF v_previous_price IS NULL THEN
        v_trend := 'insufficient_data';
    ELSIF v_current_price > v_previous_price THEN
        v_trend := 'rising';
    ELSIF v_current_price < v_previous_price THEN
        v_trend := 'falling';
    ELSE
        v_trend := 'stable';
    END IF;

    RETURN QUERY
    SELECT 
        MIN(ph.price)::INTEGER as min_price,
        MAX(ph.price)::INTEGER as max_price,
        ROUND(AVG(ph.price), 0)::DECIMAL as avg_price,
        v_current_price as current_price,
        v_trend as price_trend,
        COUNT(*)::INTEGER as data_points
    FROM price_history ph
    WHERE ph.hotel_no = p_hotel_no
      AND ph.checkin_date = p_checkin_date
      AND ph.checkout_date = p_checkout_date
      AND ph.checked_at >= CURRENT_TIMESTAMP - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- 通知配信ステータス更新
CREATE OR REPLACE FUNCTION update_notification_delivery_status(
    p_notification_id UUID,
    p_channel VARCHAR,
    p_status VARCHAR,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_time TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP;
BEGIN
    CASE p_channel
        WHEN 'email' THEN
            UPDATE notifications SET
                email_sent = (p_status = 'sent'),
                email_sent_at = CASE WHEN p_status = 'sent' THEN v_current_time ELSE email_sent_at END,
                delivery_status = p_status,
                error_message = p_error_message,
                updated_at = v_current_time
            WHERE id = p_notification_id;
        
        WHEN 'push' THEN
            UPDATE notifications SET
                push_sent = (p_status = 'sent'),
                push_sent_at = CASE WHEN p_status = 'sent' THEN v_current_time ELSE push_sent_at END,
                delivery_status = p_status,
                error_message = p_error_message,
                updated_at = v_current_time
            WHERE id = p_notification_id;
        
        WHEN 'sms' THEN
            UPDATE notifications SET
                sms_sent = (p_status = 'sent'),
                sms_sent_at = CASE WHEN p_status = 'sent' THEN v_current_time ELSE sms_sent_at END,
                delivery_status = p_status,
                error_message = p_error_message,
                updated_at = v_current_time
            WHERE id = p_notification_id;
        
        ELSE
            RETURN FALSE;
    END CASE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) 設定
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー作成
CREATE POLICY "Users can view and edit their own profile" ON users
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their own watchlist" ON watchlist
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Hotels and price_history are publicly readable (with rate limiting in application)
ALTER TABLE hotels_realtime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hotels are publicly readable" ON hotels_realtime
    FOR SELECT USING (true);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Price history is publicly readable" ON price_history
    FOR SELECT USING (true);

-- サンプルデータ投入（開発・テスト用）
INSERT INTO users (email, name, email_verified, notification_enabled) VALUES
('demo@lastminutestay.com', 'Demo User', true, true),
('test@example.com', 'Test User', true, true)
ON CONFLICT (email) DO NOTHING;

-- 東京・大阪の主要ホテルサンプルデータ
INSERT INTO hotels_realtime (
    hotel_no, hotel_name, area, prefecture, latitude, longitude, 
    min_charge, max_charge, review_average, review_count,
    hotel_thumbnail_url, amenities
) VALUES
('135436', 'ザ・リッツ・カールトン東京', '六本木', '東京都', 35.6654, 139.7297, 80000, 200000, 4.8, 1250, 
 'https://example.com/ritz-tokyo.jpg', '["spa", "fitness", "pool", "restaurant", "bar", "concierge"]'::jsonb),
('135437', 'パークハイアット東京', '新宿', '東京都', 35.6858, 139.6914, 70000, 180000, 4.7, 1180,
 'https://example.com/park-hyatt-tokyo.jpg', '["spa", "fitness", "pool", "restaurant", "bar"]'::jsonb),
('135438', 'コンラッド大阪', '中之島', '大阪府', 34.6931, 135.4881, 60000, 150000, 4.6, 980,
 'https://example.com/conrad-osaka.jpg', '["spa", "fitness", "restaurant", "bar", "meeting_rooms"]'::jsonb)
ON CONFLICT (hotel_no) DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP;

-- 初期価格履歴データ
INSERT INTO price_history (
    hotel_no, room_type, plan_name, price, availability_status,
    checkin_date, checkout_date, adult_num
) VALUES
('135436', 'デラックスルーム', '朝食付きプラン', 85000, 'available', CURRENT_DATE + 7, CURRENT_DATE + 8, 2),
('135437', 'パークルーム', 'スタンダードプラン', 75000, 'available', CURRENT_DATE + 7, CURRENT_DATE + 8, 2),
('135438', 'エグゼクティブルーム', 'ディナー付きプラン', 65000, 'limited', CURRENT_DATE + 7, CURRENT_DATE + 8, 2);

COMMIT;

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '✅ 完全システム実装 - DB・監視系6テーブル構築完了';
    RAISE NOTICE '📊 テーブル数: 6個';
    RAISE NOTICE '🔧 インデックス数: 30個以上';
    RAISE NOTICE '⚡ 関数数: 4個';
    RAISE NOTICE '🛡️ RLS ポリシー数: 6個';
    RAISE NOTICE '🚀 プロダクションレベル準備完了！';
END $$;