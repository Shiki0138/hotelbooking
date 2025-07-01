-- LastMinuteStay Database Schema
-- Optimized for ultra-fast hotel search with PostGIS

-- Enable PostGIS extension for location-based search
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For text search optimization

-- Hotels table with location data
CREATE TABLE hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT,4326) NOT NULL, -- PostGIS point for lat/lng
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    amenities JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial index for ultra-fast location queries
CREATE INDEX idx_hotels_location ON hotels USING GIST(location);
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_hotels_rating ON hotels(rating DESC);

-- Rooms table
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX idx_rooms_capacity ON rooms(capacity);

-- Availability table (optimized for fast lookups)
CREATE TABLE availability (
    id BIGSERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_count INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    last_minute_discount DECIMAL(3,2) DEFAULT 0 CHECK (last_minute_discount >= 0 AND last_minute_discount <= 1),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Composite index for super-fast availability queries
CREATE UNIQUE INDEX idx_availability_room_date ON availability(room_id, date);
CREATE INDEX idx_availability_date_available ON availability(date, available_count) WHERE available_count > 0;
CREATE INDEX idx_availability_price ON availability(price);

-- Bookings table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_dates CHECK (check_out > check_in)
);

CREATE INDEX idx_bookings_room_dates ON bookings(room_id, check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status) WHERE status = 'confirmed';

-- Search cache table for frequently searched locations
CREATE TABLE search_cache (
    id SERIAL PRIMARY KEY,
    search_key VARCHAR(255) NOT NULL UNIQUE,
    center_location GEOGRAPHY(POINT,4326),
    radius_km INTEGER,
    result_count INTEGER,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_search_cache_key ON search_cache(search_key);
CREATE INDEX idx_search_cache_expires ON search_cache(expires_at);

-- Function to update availability after booking
CREATE OR REPLACE FUNCTION update_availability_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE availability
    SET available_count = available_count - 1,
        updated_at = NOW()
    WHERE room_id = NEW.room_id
    AND date >= NEW.check_in
    AND date < NEW.check_out
    AND available_count > 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_availability_update
AFTER INSERT ON bookings
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION update_availability_on_booking();

-- Function to find nearby hotels (optimized)
CREATE OR REPLACE FUNCTION find_nearby_hotels(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km INTEGER DEFAULT 5
)
RETURNS TABLE (
    hotel_id INTEGER,
    name VARCHAR,
    distance_km DOUBLE PRECISION,
    location GEOGRAPHY,
    rating DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.name,
        ST_Distance(h.location, ST_MakePoint(user_lng, user_lat)::geography) / 1000 AS distance_km,
        h.location,
        h.rating
    FROM hotels h
    WHERE ST_DWithin(
        h.location,
        ST_MakePoint(user_lng, user_lat)::geography,
        radius_km * 1000
    )
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;