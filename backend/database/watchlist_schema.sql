-- Watchlist and Multi-channel Notification Schema
-- Created: 2025-07-04
-- Purpose: Enable price tracking and multi-channel notifications

-- Watchlist items
CREATE TABLE IF NOT EXISTS watchlist_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    
    -- Watch criteria
    watch_type VARCHAR(20) NOT NULL DEFAULT 'price', -- price, availability, both
    target_price DECIMAL(10, 2),
    price_threshold_percentage INTEGER, -- e.g., 20 for 20% discount
    watch_dates DATERANGE, -- specific date range to monitor
    weekend_only BOOLEAN DEFAULT false,
    
    -- Notification preferences
    notification_channels TEXT[] DEFAULT '{email}',
    notification_frequency VARCHAR(20) DEFAULT 'immediate', -- immediate, daily, weekly
    last_notified_at TIMESTAMP WITH TIME ZONE,
    notification_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at DATE,
    
    -- Tracking
    initial_price DECIMAL(10, 2),
    lowest_price_seen DECIMAL(10, 2),
    lowest_price_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_watch_type CHECK (watch_type IN ('price', 'availability', 'both')),
    CONSTRAINT valid_notification_frequency CHECK (notification_frequency IN ('immediate', 'daily', 'weekly')),
    CONSTRAINT valid_threshold CHECK (
        (target_price IS NOT NULL AND target_price > 0) OR 
        (price_threshold_percentage IS NOT NULL AND price_threshold_percentage BETWEEN 1 AND 99)
    )
);

-- Price change history for watchlist items
CREATE TABLE IF NOT EXISTS watchlist_price_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    watchlist_item_id UUID NOT NULL REFERENCES watchlist_items(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id),
    date DATE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    discount_percentage INTEGER,
    available_count INTEGER,
    meets_criteria BOOLEAN DEFAULT false,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification queue for multi-channel delivery
CREATE TABLE IF NOT EXISTS watchlist_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    watchlist_item_id UUID NOT NULL REFERENCES watchlist_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Notification details
    channel VARCHAR(20) NOT NULL, -- email, sms, push, line
    recipient VARCHAR(255) NOT NULL, -- email address, phone number, device token, line id
    subject VARCHAR(255),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Rich content
    hotel_name VARCHAR(255),
    room_name VARCHAR(255),
    original_price DECIMAL(10, 2),
    current_price DECIMAL(10, 2),
    discount_amount DECIMAL(10, 2),
    discount_percentage INTEGER,
    available_dates DATE[],
    
    -- Delivery status
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, cancelled
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Calendar integration
    ical_attachment TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_channel CHECK (channel IN ('email', 'sms', 'push', 'line')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

-- User segments for personalized recommendations
CREATE TABLE IF NOT EXISTS user_segments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Segment identification
    lifestyle_segment VARCHAR(50) NOT NULL, -- single, couple, family_young, family_teen, senior_couple, business
    travel_purposes TEXT[] DEFAULT '{}', -- leisure, business, anniversary, weekend, workation
    
    -- Preferences derived from behavior
    preferred_amenities TEXT[] DEFAULT '{}',
    price_sensitivity VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    booking_lead_time_days INTEGER,
    typical_stay_duration INTEGER,
    
    -- Auto-detected from profile/behavior
    has_children BOOLEAN DEFAULT false,
    children_ages INTEGER[],
    mobility_needs BOOLEAN DEFAULT false,
    pet_friendly_required BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id),
    CONSTRAINT valid_lifestyle_segment CHECK (lifestyle_segment IN (
        'single', 'couple', 'family_young', 'family_teen', 'senior_couple', 'business', 'group'
    )),
    CONSTRAINT valid_price_sensitivity CHECK (price_sensitivity IN ('low', 'medium', 'high'))
);

-- Segment-based recommendations
CREATE TABLE IF NOT EXISTS segment_recommendations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    segment VARCHAR(50) NOT NULL,
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    
    -- Recommendation metadata
    relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 0 AND 100),
    reason_tags TEXT[] NOT NULL, -- e.g., ['kids_pool', 'family_rooms', 'free_breakfast']
    special_offers TEXT[],
    
    -- Context
    valid_for_purposes TEXT[],
    seasonal_relevance VARCHAR(20), -- spring, summer, fall, winter, all
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at DATE,
    
    CONSTRAINT valid_seasonal CHECK (seasonal_relevance IN ('spring', 'summer', 'fall', 'winter', 'all', NULL))
);

-- Indexes for performance
CREATE INDEX idx_watchlist_active_user ON watchlist_items(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_watchlist_hotel_room ON watchlist_items(hotel_id, room_id);
CREATE INDEX idx_watchlist_notification_pending ON watchlist_notifications(status) WHERE status = 'pending';
CREATE INDEX idx_price_history_date ON watchlist_price_history(date, watchlist_item_id);
CREATE INDEX idx_user_segments_user ON user_segments(user_id);
CREATE INDEX idx_segment_recommendations ON segment_recommendations(segment, relevance_score DESC);

-- Triggers
CREATE TRIGGER update_watchlist_items_updated_at BEFORE UPDATE ON watchlist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_segments_updated_at BEFORE UPDATE ON user_segments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own watchlist" ON watchlist_items
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own price history" ON watchlist_price_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM watchlist_items 
            WHERE watchlist_items.id = watchlist_price_history.watchlist_item_id 
            AND watchlist_items.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own notifications" ON watchlist_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own segments" ON user_segments
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON watchlist_items TO authenticated;
GRANT ALL ON watchlist_price_history TO authenticated;
GRANT SELECT ON watchlist_notifications TO authenticated;
GRANT ALL ON user_segments TO authenticated;
GRANT SELECT ON segment_recommendations TO authenticated;