-- Group Booking and Corporate Accounts Schema
-- Created: 2025-07-09

-- Corporate accounts
CREATE TABLE IF NOT EXISTS corporate_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL,
    tax_id VARCHAR(100),
    billing_address JSONB NOT NULL,
    primary_contact_name VARCHAR(255) NOT NULL,
    primary_contact_email VARCHAR(255) NOT NULL,
    primary_contact_phone VARCHAR(50),
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- days
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Corporate account users
CREATE TABLE IF NOT EXISTS corporate_account_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    booking_approval_limit DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_corporate_role CHECK (role IN ('admin', 'manager', 'employee')),
    UNIQUE(corporate_account_id, user_id)
);

-- Group bookings
CREATE TABLE IF NOT EXISTS group_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_booking_number VARCHAR(20) UNIQUE NOT NULL,
    corporate_account_id UUID REFERENCES corporate_accounts(id),
    organizer_user_id UUID NOT NULL REFERENCES auth.users(id),
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    group_name VARCHAR(255) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_rooms INTEGER NOT NULL,
    total_guests INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'inquiry',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(12, 2),
    deposit_amount DECIMAL(10, 2),
    deposit_paid BOOLEAN DEFAULT false,
    special_requirements TEXT,
    cancellation_policy JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_group_status CHECK (status IN ('inquiry', 'tentative', 'confirmed', 'cancelled', 'completed')),
    CONSTRAINT valid_group_payment_status CHECK (payment_status IN ('pending', 'deposit_paid', 'partially_paid', 'paid', 'refunded'))
);

-- Group booking rooms
CREATE TABLE IF NOT EXISTS group_booking_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_booking_id UUID NOT NULL REFERENCES group_bookings(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id),
    quantity INTEGER NOT NULL,
    rate_per_room DECIMAL(10, 2) NOT NULL,
    occupancy_per_room INTEGER NOT NULL,
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Group booking guests
CREATE TABLE IF NOT EXISTS group_booking_guests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_booking_id UUID NOT NULL REFERENCES group_bookings(id) ON DELETE CASCADE,
    room_assignment_id UUID REFERENCES group_booking_rooms(id),
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    special_needs TEXT,
    check_in_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_checkin_status CHECK (check_in_status IN ('pending', 'checked_in', 'checked_out', 'no_show'))
);

-- Corporate booking policies
CREATE TABLE IF NOT EXISTS corporate_booking_policies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
    policy_name VARCHAR(255) NOT NULL,
    policy_type VARCHAR(50) NOT NULL,
    rules JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_policy_type CHECK (policy_type IN ('budget', 'hotel_selection', 'room_type', 'approval_workflow'))
);

-- Corporate invoices
CREATE TABLE IF NOT EXISTS corporate_invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'pending', 'partially_paid', 'paid', 'overdue', 'cancelled'))
);

-- Corporate invoice items
CREATE TABLE IF NOT EXISTS corporate_invoice_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES corporate_invoices(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id),
    group_booking_id UUID REFERENCES group_bookings(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_corporate_account_users_account ON corporate_account_users(corporate_account_id);
CREATE INDEX idx_corporate_account_users_user ON corporate_account_users(user_id);
CREATE INDEX idx_group_bookings_corporate ON group_bookings(corporate_account_id);
CREATE INDEX idx_group_bookings_dates ON group_bookings(check_in_date, check_out_date);
CREATE INDEX idx_group_bookings_status ON group_bookings(status);
CREATE INDEX idx_group_booking_rooms_booking ON group_booking_rooms(group_booking_id);
CREATE INDEX idx_group_booking_guests_booking ON group_booking_guests(group_booking_id);
CREATE INDEX idx_corporate_policies_account ON corporate_booking_policies(corporate_account_id);
CREATE INDEX idx_corporate_invoices_account ON corporate_invoices(corporate_account_id);
CREATE INDEX idx_corporate_invoices_status ON corporate_invoices(status);

-- Triggers
CREATE TRIGGER update_corporate_accounts_updated_at BEFORE UPDATE ON corporate_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_corporate_account_users_updated_at BEFORE UPDATE ON corporate_account_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_bookings_updated_at BEFORE UPDATE ON group_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_booking_guests_updated_at BEFORE UPDATE ON group_booking_guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_corporate_booking_policies_updated_at BEFORE UPDATE ON corporate_booking_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_corporate_invoices_updated_at BEFORE UPDATE ON corporate_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate group booking number
CREATE OR REPLACE FUNCTION generate_group_booking_number()
RETURNS TRIGGER AS $$
DECLARE
    booking_num VARCHAR(20);
BEGIN
    booking_num := 'GRP' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    NEW.group_booking_number := booking_num;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generating group booking number
CREATE TRIGGER generate_group_booking_number_trigger
    BEFORE INSERT ON group_bookings
    FOR EACH ROW
    WHEN (NEW.group_booking_number IS NULL)
    EXECUTE FUNCTION generate_group_booking_number();

-- Row Level Security
ALTER TABLE corporate_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_booking_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_booking_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_booking_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_invoice_items ENABLE ROW LEVEL SECURITY;

-- Corporate account access policies
CREATE POLICY "Corporate admins can manage account" ON corporate_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM corporate_account_users cau
            WHERE cau.corporate_account_id = corporate_accounts.id
            AND cau.user_id = auth.uid()
            AND cau.role = 'admin'
            AND cau.is_active = true
        )
    );

-- Corporate users can view their group bookings
CREATE POLICY "Corporate users can view group bookings" ON group_bookings
    FOR SELECT USING (
        organizer_user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM corporate_account_users cau
            WHERE cau.corporate_account_id = group_bookings.corporate_account_id
            AND cau.user_id = auth.uid()
            AND cau.is_active = true
        )
    );