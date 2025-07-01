-- Luxury Hotel Availability Notification System Schema
-- Advanced notification system for premium hotel availability alerts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- User notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    line_user_id VARCHAR(100),
    
    -- Notification channels
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    line_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    
    -- Timing preferences
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    max_notifications_per_day INTEGER DEFAULT 10,
    
    -- Frequency settings
    instant_notifications BOOLEAN DEFAULT true,
    daily_digest BOOLEAN DEFAULT false,
    weekly_summary BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotel watch lists for luxury hotels
CREATE TABLE hotel_watch_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id),
    
    -- Watch criteria
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    min_nights INTEGER DEFAULT 1,
    max_nights INTEGER DEFAULT 30,
    
    -- Room preferences
    room_types TEXT[] DEFAULT ARRAY['Suite', 'Deluxe', 'Premium'],
    min_capacity INTEGER DEFAULT 1,
    max_capacity INTEGER DEFAULT 4,
    
    -- Price criteria
    max_price_per_night DECIMAL(10,2),
    currency_code VARCHAR(3) DEFAULT 'JPY',
    price_alert_threshold DECIMAL(3,2) DEFAULT 0.20, -- 20% discount threshold
    
    -- Luxury amenities preferences
    required_amenities JSONB DEFAULT '{}',
    preferred_amenities JSONB DEFAULT '{}',
    
    -- Status and tracking
    is_active BOOLEAN DEFAULT true,
    priority_level INTEGER DEFAULT 5 CHECK (priority_level BETWEEN 1 AND 10),
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notification_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_date_range CHECK (check_out_date > check_in_date),
    CONSTRAINT reasonable_stay_length CHECK (check_out_date - check_in_date <= INTERVAL '90 days')
);

-- Notification history and tracking
CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    watch_list_id UUID REFERENCES hotel_watch_lists(id),
    hotel_id INTEGER REFERENCES hotels(id),
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL, -- 'availability', 'price_drop', 'last_minute', 'luxury_deal'
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'line', 'push'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
    
    -- Content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    
    -- Metadata
    hotel_data JSONB,
    room_data JSONB,
    pricing_data JSONB,
    
    -- Tracking
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Luxury hotel availability alerts (real-time trigger table)
CREATE TABLE availability_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id INTEGER NOT NULL REFERENCES hotels(id),
    room_id INTEGER NOT NULL REFERENCES rooms(id),
    
    -- Availability details
    available_date DATE NOT NULL,
    available_rooms INTEGER NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN original_price > 0 THEN ((original_price - current_price) / original_price * 100)
            ELSE 0
        END
    ) STORED,
    
    -- Alert metadata
    alert_type VARCHAR(50) NOT NULL, -- 'new_availability', 'price_drop', 'last_minute', 'flash_sale'
    urgency_level INTEGER DEFAULT 5 CHECK (urgency_level BETWEEN 1 AND 10),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Luxury indicators
    is_luxury_suite BOOLEAN DEFAULT false,
    has_premium_amenities BOOLEAN DEFAULT false,
    view_type VARCHAR(50), -- 'ocean', 'mountain', 'city', 'garden'
    
    -- Processing status
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    notification_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(hotel_id, room_id, available_date, alert_type)
);

-- Smart notification queue with priority handling
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    watch_list_id UUID REFERENCES hotel_watch_lists(id),
    alert_id UUID REFERENCES availability_alerts(id),
    
    -- Priority and scheduling
    priority_score INTEGER NOT NULL DEFAULT 5,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    channel VARCHAR(20) NOT NULL,
    
    -- Rate limiting
    user_daily_count INTEGER DEFAULT 0,
    user_hourly_count INTEGER DEFAULT 0,
    
    -- Content
    notification_data JSONB NOT NULL,
    
    -- Processing
    status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'processing', 'sent', 'failed', 'cancelled'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_details TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_hotel_watch_lists_user_id ON hotel_watch_lists(user_id);
CREATE INDEX idx_hotel_watch_lists_hotel_id ON hotel_watch_lists(hotel_id);
CREATE INDEX idx_hotel_watch_lists_active ON hotel_watch_lists(is_active) WHERE is_active = true;
CREATE INDEX idx_hotel_watch_lists_dates ON hotel_watch_lists(check_in_date, check_out_date);

CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_status ON notification_history(status);
CREATE INDEX idx_notification_history_created_at ON notification_history(created_at);

CREATE INDEX idx_availability_alerts_hotel_room ON availability_alerts(hotel_id, room_id);
CREATE INDEX idx_availability_alerts_date ON availability_alerts(available_date);
CREATE INDEX idx_availability_alerts_unprocessed ON availability_alerts(is_processed) WHERE is_processed = false;
CREATE INDEX idx_availability_alerts_urgency ON availability_alerts(urgency_level DESC);

CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'queued';
CREATE INDEX idx_notification_queue_priority ON notification_queue(priority_score DESC);
CREATE INDEX idx_notification_queue_user_channel ON notification_queue(user_id, channel);

-- Advanced search index for hotel amenities
CREATE INDEX idx_watch_lists_amenities_gin ON hotel_watch_lists USING GIN (required_amenities, preferred_amenities);

-- Function to calculate notification priority score
CREATE OR REPLACE FUNCTION calculate_notification_priority(
    p_urgency_level INTEGER,
    p_discount_percentage DECIMAL,
    p_user_priority INTEGER,
    p_is_luxury BOOLEAN,
    p_availability_hours_remaining INTEGER
) RETURNS INTEGER AS $$
DECLARE
    priority_score INTEGER := 0;
BEGIN
    -- Base urgency (1-10)
    priority_score := p_urgency_level * 10;
    
    -- Discount bonus (up to 50 points)
    IF p_discount_percentage IS NOT NULL THEN
        priority_score := priority_score + LEAST(p_discount_percentage * 2, 50)::INTEGER;
    END IF;
    
    -- User priority (1-10, multiply by 5)
    priority_score := priority_score + (p_user_priority * 5);
    
    -- Luxury bonus (20 points)
    IF p_is_luxury THEN
        priority_score := priority_score + 20;
    END IF;
    
    -- Urgency based on availability window
    CASE 
        WHEN p_availability_hours_remaining <= 2 THEN 
            priority_score := priority_score + 30; -- Very urgent
        WHEN p_availability_hours_remaining <= 6 THEN 
            priority_score := priority_score + 20; -- Urgent
        WHEN p_availability_hours_remaining <= 24 THEN 
            priority_score := priority_score + 10; -- Moderate
        ELSE 
            priority_score := priority_score + 0; -- Normal
    END CASE;
    
    RETURN LEAST(priority_score, 200); -- Cap at 200
END;
$$ LANGUAGE plpgsql;

-- Function to check and create availability alerts
CREATE OR REPLACE FUNCTION check_availability_alerts()
RETURNS TABLE(alert_count INTEGER, notifications_queued INTEGER) AS $$
DECLARE
    watch_record RECORD;
    alert_id UUID;
    notification_count INTEGER := 0;
    alert_count INTEGER := 0;
BEGIN
    -- Process each active watch list
    FOR watch_record IN 
        SELECT wl.*, np.email, np.email_enabled, np.line_enabled, np.push_enabled
        FROM hotel_watch_lists wl
        JOIN notification_preferences np ON wl.user_id = np.user_id
        WHERE wl.is_active = true 
        AND wl.expires_at > NOW()
        AND (wl.last_checked IS NULL OR wl.last_checked < NOW() - INTERVAL '5 minutes')
    LOOP
        -- Check for availability matching criteria
        FOR alert_id IN
            SELECT DISTINCT aa.id
            FROM availability_alerts aa
            JOIN rooms r ON aa.room_id = r.id
            WHERE aa.hotel_id = watch_record.hotel_id
            AND aa.available_date BETWEEN watch_record.check_in_date AND watch_record.check_out_date
            AND aa.current_price <= COALESCE(watch_record.max_price_per_night, aa.current_price)
            AND r.capacity BETWEEN watch_record.min_capacity AND watch_record.max_capacity
            AND (watch_record.room_types IS NULL OR r.room_type = ANY(watch_record.room_types))
            AND aa.is_processed = false
            AND aa.expires_at > NOW()
        LOOP
            alert_count := alert_count + 1;
            
            -- Queue notifications for enabled channels
            IF watch_record.email_enabled THEN
                INSERT INTO notification_queue (user_id, watch_list_id, alert_id, channel, priority_score, notification_data)
                SELECT 
                    watch_record.user_id,
                    watch_record.id,
                    alert_id,
                    'email',
                    calculate_notification_priority(aa.urgency_level, aa.discount_percentage, watch_record.priority_level, aa.is_luxury_suite, EXTRACT(EPOCH FROM (aa.expires_at - NOW()))/3600),
                    jsonb_build_object(
                        'type', 'luxury_availability',
                        'hotel_name', h.name,
                        'room_type', r.room_type,
                        'price', aa.current_price,
                        'discount', aa.discount_percentage,
                        'check_in', watch_record.check_in_date,
                        'check_out', watch_record.check_out_date
                    )
                FROM availability_alerts aa
                JOIN hotels h ON aa.hotel_id = h.id
                JOIN rooms r ON aa.room_id = r.id
                WHERE aa.id = alert_id;
                
                notification_count := notification_count + 1;
            END IF;
            
            -- Mark alert as processed
            UPDATE availability_alerts SET 
                is_processed = true,
                processed_at = NOW(),
                notification_count = notification_count + 1
            WHERE id = alert_id;
        END LOOP;
        
        -- Update last checked timestamp
        UPDATE hotel_watch_lists SET last_checked = NOW() WHERE id = watch_record.id;
    END LOOP;
    
    RETURN QUERY SELECT alert_count, notification_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create alerts when availability changes
CREATE OR REPLACE FUNCTION trigger_availability_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is a significant availability change
    IF (NEW.available_count > 0 AND (OLD.available_count = 0 OR OLD IS NULL)) OR
       (NEW.price < OLD.price * 0.9) THEN -- 10% price drop
        
        INSERT INTO availability_alerts (
            hotel_id, room_id, available_date, available_rooms,
            original_price, current_price, alert_type, urgency_level,
            expires_at, is_luxury_suite, has_premium_amenities
        )
        SELECT 
            h.id, NEW.room_id, NEW.date, NEW.available_count,
            COALESCE(OLD.price, NEW.price), NEW.price,
            CASE 
                WHEN NEW.available_count > 0 AND (OLD.available_count = 0 OR OLD IS NULL) THEN 'new_availability'
                WHEN NEW.price < OLD.price * 0.9 THEN 'price_drop'
                ELSE 'update'
            END,
            CASE 
                WHEN r.room_type ILIKE '%suite%' THEN 8
                WHEN r.room_type ILIKE '%deluxe%' THEN 7
                ELSE 5
            END,
            NOW() + INTERVAL '24 hours',
            r.room_type ILIKE '%suite%',
            (r.base_price > 20000) -- Premium if over 20,000 JPY
        FROM rooms r
        JOIN hotels h ON r.hotel_id = h.id
        WHERE r.id = NEW.room_id
        ON CONFLICT (hotel_id, room_id, available_date, alert_type) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on availability table
CREATE TRIGGER availability_alert_trigger
    AFTER INSERT OR UPDATE ON availability
    FOR EACH ROW
    EXECUTE FUNCTION trigger_availability_alert();

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_notification_data()
RETURNS void AS $$
BEGIN
    -- Delete old notification history (older than 90 days)
    DELETE FROM notification_history 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete processed alerts (older than 7 days)
    DELETE FROM availability_alerts 
    WHERE is_processed = true AND processed_at < NOW() - INTERVAL '7 days';
    
    -- Delete expired watch lists
    DELETE FROM hotel_watch_lists 
    WHERE expires_at < NOW() OR check_out_date < CURRENT_DATE;
    
    -- Delete old notification queue items
    DELETE FROM notification_queue 
    WHERE status IN ('sent', 'failed', 'cancelled') 
    AND processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (to be called by cron job)
COMMENT ON FUNCTION cleanup_notification_data() IS 'Call this function daily to cleanup old notification data';

-- Grant permissions to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO hotelbooking_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON hotel_watch_lists TO hotelbooking_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_history TO hotelbooking_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON availability_alerts TO hotelbooking_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_queue TO hotelbooking_app;

GRANT EXECUTE ON FUNCTION calculate_notification_priority(INTEGER, DECIMAL, INTEGER, BOOLEAN, INTEGER) TO hotelbooking_app;
GRANT EXECUTE ON FUNCTION check_availability_alerts() TO hotelbooking_app;
GRANT EXECUTE ON FUNCTION cleanup_notification_data() TO hotelbooking_app;