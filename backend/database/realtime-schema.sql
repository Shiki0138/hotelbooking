-- リアルホテル情報システム データベーススキーマ
-- Worker3: 15分間隔価格監視・即時通知担当
-- Created: 2025-07-02

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- リアルタイムホテル情報テーブル
CREATE TABLE IF NOT EXISTS hotels_realtime (
    hotel_no VARCHAR(20) PRIMARY KEY,
    hotel_name TEXT NOT NULL,
    hotel_name_kana TEXT,
    area_name TEXT,
    prefecture TEXT,
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    min_charge INTEGER,
    max_charge INTEGER,
    review_average DECIMAL(3,2),
    review_count INTEGER,
    hotel_thumbnail_url TEXT,
    hotel_special_url TEXT,
    rakuten_travel_url TEXT,
    facilities JSONB DEFAULT '[]'::jsonb,
    room_facilities JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 価格履歴（15分間隔）テーブル
CREATE TABLE IF NOT EXISTS price_history_15min (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_no VARCHAR(20) NOT NULL,
    room_type TEXT,
    room_name TEXT,
    plan_name TEXT,
    plan_id VARCHAR(50),
    price INTEGER NOT NULL,
    original_price INTEGER,
    discount_rate INTEGER,
    availability_status VARCHAR(20) NOT NULL, -- 'available', 'limited', 'last_room', 'unavailable'
    remaining_rooms INTEGER,
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    adult_num INTEGER NOT NULL DEFAULT 2,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT price_check CHECK (price > 0)
);

-- ウォッチリスト拡張テーブル
CREATE TABLE IF NOT EXISTS watchlist_extended (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES demo_users(id) ON DELETE CASCADE,
    hotel_no VARCHAR(20) NOT NULL,
    hotel_name TEXT NOT NULL,
    target_price INTEGER,
    max_acceptable_price INTEGER,
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    adult_num INTEGER NOT NULL DEFAULT 2,
    alert_conditions JSONB DEFAULT '{
        "price_drop": true,
        "price_drop_threshold": 1000,
        "price_drop_percentage": 10,
        "new_availability": true,
        "last_room_alert": true,
        "special_plan_alert": true,
        "daily_summary": false
    }'::jsonb,
    notification_count INTEGER DEFAULT 0,
    last_notified_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 価格変動アラートテーブル
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    watchlist_id UUID NOT NULL REFERENCES watchlist_extended(id) ON DELETE CASCADE,
    hotel_no VARCHAR(20) NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'price_drop', 'new_availability', 'last_room', 'special_plan'
    previous_price INTEGER,
    current_price INTEGER,
    price_difference INTEGER,
    price_drop_percentage DECIMAL(5,2),
    room_info JSONB,
    notification_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_alert_type CHECK (alert_type IN ('price_drop', 'new_availability', 'last_room', 'special_plan'))
);

-- 15分間隔監視キューテーブル
CREATE TABLE IF NOT EXISTS monitor_queue_15min (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_no VARCHAR(20) NOT NULL,
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    adult_num INTEGER NOT NULL DEFAULT 2,
    priority INTEGER DEFAULT 1, -- 1=high (active watchlist), 2=medium, 3=low
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    last_checked_at TIMESTAMP WITH TIME ZONE,
    next_check_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    UNIQUE(hotel_no, checkin_date, checkout_date, adult_num),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- リアルタイム通知ログテーブル
CREATE TABLE IF NOT EXISTS realtime_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES demo_users(id) ON DELETE CASCADE,
    watchlist_id UUID REFERENCES watchlist_extended(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    hotel_no VARCHAR(20) NOT NULL,
    hotel_name TEXT NOT NULL,
    alert_data JSONB NOT NULL,
    email_subject TEXT NOT NULL,
    email_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_hotels_realtime_area ON hotels_realtime(area_name);
CREATE INDEX idx_hotels_realtime_price ON hotels_realtime(min_charge);
CREATE INDEX idx_hotels_realtime_review ON hotels_realtime(review_average DESC);

CREATE INDEX idx_price_history_hotel_date ON price_history_15min(hotel_no, checkin_date, checkout_date);
CREATE INDEX idx_price_history_checked ON price_history_15min(checked_at DESC);
CREATE INDEX idx_price_history_status ON price_history_15min(availability_status);

CREATE INDEX idx_watchlist_extended_user ON watchlist_extended(user_id);
CREATE INDEX idx_watchlist_extended_hotel ON watchlist_extended(hotel_no);
CREATE INDEX idx_watchlist_extended_dates ON watchlist_extended(checkin_date, checkout_date);
CREATE INDEX idx_watchlist_extended_active ON watchlist_extended(is_active) WHERE is_active = true;

CREATE INDEX idx_price_alerts_watchlist ON price_alerts(watchlist_id);
CREATE INDEX idx_price_alerts_created ON price_alerts(created_at DESC);
CREATE INDEX idx_price_alerts_type ON price_alerts(alert_type);

CREATE INDEX idx_monitor_queue_status ON monitor_queue_15min(status, next_check_at);
CREATE INDEX idx_monitor_queue_priority ON monitor_queue_15min(priority, next_check_at);

CREATE INDEX idx_realtime_notifications_user ON realtime_notifications(user_id);
CREATE INDEX idx_realtime_notifications_created ON realtime_notifications(created_at DESC);

-- トリガー関数とトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hotels_realtime_updated_at BEFORE UPDATE ON hotels_realtime
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlist_extended_updated_at BEFORE UPDATE ON watchlist_extended
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 価格変動検知関数
CREATE OR REPLACE FUNCTION detect_price_change(
    p_hotel_no VARCHAR,
    p_checkin_date DATE,
    p_checkout_date DATE,
    p_adult_num INTEGER,
    p_current_price INTEGER
)
RETURNS TABLE(
    has_change BOOLEAN,
    previous_price INTEGER,
    price_difference INTEGER,
    change_percentage DECIMAL
) AS $$
DECLARE
    v_previous_price INTEGER;
BEGIN
    -- 直近の価格を取得（15分前のデータ）
    SELECT price INTO v_previous_price
    FROM price_history_15min
    WHERE hotel_no = p_hotel_no
      AND checkin_date = p_checkin_date
      AND checkout_date = p_checkout_date
      AND adult_num = p_adult_num
      AND checked_at >= CURRENT_TIMESTAMP - INTERVAL '30 minutes'
    ORDER BY checked_at DESC
    LIMIT 1;

    IF v_previous_price IS NULL THEN
        RETURN QUERY SELECT false, NULL::INTEGER, NULL::INTEGER, NULL::DECIMAL;
    ELSE
        RETURN QUERY SELECT 
            p_current_price != v_previous_price,
            v_previous_price,
            v_previous_price - p_current_price,
            ROUND(((v_previous_price - p_current_price)::DECIMAL / v_previous_price) * 100, 2);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 監視対象ホテル取得関数
CREATE OR REPLACE FUNCTION get_hotels_to_monitor()
RETURNS TABLE(
    hotel_no VARCHAR,
    checkin_date DATE,
    checkout_date DATE,
    adult_num INTEGER,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        w.hotel_no,
        w.checkin_date,
        w.checkout_date,
        w.adult_num,
        1 as priority
    FROM watchlist_extended w
    WHERE w.is_active = true
      AND w.checkin_date >= CURRENT_DATE
      AND w.checkout_date > w.checkin_date
    ORDER BY 1, 2, 3, 4;
END;
$$ LANGUAGE plpgsql;

-- ビュー作成
CREATE OR REPLACE VIEW active_price_monitors AS
SELECT 
    w.id as watchlist_id,
    w.user_id,
    w.hotel_no,
    w.hotel_name,
    w.target_price,
    w.checkin_date,
    w.checkout_date,
    w.adult_num,
    w.alert_conditions,
    u.email as user_email,
    u.name as user_name,
    h.min_charge as current_min_price,
    h.review_average,
    h.hotel_thumbnail_url
FROM watchlist_extended w
JOIN demo_users u ON w.user_id = u.id
LEFT JOIN hotels_realtime h ON w.hotel_no = h.hotel_no
WHERE w.is_active = true
  AND u.notification_enabled = true
  AND w.checkin_date >= CURRENT_DATE;

CREATE OR REPLACE VIEW recent_price_changes AS
SELECT 
    ph1.hotel_no,
    ph1.room_name,
    ph1.plan_name,
    ph1.checkin_date,
    ph1.checkout_date,
    ph1.price as current_price,
    ph2.price as previous_price,
    (ph2.price - ph1.price) as price_drop,
    ROUND(((ph2.price - ph1.price)::DECIMAL / ph2.price) * 100, 2) as drop_percentage,
    ph1.availability_status,
    ph1.remaining_rooms,
    ph1.checked_at
FROM price_history_15min ph1
JOIN LATERAL (
    SELECT price
    FROM price_history_15min ph2
    WHERE ph2.hotel_no = ph1.hotel_no
      AND ph2.checkin_date = ph1.checkin_date
      AND ph2.checkout_date = ph1.checkout_date
      AND ph2.adult_num = ph1.adult_num
      AND ph2.plan_id = ph1.plan_id
      AND ph2.checked_at < ph1.checked_at
      AND ph2.checked_at >= ph1.checked_at - INTERVAL '30 minutes'
    ORDER BY ph2.checked_at DESC
    LIMIT 1
) ph2 ON true
WHERE ph1.checked_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
  AND ph2.price > ph1.price
ORDER BY ph1.checked_at DESC, price_drop DESC;

-- Row Level Security
ALTER TABLE hotels_realtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history_15min ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_queue_15min ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー設定
CREATE POLICY "Hotels are viewable by everyone" ON hotels_realtime
    FOR SELECT USING (true);

CREATE POLICY "Price history is viewable by everyone" ON price_history_15min
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own watchlist" ON watchlist_extended
    FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can view own alerts" ON price_alerts
    FOR SELECT USING (
        watchlist_id IN (SELECT id FROM watchlist_extended WHERE user_id = auth.uid())
        OR auth.uid() IS NULL
    );

CREATE POLICY "Service can manage monitor queue" ON monitor_queue_15min
    FOR ALL USING (true);

CREATE POLICY "Users can view own notifications" ON realtime_notifications
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);