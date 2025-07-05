-- 地域別ホテル検索システム用データベーススキーマ
-- 高級ホテル直前予約システム

-- 都道府県テーブル
CREATE TABLE IF NOT EXISTS prefectures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    name_en VARCHAR(50),
    region VARCHAR(20) NOT NULL,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 市町村テーブル
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    prefecture_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    name_en VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    population INTEGER,
    area_km2 DECIMAL(8,2),
    is_major_city BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prefecture_id) REFERENCES prefectures(id) ON DELETE CASCADE
);

-- エリア（区域）テーブル - より詳細な地域分類
CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    name_en VARCHAR(100),
    area_type VARCHAR(20) DEFAULT 'district', -- district, station_area, tourist_area, business_area
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    radius_km DECIMAL(5,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

-- 駅テーブル
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    name_en VARCHAR(100),
    line_name VARCHAR(100),
    station_type VARCHAR(20) DEFAULT 'train', -- train, subway, bus
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    is_major_station BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

-- 観光地テーブル
CREATE TABLE IF NOT EXISTS tourist_spots (
    id SERIAL PRIMARY KEY,
    city_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(200),
    category VARCHAR(30), -- temple, museum, park, shopping, entertainment, nature
    description TEXT,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0.0,
    visit_duration_hours INTEGER DEFAULT 2,
    entry_fee INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
);

-- ホテル位置情報拡張テーブル
CREATE TABLE IF NOT EXISTS hotel_locations (
    hotel_id INTEGER PRIMARY KEY,
    prefecture_id INTEGER NOT NULL,
    city_id INTEGER NOT NULL,
    area_id INTEGER,
    address TEXT NOT NULL,
    postal_code VARCHAR(10),
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    -- 最寄り駅情報
    nearest_station_id INTEGER,
    distance_to_station_m INTEGER,
    walk_time_to_station_min INTEGER,
    -- 観光地アクセス情報
    tourist_access_score INTEGER DEFAULT 0, -- 0-100
    business_access_score INTEGER DEFAULT 0, -- 0-100
    transport_access_score INTEGER DEFAULT 0, -- 0-100
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prefecture_id) REFERENCES prefectures(id),
    FOREIGN KEY (city_id) REFERENCES cities(id),
    FOREIGN KEY (area_id) REFERENCES areas(id),
    FOREIGN KEY (nearest_station_id) REFERENCES stations(id)
);

-- ホテル-観光地関連テーブル（距離・アクセス情報）
CREATE TABLE IF NOT EXISTS hotel_tourist_spots (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL,
    tourist_spot_id INTEGER NOT NULL,
    distance_km DECIMAL(5,2),
    travel_time_min INTEGER,
    transport_method VARCHAR(20) DEFAULT 'walk', -- walk, train, bus, car, taxi
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotel_locations(hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (tourist_spot_id) REFERENCES tourist_spots(id) ON DELETE CASCADE,
    UNIQUE(hotel_id, tourist_spot_id)
);

-- 価格帯カテゴリテーブル
CREATE TABLE IF NOT EXISTS price_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    min_price INTEGER NOT NULL,
    max_price INTEGER,
    category_code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    target_customer VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ホテル価格分析テーブル
CREATE TABLE IF NOT EXISTS hotel_price_analysis (
    hotel_id INTEGER PRIMARY KEY,
    current_avg_price INTEGER,
    min_price INTEGER,
    max_price INTEGER,
    price_category_id INTEGER,
    seasonal_factor DECIMAL(3,2) DEFAULT 1.0,
    demand_factor DECIMAL(3,2) DEFAULT 1.0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (price_category_id) REFERENCES price_categories(id),
    FOREIGN KEY (hotel_id) REFERENCES hotel_locations(hotel_id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_cities_prefecture ON cities(prefecture_id);
CREATE INDEX IF NOT EXISTS idx_areas_city ON areas(city_id);
CREATE INDEX IF NOT EXISTS idx_stations_city ON stations(city_id);
CREATE INDEX IF NOT EXISTS idx_tourist_spots_city ON tourist_spots(city_id);
CREATE INDEX IF NOT EXISTS idx_hotel_locations_prefecture ON hotel_locations(prefecture_id);
CREATE INDEX IF NOT EXISTS idx_hotel_locations_city ON hotel_locations(city_id);
CREATE INDEX IF NOT EXISTS idx_hotel_locations_area ON hotel_locations(area_id);
CREATE INDEX IF NOT EXISTS idx_hotel_locations_coords ON hotel_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hotel_price_category ON hotel_price_analysis(price_category_id);

-- 空間インデックス（PostGIS使用時）
-- CREATE INDEX IF NOT EXISTS idx_hotel_locations_geom ON hotel_locations USING GIST(ST_Point(longitude, latitude));
-- CREATE INDEX IF NOT EXISTS idx_stations_geom ON stations USING GIST(ST_Point(longitude, latitude));
-- CREATE INDEX IF NOT EXISTS idx_tourist_spots_geom ON tourist_spots USING GIST(ST_Point(longitude, latitude));