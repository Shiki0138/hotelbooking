-- Add refund-related columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS refund_transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Create hotel refund policies table
CREATE TABLE IF NOT EXISTS hotel_refund_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  days_before_check_in INTEGER NOT NULL,
  refund_percentage INTEGER NOT NULL CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, days_before_check_in)
);

-- Add type column to payments table for refunds
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'PAYMENT';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_refund_status ON bookings(refund_status);
CREATE INDEX IF NOT EXISTS idx_hotel_refund_policies_hotel_id ON hotel_refund_policies(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);

-- Add check constraint for refund status
ALTER TABLE bookings
ADD CONSTRAINT check_refund_status 
CHECK (refund_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NOT_REFUNDED'));