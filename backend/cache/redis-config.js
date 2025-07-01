// Redis configuration for ultra-fast caching
const Redis = require('ioredis');

// Redis client with cluster support for scalability
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableOfflineQueue: false
});

// Separate client for pub/sub
const redisPubSub = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0
});

// Cache key patterns
const CACHE_KEYS = {
  // Location-based search results (TTL: 5 minutes)
  SEARCH_RESULTS: (lat, lng, radius) => `search:${lat}:${lng}:${radius}`,
  
  // Hotel details (TTL: 1 hour)
  HOTEL_DETAILS: (hotelId) => `hotel:${hotelId}`,
  
  // Available rooms for a hotel on specific date (TTL: 1 minute)
  AVAILABILITY: (hotelId, date) => `availability:${hotelId}:${date}`,
  
  // Price data (TTL: 30 seconds for last-minute changes)
  PRICES: (hotelId, date) => `prices:${hotelId}:${date}`,
  
  // Popular searches (TTL: 10 minutes)
  POPULAR_LOCATIONS: 'popular:locations',
  
  // Search index (using Redis Search)
  HOTEL_INDEX: 'idx:hotels'
};

// Cache TTL configurations (in seconds)
const CACHE_TTL = {
  SEARCH_RESULTS: 300,      // 5 minutes
  HOTEL_DETAILS: 3600,      // 1 hour
  AVAILABILITY: 60,         // 1 minute (critical for accuracy)
  PRICES: 30,               // 30 seconds (last-minute changes)
  POPULAR_LOCATIONS: 600    // 10 minutes
};

// Helper functions for caching patterns
class CacheManager {
  // Get or set pattern with automatic serialization
  async getOrSet(key, ttl, fetchFunction) {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      
      const data = await fetchFunction();
      await redisClient.setex(key, ttl, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Cache error:', error);
      // Fallback to fetch function on cache error
      return await fetchFunction();
    }
  }
  
  // Invalidate related caches
  async invalidateHotelCaches(hotelId) {
    const pattern = `*:${hotelId}:*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
  
  // Batch get for multiple keys
  async batchGet(keys) {
    const pipeline = redisClient.pipeline();
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();
    
    return results.map(([err, value], index) => {
      if (err || !value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    });
  }
  
  // Set multiple keys with pipeline
  async batchSet(items) {
    const pipeline = redisClient.pipeline();
    items.forEach(({ key, value, ttl }) => {
      pipeline.setex(key, ttl, JSON.stringify(value));
    });
    await pipeline.exec();
  }
  
  // Geo-based caching for location searches
  async cacheGeoSearch(lat, lng, radius, hotels) {
    const key = CACHE_KEYS.SEARCH_RESULTS(lat, lng, radius);
    const geoKey = `geo:hotels:${Math.floor(lat)}:${Math.floor(lng)}`;
    
    // Store search results
    await redisClient.setex(key, CACHE_TTL.SEARCH_RESULTS, JSON.stringify(hotels));
    
    // Also store in geo set for nearby searches
    const pipeline = redisClient.pipeline();
    hotels.forEach(hotel => {
      pipeline.geoadd(geoKey, hotel.lng, hotel.lat, hotel.id.toString());
    });
    pipeline.expire(geoKey, CACHE_TTL.SEARCH_RESULTS);
    await pipeline.exec();
  }
  
  // Get nearby cached searches
  async getNearbySearches(lat, lng, radiusKm = 1) {
    const geoKey = `geo:hotels:${Math.floor(lat)}:${Math.floor(lng)}`;
    return await redisClient.georadius(
      geoKey,
      lng,
      lat,
      radiusKm,
      'km',
      'WITHDIST',
      'ASC'
    );
  }
}

const cacheManager = new CacheManager();

module.exports = {
  redisClient,
  redisPubSub,
  CACHE_KEYS,
  CACHE_TTL,
  cacheManager
};