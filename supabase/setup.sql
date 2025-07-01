-- Supabase Setup Script for Luxury Hotel Booking System
-- Phase 1: Basic Implementation

-- Clean up existing tables if needed
DROP TABLE IF EXISTS public.search_history CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.cancellation_alerts CASCADE;
DROP TABLE IF EXISTS public.price_history CASCADE;
DROP TABLE IF EXISTS public.room_inventory CASCADE;
DROP TABLE IF EXISTS public.room_types CASCADE;
DROP TABLE IF EXISTS public.hotels CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  preferred_language TEXT DEFAULT 'ja',
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hotels table (simplified for Phase 1)
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_en TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  stars INTEGER CHECK (stars >= 1 AND stars <= 5),
  description TEXT,
  base_price DECIMAL(10, 2),
  rakuten_hotel_no TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Room inventory (simplified for Phase 1)
CREATE TABLE public.room_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_rooms INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, date)
);

-- 4. User preferences (simplified for Phase 1)
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  area_name TEXT,
  min_price DECIMAL(10, 2),
  max_price DECIMAL(10, 2),
  checkin_date DATE,
  checkout_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Search history (for analytics)
CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  search_params JSONB NOT NULL,
  results_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_hotels_city ON public.hotels(city);
CREATE INDEX idx_hotels_prefecture ON public.hotels(prefecture);
CREATE INDEX idx_room_inventory_date ON public.room_inventory(date);
CREATE INDEX idx_room_inventory_hotel_date ON public.room_inventory(hotel_id, date);
CREATE INDEX idx_user_preferences_user ON public.user_preferences(user_id) WHERE is_active = true;

-- Row Level Security (RLS) Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own search history" ON public.search_history
  FOR ALL USING (auth.uid() = user_id);

-- Public read access for hotels and inventory
CREATE POLICY "Anyone can view hotels" ON public.hotels
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view room inventory" ON public.room_inventory
  FOR SELECT USING (true);

-- Insert sample data for testing
INSERT INTO public.hotels (name, name_en, address, city, prefecture, latitude, longitude, stars, description, base_price, rakuten_hotel_no) VALUES
  ('ザ・リッツ・カールトン東京', 'The Ritz-Carlton Tokyo', '東京都港区赤坂9-7-1', '港区', '東京都', 35.6652, 139.7302, 5, '東京ミッドタウンにある最高級ホテル', 50000, '4624'),
  ('マンダリン オリエンタル 東京', 'Mandarin Oriental Tokyo', '東京都中央区日本橋室町2-1-1', '中央区', '東京都', 35.6867, 139.7731, 5, '日本橋の高級ホテル', 48000, '58437'),
  ('パークハイアット東京', 'Park Hyatt Tokyo', '東京都新宿区西新宿3-7-1-2', '新宿区', '東京都', 35.6851, 139.6905, 5, '新宿の高層ホテル', 45000, '4691'),
  ('シャングリ・ラ 東京', 'Shangri-La Tokyo', '東京都千代田区丸の内1-8-3', '千代田区', '東京都', 35.6783, 139.7671, 5, '東京駅隣接の高級ホテル', 42000, '127548'),
  ('フォーシーズンズホテル東京大手町', 'Four Seasons Hotel Tokyo at Otemachi', '東京都千代田区大手町1-2-1', '千代田区', '東京都', 35.6875, 139.7645, 5, '大手町の最新高級ホテル', 55000, '169103');

-- Insert sample inventory data
DO $$
DECLARE
  hotel_record RECORD;
  check_date DATE;
BEGIN
  FOR hotel_record IN SELECT id FROM public.hotels LOOP
    FOR i IN 0..30 LOOP
      check_date := CURRENT_DATE + i;
      INSERT INTO public.room_inventory (hotel_id, date, available_rooms, price)
      VALUES (
        hotel_record.id,
        check_date,
        CASE 
          WHEN i <= 7 THEN floor(random() * 3)  -- Low availability for next week
          ELSE floor(random() * 10) + 1  -- Normal availability
        END,
        CASE 
          WHEN i <= 3 THEN (SELECT base_price FROM public.hotels WHERE id = hotel_record.id) * 0.8  -- 20% discount for last minute
          ELSE (SELECT base_price FROM public.hotels WHERE id = hotel_record.id) * (0.9 + random() * 0.3)  -- Normal pricing
        END
      );
    END LOOP;
  END LOOP;
END $$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();