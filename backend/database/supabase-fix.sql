-- Supabase PostgreSQL用の修正版
-- EXTRACT関数のエラーを修正

-- 問題のあるビューを削除して再作成
DROP VIEW IF EXISTS luxury_deals_view CASCADE;
DROP VIEW IF EXISTS price_change_analysis CASCADE;

-- 修正版: luxury_deals_view
CREATE VIEW luxury_deals_view AS
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
    -- 修正: 明示的な型キャストを追加
    EXTRACT(DAY FROM (a.check_in_date::date - CURRENT_DATE::date))::integer as days_until_checkin
FROM hotels_crawling h
JOIN availability_crawling a ON h.id = a.hotel_id
WHERE h.is_luxury = TRUE
  AND h.is_active = TRUE
  AND a.is_last_minute = TRUE
  AND a.check_in_date >= CURRENT_DATE
  AND a.expires_at > NOW()
  AND a.discount_rate >= 20 -- 20%以上割引
ORDER BY a.discount_rate DESC, days_until_checkin ASC;

-- 修正版: price_change_analysis
CREATE VIEW price_change_analysis AS
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
    -- 修正: 明示的な型キャスト
    EXTRACT(DAY FROM (ph.check_in_date::date - CURRENT_DATE::date))::integer as days_until_checkin
FROM price_history ph
JOIN hotels_crawling h ON ph.hotel_id = h.id
WHERE ph.previous_price IS NOT NULL
  AND ph.previous_price != ph.price
  AND ph.check_in_date >= CURRENT_DATE
ORDER BY ABS(ph.price - ph.previous_price) DESC;

-- その他のEXTRACT関数を使用している箇所も修正
-- notification_templates テーブルの修正
UPDATE notification_templates 
SET template_body = REPLACE(template_body, 'EXTRACT(DAY FROM', 'EXTRACT(DAY FROM CAST(')
WHERE template_body LIKE '%EXTRACT(DAY FROM%';

-- 関数内のEXTRACT修正が必要な場合の例
-- (実際の関数定義を確認して必要に応じて修正)

-- テスト: 修正が成功したか確認
SELECT 
    EXTRACT(DAY FROM (CURRENT_DATE::date + INTERVAL '7 days' - CURRENT_DATE::date))::integer as test_days,
    EXTRACT(DAY FROM CURRENT_TIMESTAMP - CURRENT_TIMESTAMP)::integer as test_zero;

-- 成功メッセージ
DO $$
BEGIN
    RAISE NOTICE 'EXTRACT関数の修正が完了しました';
END
$$;