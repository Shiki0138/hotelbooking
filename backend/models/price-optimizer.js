// Dynamic price optimization and caching strategy
const { Pool } = require('pg');
const { redisClient, CACHE_KEYS, CACHE_TTL } = require('../cache/redis-config');

class PriceOptimizer {
  constructor() {
    this.pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'lastminutestay',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 10
    });
    
    // Price calculation rules
    this.LAST_MINUTE_THRESHOLDS = {
      HOURS_24: { hours: 24, discount: 0.15 },    // 15% off within 24 hours
      HOURS_12: { hours: 12, discount: 0.25 },    // 25% off within 12 hours
      HOURS_6: { hours: 6, discount: 0.35 },      // 35% off within 6 hours
      HOURS_3: { hours: 3, discount: 0.45 }       // 45% off within 3 hours
    };
    
    // Start background price updater
    this.startPriceUpdater();
  }

  // Background job to update last-minute prices
  startPriceUpdater() {
    setInterval(async () => {
      await this.updateLastMinutePrices();
    }, 60000); // Every minute
  }

  // Calculate dynamic price based on time until check-in
  calculateDynamicPrice(basePrice, checkInDate, availableCount) {
    const now = new Date();
    const checkIn = new Date(checkInDate);
    const hoursUntilCheckIn = (checkIn - now) / (1000 * 60 * 60);
    
    let discount = 0;
    
    // Apply last-minute discounts
    for (const [key, rule] of Object.entries(this.LAST_MINUTE_THRESHOLDS)) {
      if (hoursUntilCheckIn <= rule.hours) {
        discount = rule.discount;
      }
    }
    
    // Additional discount for low availability (encourages quick booking)
    if (availableCount === 1) {
      discount = Math.min(discount + 0.1, 0.5); // Max 50% off
    }
    
    // Calculate final price
    const finalPrice = basePrice * (1 - discount);
    
    return {
      originalPrice: basePrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      discount: discount,
      savingsAmount: Math.round((basePrice - finalPrice) * 100) / 100,
      urgencyLevel: this.getUrgencyLevel(hoursUntilCheckIn, availableCount)
    };
  }

  // Determine urgency level for UI display
  getUrgencyLevel(hoursUntilCheckIn, availableCount) {
    if (hoursUntilCheckIn <= 3 || availableCount === 1) {
      return 'critical';
    } else if (hoursUntilCheckIn <= 6 || availableCount <= 3) {
      return 'high';
    } else if (hoursUntilCheckIn <= 12) {
      return 'medium';
    } else if (hoursUntilCheckIn <= 24) {
      return 'low';
    }
    return 'none';
  }

  // Update last-minute prices in database
  async updateLastMinutePrices() {
    const updateQuery = `
      WITH price_updates AS (
        SELECT 
          a.id,
          a.room_id,
          a.date,
          a.price,
          EXTRACT(EPOCH FROM (a.date - NOW())) / 3600 AS hours_until,
          CASE
            WHEN EXTRACT(EPOCH FROM (a.date - NOW())) / 3600 <= 3 THEN 0.45
            WHEN EXTRACT(EPOCH FROM (a.date - NOW())) / 3600 <= 6 THEN 0.35
            WHEN EXTRACT(EPOCH FROM (a.date - NOW())) / 3600 <= 12 THEN 0.25
            WHEN EXTRACT(EPOCH FROM (a.date - NOW())) / 3600 <= 24 THEN 0.15
            ELSE 0
          END AS new_discount
        FROM availability a
        WHERE a.date >= CURRENT_DATE
          AND a.date <= CURRENT_DATE + INTERVAL '2 days'
          AND a.available_count > 0
      )
      UPDATE availability a
      SET 
        last_minute_discount = pu.new_discount,
        updated_at = NOW()
      FROM price_updates pu
      WHERE a.id = pu.id
        AND a.last_minute_discount != pu.new_discount
      RETURNING a.room_id, a.date, a.price, a.last_minute_discount
    `;
    
    const result = await this.pgPool.query(updateQuery);
    
    // Invalidate affected caches
    if (result.rows.length > 0) {
      await this.invalidatePriceCaches(result.rows);
    }
    
    return result.rows.length;
  }

  // Invalidate price caches for updated rooms
  async invalidatePriceCaches(updates) {
    const pipeline = redisClient.pipeline();
    
    // Group by hotel for efficient cache invalidation
    const hotelRoomMap = await this.getHotelRoomMapping(updates.map(u => u.room_id));
    
    updates.forEach(update => {
      const hotelId = hotelRoomMap[update.room_id];
      if (hotelId) {
        pipeline.del(CACHE_KEYS.PRICES(hotelId, update.date));
        pipeline.del(CACHE_KEYS.AVAILABILITY(hotelId, update.date));
      }
    });
    
    await pipeline.exec();
  }

  // Get hotel IDs for rooms
  async getHotelRoomMapping(roomIds) {
    const uniqueRoomIds = [...new Set(roomIds)];
    const result = await this.pgPool.query(
      'SELECT id, hotel_id FROM rooms WHERE id = ANY($1)',
      [uniqueRoomIds]
    );
    
    return result.rows.reduce((acc, row) => {
      acc[row.id] = row.hotel_id;
      return acc;
    }, {});
  }

  // Get best deals (highest discounts)
  async getBestDeals(limit = 10) {
    const cacheKey = 'deals:best';
    
    // Try cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const query = `
      SELECT DISTINCT ON (h.id)
        h.id AS hotel_id,
        h.name,
        h.city,
        h.rating,
        ST_Y(h.location::geometry) AS lat,
        ST_X(h.location::geometry) AS lng,
        r.room_type,
        a.date AS check_in_date,
        a.price AS original_price,
        a.price * (1 - a.last_minute_discount) AS discounted_price,
        a.last_minute_discount AS discount,
        a.available_count
      FROM hotels h
      INNER JOIN rooms r ON r.hotel_id = h.id
      INNER JOIN availability a ON a.room_id = r.id
      WHERE a.date >= CURRENT_DATE
        AND a.date <= CURRENT_DATE + INTERVAL '7 days'
        AND a.available_count > 0
        AND a.last_minute_discount > 0
      ORDER BY h.id, a.last_minute_discount DESC, a.price ASC
      LIMIT $1
    `;
    
    const result = await this.pgPool.query(query, [limit]);
    
    const deals = result.rows.map(row => ({
      hotelId: row.hotel_id,
      hotelName: row.name,
      city: row.city,
      rating: parseFloat(row.rating),
      location: { lat: row.lat, lng: row.lng },
      roomType: row.room_type,
      checkInDate: row.check_in_date,
      originalPrice: parseFloat(row.original_price),
      discountedPrice: parseFloat(row.discounted_price),
      discountPercentage: Math.round(row.discount * 100),
      savings: parseFloat(row.original_price) - parseFloat(row.discounted_price),
      availableRooms: row.available_count,
      urgencyLevel: this.getUrgencyLevel(
        (new Date(row.check_in_date) - new Date()) / (1000 * 60 * 60),
        row.available_count
      )
    }));
    
    // Cache for 5 minutes
    await redisClient.setex(cacheKey, 300, JSON.stringify(deals));
    
    return deals;
  }

  // Get price trends for a hotel
  async getPriceTrends(hotelId, days = 30) {
    const cacheKey = `trends:${hotelId}:${days}`;
    
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const query = `
      WITH daily_prices AS (
        SELECT 
          a.date,
          MIN(a.price * (1 - a.last_minute_discount)) AS min_price,
          AVG(a.price * (1 - a.last_minute_discount)) AS avg_price,
          MAX(a.price * (1 - a.last_minute_discount)) AS max_price,
          SUM(a.available_count) AS total_available
        FROM rooms r
        INNER JOIN availability a ON a.room_id = r.id
        WHERE r.hotel_id = $1
          AND a.date >= CURRENT_DATE
          AND a.date < CURRENT_DATE + INTERVAL '${days} days'
        GROUP BY a.date
        ORDER BY a.date
      )
      SELECT 
        date,
        min_price,
        avg_price,
        max_price,
        total_available,
        CASE 
          WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN 'weekend'
          ELSE 'weekday'
        END AS day_type
      FROM daily_prices
    `;
    
    const result = await this.pgPool.query(query, [hotelId]);
    
    const trends = {
      hotelId,
      period: days,
      data: result.rows.map(row => ({
        date: row.date,
        minPrice: parseFloat(row.min_price),
        avgPrice: parseFloat(row.avg_price),
        maxPrice: parseFloat(row.max_price),
        availability: row.total_available,
        dayType: row.day_type
      })),
      summary: this.calculateTrendSummary(result.rows)
    };
    
    // Cache for 1 hour
    await redisClient.setex(cacheKey, 3600, JSON.stringify(trends));
    
    return trends;
  }

  // Calculate price trend summary
  calculateTrendSummary(trendData) {
    if (trendData.length === 0) {
      return null;
    }
    
    const prices = trendData.map(d => d.avg_price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    const weekdayPrices = trendData
      .filter(d => d.day_type === 'weekday')
      .map(d => d.avg_price);
    const weekendPrices = trendData
      .filter(d => d.day_type === 'weekend')
      .map(d => d.avg_price);
    
    return {
      averagePrice: Math.round(avgPrice * 100) / 100,
      lowestPrice: Math.min(...prices),
      highestPrice: Math.max(...prices),
      weekdayAverage: weekdayPrices.length > 0 
        ? weekdayPrices.reduce((a, b) => a + b, 0) / weekdayPrices.length 
        : null,
      weekendAverage: weekendPrices.length > 0
        ? weekendPrices.reduce((a, b) => a + b, 0) / weekendPrices.length
        : null,
      bestDealDay: trendData.reduce((min, d) => 
        d.min_price < min.min_price ? d : min
      ).date
    };
  }

  // Smart price suggestion for revenue optimization
  async suggestOptimalPrice(roomId, date) {
    // Get historical booking data
    const historyQuery = `
      SELECT 
        COUNT(*) AS booking_count,
        AVG(total_price / (check_out - check_in)) AS avg_daily_rate
      FROM bookings
      WHERE room_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
        AND status = 'confirmed'
    `;
    
    const history = await this.pgPool.query(historyQuery, [roomId]);
    
    // Get competitor prices (similar rooms in same area)
    const competitorQuery = `
      SELECT 
        AVG(a.price) AS avg_competitor_price,
        STDDEV(a.price) AS price_variance
      FROM rooms r1
      INNER JOIN rooms r2 ON r1.hotel_id != r2.hotel_id
        AND r1.room_type = r2.room_type
        AND r1.capacity = r2.capacity
      INNER JOIN hotels h1 ON h1.id = r1.hotel_id
      INNER JOIN hotels h2 ON h2.id = r2.hotel_id
      INNER JOIN availability a ON a.room_id = r2.id
      WHERE r1.id = $1
        AND a.date = $2
        AND ST_DWithin(h1.location, h2.location, 5000) -- 5km radius
    `;
    
    const competitors = await this.pgPool.query(competitorQuery, [roomId, date]);
    
    // Calculate suggested price
    const historicalRate = history.rows[0]?.avg_daily_rate || 100;
    const competitorAvg = competitors.rows[0]?.avg_competitor_price || historicalRate;
    
    // Price slightly below competitors for quick booking
    const suggestedPrice = competitorAvg * 0.95;
    
    return {
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      historicalAverage: Math.round(historicalRate * 100) / 100,
      competitorAverage: Math.round(competitorAvg * 100) / 100,
      bookingVelocity: history.rows[0]?.booking_count || 0,
      confidence: this.calculatePriceConfidence(history.rows[0], competitors.rows[0])
    };
  }

  // Calculate confidence level for price suggestion
  calculatePriceConfidence(historyData, competitorData) {
    let confidence = 0;
    
    if (historyData?.booking_count > 10) confidence += 40;
    else if (historyData?.booking_count > 5) confidence += 20;
    
    if (competitorData?.avg_competitor_price) confidence += 30;
    
    if (competitorData?.price_variance < 20) confidence += 30;
    else if (competitorData?.price_variance < 50) confidence += 15;
    
    return Math.min(confidence, 100);
  }
}

module.exports = PriceOptimizer;