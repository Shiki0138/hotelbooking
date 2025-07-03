-- LastMinuteStay Database Schema
-- Created for Emergency 24h Release

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hotels table
CREATE TABLE public.hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    prefecture TEXT NOT NULL,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    rating DECIMAL(2, 1),
    amenities JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room types table
CREATE TABLE public.room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    amenities JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room inventory table
CREATE TABLE public.room_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_rooms INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_type_id, date)
);

-- Bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id),
    room_type_id UUID NOT NULL REFERENCES public.room_types(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guest_count INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'JPY',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    payment_intent_id TEXT,
    special_requests TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded'))
);

-- Guest details table
CREATE TABLE public.guest_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT,
    is_primary_guest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    stripe_payment_intent_id TEXT UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'JPY',
    status TEXT NOT NULL,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_hotels_location ON public.hotels(city, prefecture);
CREATE INDEX idx_hotels_geo ON public.hotels(latitude, longitude);
CREATE INDEX idx_room_inventory_date ON public.room_inventory(date);
CREATE INDEX idx_room_inventory_availability ON public.room_inventory(room_type_id, date, available_rooms);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_hotel ON public.bookings(hotel_id);
CREATE INDEX idx_bookings_dates ON public.bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_payment_transactions_booking ON public.payment_transactions(booking_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON public.bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- Guest details policies
CREATE POLICY "Users can view own guest details" ON public.guest_details
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = guest_details.booking_id
            AND bookings.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own guest details" ON public.guest_details
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = guest_details.booking_id
            AND bookings.user_id = auth.uid()
        )
    );

-- Payment transactions policies
CREATE POLICY "Users can view own payments" ON public.payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings
            WHERE bookings.id = payment_transactions.booking_id
            AND bookings.user_id = auth.uid()
        )
    );

-- Functions
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    reference TEXT;
BEGIN
    -- Generate a unique booking reference like 'LMS-20240701-XXXX'
    reference := 'LMS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4));
    RETURN reference;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate booking reference
CREATE OR REPLACE FUNCTION public.set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_reference IS NULL THEN
        NEW.booking_reference := public.generate_booking_reference();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_reference_trigger
    BEFORE INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_booking_reference();

-- Function to update room availability after booking
CREATE OR REPLACE FUNCTION public.update_room_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Decrease available rooms for booking dates
        UPDATE public.room_inventory
        SET available_rooms = available_rooms - 1
        WHERE room_type_id = NEW.room_type_id
        AND date >= NEW.check_in_date
        AND date < NEW.check_out_date
        AND available_rooms > 0;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        -- Increase available rooms when booking is cancelled
        UPDATE public.room_inventory
        SET available_rooms = available_rooms + 1
        WHERE room_type_id = NEW.room_type_id
        AND date >= NEW.check_in_date
        AND date < NEW.check_out_date;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_availability_trigger
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_room_availability();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON public.room_types
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_inventory_updated_at BEFORE UPDATE ON public.room_inventory
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();