// DataLoader implementation to solve N+1 query problems
const DataLoader = require('dataloader');
const { Pool } = require('pg');
const { redisClient } = require('../cache/redis-config');

class HotelDataLoader {
  constructor() {
    this.pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'lastminutestay',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20
    });
    
    this.initializeLoaders();
  }

  initializeLoaders() {
    // Hotel loader - batch load hotels by ID
    this.hotelLoader = new DataLoader(async (hotelIds) => {
      const query = `
        SELECT 
          id, name, city, rating, 
          ST_Y(location::geometry) AS lat,
          ST_X(location::geometry) AS lng,
          amenities, address
        FROM hotels 
        WHERE id = ANY($1)
      `;
      
      const result = await this.pgPool.query(query, [hotelIds]);
      const hotelMap = result.rows.reduce((map, hotel) => {
        map[hotel.id] = hotel;
        return map;
      }, {});
      
      return hotelIds.map(id => hotelMap[id] || null);
    }, {
      cache: true,
      maxBatchSize: 100
    });

    // Room loader - batch load rooms by hotel ID
    this.roomsByHotelLoader = new DataLoader(async (hotelIds) => {
      const query = `
        SELECT 
          id, hotel_id, room_type, capacity, base_price
        FROM rooms
        WHERE hotel_id = ANY($1)
        ORDER BY hotel_id, base_price
      `;
      
      const result = await this.pgPool.query(query, [hotelIds]);
      
      // Group rooms by hotel ID
      const roomsByHotel = hotelIds.map(hotelId => 
        result.rows.filter(room => room.hotel_id === hotelId)
      );
      
      return roomsByHotel;
    }, {
      cache: true,
      maxBatchSize: 50
    });

    // Availability loader - batch load availability by room IDs and date range
    this.availabilityLoader = new DataLoader(async (queries) => {
      // queries format: [{roomId, checkIn, checkOut}]
      const roomIds = [...new Set(queries.map(q => q.roomId))];
      const minDate = queries.reduce((min, q) => 
        (!min || q.checkIn < min) ? q.checkIn : min, null
      );
      const maxDate = queries.reduce((max, q) => 
        (!max || q.checkOut > max) ? q.checkOut : max, null
      );
      
      const query = `
        SELECT 
          room_id, date, available_count, 
          price * (1 - COALESCE(last_minute_discount, 0)) AS final_price,
          last_minute_discount
        FROM availability
        WHERE room_id = ANY($1)
          AND date >= $2
          AND date < $3
          AND available_count > 0
        ORDER BY room_id, date
      `;
      
      const result = await this.pgPool.query(query, [roomIds, minDate, maxDate]);
      
      // Create availability map
      const availabilityMap = result.rows.reduce((map, row) => {
        if (!map[row.room_id]) map[row.room_id] = {};
        map[row.room_id][row.date.toISOString().split('T')[0]] = row;
        return map;
      }, {});
      
      // Return availability for each query
      return queries.map(q => {
        const roomAvailability = availabilityMap[q.roomId] || {};
        const dates = [];
        const current = new Date(q.checkIn);
        const end = new Date(q.checkOut);
        
        while (current < end) {
          const dateStr = current.toISOString().split('T')[0];
          if (roomAvailability[dateStr]) {
            dates.push(roomAvailability[dateStr]);
          }
          current.setDate(current.getDate() + 1);
        }
        
        // Return null if not all dates are available
        return dates.length === (end - new Date(q.checkIn)) / (24 * 60 * 60 * 1000) 
          ? dates 
          : null;
      });
    }, {
      cacheKeyFn: (query) => `${query.roomId}:${query.checkIn}:${query.checkOut}`,
      maxBatchSize: 200
    });

    // Booking count loader - batch load booking counts
    this.bookingCountLoader = new DataLoader(async (hotelIds) => {
      const query = `
        SELECT 
          r.hotel_id,
          COUNT(DISTINCT b.id) as booking_count
        FROM rooms r
        LEFT JOIN bookings b ON b.room_id = r.id 
          AND b.created_at >= NOW() - INTERVAL '30 days'
          AND b.status = 'confirmed'
        WHERE r.hotel_id = ANY($1)
        GROUP BY r.hotel_id
      `;
      
      const result = await this.pgPool.query(query, [hotelIds]);
      const countMap = result.rows.reduce((map, row) => {
        map[row.hotel_id] = row.booking_count;
        return map;
      }, {});
      
      return hotelIds.map(id => countMap[id] || 0);
    }, {
      cache: true,
      maxBatchSize: 100
    });

    // Reviews loader - batch load review summaries
    this.reviewSummaryLoader = new DataLoader(async (hotelIds) => {
      // Simulated review data - in production, this would query a reviews table
      const query = `
        SELECT 
          h.id as hotel_id,
          h.rating,
          FLOOR(RANDOM() * 1000 + 100) as review_count,
          ARRAY[
            'Excellent location',
            'Great value',
            'Clean rooms',
            'Friendly staff'
          ][1 + FLOOR(RANDOM() * 4)] as top_mention
        FROM hotels h
        WHERE h.id = ANY($1)
      `;
      
      const result = await this.pgPool.query(query, [hotelIds]);
      const reviewMap = result.rows.reduce((map, row) => {
        map[row.hotel_id] = {
          rating: parseFloat(row.rating),
          reviewCount: row.review_count,
          topMention: row.top_mention
        };
        return map;
      }, {});
      
      return hotelIds.map(id => reviewMap[id] || null);
    }, {
      cache: true,
      maxBatchSize: 100
    });

    // Price statistics loader
    this.priceStatsLoader = new DataLoader(async (queries) => {
      // queries format: [{hotelId, checkIn, checkOut}]
      const hotelIds = [...new Set(queries.map(q => q.hotelId))];
      
      const query = `
        SELECT 
          r.hotel_id,
          MIN(a.price * (1 - COALESCE(a.last_minute_discount, 0))) as min_price,
          AVG(a.price * (1 - COALESCE(a.last_minute_discount, 0))) as avg_price,
          MAX(a.price * (1 - COALESCE(a.last_minute_discount, 0))) as max_price,
          MAX(a.last_minute_discount) as max_discount
        FROM rooms r
        INNER JOIN availability a ON a.room_id = r.id
        WHERE r.hotel_id = ANY($1)
          AND a.date >= $2
          AND a.date < $3
          AND a.available_count > 0
        GROUP BY r.hotel_id
      `;
      
      // Use the earliest check-in and latest check-out for the batch
      const minCheckIn = queries.reduce((min, q) => 
        (!min || q.checkIn < min) ? q.checkIn : min, null
      );
      const maxCheckOut = queries.reduce((max, q) => 
        (!max || q.checkOut > max) ? q.checkOut : max, null
      );
      
      const result = await this.pgPool.query(query, [hotelIds, minCheckIn, maxCheckOut]);
      const statsMap = result.rows.reduce((map, row) => {
        map[row.hotel_id] = {
          minPrice: parseFloat(row.min_price),
          avgPrice: parseFloat(row.avg_price),
          maxPrice: parseFloat(row.max_price),
          maxDiscount: parseFloat(row.max_discount)
        };
        return map;
      }, {});
      
      return queries.map(q => statsMap[q.hotelId] || null);
    }, {
      cacheKeyFn: (query) => `${query.hotelId}:${query.checkIn}:${query.checkOut}`,
      maxBatchSize: 50
    });
  }

  // Utility methods for clearing caches
  clearHotelCache(hotelId) {
    this.hotelLoader.clear(hotelId);
    this.roomsByHotelLoader.clear(hotelId);
    this.bookingCountLoader.clear(hotelId);
    this.reviewSummaryLoader.clear(hotelId);
  }

  clearAllCaches() {
    this.hotelLoader.clearAll();
    this.roomsByHotelLoader.clearAll();
    this.availabilityLoader.clearAll();
    this.bookingCountLoader.clearAll();
    this.reviewSummaryLoader.clearAll();
    this.priceStatsLoader.clearAll();
  }

  // Batch loading example for GraphQL resolvers or REST endpoints
  async loadHotelWithDetails(hotelId, checkIn, checkOut) {
    // Load all related data in parallel using DataLoader
    const [hotel, rooms, bookingCount, reviews, priceStats] = await Promise.all([
      this.hotelLoader.load(hotelId),
      this.roomsByHotelLoader.load(hotelId),
      this.bookingCountLoader.load(hotelId),
      this.reviewSummaryLoader.load(hotelId),
      this.priceStatsLoader.load({ hotelId, checkIn, checkOut })
    ]);
    
    // Load availability for each room
    const roomsWithAvailability = await Promise.all(
      rooms.map(async (room) => {
        const availability = await this.availabilityLoader.load({
          roomId: room.id,
          checkIn,
          checkOut
        });
        
        return {
          ...room,
          availability,
          totalPrice: availability 
            ? availability.reduce((sum, day) => sum + day.final_price, 0)
            : null
        };
      })
    );
    
    return {
      ...hotel,
      rooms: roomsWithAvailability.filter(r => r.availability),
      bookingCount,
      reviews,
      priceStats
    };
  }

  // Batch load multiple hotels efficiently
  async loadMultipleHotels(hotelIds, checkIn, checkOut) {
    return Promise.all(
      hotelIds.map(id => this.loadHotelWithDetails(id, checkIn, checkOut))
    );
  }
}

// Singleton instance
let dataLoaderInstance;

function getDataLoader() {
  if (!dataLoaderInstance) {
    dataLoaderInstance = new HotelDataLoader();
  }
  return dataLoaderInstance;
}

module.exports = {
  getDataLoader,
  HotelDataLoader
};