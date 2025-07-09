-- Supabase用セットアップSQL（正しい順序で実行）
-- ステップ1: 基本テーブルの作成

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users table (Supabase Auth連携)
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

-- 2. Hotels table
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

-- 3. Hotels crawling table (楽天API用) - ビューより先に作成
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

-- 4. Availability crawling table
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

-- 5. Price history table
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

-- 6. Rooms table
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

-- 7. Bookings table
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

-- 8. その他のテーブル
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

CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_query JSONB NOT NULL,
    search_results_count INTEGER,
    selected_hotel_id UUID REFERENCES hotels(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, hotel_id)
);

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

-- インデックスの作成
CREATE INDEX idx_hotels_location ON hotels(city, state, country);
CREATE INDEX idx_hotels_active ON hotels(is_active);
CREATE INDEX idx_rooms_hotel ON rooms(hotel_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_hotel ON bookings(hotel_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_hotels_crawling_rakuten ON hotels_crawling(rakuten_hotel_no);
CREATE INDEX idx_availability_crawling_dates ON availability_crawling(check_in_date, hotel_id);