-- LMS Hotel Booking System Complete Schema
-- AI価格予測とOTA比較のための完全なデータベース構造

-- 既存テーブルをドロップ（存在する場合）
DROP TABLE IF EXISTS affiliate_clicks CASCADE;
DROP TABLE IF EXISTS price_predictions CASCADE;
DROP TABLE IF EXISTS hotel_price_history CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;

-- ホテル基本情報テーブル
CREATE TABLE IF NOT EXISTS hotels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    location VARCHAR(500) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    rating DECIMAL(2, 1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    base_price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'JPY',
    image_url TEXT,
    amenities JSONB DEFAULT '[]'::jsonb,
    room_types JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ホテル価格履歴テーブル
CREATE TABLE IF NOT EXISTS hotel_price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id VARCHAR(255) NOT NULL,
    hotel_name VARCHAR(500) NOT NULL,
    date DATE NOT NULL,
    price DECIMAL(10, 2),
    room_type VARCHAR(100) DEFAULT 'standard',
    availability_status VARCHAR(50) DEFAULT 'available',
    occupancy_rate FLOAT,
    ota_prices JSONB DEFAULT '{}'::jsonb,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotel_id, date, room_type)
);

-- AI価格予測テーブル
CREATE TABLE IF NOT EXISTS price_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id VARCHAR(255) NOT NULL,
    prediction_date DATE NOT NULL,
    predicted_price DECIMAL(10, 2) NOT NULL,
    confidence_score FLOAT DEFAULT 0,
    price_range_min DECIMAL(10, 2),
    price_range_max DECIMAL(10, 2),
    reasoning TEXT,
    best_booking_time VARCHAR(255),
    factors JSONB DEFAULT '{}'::jsonb,
    model_version VARCHAR(50) DEFAULT 'gpt-4o-mini',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotel_id, prediction_date)
);

-- アフィリエイトクリック追跡テーブル
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id VARCHAR(255) NOT NULL,
    ota_provider VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    click_price DECIMAL(10, 2),
    predicted_price DECIMAL(10, 2),
    savings_amount DECIMAL(10, 2),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    ip_address INET,
    session_id VARCHAR(255),
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーお気に入りテーブル
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hotel_id VARCHAR(255) NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, hotel_id)
);

-- インデックス作成
CREATE INDEX idx_hotel_price_history_hotel_date ON hotel_price_history(hotel_id, date);
CREATE INDEX idx_hotel_price_history_date ON hotel_price_history(date);
CREATE INDEX idx_price_predictions_hotel_date ON price_predictions(hotel_id, prediction_date);
CREATE INDEX idx_price_predictions_date ON price_predictions(prediction_date);
CREATE INDEX idx_affiliate_clicks_hotel ON affiliate_clicks(hotel_id);
CREATE INDEX idx_affiliate_clicks_user ON affiliate_clicks(user_id);
CREATE INDEX idx_affiliate_clicks_date ON affiliate_clicks(clicked_at);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_hotel ON user_favorites(hotel_id);
CREATE INDEX idx_hotels_location ON hotels(location);
CREATE INDEX idx_hotels_rating ON hotels(rating);

-- Row Level Security (RLS) 有効化
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- RLSポリシー作成
-- 誰でもホテル情報を読める
CREATE POLICY "Anyone can read hotels" ON hotels
FOR SELECT USING (true);

-- 誰でも価格履歴を読める
CREATE POLICY "Anyone can read price history" ON hotel_price_history
FOR SELECT USING (true);

-- 誰でも価格予測を読める
CREATE POLICY "Anyone can read predictions" ON price_predictions
FOR SELECT USING (true);

-- ユーザーは自分のクリックを記録できる
CREATE POLICY "Users can insert their clicks" ON affiliate_clicks
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ユーザーは自分のクリックを見れる
CREATE POLICY "Users can view their clicks" ON affiliate_clicks
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- ユーザーは自分のお気に入りを管理できる
CREATE POLICY "Users can manage their favorites" ON user_favorites
FOR ALL USING (auth.uid() = user_id);

-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新日時トリガー
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータ挿入関数
CREATE OR REPLACE FUNCTION insert_sample_hotels()
RETURNS void AS $$
BEGIN
    -- サンプルホテルデータ
    INSERT INTO hotels (external_id, name, location, address, latitude, longitude, rating, review_count, base_price, image_url)
    VALUES 
    ('ritz-carlton-tokyo', 'ザ・リッツ・カールトン東京', '東京都港区', '東京都港区赤坂9-7-1', 35.6654, 139.7307, 4.8, 1250, 45000, 'https://images.unsplash.com/photo-1564501049412-61c2a3083791'),
    ('mandarin-oriental-tokyo', 'マンダリン オリエンタル 東京', '東京都中央区', '東京都中央区日本橋室町2-1-1', 35.6866, 139.7730, 4.7, 980, 42000, 'https://images.unsplash.com/photo-1566073771259-6a8506099945'),
    ('park-hyatt-tokyo', 'パーク ハイアット 東京', '東京都新宿区', '東京都新宿区西新宿3-7-1-2', 35.6938, 139.6910, 4.6, 1100, 38000, 'https://images.unsplash.com/photo-1618773928121-c32242e63f39')
    ON CONFLICT (external_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- サンプルデータ実行
SELECT insert_sample_hotels();