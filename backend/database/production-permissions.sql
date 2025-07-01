-- Production Database Permissions Setup
-- This script creates secure database users with minimal privileges
-- Following the principle of least privilege for maximum security

-- Cleanup existing users (only for initial setup)
-- DROP USER IF EXISTS hotelbooking_app;
-- DROP USER IF EXISTS hotelbooking_readonly;
-- DROP USER IF EXISTS hotelbooking_admin;
-- DROP USER IF EXISTS hotelbooking_backup;
-- DROP USER IF EXISTS hotelbooking_monitor;

-- Create production application user (minimal privileges)
CREATE USER hotelbooking_app WITH PASSWORD 'CHANGE_THIS_SECURE_PASSWORD_APP';
GRANT CONNECT ON DATABASE lastminutestay TO hotelbooking_app;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO hotelbooking_app;

-- Grant table-specific permissions (no CREATE, DROP, ALTER)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hotelbooking_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hotelbooking_app;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION find_nearby_hotels(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO hotelbooking_app;
GRANT EXECUTE ON FUNCTION update_availability_on_booking() TO hotelbooking_app;

-- Create read-only user for reporting/analytics
CREATE USER hotelbooking_readonly WITH PASSWORD 'CHANGE_THIS_SECURE_PASSWORD_READONLY';
GRANT CONNECT ON DATABASE lastminutestay TO hotelbooking_readonly;
GRANT USAGE ON SCHEMA public TO hotelbooking_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO hotelbooking_readonly;

-- Create admin user for migrations (limited usage)
CREATE USER hotelbooking_admin WITH PASSWORD 'CHANGE_THIS_SECURE_PASSWORD_ADMIN';
GRANT CONNECT ON DATABASE lastminutestay TO hotelbooking_admin;
GRANT ALL PRIVILEGES ON DATABASE lastminutestay TO hotelbooking_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO hotelbooking_admin;

-- Create backup user (for automated backups)
CREATE USER hotelbooking_backup WITH PASSWORD 'CHANGE_THIS_SECURE_PASSWORD_BACKUP';
GRANT CONNECT ON DATABASE lastminutestay TO hotelbooking_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO hotelbooking_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO hotelbooking_backup;

-- Create monitoring user (for health checks)
CREATE USER hotelbooking_monitor WITH PASSWORD 'CHANGE_THIS_SECURE_PASSWORD_MONITOR';
GRANT CONNECT ON DATABASE lastminutestay TO hotelbooking_monitor;
GRANT USAGE ON SCHEMA public TO hotelbooking_monitor;
GRANT SELECT ON pg_stat_database TO hotelbooking_monitor;
GRANT SELECT ON pg_stat_user_tables TO hotelbooking_monitor;
GRANT SELECT ON pg_stat_activity TO hotelbooking_monitor;

-- Set connection limits
ALTER USER hotelbooking_app CONNECTION LIMIT 100;
ALTER USER hotelbooking_readonly CONNECTION LIMIT 20;
ALTER USER hotelbooking_admin CONNECTION LIMIT 5;
ALTER USER hotelbooking_backup CONNECTION LIMIT 2;
ALTER USER hotelbooking_monitor CONNECTION LIMIT 5;

-- Set statement timeouts
ALTER USER hotelbooking_app SET statement_timeout = '30s';
ALTER USER hotelbooking_readonly SET statement_timeout = '60s';
ALTER USER hotelbooking_admin SET statement_timeout = '300s';
ALTER USER hotelbooking_backup SET statement_timeout = '0';
ALTER USER hotelbooking_monitor SET statement_timeout = '5s';

-- Row Level Security (RLS) for multi-tenant scenarios
-- Enable RLS on sensitive tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policy for bookings (users can only see their own bookings)
CREATE POLICY booking_isolation ON bookings
    FOR ALL
    TO hotelbooking_app
    USING (guest_email = current_setting('app.current_user_email', true));

-- Audit logging setup
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    user_name VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    row_data JSONB,
    changed_fields JSONB
);

-- Audit function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, user_name, row_data)
        VALUES (TG_TABLE_NAME, TG_OP, current_user, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, user_name, row_data, changed_fields)
        VALUES (TG_TABLE_NAME, TG_OP, current_user, row_to_json(NEW), 
                jsonb_object_agg(key, value) 
                FROM jsonb_each(to_jsonb(NEW)) AS n(key, value)
                WHERE NOT EXISTS (
                    SELECT 1 FROM jsonb_each(to_jsonb(OLD)) AS o(key, value)
                    WHERE o.key = n.key AND o.value = n.value
                ));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, user_name, row_data)
        VALUES (TG_TABLE_NAME, TG_OP, current_user, row_to_json(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_bookings
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_hotels
    AFTER INSERT OR UPDATE OR DELETE ON hotels
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Grant permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hotelbooking_app;
    
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON TABLES TO hotelbooking_readonly;
    
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON TABLES TO hotelbooking_backup;

-- Performance optimization settings
ALTER DATABASE lastminutestay SET random_page_cost = 1.1;
ALTER DATABASE lastminutestay SET effective_cache_size = '24GB';
ALTER DATABASE lastminutestay SET shared_buffers = '8GB';
ALTER DATABASE lastminutestay SET work_mem = '64MB';
ALTER DATABASE lastminutestay SET maintenance_work_mem = '2GB';

-- Connection pooling recommendations
COMMENT ON DATABASE lastminutestay IS 'Production database for Hotel Booking System. Use connection pooling with max_connections=100 for app user.';

-- Security notes
COMMENT ON USER hotelbooking_app IS 'Application user - Use with connection pooling. Max pool size: 100';
COMMENT ON USER hotelbooking_readonly IS 'Read-only user for reporting and analytics';
COMMENT ON USER hotelbooking_admin IS 'Admin user - Use only for migrations and maintenance';
COMMENT ON USER hotelbooking_backup IS 'Backup user - Automated backup processes only';
COMMENT ON USER hotelbooking_monitor IS 'Monitoring user - Health checks and metrics only';