-- Add 2FA columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT,
ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_two_factor_verification TIMESTAMPTZ;

-- Create indexes for 2FA
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled);

-- Add 2FA verification log table
CREATE TABLE IF NOT EXISTS two_factor_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  verification_method VARCHAR(50), -- 'totp' or 'backup_code'
  operation VARCHAR(50) -- 'login', 'payment', 'profile_change', etc.
);

-- Create index for verification logs
CREATE INDEX IF NOT EXISTS idx_two_factor_verifications_user_id ON two_factor_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_verifications_verified_at ON two_factor_verifications(verified_at);