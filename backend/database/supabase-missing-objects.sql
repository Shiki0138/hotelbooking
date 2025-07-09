-- Supabaseで不足しているテーブルとオブジェクトを作成

-- 1. 不足しているテーブルを作成

-- Users table (重要)
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

-- 2. 不足しているインデックスを作成
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_room_date ON availability_calendar(room_id, date);

-- 3. ビューを作成（修正済みバージョン）
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
    (a.check_in_date - CURRENT_DATE)::integer as days_until_checkin
FROM hotels_crawling h
JOIN availability_crawling a ON h.id = a.hotel_id
WHERE h.is_luxury = TRUE
  AND h.is_active = TRUE
  AND a.is_last_minute = TRUE
  AND a.check_in_date >= CURRENT_DATE
  AND a.expires_at > NOW()
  AND a.discount_rate >= 20;

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
    (ph.check_in_date - CURRENT_DATE)::integer as days_until_checkin
FROM price_history ph
JOIN hotels_crawling h ON ph.hotel_id = h.id
WHERE ph.previous_price IS NOT NULL
  AND ph.previous_price != ph.price
  AND ph.check_in_date >= CURRENT_DATE
ORDER BY ABS(ph.price - ph.previous_price) DESC;

-- 4. 関数とトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 権限の付与
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 成功メッセージ
DO $$
BEGIN
    RAISE NOTICE '不足していたオブジェクトの作成が完了しました。';
END
$$;