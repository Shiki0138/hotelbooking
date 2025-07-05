-- 🏨 高級ホテル直前予約システム - クローリング・データ収集専用スキーマ
-- 作成日: 2025-07-05
-- 作成者: worker1 (ホテルクローリング・データ収集システム担当)

-- =================================================================
-- 1. ホテル基本情報テーブル
-- =================================================================
CREATE TABLE IF NOT EXISTS hotels_crawling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_code VARCHAR(50) UNIQUE NOT NULL, -- 楽天ホテルコード等
    name VARCHAR(255) NOT NULL,
    name_kana VARCHAR(255),
    prefecture_code INTEGER,
    prefecture_name VARCHAR(50),
    city VARCHAR(100),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20),
    fax VARCHAR(20),
    url TEXT,
    hotel_class INTEGER, -- 1-5星ランク
    hotel_type VARCHAR(50), -- 'luxury', 'resort', 'business', 'ryokan'
    chain_name VARCHAR(100),
    
    -- 施設情報
    total_rooms INTEGER,
    checkin_time TIME,
    checkout_time TIME,
    parking_info TEXT,
    
    -- API連携情報
    api_source VARCHAR(20) NOT NULL, -- 'rakuten', 'jalan', 'ikyu'
    api_hotel_id VARCHAR(100) NOT NULL,
    api_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- メタ情報
    is_luxury BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    crawl_priority INTEGER DEFAULT 1, -- 1:高 2:中 3:低
    last_crawled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 2. 空室・在庫情報テーブル
-- =================================================================
CREATE TABLE IF NOT EXISTS availability_crawling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels_crawling(id) ON DELETE CASCADE,
    
    -- 日付情報
    check_date DATE NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INTEGER NOT NULL,
    
    -- 部屋情報
    room_type_code VARCHAR(50),
    room_type_name VARCHAR(255),
    room_count INTEGER,
    available_rooms INTEGER NOT NULL,
    
    -- 価格情報
    original_price INTEGER, -- 元価格
    current_price INTEGER NOT NULL, -- 現在価格
    discount_rate DECIMAL(5,2), -- 割引率%
    is_last_minute BOOLEAN DEFAULT FALSE, -- 直前割引フラグ
    
    -- 予約条件
    min_nights INTEGER DEFAULT 1,
    max_nights INTEGER,
    min_guests INTEGER DEFAULT 1,
    max_guests INTEGER,
    
    -- API情報
    api_source VARCHAR(20) NOT NULL,
    api_plan_id VARCHAR(100),
    api_room_id VARCHAR(100),
    
    -- メタ情報
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- データ有効期限
    
    UNIQUE(hotel_id, check_in_date, check_out_date, room_type_code, api_source)
);

-- =================================================================
-- 3. 価格履歴テーブル
-- =================================================================
CREATE TABLE IF NOT EXISTS price_history_crawling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels_crawling(id) ON DELETE CASCADE,
    
    -- 価格データ
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    room_type_code VARCHAR(50),
    price INTEGER NOT NULL,
    original_price INTEGER,
    discount_rate DECIMAL(5,2),
    available_rooms INTEGER,
    
    -- 変動追跡
    price_change INTEGER, -- 前回からの価格変動
    price_change_percentage DECIMAL(5,2), -- 前回からの変動率%
    is_price_drop BOOLEAN DEFAULT FALSE, -- 価格下落フラグ
    
    -- 時期分析
    days_before_checkin INTEGER, -- チェックイン何日前
    is_weekend BOOLEAN DEFAULT FALSE,
    is_holiday BOOLEAN DEFAULT FALSE,
    season VARCHAR(20), -- 'spring', 'summer', 'autumn', 'winter'
    
    -- API情報
    api_source VARCHAR(20) NOT NULL,
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 4. 割引・キャンペーン情報テーブル
-- =================================================================
CREATE TABLE IF NOT EXISTS discounts_crawling (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES hotels_crawling(id) ON DELETE CASCADE,
    
    -- 割引情報
    discount_type VARCHAR(50) NOT NULL, -- 'last_minute', 'early_bird', 'weekend', 'campaign'
    discount_name VARCHAR(255),
    discount_description TEXT,
    discount_rate DECIMAL(5,2),
    discount_amount INTEGER,
    
    -- 適用条件
    min_days_before INTEGER, -- 最小予約日数前
    max_days_before INTEGER, -- 最大予約日数前
    applicable_room_types TEXT[], -- 適用部屋タイプ
    applicable_dates_from DATE,
    applicable_dates_to DATE,
    min_nights INTEGER DEFAULT 1,
    max_nights INTEGER,
    
    -- 在庫・制限
    total_quota INTEGER, -- 総枠数
    remaining_quota INTEGER, -- 残り枠数
    is_member_only BOOLEAN DEFAULT FALSE,
    
    -- ステータス
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1, -- 表示優先度
    
    -- API情報
    api_source VARCHAR(20) NOT NULL,
    api_campaign_id VARCHAR(100),
    
    -- メタ情報
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 5. クローリング実行ログテーブル
-- =================================================================
CREATE TABLE IF NOT EXISTS crawling_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 実行情報
    crawl_type VARCHAR(50) NOT NULL, -- 'hotels', 'availability', 'prices', 'discounts'
    api_source VARCHAR(20) NOT NULL,
    execution_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- 実行結果
    status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed', 'partial'
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- 実行時間
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    
    -- エラー情報
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- パフォーマンス情報
    api_calls_made INTEGER DEFAULT 0,
    rate_limit_hits INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    
    -- メタ情報
    configuration JSONB, -- 実行時の設定
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 6. API使用量追跡テーブル
-- =================================================================
CREATE TABLE IF NOT EXISTS api_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_source VARCHAR(20) NOT NULL,
    
    -- 使用量情報
    date DATE NOT NULL,
    hour INTEGER, -- 0-23時間
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    rate_limited_calls INTEGER DEFAULT 0,
    
    -- レスポンス情報
    avg_response_time_ms INTEGER,
    min_response_time_ms INTEGER,
    max_response_time_ms INTEGER,
    
    -- 制限情報
    daily_limit INTEGER,
    hourly_limit INTEGER,
    remaining_daily_calls INTEGER,
    remaining_hourly_calls INTEGER,
    
    -- メタ情報
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(api_source, date, hour)
);

-- =================================================================
-- インデックス作成
-- =================================================================

-- ホテル検索用インデックス
CREATE INDEX IF NOT EXISTS idx_hotels_crawling_luxury ON hotels_crawling(is_luxury, is_active);
CREATE INDEX IF NOT EXISTS idx_hotels_crawling_prefecture ON hotels_crawling(prefecture_code, is_active);
CREATE INDEX IF NOT EXISTS idx_hotels_crawling_api_source ON hotels_crawling(api_source, is_active);
CREATE INDEX IF NOT EXISTS idx_hotels_crawling_last_crawled ON hotels_crawling(last_crawled_at);

-- 空室情報検索用インデックス
CREATE INDEX IF NOT EXISTS idx_availability_crawling_hotel_date ON availability_crawling(hotel_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_availability_crawling_check_date ON availability_crawling(check_date);
CREATE INDEX IF NOT EXISTS idx_availability_crawling_last_minute ON availability_crawling(is_last_minute, crawled_at);
CREATE INDEX IF NOT EXISTS idx_availability_crawling_price ON availability_crawling(current_price, discount_rate);

-- 価格履歴検索用インデックス
CREATE INDEX IF NOT EXISTS idx_price_history_crawling_hotel_date ON price_history_crawling(hotel_id, check_in_date, crawled_at);
CREATE INDEX IF NOT EXISTS idx_price_history_crawling_price_drop ON price_history_crawling(is_price_drop, crawled_at);
CREATE INDEX IF NOT EXISTS idx_price_history_crawling_days_before ON price_history_crawling(days_before_checkin, hotel_id);

-- 割引情報検索用インデックス
CREATE INDEX IF NOT EXISTS idx_discounts_crawling_hotel_active ON discounts_crawling(hotel_id, is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_crawling_type ON discounts_crawling(discount_type, is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_crawling_dates ON discounts_crawling(applicable_dates_from, applicable_dates_to);

-- ログ検索用インデックス
CREATE INDEX IF NOT EXISTS idx_crawling_logs_status ON crawling_logs(status, started_at);
CREATE INDEX IF NOT EXISTS idx_crawling_logs_type_source ON crawling_logs(crawl_type, api_source);
CREATE INDEX IF NOT EXISTS idx_crawling_logs_execution_id ON crawling_logs(execution_id);

-- API使用量追跡用インデックス
CREATE INDEX IF NOT EXISTS idx_api_usage_tracking_source_date ON api_usage_tracking(api_source, date, hour);

-- =================================================================
-- ビュー作成
-- =================================================================

-- 高級ホテル直前割引ビュー
CREATE OR REPLACE VIEW luxury_last_minute_deals AS
SELECT 
    h.id as hotel_id,
    h.name as hotel_name,
    h.prefecture_name,
    h.city,
    a.check_in_date,
    a.check_out_date,
    a.room_type_name,
    a.original_price,
    a.current_price,
    a.discount_rate,
    a.available_rooms,
    a.crawled_at,
    EXTRACT(DAY FROM (a.check_in_date - CURRENT_DATE)) as days_until_checkin
FROM hotels_crawling h
JOIN availability_crawling a ON h.id = a.hotel_id
WHERE h.is_luxury = TRUE
  AND h.is_active = TRUE
  AND a.is_last_minute = TRUE
  AND a.check_in_date >= CURRENT_DATE
  AND a.expires_at > NOW()
  AND a.discount_rate >= 20 -- 20%以上割引
ORDER BY a.discount_rate DESC, days_until_checkin ASC;

-- 価格変動分析ビュー
CREATE OR REPLACE VIEW price_trend_analysis AS
SELECT 
    h.id as hotel_id,
    h.name as hotel_name,
    ph.check_in_date,
    ph.room_type_code,
    COUNT(*) as price_records,
    MIN(ph.price) as min_price,
    MAX(ph.price) as max_price,
    AVG(ph.price) as avg_price,
    STDDEV(ph.price) as price_volatility,
    COUNT(CASE WHEN ph.is_price_drop = TRUE THEN 1 END) as price_drop_count,
    MAX(ph.crawled_at) as last_updated
FROM hotels_crawling h
JOIN price_history_crawling ph ON h.id = ph.hotel_id
WHERE h.is_luxury = TRUE
  AND ph.crawled_at >= NOW() - INTERVAL '30 days'
GROUP BY h.id, h.name, ph.check_in_date, ph.room_type_code
ORDER BY price_volatility DESC;

-- =================================================================
-- 関数作成
-- =================================================================

-- 価格変動計算関数
CREATE OR REPLACE FUNCTION calculate_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 前回の価格を取得して変動を計算
    WITH previous_price AS (
        SELECT price
        FROM price_history_crawling
        WHERE hotel_id = NEW.hotel_id
          AND check_in_date = NEW.check_in_date
          AND check_out_date = NEW.check_out_date
          AND room_type_code = NEW.room_type_code
          AND crawled_at < NEW.crawled_at
        ORDER BY crawled_at DESC
        LIMIT 1
    )
    UPDATE price_history_crawling
    SET 
        price_change = NEW.price - previous_price.price,
        price_change_percentage = CASE 
            WHEN previous_price.price > 0 THEN 
                ROUND(((NEW.price - previous_price.price)::DECIMAL / previous_price.price * 100), 2)
            ELSE 0 
        END,
        is_price_drop = NEW.price < previous_price.price
    FROM previous_price
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
CREATE TRIGGER trigger_calculate_price_change
    AFTER INSERT ON price_history_crawling
    FOR EACH ROW
    EXECUTE FUNCTION calculate_price_change();

-- タイムスタンプ自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 自動更新トリガー
CREATE TRIGGER trigger_hotels_crawling_updated_at
    BEFORE UPDATE ON hotels_crawling
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_discounts_crawling_updated_at
    BEFORE UPDATE ON discounts_crawling
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- 初期データ挿入
-- =================================================================

-- 楽天トラベル高級ホテルサンプルデータ
INSERT INTO hotels_crawling (hotel_code, name, name_kana, prefecture_code, prefecture_name, city, address, hotel_class, hotel_type, api_source, api_hotel_id, is_luxury, crawl_priority) VALUES
('rakuten_001', 'ザ・リッツ・カールトン東京', 'ザ・リッツ・カールトン・トウキョウ', 13, '東京都', '港区', '東京都港区赤坂9-7-1', 5, 'luxury', 'rakuten', '133155', TRUE, 1),
('rakuten_002', 'マンダリン オリエンタル 東京', 'マンダリン・オリエンタル・トウキョウ', 13, '東京都', '中央区', '東京都中央区日本橋室町2-1-1', 5, 'luxury', 'rakuten', '169875', TRUE, 1),
('rakuten_003', 'パーク ハイアット 東京', 'パーク・ハイアット・トウキョウ', 13, '東京都', '新宿区', '東京都新宿区西新宿3-7-1-2', 5, 'luxury', 'rakuten', '135187', TRUE, 1),
('rakuten_004', 'フォーシーズンズホテル京都', 'フォーシーズンズ・ホテル・キョウト', 26, '京都府', '京都市', '京都府京都市東山区妙法院前側町445-3', 5, 'luxury', 'rakuten', '195432', TRUE, 1),
('rakuten_005', 'ハレクラニ沖縄', 'ハレクラニ・オキナワ', 47, '沖縄県', '国頭郡', '沖縄県国頭郡恩納村名嘉真1967-1', 5, 'resort', 'rakuten', '187650', TRUE, 1);

COMMENT ON TABLE hotels_crawling IS '高級ホテル基本情報（クローリング用）';
COMMENT ON TABLE availability_crawling IS '空室・在庫情報（リアルタイム更新）';
COMMENT ON TABLE price_history_crawling IS '価格履歴（変動追跡用）';
COMMENT ON TABLE discounts_crawling IS '割引・キャンペーン情報';
COMMENT ON TABLE crawling_logs IS 'クローリング実行ログ';
COMMENT ON TABLE api_usage_tracking IS 'API使用量追跡';