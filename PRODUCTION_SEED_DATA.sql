-- LastMinuteStay Production Seed Data
-- Version: 1.0.0
-- Created: 2025-07-04
-- Author: Worker2

-- =====================================================
-- Initial Configuration Data
-- =====================================================

-- Insert default notification preferences for new users
-- This will be triggered when a new user signs up
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, full_name, notification_enabled)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', true)
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO user_notification_preferences (
        user_id,
        email_notifications,
        availability_alerts,
        price_drop_alerts,
        price_drop_threshold,
        price_drop_amount,
        instant_alerts,
        max_alerts_per_day
    )
    VALUES (
        NEW.id,
        true,  -- email_notifications
        true,  -- availability_alerts
        true,  -- price_drop_alerts
        10,    -- 10% threshold
        1000,  -- 1000 JPY
        true,  -- instant_alerts
        10     -- max 10 alerts per day
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_preferences();

-- =====================================================
-- Sample Hotels Data (Popular Tokyo Hotels)
-- =====================================================

-- Insert sample hotels for testing
INSERT INTO hotels (
    rakuten_hotel_id,
    name,
    name_en,
    location,
    prefecture,
    address,
    latitude,
    longitude,
    description,
    star_rating,
    amenities,
    images
) VALUES 
(
    'DEMO001',
    'ザ・リッツ・カールトン東京',
    'The Ritz-Carlton Tokyo',
    '六本木',
    '東京都',
    '東京都港区赤坂9-7-1',
    35.665517,
    139.730464,
    '東京ミッドタウンの上層階に位置する最高級ホテル',
    5,
    '["WiFi", "スパ", "フィットネス", "レストラン", "バー", "ビジネスセンター", "コンシェルジュ"]'::jsonb,
    '[
        "https://images.unsplash.com/photo-1566073771259-6a8506099945",
        "https://images.unsplash.com/photo-1582719508461-905c673771fd",
        "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9"
    ]'::jsonb
),
(
    'DEMO002',
    'マンダリン オリエンタル 東京',
    'Mandarin Oriental Tokyo',
    '日本橋',
    '東京都',
    '東京都中央区日本橋室町2-1-1',
    35.686828,
    139.773158,
    '日本橋の中心に位置する洗練されたラグジュアリーホテル',
    5,
    '["WiFi", "スパ", "プール", "フィットネス", "レストラン", "バー"]'::jsonb,
    '[
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa",
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791",
        "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6"
    ]'::jsonb
),
(
    'DEMO003',
    'パーク ハイアット 東京',
    'Park Hyatt Tokyo',
    '西新宿',
    '東京都',
    '東京都新宿区西新宿3-7-1-2',
    35.685444,
    139.690556,
    '新宿の高層ビル上層階に位置する洗練されたホテル',
    5,
    '["WiFi", "プール", "スパ", "フィットネス", "レストラン", "バー", "図書館"]'::jsonb,
    '[
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb",
        "https://images.unsplash.com/photo-1559599238-308793637427",
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7"
    ]'::jsonb
);

-- =====================================================
-- Sample Price History (Last 7 days)
-- =====================================================

-- Generate sample price history
DO $$
DECLARE
    hotel_rec RECORD;
    date_offset INTEGER;
    base_price INTEGER;
    price_variation INTEGER;
BEGIN
    FOR hotel_rec IN SELECT rakuten_hotel_id FROM hotels WHERE rakuten_hotel_id LIKE 'DEMO%' LOOP
        -- Set base price based on hotel
        base_price := CASE 
            WHEN hotel_rec.rakuten_hotel_id = 'DEMO001' THEN 80000
            WHEN hotel_rec.rakuten_hotel_id = 'DEMO002' THEN 75000
            WHEN hotel_rec.rakuten_hotel_id = 'DEMO003' THEN 70000
        END;
        
        -- Generate 7 days of price history
        FOR date_offset IN 0..6 LOOP
            -- Add some price variation
            price_variation := (RANDOM() * 10000 - 5000)::INTEGER;
            
            INSERT INTO hotel_price_history (
                hotel_id,
                hotel_name,
                check_in,
                check_out,
                guests_count,
                current_price,
                previous_price,
                availability_status,
                room_types_available,
                check_timestamp
            ) VALUES (
                hotel_rec.rakuten_hotel_id,
                CASE 
                    WHEN hotel_rec.rakuten_hotel_id = 'DEMO001' THEN 'ザ・リッツ・カールトン東京'
                    WHEN hotel_rec.rakuten_hotel_id = 'DEMO002' THEN 'マンダリン オリエンタル 東京'
                    WHEN hotel_rec.rakuten_hotel_id = 'DEMO003' THEN 'パーク ハイアット 東京'
                END,
                CURRENT_DATE + INTERVAL '14 days',
                CURRENT_DATE + INTERVAL '15 days',
                2,
                base_price + price_variation,
                CASE WHEN date_offset > 0 THEN base_price + (RANDOM() * 10000 - 5000)::INTEGER ELSE NULL END,
                CASE 
                    WHEN RANDOM() > 0.8 THEN 'limited'
                    WHEN RANDOM() > 0.95 THEN 'unavailable'
                    ELSE 'available'
                END,
                (RANDOM() * 5 + 1)::INTEGER,
                CURRENT_TIMESTAMP - (date_offset || ' days')::INTERVAL
            );
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- Test User Account (for demo purposes)
-- =====================================================

-- Note: This should be created through Supabase Auth UI or API
-- Email: demo@lastminutestay.com
-- Password: DemoUser123!

-- After creating the test user, update their profile:
-- UPDATE user_profiles 
-- SET 
--     full_name = 'デモ ユーザー',
--     preferred_areas = ARRAY['東京都', '大阪府', '京都府'],
--     phone_number = '090-1234-5678'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'demo@lastminutestay.com');

-- =====================================================
-- Sample Watchlist Entry (requires user_id)
-- =====================================================

-- After creating test user, add sample watchlist:
-- INSERT INTO watchlist (
--     user_id,
--     hotel_id,
--     hotel_name,
--     location,
--     check_in,
--     check_out,
--     guests_count,
--     target_price,
--     max_price
-- ) VALUES (
--     (SELECT id FROM auth.users WHERE email = 'demo@lastminutestay.com'),
--     'DEMO001',
--     'ザ・リッツ・カールトン東京',
--     '六本木',
--     CURRENT_DATE + INTERVAL '14 days',
--     CURRENT_DATE + INTERVAL '15 days',
--     2,
--     70000,
--     85000
-- );

-- =====================================================
-- Utility Functions
-- =====================================================

-- Function to get current availability summary
CREATE OR REPLACE FUNCTION get_availability_summary()
RETURNS TABLE (
    hotel_id VARCHAR,
    hotel_name VARCHAR,
    avg_price NUMERIC,
    min_price NUMERIC,
    availability_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.hotel_id,
        h.hotel_name,
        ROUND(AVG(h.current_price), 0) as avg_price,
        MIN(h.current_price) as min_price,
        ROUND(
            COUNT(CASE WHEN h.availability_status = 'available' THEN 1 END)::NUMERIC / 
            COUNT(*)::NUMERIC * 100, 
            1
        ) as availability_rate
    FROM hotel_price_history h
    WHERE h.check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    GROUP BY h.hotel_id, h.hotel_name
    ORDER BY h.hotel_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Initial Statistics View
-- =====================================================

CREATE OR REPLACE VIEW system_statistics AS
SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM watchlist WHERE is_active = true) as active_watchlists,
    (SELECT COUNT(*) FROM hotel_price_history WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours') as price_checks_24h,
    (SELECT COUNT(*) FROM notification_queue WHERE status = 'sent' AND processed_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') as notifications_sent_24h,
    (SELECT COUNT(DISTINCT hotel_id) FROM hotel_price_history) as monitored_hotels;

-- =====================================================
-- Completion Message
-- =====================================================
-- Seed data loaded successfully!
-- Test user should be created manually through Supabase Auth
-- Sample watchlist entries can be added after user creation