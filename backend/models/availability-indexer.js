// Real-time availability indexing system
const { Pool } = require('pg');
const { redisClient, redisPubSub, CACHE_KEYS } = require('../cache/redis-config');
const EventEmitter = require('events');

class AvailabilityIndexer extends EventEmitter {
  constructor() {
    super();
    this.pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'lastminutestay',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 10
    });
    
    this.indexUpdateQueue = [];
    this.batchSize = 100;
    this.batchInterval = 1000; // 1 second
    
    this.startBatchProcessor();
    this.setupRealtimeSync();
  }

  // Batch processor for efficient index updates
  startBatchProcessor() {
    setInterval(async () => {
      if (this.indexUpdateQueue.length > 0) {
        const batch = this.indexUpdateQueue.splice(0, this.batchSize);
        await this.processBatch(batch);
      }
    }, this.batchInterval);
  }

  // Real-time sync with PostgreSQL LISTEN/NOTIFY
  async setupRealtimeSync() {
    const client = await this.pgPool.connect();
    
    // Listen for availability changes
    await client.query('LISTEN availability_changes');
    await client.query('LISTEN booking_changes');
    
    client.on('notification', async (msg) => {
      const payload = JSON.parse(msg.payload);
      await this.handleDatabaseChange(msg.channel, payload);
    });
    
    // Setup triggers in database
    await this.setupDatabaseTriggers();
  }

  // Database triggers for real-time updates
  async setupDatabaseTriggers() {
    const triggerSQL = `
      -- Trigger for availability changes
      CREATE OR REPLACE FUNCTION notify_availability_change()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM pg_notify(
          'availability_changes',
          json_build_object(
            'room_id', NEW.room_id,
            'date', NEW.date,
            'available_count', NEW.available_count,
            'price', NEW.price,
            'operation', TG_OP
          )::text
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS availability_change_trigger ON availability;
      CREATE TRIGGER availability_change_trigger
      AFTER INSERT OR UPDATE OR DELETE ON availability
      FOR EACH ROW EXECUTE FUNCTION notify_availability_change();

      -- Trigger for booking changes
      CREATE OR REPLACE FUNCTION notify_booking_change()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM pg_notify(
          'booking_changes',
          json_build_object(
            'room_id', NEW.room_id,
            'check_in', NEW.check_in,
            'check_out', NEW.check_out,
            'status', NEW.status,
            'operation', TG_OP
          )::text
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS booking_change_trigger ON bookings;
      CREATE TRIGGER booking_change_trigger
      AFTER INSERT OR UPDATE ON bookings
      FOR EACH ROW EXECUTE FUNCTION notify_booking_change();
    `;
    
    await this.pgPool.query(triggerSQL);
  }

  // Handle real-time database changes
  async handleDatabaseChange(channel, payload) {
    if (channel === 'availability_changes') {
      await this.updateAvailabilityIndex(payload);
    } else if (channel === 'booking_changes') {
      await this.updateBookingIndex(payload);
    }
    
    // Publish to Redis for other services
    await redisPubSub.publish(`index:${channel}`, JSON.stringify(payload));
  }

  // Update availability index in Redis
  async updateAvailabilityIndex(change) {
    const { room_id, date, available_count, price } = change;
    
    // Get hotel_id for the room
    const hotelResult = await this.pgPool.query(
      'SELECT hotel_id FROM rooms WHERE id = $1',
      [room_id]
    );
    
    if (hotelResult.rows.length === 0) return;
    
    const hotelId = hotelResult.rows[0].hotel_id;
    
    // Update multiple index structures
    const pipeline = redisClient.pipeline();
    
    // 1. Date-based availability index
    const dateIndexKey = `idx:availability:${date}`;
    if (available_count > 0) {
      pipeline.zadd(dateIndexKey, price, `${hotelId}:${room_id}`);
    } else {
      pipeline.zrem(dateIndexKey, `${hotelId}:${room_id}`);
    }
    pipeline.expire(dateIndexKey, 86400); // 24 hours
    
    // 2. Hotel availability bitmap
    const hotelBitmapKey = `idx:hotel:${hotelId}:availability`;
    const dayOffset = Math.floor((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    if (dayOffset >= 0 && dayOffset < 365) {
      pipeline.setbit(hotelBitmapKey, dayOffset, available_count > 0 ? 1 : 0);
    }
    
    // 3. Price range index
    const priceRangeKey = `idx:price:${Math.floor(price / 50) * 50}`;
    if (available_count > 0) {
      pipeline.sadd(priceRangeKey, hotelId);
    }
    pipeline.expire(priceRangeKey, 3600); // 1 hour
    
    // 4. Invalidate caches
    pipeline.del(CACHE_KEYS.AVAILABILITY(hotelId, date));
    pipeline.del(CACHE_KEYS.PRICES(hotelId, date));
    
    await pipeline.exec();
    
    this.emit('index:updated', { type: 'availability', hotelId, date });
  }

  // Update booking-related indexes
  async updateBookingIndex(change) {
    const { room_id, check_in, check_out, status } = change;
    
    if (status !== 'confirmed') return;
    
    // Queue for batch processing
    this.indexUpdateQueue.push({
      type: 'booking',
      room_id,
      check_in,
      check_out
    });
  }

  // Process batch updates
  async processBatch(batch) {
    const bookingUpdates = batch.filter(u => u.type === 'booking');
    
    if (bookingUpdates.length > 0) {
      // Group by hotel for efficient processing
      const hotelGroups = await this.groupBookingsByHotel(bookingUpdates);
      
      for (const [hotelId, updates] of Object.entries(hotelGroups)) {
        await this.updateHotelBookingStats(hotelId, updates);
      }
    }
  }

  // Group bookings by hotel
  async groupBookingsByHotel(bookingUpdates) {
    const roomIds = [...new Set(bookingUpdates.map(u => u.room_id))];
    
    const result = await this.pgPool.query(
      'SELECT id, hotel_id FROM rooms WHERE id = ANY($1)',
      [roomIds]
    );
    
    const roomToHotel = result.rows.reduce((acc, row) => {
      acc[row.id] = row.hotel_id;
      return acc;
    }, {});
    
    return bookingUpdates.reduce((acc, update) => {
      const hotelId = roomToHotel[update.room_id];
      if (!acc[hotelId]) acc[hotelId] = [];
      acc[hotelId].push(update);
      return acc;
    }, {});
  }

  // Update hotel booking statistics
  async updateHotelBookingStats(hotelId, bookingUpdates) {
    const pipeline = redisClient.pipeline();
    
    // Update booking velocity (bookings per hour)
    const velocityKey = `idx:hotel:${hotelId}:velocity`;
    const currentHour = new Date().getHours();
    pipeline.hincrby(velocityKey, currentHour, bookingUpdates.length);
    pipeline.expire(velocityKey, 86400); // 24 hours
    
    // Update popularity score
    const popularityKey = 'idx:hotels:popularity';
    pipeline.zincrby(popularityKey, bookingUpdates.length, hotelId);
    
    await pipeline.exec();
  }

  // Fast availability check using indexes
  async checkAvailabilityFast(hotelId, checkIn, checkOut) {
    const hotelBitmapKey = `idx:hotel:${hotelId}:availability`;
    
    const startDay = Math.floor((new Date(checkIn) - new Date()) / (1000 * 60 * 60 * 24));
    const endDay = Math.floor((new Date(checkOut) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (startDay < 0 || endDay > 365) {
      // Fallback to database query
      return await this.checkAvailabilityDatabase(hotelId, checkIn, checkOut);
    }
    
    // Check bitmap for all days
    const pipeline = redisClient.pipeline();
    for (let day = startDay; day < endDay; day++) {
      pipeline.getbit(hotelBitmapKey, day);
    }
    
    const results = await pipeline.exec();
    const allAvailable = results.every(([err, bit]) => !err && bit === 1);
    
    return allAvailable;
  }

  // Database fallback for availability check
  async checkAvailabilityDatabase(hotelId, checkIn, checkOut) {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM rooms r
        INNER JOIN availability a ON r.id = a.room_id
        WHERE r.hotel_id = $1
          AND a.date >= $2
          AND a.date < $3
          AND a.available_count > 0
        GROUP BY r.id
        HAVING COUNT(DISTINCT a.date) = $3::date - $2::date
      ) AS available
    `;
    
    const result = await this.pgPool.query(query, [hotelId, checkIn, checkOut]);
    return result.rows[0].available;
  }

  // Get hotels with availability on specific date (sorted by price)
  async getAvailableHotelsByDate(date, limit = 20) {
    const dateIndexKey = `idx:availability:${date}`;
    
    // Get cheapest available hotels
    const results = await redisClient.zrange(dateIndexKey, 0, limit - 1, 'WITHSCORES');
    
    const hotels = [];
    for (let i = 0; i < results.length; i += 2) {
      const [hotelId, roomId] = results[i].split(':');
      const price = parseFloat(results[i + 1]);
      
      hotels.push({
        hotelId: parseInt(hotelId),
        roomId: parseInt(roomId),
        price
      });
    }
    
    return hotels;
  }

  // Get hotels by price range
  async getHotelsByPriceRange(minPrice, maxPrice) {
    const priceRanges = [];
    for (let price = Math.floor(minPrice / 50) * 50; price <= maxPrice; price += 50) {
      priceRanges.push(`idx:price:${price}`);
    }
    
    if (priceRanges.length === 0) return [];
    
    // Union of all price ranges
    const hotelIds = await redisClient.sunion(...priceRanges);
    return hotelIds.map(id => parseInt(id));
  }

  // Get trending hotels based on booking velocity
  async getTrendingHotels(limit = 10) {
    const results = await redisClient.zrevrange('idx:hotels:popularity', 0, limit - 1, 'WITHSCORES');
    
    const hotels = [];
    for (let i = 0; i < results.length; i += 2) {
      hotels.push({
        hotelId: parseInt(results[i]),
        bookingCount: parseInt(results[i + 1])
      });
    }
    
    return hotels;
  }
}

module.exports = AvailabilityIndexer;