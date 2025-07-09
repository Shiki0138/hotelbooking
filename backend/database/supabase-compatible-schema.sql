-- Supabase PostgreSQL互換性のある完全なスキーマ
-- EXTRACT関数のエラーを修正済み

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (Supabase Auth連携)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'USER',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    star_rating DECIMAL(2, 1),
    total_rooms INTEGER,
    check_in_time TIME,
    check_out_time TIME,
    amenities JSONB,
    policies JSONB,
    images JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    room_type VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    max_occupancy INTEGER NOT NULL,
    bed_type VARCHAR(50),
    room_size DECIMAL(8, 2),
    amenities JSONB,
    images JSONB,
    total_rooms INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id),
    hotel_id UUID REFERENCES hotels(id),
    room_id UUID REFERENCES rooms(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(20),
    number_of_guests INTEGER DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'JPY',
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    booking_status VARCHAR(50) DEFAULT 'confirmed',
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    preferred_locations JSONB,
    budget_range JSONB,
    preferred_amenities JSONB,
    preferred_room_types JSONB,
    notification_preferences JSONB,
    language VARCHAR(10) DEFAULT 'ja',
    currency VARCHAR(3) DEFAULT 'JPY',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Search history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_query JSONB NOT NULL,
    search_results_count INTEGER,
    selected_hotel_id UUID REFERENCES hotels(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, hotel_id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    user_id UUID REFERENCES users(id),
    hotel_id UUID REFERENCES hotels(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    pros TEXT,
    cons TEXT,
    is_verified BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Availability calendar table
CREATE TABLE IF NOT EXISTS availability_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_rooms INTEGER NOT NULL,
    price DECIMAL(10, 2),
    min_stay INTEGER DEFAULT 1,
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, date)
);

-- Price rules table
CREATE TABLE IF NOT EXISTS price_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    conditions JSONB,
    adjustment_type VARCHAR(20),
    adjustment_value DECIMAL(10, 2),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    room_type VARCHAR(255),
    check_in_date DATE,
    check_out_date DATE,
    target_price DECIMAL(10, 2),
    notification_enabled BOOLEAN DEFAULT true,
    last_notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hotels crawling table (楽天API用)
CREATE TABLE IF NOT EXISTS hotels_crawling (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rakuten_hotel_no VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Japan',
    prefecture VARCHAR(100),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    star_rating DECIMAL(2, 1),
    total_reviews INTEGER DEFAULT 0,
    review_score DECIMAL(3, 2),
    image_url TEXT,
    amenities JSONB,
    description TEXT,
    is_luxury BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_crawled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Availability crawling table
CREATE TABLE IF NOT EXISTS availability_crawling (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels_crawling(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    room_type_name VARCHAR(255),
    room_class VARCHAR(100),
    plan_name TEXT,
    original_price DECIMAL(10, 2),
    current_price DECIMAL(10, 2) NOT NULL,
    discount_rate DECIMAL(5, 2),
    available_rooms INTEGER,
    max_occupancy INTEGER,
    meal_type VARCHAR(50),
    cancellation_policy TEXT,
    is_last_minute BOOLEAN DEFAULT false,
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Price history table
CREATE TABLE IF NOT EXISTS price_history_crawling (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels_crawling(id) ON DELETE CASCADE,
    room_type_name VARCHAR(255),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    available_rooms INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_hotels_location ON hotels(city, state, country);
CREATE INDEX idx_hotels_active ON hotels(is_active);
CREATE INDEX idx_rooms_hotel ON rooms(hotel_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_hotel ON bookings(hotel_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_availability_room_date ON availability_calendar(room_id, date);
CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_watchlist_user ON watchlist(user_id);
CREATE INDEX idx_hotels_crawling_rakuten ON hotels_crawling(rakuten_hotel_no);
CREATE INDEX idx_availability_crawling_dates ON availability_crawling(check_in_date, hotel_id);

-- Views with fixed EXTRACT function

-- 修正版: luxury_deals_view
CREATE OR REPLACE VIEW luxury_deals_view AS
SELECT 
    h.id as hotel_id,
    h.name,
    h.city,
    h.country,
    h.star_rating,
    h.total_reviews,
    h.review_score,
    h.image_url,
    h.amenities,
    h.description,
    a.id as availability_id,
    a.check_in_date,
    a.check_out_date,
    a.room_type_name,
    a.original_price,
    a.current_price,
    a.discount_rate,
    a.available_rooms,
    a.crawled_at,
    -- 修正: 日付の差を計算
    (a.check_in_date - CURRENT_DATE)::integer as days_until_checkin
FROM hotels_crawling h
JOIN availability_crawling a ON h.id = a.hotel_id
WHERE h.is_luxury = TRUE
  AND h.is_active = TRUE
  AND a.is_last_minute = TRUE
  AND a.check_in_date >= CURRENT_DATE
  AND a.expires_at > NOW()
  AND a.discount_rate >= 20;

-- 修正版: price_change_analysis
CREATE OR REPLACE VIEW price_change_analysis AS
WITH price_history AS (
    SELECT 
        ph.hotel_id,
        ph.room_type_name,
        ph.check_in_date,
        ph.check_out_date,
        ph.price,
        ph.recorded_at,
        LAG(ph.price) OVER (
            PARTITION BY ph.hotel_id, ph.room_type_name, ph.check_in_date 
            ORDER BY ph.recorded_at
        ) as previous_price
    FROM price_history_crawling ph
)
SELECT 
    h.name as hotel_name,
    h.city,
    ph.room_type_name,
    ph.check_in_date,
    ph.check_out_date,
    ph.previous_price,
    ph.price as current_price,
    ROUND(((ph.price - ph.previous_price) / NULLIF(ph.previous_price, 0) * 100)::numeric, 2) as price_change_percent,
    ph.recorded_at,
    -- 修正: 日付の差を計算
    (ph.check_in_date - CURRENT_DATE)::integer as days_until_checkin
FROM price_history ph
JOIN hotels_crawling h ON ph.hotel_id = h.id
WHERE ph.previous_price IS NOT NULL
  AND ph.previous_price != ph.price
  AND ph.check_in_date >= CURRENT_DATE
ORDER BY ABS(ph.price - ph.previous_price) DESC;

-- Realtime inventory tracking
CREATE TABLE IF NOT EXISTS realtime_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_rooms INTEGER NOT NULL,
    occupied_rooms INTEGER DEFAULT 0,
    available_rooms INTEGER GENERATED ALWAYS AS (total_rooms - occupied_rooms) STORED,
    occupancy_rate DECIMAL(5, 2) GENERATED ALWAYS AS 
        (CASE WHEN total_rooms > 0 THEN (occupied_rooms::DECIMAL / total_rooms * 100) ELSE 0 END) STORED,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, date)
);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Supabase推奨
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own favorites" ON favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites" ON favorites
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Supabase互換スキーマの作成が完了しました。';
END
$$;