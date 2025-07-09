-- Business Intelligence Dashboard Schema
-- Created: 2025-07-09

-- BI metrics aggregation tables
CREATE TABLE IF NOT EXISTS bi_daily_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    metric_date DATE NOT NULL,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    occupancy_rate DECIMAL(5, 2) DEFAULT 0,
    average_daily_rate DECIMAL(10, 2) DEFAULT 0,
    revenue_per_available_room DECIMAL(10, 2) DEFAULT 0,
    cancellation_rate DECIMAL(5, 2) DEFAULT 0,
    average_length_of_stay DECIMAL(5, 2) DEFAULT 0,
    direct_bookings INTEGER DEFAULT 0,
    ota_bookings INTEGER DEFAULT 0,
    corporate_bookings INTEGER DEFAULT 0,
    group_bookings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_date, hotel_id)
);

-- Revenue analytics
CREATE TABLE IF NOT EXISTS bi_revenue_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    room_revenue DECIMAL(12, 2) DEFAULT 0,
    additional_services_revenue DECIMAL(12, 2) DEFAULT 0,
    cancellation_fees DECIMAL(10, 2) DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    revenue_by_channel JSONB DEFAULT '{}'::jsonb,
    revenue_by_room_type JSONB DEFAULT '{}'::jsonb,
    year_over_year_growth DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_period_type CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'))
);

-- Guest analytics
CREATE TABLE IF NOT EXISTS bi_guest_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    analysis_date DATE NOT NULL,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    total_guests INTEGER DEFAULT 0,
    new_guests INTEGER DEFAULT 0,
    returning_guests INTEGER DEFAULT 0,
    guest_demographics JSONB DEFAULT '{}'::jsonb,
    guest_origins JSONB DEFAULT '{}'::jsonb,
    average_guest_rating DECIMAL(3, 2),
    guest_satisfaction_score DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Market insights
CREATE TABLE IF NOT EXISTS bi_market_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    insight_date DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    market_demand_index DECIMAL(5, 2),
    competitor_average_rate DECIMAL(10, 2),
    market_occupancy_rate DECIMAL(5, 2),
    demand_forecast JSONB DEFAULT '{}'::jsonb,
    seasonal_trends JSONB DEFAULT '{}'::jsonb,
    event_impact_analysis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance benchmarks
CREATE TABLE IF NOT EXISTS bi_performance_benchmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    benchmark_date DATE NOT NULL,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(12, 2) NOT NULL,
    industry_average DECIMAL(12, 2),
    percentile_rank INTEGER,
    trend VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_trend CHECK (trend IN ('improving', 'stable', 'declining'))
);

-- Forecasting models
CREATE TABLE IF NOT EXISTS bi_forecasting_models (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
    model_type VARCHAR(50) NOT NULL,
    forecast_date DATE NOT NULL,
    forecast_period INTEGER NOT NULL, -- days ahead
    predicted_occupancy DECIMAL(5, 2),
    predicted_adr DECIMAL(10, 2),
    predicted_revenue DECIMAL(12, 2),
    confidence_interval JSONB DEFAULT '{}'::jsonb,
    model_accuracy DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_model_type CHECK (model_type IN ('linear_regression', 'arima', 'neural_network', 'ensemble'))
);

-- Custom reports
CREATE TABLE IF NOT EXISTS bi_custom_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    created_by UUID NOT NULL REFERENCES cms_users(id),
    hotel_id UUID REFERENCES hotels(id),
    query_definition JSONB NOT NULL,
    visualization_config JSONB DEFAULT '{}'::jsonb,
    schedule_config JSONB DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_report_type CHECK (report_type IN ('revenue', 'occupancy', 'guest', 'marketing', 'custom'))
);

-- Report executions
CREATE TABLE IF NOT EXISTS bi_report_executions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES bi_custom_reports(id) ON DELETE CASCADE,
    executed_by UUID REFERENCES cms_users(id),
    execution_time TIMESTAMP WITH TIME ZONE NOT NULL,
    execution_duration_ms INTEGER,
    result_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- KPI definitions
CREATE TABLE IF NOT EXISTS bi_kpi_definitions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kpi_name VARCHAR(255) NOT NULL,
    kpi_category VARCHAR(100) NOT NULL,
    calculation_formula TEXT NOT NULL,
    target_value DECIMAL(12, 2),
    threshold_warning DECIMAL(12, 2),
    threshold_critical DECIMAL(12, 2),
    is_higher_better BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- KPI tracking
CREATE TABLE IF NOT EXISTS bi_kpi_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    kpi_id UUID NOT NULL REFERENCES bi_kpi_definitions(id),
    hotel_id UUID REFERENCES hotels(id),
    tracking_date DATE NOT NULL,
    actual_value DECIMAL(12, 2) NOT NULL,
    target_value DECIMAL(12, 2),
    variance_percentage DECIMAL(5, 2),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_kpi_status CHECK (status IN ('on_target', 'warning', 'critical', 'exceeded'))
);

-- Indexes
CREATE INDEX idx_bi_daily_metrics_date ON bi_daily_metrics(metric_date);
CREATE INDEX idx_bi_daily_metrics_hotel ON bi_daily_metrics(hotel_id);
CREATE INDEX idx_bi_revenue_analytics_period ON bi_revenue_analytics(period_start, period_end);
CREATE INDEX idx_bi_revenue_analytics_hotel ON bi_revenue_analytics(hotel_id);
CREATE INDEX idx_bi_guest_analytics_date ON bi_guest_analytics(analysis_date);
CREATE INDEX idx_bi_market_insights_date ON bi_market_insights(insight_date);
CREATE INDEX idx_bi_market_insights_location ON bi_market_insights(location);
CREATE INDEX idx_bi_performance_benchmarks_date ON bi_performance_benchmarks(benchmark_date);
CREATE INDEX idx_bi_forecasting_models_hotel ON bi_forecasting_models(hotel_id);
CREATE INDEX idx_bi_custom_reports_creator ON bi_custom_reports(created_by);
CREATE INDEX idx_bi_report_executions_report ON bi_report_executions(report_id);
CREATE INDEX idx_bi_kpi_tracking_date ON bi_kpi_tracking(tracking_date);

-- Triggers
CREATE TRIGGER update_bi_custom_reports_updated_at BEFORE UPDATE ON bi_custom_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bi_kpi_definitions_updated_at BEFORE UPDATE ON bi_kpi_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Materialized views for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS bi_monthly_summary AS
SELECT 
    DATE_TRUNC('month', metric_date) as month,
    hotel_id,
    SUM(total_bookings) as total_bookings,
    SUM(total_revenue) as total_revenue,
    AVG(occupancy_rate) as avg_occupancy_rate,
    AVG(average_daily_rate) as avg_daily_rate,
    AVG(revenue_per_available_room) as avg_revpar
FROM bi_daily_metrics
GROUP BY DATE_TRUNC('month', metric_date), hotel_id;

CREATE INDEX idx_bi_monthly_summary ON bi_monthly_summary(month, hotel_id);

-- Row Level Security
ALTER TABLE bi_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_revenue_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_guest_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_market_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_performance_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_forecasting_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi_kpi_tracking ENABLE ROW LEVEL SECURITY;

-- BI access policies
CREATE POLICY "Hotel managers can view their BI data" ON bi_daily_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cms_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.is_active = true
            AND (cu.role = 'super_admin' OR (cu.hotel_id = bi_daily_metrics.hotel_id AND cu.role IN ('hotel_manager')))
        )
    );