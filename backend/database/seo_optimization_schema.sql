-- SEO Optimization Schema
-- Created: 2025-07-09

-- SEO metadata for pages
CREATE TABLE IF NOT EXISTS seo_metadata (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    page_type VARCHAR(50) NOT NULL,
    page_identifier VARCHAR(255) NOT NULL,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    meta_description TEXT,
    meta_keywords TEXT[],
    canonical_url TEXT,
    og_title VARCHAR(255),
    og_description TEXT,
    og_image TEXT,
    twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
    twitter_title VARCHAR(255),
    twitter_description TEXT,
    twitter_image TEXT,
    structured_data JSONB DEFAULT '{}'::jsonb,
    custom_meta_tags JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_page_type CHECK (page_type IN ('home', 'hotel', 'room', 'location', 'search', 'booking', 'custom')),
    UNIQUE(page_type, page_identifier)
);

-- URL redirects management
CREATE TABLE IF NOT EXISTS seo_redirects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source_url TEXT NOT NULL UNIQUE,
    target_url TEXT NOT NULL,
    redirect_type INTEGER NOT NULL DEFAULT 301,
    is_active BOOLEAN DEFAULT true,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_redirect_type CHECK (redirect_type IN (301, 302, 307, 308))
);

-- Sitemap configuration
CREATE TABLE IF NOT EXISTS seo_sitemap_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    url_pattern TEXT NOT NULL,
    change_frequency VARCHAR(20) DEFAULT 'weekly',
    priority DECIMAL(2,1) DEFAULT 0.5,
    include_images BOOLEAN DEFAULT true,
    last_modified_source VARCHAR(50) DEFAULT 'updated_at',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_change_frequency CHECK (change_frequency IN ('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never')),
    CONSTRAINT valid_priority CHECK (priority >= 0 AND priority <= 1)
);

-- SEO content analysis
CREATE TABLE IF NOT EXISTS seo_content_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    page_url TEXT NOT NULL,
    analysis_date TIMESTAMP WITH TIME ZONE NOT NULL,
    title_length INTEGER,
    description_length INTEGER,
    h1_count INTEGER,
    h2_count INTEGER,
    image_count INTEGER,
    images_without_alt INTEGER,
    internal_links INTEGER,
    external_links INTEGER,
    word_count INTEGER,
    keyword_density JSONB DEFAULT '{}'::jsonb,
    issues JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    seo_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Search engine rankings tracking
CREATE TABLE IF NOT EXISTS seo_rankings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    search_engine VARCHAR(50) NOT NULL DEFAULT 'google',
    position INTEGER,
    previous_position INTEGER,
    best_position INTEGER,
    tracking_date DATE NOT NULL,
    location VARCHAR(100),
    device_type VARCHAR(20) DEFAULT 'desktop',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_search_engine CHECK (search_engine IN ('google', 'bing', 'yahoo')),
    CONSTRAINT valid_device_type CHECK (device_type IN ('desktop', 'mobile', 'tablet'))
);

-- Page performance metrics
CREATE TABLE IF NOT EXISTS seo_page_performance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    page_url TEXT NOT NULL,
    measurement_date DATE NOT NULL,
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2),
    average_time_on_page INTEGER, -- seconds
    exit_rate DECIMAL(5,2),
    page_load_time DECIMAL(6,3), -- seconds
    first_contentful_paint DECIMAL(6,3),
    largest_contentful_paint DECIMAL(6,3),
    cumulative_layout_shift DECIMAL(6,3),
    first_input_delay DECIMAL(6,3),
    time_to_interactive DECIMAL(6,3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_url, measurement_date)
);

-- Local SEO data
CREATE TABLE IF NOT EXISTS seo_local_listings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    platform VARCHAR(100) NOT NULL,
    listing_url TEXT,
    business_name VARCHAR(255) NOT NULL,
    business_address TEXT NOT NULL,
    business_phone VARCHAR(50),
    business_hours JSONB DEFAULT '{}'::jsonb,
    business_description TEXT,
    categories TEXT[],
    is_verified BOOLEAN DEFAULT false,
    rating DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_platform CHECK (platform IN ('google_my_business', 'bing_places', 'apple_maps', 'yelp', 'tripadvisor'))
);

-- Schema markup templates
CREATE TABLE IF NOT EXISTS seo_schema_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    schema_type VARCHAR(100) NOT NULL,
    template_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SEO experiments (A/B testing)
CREATE TABLE IF NOT EXISTS seo_experiments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    experiment_name VARCHAR(255) NOT NULL,
    page_type VARCHAR(50) NOT NULL,
    variant_a JSONB NOT NULL,
    variant_b JSONB NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    traffic_split DECIMAL(3,2) DEFAULT 0.50,
    winner VARCHAR(1),
    results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_winner CHECK (winner IN ('A', 'B'))
);

-- Indexes
CREATE INDEX idx_seo_metadata_page ON seo_metadata(page_type, page_identifier);
CREATE INDEX idx_seo_metadata_hotel ON seo_metadata(hotel_id);
CREATE INDEX idx_seo_redirects_source ON seo_redirects(source_url) WHERE is_active = true;
CREATE INDEX idx_seo_content_analysis_url ON seo_content_analysis(page_url);
CREATE INDEX idx_seo_content_analysis_date ON seo_content_analysis(analysis_date);
CREATE INDEX idx_seo_rankings_keyword ON seo_rankings(keyword);
CREATE INDEX idx_seo_rankings_date ON seo_rankings(tracking_date);
CREATE INDEX idx_seo_page_performance_url_date ON seo_page_performance(page_url, measurement_date);
CREATE INDEX idx_seo_local_listings_hotel ON seo_local_listings(hotel_id);
CREATE INDEX idx_seo_experiments_dates ON seo_experiments(start_date, end_date);

-- Triggers
CREATE TRIGGER update_seo_metadata_updated_at BEFORE UPDATE ON seo_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_redirects_updated_at BEFORE UPDATE ON seo_redirects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_sitemap_config_updated_at BEFORE UPDATE ON seo_sitemap_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_local_listings_updated_at BEFORE UPDATE ON seo_local_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_schema_templates_updated_at BEFORE UPDATE ON seo_schema_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_experiments_updated_at BEFORE UPDATE ON seo_experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE seo_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_sitemap_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_page_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_local_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_schema_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_experiments ENABLE ROW LEVEL SECURITY;

-- SEO data is viewable by CMS users
CREATE POLICY "CMS users can manage SEO data" ON seo_metadata
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cms_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.is_active = true
            AND cu.role IN ('super_admin', 'hotel_manager', 'content_editor')
        )
    );