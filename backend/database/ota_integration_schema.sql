-- OTA (Online Travel Agency) Integration Schema
-- Created: 2025-07-09

-- OTA providers configuration
CREATE TABLE IF NOT EXISTS ota_providers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    provider_code VARCHAR(50) NOT NULL UNIQUE,
    api_endpoint TEXT NOT NULL,
    api_version VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    rate_limit INTEGER DEFAULT 100, -- requests per minute
    credentials JSONB, -- encrypted credentials
    configuration JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hotel OTA mappings
CREATE TABLE IF NOT EXISTS hotel_ota_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES ota_providers(id) ON DELETE CASCADE,
    external_hotel_id VARCHAR(255) NOT NULL,
    external_hotel_name VARCHAR(255),
    mapping_confidence DECIMAL(3,2) DEFAULT 1.0,
    is_verified BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, provider_id)
);

-- Room OTA mappings
CREATE TABLE IF NOT EXISTS room_ota_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES ota_providers(id) ON DELETE CASCADE,
    hotel_mapping_id UUID NOT NULL REFERENCES hotel_ota_mappings(id) ON DELETE CASCADE,
    external_room_id VARCHAR(255) NOT NULL,
    external_room_type VARCHAR(255),
    mapping_rules JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, provider_id)
);

-- OTA sync jobs
CREATE TABLE IF NOT EXISTS ota_sync_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES ota_providers(id),
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    parameters JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_job_type CHECK (job_type IN ('inventory_sync', 'rate_sync', 'booking_sync', 'availability_sync')),
    CONSTRAINT valid_job_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

-- OTA inventory cache
CREATE TABLE IF NOT EXISTS ota_inventory_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES ota_providers(id),
    hotel_mapping_id UUID NOT NULL REFERENCES hotel_ota_mappings(id),
    room_mapping_id UUID REFERENCES room_ota_mappings(id),
    date DATE NOT NULL,
    availability INTEGER NOT NULL DEFAULT 0,
    rate DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'JPY',
    rate_plan_code VARCHAR(100),
    restrictions JSONB DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, room_mapping_id, date, rate_plan_code)
);

-- OTA bookings (external bookings imported from OTAs)
CREATE TABLE IF NOT EXISTS ota_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES ota_providers(id),
    external_booking_id VARCHAR(255) NOT NULL,
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    room_id UUID REFERENCES rooms(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    guests_count INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'JPY',
    booking_status VARCHAR(50) NOT NULL,
    raw_booking_data JSONB NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider_id, external_booking_id)
);

-- OTA API logs
CREATE TABLE IF NOT EXISTS ota_api_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES ota_providers(id),
    request_type VARCHAR(50) NOT NULL,
    request_url TEXT NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_hotel_ota_mappings_hotel ON hotel_ota_mappings(hotel_id);
CREATE INDEX idx_hotel_ota_mappings_provider ON hotel_ota_mappings(provider_id);
CREATE INDEX idx_room_ota_mappings_room ON room_ota_mappings(room_id);
CREATE INDEX idx_ota_sync_jobs_provider ON ota_sync_jobs(provider_id);
CREATE INDEX idx_ota_sync_jobs_status ON ota_sync_jobs(status);
CREATE INDEX idx_ota_inventory_cache_date ON ota_inventory_cache(date);
CREATE INDEX idx_ota_inventory_cache_mapping ON ota_inventory_cache(hotel_mapping_id, room_mapping_id);
CREATE INDEX idx_ota_bookings_dates ON ota_bookings(check_in_date, check_out_date);
CREATE INDEX idx_ota_bookings_hotel ON ota_bookings(hotel_id);
CREATE INDEX idx_ota_api_logs_provider ON ota_api_logs(provider_id, created_at);

-- Triggers
CREATE TRIGGER update_ota_providers_updated_at BEFORE UPDATE ON ota_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_ota_mappings_updated_at BEFORE UPDATE ON hotel_ota_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_ota_mappings_updated_at BEFORE UPDATE ON room_ota_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ota_inventory_cache_updated_at BEFORE UPDATE ON ota_inventory_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ota_bookings_updated_at BEFORE UPDATE ON ota_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE ota_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_ota_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_ota_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_inventory_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_api_logs ENABLE ROW LEVEL SECURITY;

-- Policies (admin only access for OTA configuration)
CREATE POLICY "Admin only access to OTA providers" ON ota_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cms_users cu 
            WHERE cu.user_id = auth.uid() 
            AND cu.role = 'super_admin'
            AND cu.is_active = true
        )
    );

-- Hotel managers can view their OTA mappings
CREATE POLICY "Hotel managers can view OTA mappings" ON hotel_ota_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cms_users cu 
            WHERE cu.user_id = auth.uid() 
            AND cu.is_active = true
            AND (cu.role = 'super_admin' OR (cu.hotel_id = hotel_ota_mappings.hotel_id AND cu.role = 'hotel_manager'))
        )
    );