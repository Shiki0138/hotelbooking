-- Supabase用ビューの作成（テーブル作成後に実行）

-- 1. luxury_deals_view（修正済み）
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
    -- 日付の差を計算（Supabase互換）
    (a.check_in_date - CURRENT_DATE)::integer as days_until_checkin
FROM hotels_crawling h
JOIN availability_crawling a ON h.id = a.hotel_id
WHERE h.is_luxury = TRUE
  AND h.is_active = TRUE
  AND a.is_last_minute = TRUE
  AND a.check_in_date >= CURRENT_DATE
  AND a.expires_at > NOW()
  AND a.discount_rate >= 20;

-- 2. price_change_analysis（修正済み）
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
    -- 日付の差を計算（Supabase互換）
    (ph.check_in_date - CURRENT_DATE)::integer as days_until_checkin
FROM price_history ph
JOIN hotels_crawling h ON ph.hotel_id = h.id
WHERE ph.previous_price IS NOT NULL
  AND ph.previous_price != ph.price
  AND ph.check_in_date >= CURRENT_DATE
ORDER BY ABS(ph.price - ph.previous_price) DESC;

-- 3. 関数の作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. トリガーの作成
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_crawling_updated_at BEFORE UPDATE ON hotels_crawling
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Row Level Security (RLS) - Supabase推奨
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies（Supabase Auth使用）
-- 注: auth.uid()はSupabase Authを使用している場合のみ動作
-- 使用しない場合はコメントアウトしてください

-- CREATE POLICY "Users can view own profile" ON users
--     FOR SELECT USING (auth.uid() = id);

-- CREATE POLICY "Users can update own profile" ON users
--     FOR UPDATE USING (auth.uid() = id);

-- CREATE POLICY "Users can view own bookings" ON bookings
--     FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can create own bookings" ON bookings
--     FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can view own favorites" ON favorites
--     FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can manage own favorites" ON favorites
--     FOR ALL USING (auth.uid() = user_id);

-- 7. 権限の付与
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 成功メッセージ
DO $$
BEGIN
    RAISE NOTICE 'ビューとトリガーの作成が完了しました。';
END
$$;