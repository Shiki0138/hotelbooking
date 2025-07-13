-- 価格履歴テーブル
CREATE TABLE IF NOT EXISTS hotel_price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id VARCHAR(255) NOT NULL,
    hotel_name VARCHAR(500) NOT NULL,
    date DATE NOT NULL,
    price DECIMAL(10, 2),
    room_type VARCHAR(100) DEFAULT 'standard',
    availability_status VARCHAR(50) DEFAULT 'available',
    occupancy_rate FLOAT,
    collected_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(hotel_id, date, room_type)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_hotel_date ON hotel_price_history(hotel_id, date);
CREATE INDEX IF NOT EXISTS idx_date ON hotel_price_history(date);
CREATE INDEX IF NOT EXISTS idx_hotel_id ON hotel_price_history(hotel_id);

-- 価格予測テーブル
CREATE TABLE IF NOT EXISTS price_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id VARCHAR(255) NOT NULL,
    prediction_date DATE NOT NULL,
    target_date DATE NOT NULL,
    predicted_price DECIMAL(10, 2),
    confidence_score FLOAT,
    price_range_min DECIMAL(10, 2),
    price_range_max DECIMAL(10, 2),
    factors JSONB,
    reasoning TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 予測テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_pred_hotel_date ON price_predictions(hotel_id, target_date);
CREATE INDEX IF NOT EXISTS idx_pred_date ON price_predictions(prediction_date);

-- アフィリエイトクリック追跡
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    hotel_id VARCHAR(255),
    provider VARCHAR(50),
    redirect_url TEXT,
    clicked_at TIMESTAMP DEFAULT NOW()
);

-- クリック追跡のインデックス
CREATE INDEX IF NOT EXISTS idx_clicks_user ON affiliate_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_clicks_hotel ON affiliate_clicks(hotel_id);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON affiliate_clicks(clicked_at);

-- ホテル価値スコアテーブル
CREATE TABLE IF NOT EXISTS hotel_value_scores (
    hotel_id VARCHAR(255) PRIMARY KEY,
    hotel_name VARCHAR(500),
    overall_score FLOAT,
    hotel_appeal_score FLOAT,
    location_value_score FLOAT,
    experience_value_score FLOAT,
    category VARCHAR(50),
    amenities JSONB,
    nearby_attractions JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ユーザー行動追跡
CREATE TABLE IF NOT EXISTS user_behaviors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    action_type VARCHAR(50),
    hotel_id VARCHAR(255),
    search_params JSONB,
    page_url TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ユーザー行動のインデックス
CREATE INDEX IF NOT EXISTS idx_behavior_user ON user_behaviors(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_session ON user_behaviors(session_id);
CREATE INDEX IF NOT EXISTS idx_behavior_hotel ON user_behaviors(hotel_id);