-- Query optimization for LastMinuteStay database
-- Performance improvements for 50% speed increase

-- 1. Add missing indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_city_rating ON hotels(city, rating DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_created_at ON hotels(created_at DESC);

-- Composite index for location + rating queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hotels_location_rating 
ON hotels USING GIST(location) 
INCLUDE (rating, name, amenities);

-- 2. Optimize availability queries with partial indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_availability_future_dates 
ON availability(date, room_id, available_count) 
WHERE date >= CURRENT_DATE AND available_count > 0;

-- Index for last-minute deals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_availability_discount 
ON availability(last_minute_discount DESC, date) 
WHERE last_minute_discount > 0 AND date >= CURRENT_DATE;

-- 3. Optimize room queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_hotel_type 
ON rooms(hotel_id, room_type, capacity);

-- 4. Booking performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_dates 
ON bookings(check_in, check_out) 
WHERE status = 'confirmed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_email 
ON bookings(guest_email) 
WHERE status = 'confirmed';

-- 5. Materialized view for popular hotel searches
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_hotels AS
SELECT 
    h.id,
    h.name,
    h.city,
    h.rating,
    h.location,
    h.amenities,
    COUNT(DISTINCT b.id) as booking_count,
    AVG(a.price * (1 - a.last_minute_discount)) as avg_price
FROM hotels h
LEFT JOIN rooms r ON r.hotel_id = h.id
LEFT JOIN bookings b ON b.room_id = r.id 
    AND b.created_at >= NOW() - INTERVAL '30 days'
    AND b.status = 'confirmed'
LEFT JOIN availability a ON a.room_id = r.id 
    AND a.date >= CURRENT_DATE 
    AND a.date < CURRENT_DATE + INTERVAL '7 days'
GROUP BY h.id, h.name, h.city, h.rating, h.location, h.amenities
ORDER BY booking_count DESC, h.rating DESC;

CREATE UNIQUE INDEX idx_mv_popular_hotels_id ON mv_popular_hotels(id);
CREATE INDEX idx_mv_popular_hotels_city ON mv_popular_hotels(city);

-- 6. Query performance analysis
CREATE OR REPLACE FUNCTION analyze_slow_queries()
RETURNS TABLE (
    query_hash bigint,
    sample_query text,
    total_calls bigint,
    mean_time_ms numeric,
    max_time_ms numeric,
    total_time_ms numeric
) AS $$
BEGIN
    -- Enable pg_stat_statements if not already enabled
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        CREATE EXTENSION pg_stat_statements;
    END IF;
    
    RETURN QUERY
    SELECT 
        queryid,
        query,
        calls,
        round(mean_exec_time::numeric, 2),
        round(max_exec_time::numeric, 2),
        round(total_exec_time::numeric, 2)
    FROM pg_stat_statements
    WHERE mean_exec_time > 50 -- Queries taking more than 50ms
    ORDER BY mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- 7. Optimized search function with query hints
CREATE OR REPLACE FUNCTION search_hotels_optimized(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km INTEGER,
    p_check_in DATE,
    p_check_out DATE,
    p_min_rating DECIMAL DEFAULT 0,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    hotel_id INTEGER,
    hotel_name VARCHAR,
    distance_km DOUBLE PRECISION,
    rating DECIMAL,
    min_price DECIMAL,
    available_rooms BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH nearby_hotels AS (
        SELECT 
            h.id,
            h.name,
            h.rating,
            ST_Distance(h.location, ST_MakePoint(p_lng, p_lat)::geography) / 1000 AS distance
        FROM hotels h
        WHERE ST_DWithin(
            h.location,
            ST_MakePoint(p_lng, p_lat)::geography,
            p_radius_km * 1000
        )
        AND h.rating >= p_min_rating
    ),
    hotel_availability AS (
        SELECT 
            r.hotel_id,
            MIN(a.price * (1 - COALESCE(a.last_minute_discount, 0))) AS min_price,
            COUNT(DISTINCT r.id) AS available_room_count
        FROM rooms r
        INNER JOIN availability a ON a.room_id = r.id
        WHERE r.hotel_id IN (SELECT id FROM nearby_hotels)
            AND a.date >= p_check_in
            AND a.date < p_check_out
            AND a.available_count > 0
        GROUP BY r.hotel_id
        HAVING COUNT(DISTINCT a.date) = p_check_out - p_check_in
    )
    SELECT 
        nh.id,
        nh.name,
        nh.distance,
        nh.rating,
        ha.min_price,
        ha.available_room_count
    FROM nearby_hotels nh
    INNER JOIN hotel_availability ha ON ha.hotel_id = nh.id
    ORDER BY nh.distance ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 8. Vacuum and analyze scheduling
CREATE OR REPLACE FUNCTION schedule_maintenance()
RETURNS void AS $$
BEGIN
    -- Analyze frequently updated tables
    ANALYZE availability;
    ANALYZE bookings;
    
    -- Vacuum tables with high update frequency
    VACUUM (ANALYZE) availability;
    VACUUM (ANALYZE) bookings;
    
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_hotels;
END;
$$ LANGUAGE plpgsql;

-- 9. Connection pooling recommendations
COMMENT ON DATABASE lastminutestay IS 'Recommended settings:
- max_connections = 200
- shared_buffers = 256MB
- effective_cache_size = 1GB
- work_mem = 4MB
- maintenance_work_mem = 64MB
- random_page_cost = 1.1 (for SSD)
- effective_io_concurrency = 200
- max_parallel_workers_per_gather = 2';

-- 10. Query plan monitoring
CREATE OR REPLACE FUNCTION log_expensive_queries()
RETURNS trigger AS $$
BEGIN
    IF NEW.total_exec_time > 1000 THEN -- Log queries taking more than 1 second
        INSERT INTO query_performance_log (
            query_hash,
            query_text,
            execution_time_ms,
            logged_at
        ) VALUES (
            NEW.queryid,
            NEW.query,
            NEW.total_exec_time,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;