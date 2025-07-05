-- User Preferences Schema for Hotel Matching
-- Created: 2025-07-04
-- Purpose: Enable user preference-based hotel matching

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Location preferences
    preferred_locations TEXT[] DEFAULT '{}',
    preferred_prefectures TEXT[] DEFAULT '{}',
    
    -- Budget preferences
    budget_min DECIMAL(10, 2),
    budget_max DECIMAL(10, 2),
    
    -- Date preferences
    date_flexibility JSONB DEFAULT '{
        "flexible": true,
        "preferred_days": ["friday", "saturday"],
        "avoid_days": [],
        "advance_days": 7
    }'::jsonb,
    
    -- Room preferences
    room_preferences JSONB DEFAULT '{
        "types": ["single", "double", "twin"],
        "amenities": [],
        "min_size": null
    }'::jsonb,
    
    -- Notification preferences
    notification_settings JSONB DEFAULT '{
        "channels": ["email"],
        "frequency": "immediate",
        "quiet_hours": {"start": "22:00", "end": "08:00"},
        "match_threshold": 80
    }'::jsonb,
    
    -- Matching settings
    auto_match_enabled BOOLEAN DEFAULT true,
    match_priority VARCHAR(20) DEFAULT 'balanced', -- price, location, availability, balanced
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id),
    CONSTRAINT valid_budget CHECK (budget_max >= budget_min),
    CONSTRAINT valid_match_priority CHECK (match_priority IN ('price', 'location', 'availability', 'balanced'))
);

-- Preference match history
CREATE TABLE IF NOT EXISTS preference_match_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preference_id UUID NOT NULL REFERENCES user_preferences(id) ON DELETE CASCADE,
    hotel_id VARCHAR(50) NOT NULL,
    hotel_name VARCHAR(255) NOT NULL,
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    match_details JSONB NOT NULL,
    notification_sent BOOLEAN DEFAULT false,
    user_viewed BOOLEAN DEFAULT false,
    user_action VARCHAR(20), -- viewed, saved, booked, dismissed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_user_action CHECK (user_action IN ('viewed', 'saved', 'booked', 'dismissed', NULL))
);

-- Indexes for performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_auto_match ON user_preferences(auto_match_enabled) WHERE auto_match_enabled = true;
CREATE INDEX idx_preference_match_history_user_id ON preference_match_history(user_id);
CREATE INDEX idx_preference_match_history_created ON preference_match_history(created_at);
CREATE INDEX idx_preference_match_history_not_viewed ON preference_match_history(user_viewed) WHERE user_viewed = false;

-- Triggers
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE preference_match_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own match history" ON preference_match_history
    FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_preferences TO authenticated;
GRANT ALL ON preference_match_history TO authenticated;
GRANT USAGE ON SEQUENCE user_preferences_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE preference_match_history_id_seq TO authenticated;