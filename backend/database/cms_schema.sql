-- Content Management System (CMS) Schema
-- Created: 2025-07-09

-- CMS users table (for hotel managers and content editors)
CREATE TABLE IF NOT EXISTS cms_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_cms_role CHECK (role IN ('super_admin', 'hotel_manager', 'content_editor', 'viewer'))
);

-- CMS content pages (for hotel descriptions, policies, etc.)
CREATE TABLE IF NOT EXISTS cms_pages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    meta_description TEXT,
    meta_keywords TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    author_id UUID NOT NULL REFERENCES cms_users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_page_status CHECK (status IN ('draft', 'published', 'archived')),
    UNIQUE(hotel_id, slug)
);

-- CMS media library
CREATE TABLE IF NOT EXISTS cms_media (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),
    caption TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_by UUID NOT NULL REFERENCES cms_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CMS content blocks (reusable content components)
CREATE TABLE IF NOT EXISTS cms_blocks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    block_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES cms_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_block_type CHECK (block_type IN ('hero', 'gallery', 'amenities', 'policies', 'faq', 'testimonial', 'custom'))
);

-- CMS audit log
CREATE TABLE IF NOT EXISTS cms_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES cms_users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_cms_users_role ON cms_users(role);
CREATE INDEX idx_cms_users_hotel ON cms_users(hotel_id);
CREATE INDEX idx_cms_pages_hotel ON cms_pages(hotel_id);
CREATE INDEX idx_cms_pages_status ON cms_pages(status);
CREATE INDEX idx_cms_media_hotel ON cms_media(hotel_id);
CREATE INDEX idx_cms_blocks_hotel ON cms_blocks(hotel_id);
CREATE INDEX idx_cms_audit_user ON cms_audit_log(user_id);
CREATE INDEX idx_cms_audit_entity ON cms_audit_log(entity_type, entity_id);

-- Triggers
CREATE TRIGGER update_cms_users_updated_at BEFORE UPDATE ON cms_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_pages_updated_at BEFORE UPDATE ON cms_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_blocks_updated_at BEFORE UPDATE ON cms_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE cms_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_audit_log ENABLE ROW LEVEL SECURITY;

-- CMS user policies
CREATE POLICY "CMS users can view their own profile" ON cms_users
    FOR SELECT USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM cms_users cu WHERE cu.user_id = auth.uid() AND cu.role IN ('super_admin')
    ));

-- CMS pages policies
CREATE POLICY "Published pages are public" ON cms_pages
    FOR SELECT USING (status = 'published');

CREATE POLICY "CMS users can manage hotel pages" ON cms_pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cms_users cu 
            WHERE cu.user_id = auth.uid() 
            AND cu.is_active = true
            AND (cu.role = 'super_admin' OR (cu.hotel_id = cms_pages.hotel_id AND cu.role IN ('hotel_manager', 'content_editor')))
        )
    );

-- Media policies
CREATE POLICY "Public media access" ON cms_media
    FOR SELECT USING (true);

CREATE POLICY "CMS users can manage media" ON cms_media
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM cms_users cu 
            WHERE cu.user_id = auth.uid() 
            AND cu.is_active = true
            AND (cu.role = 'super_admin' OR (cu.hotel_id = cms_media.hotel_id AND cu.role IN ('hotel_manager', 'content_editor')))
        )
    );