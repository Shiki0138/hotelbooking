-- Migration: 002_realtime_hotel_system
-- Description: Real-time hotel system with price monitoring and watchlists
-- Date: 2025-07-02

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Real-time hotel information table
CREATE TABLE IF NOT EXISTS public.hotels_realtime (
  hotel_no VARCHAR(20) PRIMARY KEY,
  hotel_name TEXT NOT NULL,
  area_name TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  min_charge INTEGER,
  max_charge INTEGER,
  review_average DECIMAL(3,2),
  review_count INTEGER,
  hotel_thumbnail_url TEXT,
  hotel_image_url TEXT,
  access_info TEXT,
  checkin_time VARCHAR(10),
  checkout_time VARCHAR(10),
  address1 TEXT,
  address2 TEXT,
  postal_code VARCHAR(10),
  telephone_no VARCHAR(20),
  hotel_special TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history table (15-minute intervals for real-time monitoring)
CREATE TABLE IF NOT EXISTS public.price_history_15min (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_no VARCHAR(20) NOT NULL,
  room_type TEXT,
  plan_name TEXT,
  plan_id VARCHAR(50),
  price INTEGER NOT NULL,
  availability_status VARCHAR(20) CHECK (availability_status IN ('available', 'unavailable', 'limited')),
  available_rooms INTEGER DEFAULT 0,
  max_rooms INTEGER,
  checkin_date DATE,
  checkout_date DATE,
  adult_num INTEGER,
  room_num INTEGER,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extended watchlist table for price monitoring
CREATE TABLE IF NOT EXISTS public.watchlist_extended (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_no VARCHAR(20) NOT NULL,
  hotel_name TEXT NOT NULL,
  target_price INTEGER,
  checkin_date DATE,
  checkout_date DATE,
  adult_num INTEGER DEFAULT 2,
  room_num INTEGER DEFAULT 1,
  alert_conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search history for analytics
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  search_params JSONB NOT NULL,
  result_count INTEGER,
  search_location TEXT,
  search_type VARCHAR(50),
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price alerts sent log
CREATE TABLE IF NOT EXISTS public.price_alerts_sent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_no VARCHAR(20) NOT NULL,
  hotel_name TEXT,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('price_drop', 'new_availability', 'last_room', 'special_plan')),
  message TEXT NOT NULL,
  current_price INTEGER,
  target_price INTEGER,
  checkin_date DATE,
  checkout_date DATE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_delivered BOOLEAN DEFAULT FALSE,
  email_opened BOOLEAN DEFAULT FALSE
);

-- Hotel facilities and amenities (for detailed search)
CREATE TABLE IF NOT EXISTS public.hotel_facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_no VARCHAR(20) NOT NULL,
  facility_type VARCHAR(50) NOT NULL,
  facility_name TEXT NOT NULL,
  facility_description TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (hotel_no) REFERENCES public.hotels_realtime(hotel_no) ON DELETE CASCADE
);

-- Real-time room availability cache
CREATE TABLE IF NOT EXISTS public.room_availability_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_no VARCHAR(20) NOT NULL,
  room_class TEXT,
  plan_name TEXT,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  adult_num INTEGER NOT NULL,
  room_num INTEGER NOT NULL,
  available_rooms INTEGER NOT NULL DEFAULT 0,
  price INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
  UNIQUE(hotel_no, room_class, plan_name, checkin_date, checkout_date, adult_num, room_num)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_hotels_realtime_location ON public.hotels_realtime(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hotels_realtime_price ON public.hotels_realtime(min_charge, max_charge);
CREATE INDEX IF NOT EXISTS idx_hotels_realtime_rating ON public.hotels_realtime(review_average);
CREATE INDEX IF NOT EXISTS idx_hotels_realtime_updated ON public.hotels_realtime(updated_at);

CREATE INDEX IF NOT EXISTS idx_price_history_hotel_time ON public.price_history_15min(hotel_no, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_date_range ON public.price_history_15min(checkin_date, checkout_date);
CREATE INDEX IF NOT EXISTS idx_price_history_price ON public.price_history_15min(price);
CREATE INDEX IF NOT EXISTS idx_price_history_availability ON public.price_history_15min(availability_status, available_rooms);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist_extended(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_hotel ON public.watchlist_extended(hotel_no);
CREATE INDEX IF NOT EXISTS idx_watchlist_active ON public.watchlist_extended(is_active, last_checked);
CREATE INDEX IF NOT EXISTS idx_watchlist_dates ON public.watchlist_extended(checkin_date, checkout_date);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.search_history(user_id, searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_time ON public.search_history(searched_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_sent_user ON public.price_alerts_sent(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_hotel ON public.price_alerts_sent(hotel_no, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_hotel_facilities_hotel ON public.hotel_facilities(hotel_no);
CREATE INDEX IF NOT EXISTS idx_hotel_facilities_type ON public.hotel_facilities(facility_type);

CREATE INDEX IF NOT EXISTS idx_room_cache_hotel_dates ON public.room_availability_cache(hotel_no, checkin_date, checkout_date);
CREATE INDEX IF NOT EXISTS idx_room_cache_expires ON public.room_availability_cache(expires_at);

-- Row Level Security (RLS) policies
ALTER TABLE public.hotels_realtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history_15min ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_availability_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for hotel data
CREATE POLICY "Public read access for hotels" ON public.hotels_realtime
    FOR SELECT USING (true);

CREATE POLICY "Public read access for price history" ON public.price_history_15min
    FOR SELECT USING (true);

CREATE POLICY "Public read access for hotel facilities" ON public.hotel_facilities
    FOR SELECT USING (true);

CREATE POLICY "Public read access for room cache" ON public.room_availability_cache
    FOR SELECT USING (true);

-- User-specific policies for watchlist
CREATE POLICY "Users can view own watchlist" ON public.watchlist_extended
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create watchlist items" ON public.watchlist_extended
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist" ON public.watchlist_extended
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON public.watchlist_extended
    FOR DELETE USING (auth.uid() = user_id);

-- Search history policies
CREATE POLICY "Users can view own search history" ON public.search_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create search history" ON public.search_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Price alerts policies
CREATE POLICY "Users can view own alerts" ON public.price_alerts_sent
    FOR SELECT USING (auth.uid() = user_id);

-- Functions for data management

-- Function to clean old price history (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_price_history()
RETURNS void AS $$
BEGIN
  DELETE FROM public.price_history_15min
  WHERE checked_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired room cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_room_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.room_availability_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get price trend for a hotel
CREATE OR REPLACE FUNCTION public.get_hotel_price_trend(
  p_hotel_no VARCHAR(20),
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  hour_group TIMESTAMPTZ,
  avg_price DECIMAL,
  min_price INTEGER,
  max_price INTEGER,
  availability_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', checked_at) as hour_group,
    AVG(price)::DECIMAL as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price,
    COUNT(CASE WHEN availability_status = 'available' THEN 1 END)::INTEGER as availability_count
  FROM public.price_history_15min
  WHERE 
    hotel_no = p_hotel_no
    AND checked_at > NOW() - (p_hours || ' hours')::INTERVAL
    AND price IS NOT NULL
  GROUP BY date_trunc('hour', checked_at)
  ORDER BY hour_group DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get hotels by location
CREATE OR REPLACE FUNCTION public.search_hotels_by_location(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_km DECIMAL DEFAULT 5.0,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  hotel_no VARCHAR(20),
  hotel_name TEXT,
  distance_km DECIMAL,
  min_charge INTEGER,
  review_average DECIMAL,
  review_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.hotel_no,
    h.hotel_name,
    ROUND(
      6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(h.latitude)) * 
        cos(radians(h.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(h.latitude))
      )::DECIMAL, 2
    ) as distance_km,
    h.min_charge,
    h.review_average,
    h.review_count
  FROM public.hotels_realtime h
  WHERE 
    h.latitude IS NOT NULL 
    AND h.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(h.latitude)) * 
        cos(radians(h.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(h.latitude))
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update watchlist updated_at
CREATE OR REPLACE FUNCTION public.update_watchlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_watchlist_updated_at_trigger
  BEFORE UPDATE ON public.watchlist_extended
  FOR EACH ROW
  EXECUTE FUNCTION public.update_watchlist_updated_at();

-- Trigger to update hotel realtime updated_at
CREATE OR REPLACE FUNCTION public.update_hotels_realtime_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hotels_realtime_updated_at_trigger
  BEFORE UPDATE ON public.hotels_realtime
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hotels_realtime_updated_at();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Insert sample popular destinations
INSERT INTO public.hotels_realtime (
  hotel_no, hotel_name, area_name, latitude, longitude, 
  min_charge, max_charge, review_average, review_count,
  hotel_thumbnail_url, address1, address2
) VALUES 
('sample001', 'サンプルホテル東京駅前', '東京都千代田区', 35.6812, 139.7671, 8000, 25000, 4.2, 1200, 'https://via.placeholder.com/200x150', '東京都', '千代田区丸の内1-1-1'),
('sample002', 'サンプルホテル新宿', '東京都新宿区', 35.6896, 139.7006, 6000, 18000, 4.0, 890, 'https://via.placeholder.com/200x150', '東京都', '新宿区新宿3-1-1'),
('sample003', 'サンプルホテル大阪梅田', '大阪府大阪市', 34.7024, 135.4963, 7500, 22000, 4.3, 1560, 'https://via.placeholder.com/200x150', '大阪府', '大阪市北区梅田1-1-1'),
('sample004', 'サンプルホテル京都駅前', '京都府京都市', 34.9858, 135.7581, 9000, 30000, 4.5, 980, 'https://via.placeholder.com/200x150', '京都府', '京都市下京区烏丸通1-1'),
('sample005', 'サンプルリゾート沖縄', '沖縄県那覇市', 26.2124, 127.6792, 15000, 80000, 4.7, 450, 'https://via.placeholder.com/200x150', '沖縄県', '那覇市泉崎1-1-1')
ON CONFLICT (hotel_no) DO NOTHING;

-- Insert sample price history
INSERT INTO public.price_history_15min (
  hotel_no, room_type, plan_name, price, availability_status, available_rooms, checked_at
) 
SELECT 
  'sample001',
  'スタンダードルーム',
  '素泊まりプラン',
  8000 + (random() * 2000)::INTEGER,
  CASE WHEN random() > 0.2 THEN 'available' ELSE 'limited' END,
  (random() * 10)::INTEGER + 1,
  NOW() - (generate_series(0, 95) * INTERVAL '15 minutes')
FROM generate_series(0, 95);

COMMIT;