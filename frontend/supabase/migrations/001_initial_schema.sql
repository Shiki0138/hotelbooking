-- Migration: 001_initial_schema
-- Description: Initial database schema for LastMinuteStay
-- Date: 2025-07-01

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP TABLE IF EXISTS public.guest_details CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.room_inventory CASCADE;
DROP TABLE IF EXISTS public.room_types CASCADE;
DROP TABLE IF EXISTS public.hotels CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Run the main schema
\i ../schema.sql

-- Seed initial data for testing
INSERT INTO public.hotels (name, description, address, city, prefecture, postal_code, latitude, longitude, rating, amenities, images)
VALUES 
    ('東京グランドホテル', '東京の中心に位置する高級ホテル', '東京都千代田区丸の内1-1-1', '千代田区', '東京都', '100-0005', 35.6812, 139.7671, 4.5, 
     '["Wi-Fi", "駐車場", "レストラン", "スパ", "ジム", "会議室"]'::jsonb,
     '["https://example.com/hotel1-1.jpg", "https://example.com/hotel1-2.jpg"]'::jsonb),
    
    ('大阪ベイホテル', '大阪湾を一望できるリゾートホテル', '大阪府大阪市港区海岸通1-5-15', '大阪市', '大阪府', '552-0022', 34.6549, 135.4323, 4.3,
     '["Wi-Fi", "駐車場", "プール", "レストラン", "バー"]'::jsonb,
     '["https://example.com/hotel2-1.jpg", "https://example.com/hotel2-2.jpg"]'::jsonb),
    
    ('京都旅館さくら', '伝統的な日本旅館', '京都府京都市東山区清水2-208-1', '京都市', '京都府', '605-0862', 34.9948, 135.7850, 4.7,
     '["Wi-Fi", "温泉", "和食レストラン", "茶室", "庭園"]'::jsonb,
     '["https://example.com/hotel3-1.jpg", "https://example.com/hotel3-2.jpg"]'::jsonb);

-- Insert room types for each hotel
INSERT INTO public.room_types (hotel_id, name, description, capacity, base_price, amenities)
SELECT 
    h.id,
    room_type.name,
    room_type.description,
    room_type.capacity,
    room_type.base_price,
    room_type.amenities
FROM public.hotels h
CROSS JOIN (
    VALUES 
        ('スタンダードルーム', 'シンプルで快適な客室', 2, 10000, '["エアコン", "テレビ", "冷蔵庫", "電気ポット"]'::jsonb),
        ('デラックスルーム', '広々とした豪華な客室', 2, 18000, '["エアコン", "テレビ", "冷蔵庫", "電気ポット", "バスタブ", "ミニバー"]'::jsonb),
        ('スイートルーム', '最高級の設備を備えた特別室', 4, 35000, '["エアコン", "テレビ", "冷蔵庫", "電気ポット", "バスタブ", "ミニバー", "リビングルーム", "キッチン"]'::jsonb)
) AS room_type(name, description, capacity, base_price, amenities);

-- Generate room inventory for the next 90 days
INSERT INTO public.room_inventory (room_type_id, date, available_rooms, price)
SELECT 
    rt.id,
    date_series.date,
    CASE 
        WHEN EXTRACT(DOW FROM date_series.date) IN (0, 6) THEN 3  -- Weekends: fewer rooms
        ELSE 5  -- Weekdays: more rooms
    END AS available_rooms,
    CASE 
        WHEN EXTRACT(DOW FROM date_series.date) IN (0, 6) THEN rt.base_price * 1.3  -- Weekend price
        ELSE rt.base_price  -- Weekday price
    END AS price
FROM public.room_types rt
CROSS JOIN (
    SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '90 days',
        '1 day'::interval
    )::date AS date
) AS date_series;

-- Create sample user (for testing - password: test123)
-- Note: This would normally be done through Supabase Auth
/*
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'test@example.com',
    crypt('test123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
);

INSERT INTO public.user_profiles (id, email, full_name, phone_number)
VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'test@example.com',
    'Test User',
    '090-1234-5678'
);
*/

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;