-- Price Prediction and Auto-booking Schema
-- Created: 2025-07-04
-- Purpose: Enable AI-powered price predictions and automated booking

-- Historical price data for ML training
CREATE TABLE IF NOT EXISTS price_history_ml (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    date DATE NOT NULL,
    
    -- Price data
    price DECIMAL(10, 2) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    discount_percentage INTEGER DEFAULT 0,
    
    -- Temporal features
    day_of_week INTEGER NOT NULL, -- 0-6
    month INTEGER NOT NULL, -- 1-12
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN DEFAULT false,
    days_until_checkin INTEGER,
    
    -- Event features
    local_event VARCHAR(255),
    event_impact_score INTEGER DEFAULT 0, -- 0-100
    season VARCHAR(20),
    
    -- Supply/demand indicators
    occupancy_rate DECIMAL(5, 2),
    search_volume INTEGER,
    competitor_avg_price DECIMAL(10, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(hotel_id, room_id, date)
);

-- Price predictions
CREATE TABLE IF NOT EXISTS price_predictions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    
    -- Prediction period
    prediction_date DATE NOT NULL,
    target_date DATE NOT NULL,
    days_ahead INTEGER NOT NULL,
    
    -- Predictions
    predicted_price DECIMAL(10, 2) NOT NULL,
    confidence_score DECIMAL(5, 2) NOT NULL, -- 0-100
    price_range_low DECIMAL(10, 2),
    price_range_high DECIMAL(10, 2),
    
    -- Recommendation
    recommendation VARCHAR(20) NOT NULL, -- book_now, wait, monitor
    recommendation_reason TEXT,
    
    -- Model metadata
    model_version VARCHAR(20),
    features_used JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_recommendation CHECK (recommendation IN ('book_now', 'wait', 'monitor')),
    CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0 AND 100)
);

-- Price freeze functionality
CREATE TABLE IF NOT EXISTS price_freezes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    
    -- Freeze details
    frozen_price DECIMAL(10, 2) NOT NULL,
    freeze_fee DECIMAL(10, 2) NOT NULL DEFAULT 300,
    freeze_duration_hours INTEGER NOT NULL DEFAULT 72,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Dates
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guests_count INTEGER NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, converted, expired, cancelled
    booking_id UUID REFERENCES bookings(id),
    
    -- Payment
    stripe_payment_intent_id VARCHAR(255),
    fee_paid BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_freeze_status CHECK (status IN ('active', 'converted', 'expired', 'cancelled')),
    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

-- Auto-booking rules
CREATE TABLE IF NOT EXISTS auto_booking_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Target criteria
    hotel_ids UUID[],
    room_types TEXT[],
    locations TEXT[],
    
    -- Date criteria
    check_in_dates DATERANGE,
    stay_duration_min INTEGER DEFAULT 1,
    stay_duration_max INTEGER DEFAULT 7,
    book_weekends_only BOOLEAN DEFAULT false,
    
    -- Price criteria
    max_price DECIMAL(10, 2) NOT NULL,
    max_total_price DECIMAL(10, 2),
    require_discount BOOLEAN DEFAULT false,
    min_discount_percentage INTEGER,
    
    -- Booking settings
    guests_count INTEGER NOT NULL DEFAULT 1,
    auto_confirm BOOLEAN DEFAULT false,
    notification_only BOOLEAN DEFAULT false,
    
    -- Payment
    payment_method_id VARCHAR(255), -- Stripe payment method
    require_approval_above DECIMAL(10, 2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at DATE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    bookings_created INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_stay_duration CHECK (stay_duration_max >= stay_duration_min)
);

-- Auto-booking execution log
CREATE TABLE IF NOT EXISTS auto_booking_executions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rule_id UUID NOT NULL REFERENCES auto_booking_rules(id),
    
    -- Execution details
    matched_room_id UUID REFERENCES rooms(id),
    matched_price DECIMAL(10, 2),
    check_in_date DATE,
    check_out_date DATE,
    
    -- Result
    action_taken VARCHAR(20) NOT NULL, -- booked, notified, skipped
    booking_id UUID REFERENCES bookings(id),
    skip_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_action CHECK (action_taken IN ('booked', 'notified', 'skipped'))
);

-- Social media content cache
CREATE TABLE IF NOT EXISTS social_media_content (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    
    -- Source
    platform VARCHAR(20) NOT NULL, -- google, instagram, youtube
    content_type VARCHAR(20) NOT NULL, -- review, post, video
    external_id VARCHAR(255) NOT NULL,
    
    -- Content
    author_name VARCHAR(255),
    author_avatar_url TEXT,
    content TEXT,
    media_urls TEXT[],
    thumbnail_url TEXT,
    
    -- Metadata
    rating INTEGER,
    likes_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Cache management
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(platform, external_id),
    CONSTRAINT valid_platform CHECK (platform IN ('google', 'instagram', 'youtube')),
    CONSTRAINT valid_content_type CHECK (content_type IN ('review', 'post', 'video'))
);

-- Indexes
CREATE INDEX idx_price_history_ml_lookup ON price_history_ml(hotel_id, room_id, date);
CREATE INDEX idx_price_predictions_latest ON price_predictions(hotel_id, room_id, prediction_date DESC);
CREATE INDEX idx_price_freezes_active ON price_freezes(status, expires_at) WHERE status = 'active';
CREATE INDEX idx_auto_booking_active ON auto_booking_rules(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_social_media_hotel ON social_media_content(hotel_id, platform);

-- Triggers
CREATE TRIGGER update_price_freezes_updated_at BEFORE UPDATE ON price_freezes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_booking_rules_updated_at BEFORE UPDATE ON auto_booking_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE price_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_freezes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_booking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_booking_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view predictions" ON price_predictions
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own price freezes" ON price_freezes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own auto-booking rules" ON auto_booking_rules
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own auto-booking executions" ON auto_booking_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auto_booking_rules 
            WHERE auto_booking_rules.id = auto_booking_executions.rule_id 
            AND auto_booking_rules.user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT SELECT ON price_history_ml TO authenticated;
GRANT SELECT ON price_predictions TO authenticated;
GRANT ALL ON price_freezes TO authenticated;
GRANT ALL ON auto_booking_rules TO authenticated;
GRANT SELECT ON auto_booking_executions TO authenticated;
GRANT SELECT ON social_media_content TO authenticated;