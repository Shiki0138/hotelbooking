-- Supabase Database Schema for Luxury Hotel Booking System

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  preferred_language TEXT DEFAULT 'ja',
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hotels table
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_en TEXT,
  hotel_type TEXT CHECK (hotel_type IN ('luxury', 'business', 'resort', 'ryokan')),
  chain_name TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  stars INTEGER CHECK (stars >= 1 AND stars <= 5),
  amenities JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  description TEXT,
  description_en TEXT,
  base_price DECIMAL(10, 2),
  currency TEXT DEFAULT 'JPY',
  external_ids JSONB DEFAULT '{}', -- {rakuten_id, booking_id, etc}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room types
CREATE TABLE IF NOT EXISTS public.room_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  max_occupancy INTEGER NOT NULL,
  bed_type TEXT,
  size_sqm DECIMAL(6, 2),
  amenities JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room inventory (real-time availability)
CREATE TABLE IF NOT EXISTS public.room_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_rooms INTEGER NOT NULL DEFAULT 0,
  available_rooms INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  is_last_minute BOOLEAN DEFAULT false,
  days_before_checkin INTEGER GENERATED ALWAYS AS (date - CURRENT_DATE) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_type_id, date)
);

-- Price history for tracking changes
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  previous_price DECIMAL(10, 2),
  price_change DECIMAL(10, 2) GENERATED ALWAYS AS (price - previous_price) STORED,
  change_percentage DECIMAL(5, 2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences for notifications
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL CHECK (preference_type IN ('hotel', 'area', 'chain', 'price_range')),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  area_name TEXT,
  chain_name TEXT,
  min_price DECIMAL(10, 2),
  max_price DECIMAL(10, 2),
  min_stars INTEGER,
  checkin_date DATE,
  checkout_date DATE,
  flexibility_days INTEGER DEFAULT 0,
  notify_last_minute BOOLEAN DEFAULT true,
  notify_price_drop BOOLEAN DEFAULT true,
  notify_new_availability BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Notification queue
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('last_minute', 'price_drop', 'new_availability', 'cancellation')),
  hotel_id UUID REFERENCES public.hotels(id),
  room_type_id UUID REFERENCES public.room_types(id),
  check_in_date DATE,
  check_out_date DATE,
  price DECIMAL(10, 2),
  previous_price DECIMAL(10, 2),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cancellation tracking
CREATE TABLE IF NOT EXISTS public.cancellation_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_inventory_id UUID REFERENCES public.room_inventory(id),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  previous_available INTEGER,
  current_available INTEGER,
  room_increase INTEGER GENERATED ALWAYS AS (current_available - previous_available) STORED,
  notified_users INTEGER DEFAULT 0
);

-- Search history for analytics
CREATE TABLE IF NOT EXISTS public.search_history (
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
CREATE INDEX idx_room_inventory_last_minute ON public.room_inventory(is_last_minute) WHERE is_last_minute = true;
CREATE INDEX idx_room_inventory_available ON public.room_inventory(available_rooms) WHERE available_rooms > 0;
CREATE INDEX idx_notifications_user_status ON public.notifications(user_id, status);
CREATE INDEX idx_notifications_created ON public.notifications(created_at) WHERE status = 'pending';
CREATE INDEX idx_user_preferences_active ON public.user_preferences(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_price_history_changes ON public.price_history(room_type_id, date, price_change);

-- Row Level Security (RLS) Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own search history" ON public.search_history
  FOR SELECT USING (auth.uid() = user_id);

-- Public read access for hotels and rooms
CREATE POLICY "Anyone can view hotels" ON public.hotels
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view room types" ON public.room_types
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view room inventory" ON public.room_inventory
  FOR SELECT USING (true);

-- Functions for real-time features
CREATE OR REPLACE FUNCTION check_last_minute_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as last minute if within 7 days
  IF NEW.date - CURRENT_DATE <= 7 THEN
    NEW.is_last_minute := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_last_minute_flag
  BEFORE INSERT OR UPDATE ON public.room_inventory
  FOR EACH ROW
  EXECUTE FUNCTION check_last_minute_availability();

-- Function to detect cancellations
CREATE OR REPLACE FUNCTION detect_cancellations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.available_rooms > OLD.available_rooms THEN
    INSERT INTO public.cancellation_alerts (
      room_inventory_id,
      previous_available,
      current_available
    ) VALUES (
      NEW.id,
      OLD.available_rooms,
      NEW.available_rooms
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cancellation_detector
  AFTER UPDATE ON public.room_inventory
  FOR EACH ROW
  WHEN (NEW.available_rooms > OLD.available_rooms)
  EXECUTE FUNCTION detect_cancellations();

-- Function to track price changes
CREATE OR REPLACE FUNCTION track_price_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.price != OLD.price THEN
    INSERT INTO public.price_history (
      room_type_id,
      date,
      price,
      previous_price,
      change_percentage
    ) VALUES (
      NEW.room_type_id,
      NEW.date,
      NEW.price,
      OLD.price,
      ((NEW.price - OLD.price) / OLD.price * 100)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER price_change_tracker
  AFTER UPDATE ON public.room_inventory
  FOR EACH ROW
  WHEN (NEW.price != OLD.price)
  EXECUTE FUNCTION track_price_changes();