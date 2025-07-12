-- Hotel Booking System Database Schema
-- Phase 4 完全版 - Agoda, Booking.com, Expedia API統合対応

-- Users table (認証なしでも動作可能)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    preferred_language VARCHAR(10) DEFAULT 'ja',
    preferred_currency VARCHAR(3) DEFAULT 'JPY',
    notification_email BOOLEAN DEFAULT true,
    preferred_providers TEXT[] DEFAULT ARRAY['agoda', 'booking', 'expedia'],
    price_range_min INTEGER,
    price_range_max INTEGER,
    preferred_amenities TEXT[],
    preferred_regions TEXT[] DEFAULT '{}',
    preferred_prefectures TEXT[] DEFAULT '{}',
    hotel_types TEXT[] DEFAULT '{}',
    min_rating NUMERIC(2,1) DEFAULT 4.0,
    travel_months INTEGER[] DEFAULT '{}',
    advance_notice_days INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotels master table (全プロバイダー統合)
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_hotel_id VARCHAR(255),
    provider VARCHAR(50) NOT NULL, -- agoda, booking, expedia
    name VARCHAR(500) NOT NULL,
    name_ja VARCHAR(500),
    description TEXT,
    description_ja TEXT,
    address VARCHAR(500),
    city VARCHAR(200),
    prefecture VARCHAR(100),
    country VARCHAR(100) DEFAULT 'JP',
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    star_rating DECIMAL(2, 1),
    review_score DECIMAL(3, 2),
    review_count INTEGER,
    hotel_class VARCHAR(50), -- luxury, business, budget
    chain_name VARCHAR(200),
    amenities JSONB,
    images JSONB,
    policies JSONB,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_hotel_id)
);

-- Room types
CREATE TABLE IF NOT EXISTS room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    provider_room_id VARCHAR(255),
    name VARCHAR(500) NOT NULL,
    name_ja VARCHAR(500),
    description TEXT,
    max_occupancy INTEGER NOT NULL,
    bed_configuration VARCHAR(200),
    room_size_sqm DECIMAL(6, 2),
    amenities JSONB,
    images JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price cache (リアルタイム価格管理)
CREATE TABLE IF NOT EXISTS price_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL,
    original_price DECIMAL(10, 2),
    discounted_price DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2),
    taxes_and_fees DECIMAL(10, 2),
    total_price DECIMAL(10, 2) NOT NULL,
    availability_status VARCHAR(50), -- available, limited, sold_out
    cancellation_policy JSONB,
    meal_plan VARCHAR(100),
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings (予約管理)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    room_type_id UUID REFERENCES room_types(id),
    provider VARCHAR(50) NOT NULL,
    provider_booking_id VARCHAR(255),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INTEGER NOT NULL,
    guests_count INTEGER NOT NULL,
    room_count INTEGER DEFAULT 1,
    currency VARCHAR(3) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    taxes_and_fees DECIMAL(10, 2),
    total_price DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2),
    commission_rate DECIMAL(5, 2),
    booking_status VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50),
    cancellation_deadline TIMESTAMP WITH TIME ZONE,
    guest_details JSONB,
    special_requests TEXT,
    confirmation_code VARCHAR(100),
    affiliate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search history
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    search_params JSONB NOT NULL,
    results_count INTEGER,
    selected_hotel_id UUID REFERENCES hotels(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Affiliate tracking (収益化)
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    hotel_id UUID REFERENCES hotels(id),
    provider VARCHAR(50) NOT NULL,
    affiliate_url TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    click_id UUID REFERENCES affiliate_clicks(id),
    booking_id UUID REFERENCES bookings(id),
    provider VARCHAR(50) NOT NULL,
    commission_amount DECIMAL(10, 2),
    commission_currency VARCHAR(3),
    conversion_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites/Watchlist
CREATE TABLE IF NOT EXISTS favorite_hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES hotels(id),
    hotel_data JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, hotel_id)
);

-- Price alerts
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    hotel_id UUID REFERENCES hotels(id),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    target_price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'JPY',
    is_active BOOLEAN DEFAULT true,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification history
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    hotel_id VARCHAR(255),
    hotel_name VARCHAR(255),
    content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE
);

-- Reviews (プロバイダー統合)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    provider VARCHAR(50) NOT NULL,
    provider_review_id VARCHAR(255),
    user_name VARCHAR(200),
    rating DECIMAL(3, 2),
    title VARCHAR(500),
    comment TEXT,
    pros TEXT,
    cons TEXT,
    travel_type VARCHAR(100),
    room_type VARCHAR(200),
    stay_date DATE,
    review_date DATE,
    language VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_review_id)
);

-- Performance indexes
CREATE INDEX idx_hotels_location ON hotels(prefecture, city);
CREATE INDEX idx_hotels_rating ON hotels(star_rating, review_score);
CREATE INDEX idx_hotels_provider ON hotels(provider, provider_hotel_id);
CREATE INDEX idx_hotels_active ON hotels(is_active);
CREATE INDEX idx_hotels_class ON hotels(hotel_class);

CREATE INDEX idx_price_cache_search ON price_cache(hotel_id, check_in, check_out, provider);
CREATE INDEX idx_price_cache_expires ON price_cache(expires_at);
CREATE INDEX idx_price_cache_dates ON price_cache(check_in, check_out);

CREATE INDEX idx_bookings_user ON bookings(user_id, booking_status);
CREATE INDEX idx_bookings_hotel ON bookings(hotel_id, check_in);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_provider ON bookings(provider);

CREATE INDEX idx_search_history_user ON search_history(user_id, created_at);
CREATE INDEX idx_search_history_session ON search_history(session_id);

CREATE INDEX idx_affiliate_clicks_user ON affiliate_clicks(user_id, created_at);
CREATE INDEX idx_affiliate_clicks_hotel ON affiliate_clicks(hotel_id, provider);

CREATE INDEX idx_favorite_hotels_user ON favorite_hotels(user_id);
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON room_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();