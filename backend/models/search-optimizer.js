// Search optimization layer for ultra-fast hotel queries
const { Pool } = require('pg');
const { cacheManager, CACHE_KEYS, CACHE_TTL } = require('../cache/redis-config');

class SearchOptimizer {
  constructor() {
    this.pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'lastminutestay',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  // Ultra-fast location-based search with multiple optimization layers
  async searchNearbyHotels(lat, lng, radiusKm = 5, checkIn, checkOut, filters = {}) {
    const cacheKey = CACHE_KEYS.SEARCH_RESULTS(lat, lng, radiusKm);
    
    // Try cache first
    const cached = await cacheManager.getOrSet(
      cacheKey,
      CACHE_TTL.SEARCH_RESULTS,
      async () => {
        // Use optimized PostGIS query
        const query = `
          WITH nearby_hotels AS (
            SELECT 
              h.id,
              h.name,
              h.rating,
              h.amenities,
              ST_Distance(h.location, ST_MakePoint($2, $1)::geography) / 1000 AS distance_km,
              ST_Y(h.location::geometry) AS lat,
              ST_X(h.location::geometry) AS lng
            FROM hotels h
            WHERE ST_DWithin(
              h.location,
              ST_MakePoint($2, $1)::geography,
              $3 * 1000
            )
            ${filters.minRating ? 'AND h.rating >= $4' : ''}
          )
          SELECT * FROM nearby_hotels
          ORDER BY 
            ${filters.sortBy === 'rating' ? 'rating DESC, distance_km ASC' : 'distance_km ASC'}
          LIMIT 50
        `;
        
        const params = [lat, lng, radiusKm];
        if (filters.minRating) params.push(filters.minRating);
        
        const result = await this.pgPool.query(query, params);
        return result.rows;
      }
    );
    
    // Enrich with availability data
    return await this.enrichWithAvailability(cached, checkIn, checkOut);
  }

  // Fast availability check with intelligent caching
  async enrichWithAvailability(hotels, checkIn, checkOut) {
    const hotelIds = hotels.map(h => h.id);
    
    // Batch fetch availability
    const availabilityMap = await this.batchCheckAvailability(hotelIds, checkIn, checkOut);
    
    // Merge availability data
    return hotels.map(hotel => ({
      ...hotel,
      availability: availabilityMap[hotel.id] || { available: false, minPrice: null }
    })).filter(h => h.availability.available);
  }

  // Batch availability check with Redis pipeline
  async batchCheckAvailability(hotelIds, checkIn, checkOut) {
    const dateKey = checkIn; // Simplified for MVP
    const cacheKeys = hotelIds.map(id => CACHE_KEYS.AVAILABILITY(id, dateKey));
    
    // Try batch get from cache
    const cached = await cacheManager.batchGet(cacheKeys);
    const missingIds = hotelIds.filter((id, index) => !cached[index]);
    
    if (missingIds.length === 0) {
      // All data in cache
      return hotelIds.reduce((acc, id, index) => {
        acc[id] = cached[index];
        return acc;
      }, {});
    }
    
    // Fetch missing data from database
    const query = `
      SELECT 
        r.hotel_id,
        MIN(a.price * (1 - a.last_minute_discount)) AS min_price,
        SUM(a.available_count) AS total_available
      FROM rooms r
      INNER JOIN availability a ON r.id = a.room_id
      WHERE r.hotel_id = ANY($1)
        AND a.date >= $2
        AND a.date < $3
        AND a.available_count > 0
      GROUP BY r.hotel_id
      HAVING COUNT(DISTINCT a.date) = $3::date - $2::date
    `;
    
    const result = await this.pgPool.query(query, [missingIds, checkIn, checkOut]);
    
    // Cache the fresh data
    const freshData = result.rows.reduce((acc, row) => {
      acc[row.hotel_id] = {
        available: true,
        minPrice: parseFloat(row.min_price),
        totalAvailable: parseInt(row.total_available)
      };
      return acc;
    }, {});
    
    // Cache missing data
    const cacheItems = missingIds.map(id => ({
      key: CACHE_KEYS.AVAILABILITY(id, dateKey),
      value: freshData[id] || { available: false, minPrice: null },
      ttl: CACHE_TTL.AVAILABILITY
    }));
    
    await cacheManager.batchSet(cacheItems);
    
    // Merge all data
    return hotelIds.reduce((acc, id, index) => {
      acc[id] = cached[index] || freshData[id] || { available: false, minPrice: null };
      return acc;
    }, {});
  }

  // Price optimization with dynamic caching
  async getOptimizedPrices(hotelId, checkIn, checkOut) {
    const dateKey = checkIn;
    const cacheKey = CACHE_KEYS.PRICES(hotelId, dateKey);
    
    return await cacheManager.getOrSet(
      cacheKey,
      CACHE_TTL.PRICES,
      async () => {
        const query = `
          SELECT 
            r.id AS room_id,
            r.room_type,
            r.capacity,
            ARRAY_AGG(
              JSON_BUILD_OBJECT(
                'date', a.date,
                'price', a.price * (1 - a.last_minute_discount),
                'discount', a.last_minute_discount,
                'available', a.available_count
              ) ORDER BY a.date
            ) AS price_calendar
          FROM rooms r
          INNER JOIN availability a ON r.id = a.room_id
          WHERE r.hotel_id = $1
            AND a.date >= $2
            AND a.date < $3
            AND a.available_count > 0
          GROUP BY r.id, r.room_type, r.capacity
          HAVING COUNT(DISTINCT a.date) = $3::date - $2::date
        `;
        
        const result = await this.pgPool.query(query, [hotelId, checkIn, checkOut]);
        
        return result.rows.map(row => ({
          roomId: row.room_id,
          roomType: row.room_type,
          capacity: row.capacity,
          totalPrice: row.price_calendar.reduce((sum, day) => sum + day.price, 0),
          priceBreakdown: row.price_calendar
        }));
      }
    );
  }

  // Popular locations for quick search
  async getPopularLocations() {
    return await cacheManager.getOrSet(
      CACHE_KEYS.POPULAR_LOCATIONS,
      CACHE_TTL.POPULAR_LOCATIONS,
      async () => {
        const query = `
          SELECT 
            city,
            COUNT(*) as hotel_count,
            AVG(rating) as avg_rating,
            ST_Y(ST_Centroid(ST_Collect(location::geometry))) AS center_lat,
            ST_X(ST_Centroid(ST_Collect(location::geometry))) AS center_lng
          FROM hotels
          GROUP BY city
          ORDER BY hotel_count DESC
          LIMIT 10
        `;
        
        const result = await this.pgPool.query(query);
        return result.rows;
      }
    );
  }

  // Create search index for text search
  async createSearchIndex() {
    // Create text search indexes
    await this.pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_hotels_name_trgm ON hotels USING gin(name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_hotels_city_trgm ON hotels USING gin(city gin_trgm_ops);
    `);
  }

  // Text-based hotel search
  async searchByText(searchTerm, limit = 20) {
    const query = `
      SELECT 
        id,
        name,
        city,
        rating,
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng,
        similarity(name, $1) AS name_similarity,
        similarity(city, $1) AS city_similarity
      FROM hotels
      WHERE name % $1 OR city % $1
      ORDER BY 
        GREATEST(similarity(name, $1), similarity(city, $1)) DESC,
        rating DESC
      LIMIT $2
    `;
    
    const result = await this.pgPool.query(query, [searchTerm, limit]);
    return result.rows;
  }
}

module.exports = SearchOptimizer;