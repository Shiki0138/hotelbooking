-- Add role enum to users table
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'HOTEL_MANAGER');

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'USER';

-- Add hotel_manager_hotels table for hotel managers
CREATE TABLE IF NOT EXISTS hotel_manager_hotels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hotel_id)
);

-- Add indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_hotel_manager_hotels_user_id ON hotel_manager_hotels(user_id);
CREATE INDEX idx_hotel_manager_hotels_hotel_id ON hotel_manager_hotels(hotel_id);