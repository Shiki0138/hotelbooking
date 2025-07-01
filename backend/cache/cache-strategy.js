// Enhanced multi-layer caching strategy for 50% performance improvement
const Redis = require('ioredis');
const LRU = require('lru-cache');
const crypto = require('crypto');

class EnhancedCacheStrategy {
  constructor() {
    // L1 Cache - In-memory LRU cache (fastest)
    this.l1Cache = new LRU({
      max: 500,
      maxAge: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true
    });
    
    // L2 Cache - Redis (distributed)
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      enableOfflineQueue: false,
      lazyConnect: true
    });
    
    // Cache statistics
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      dbHits: 0
    };
    
    // Cache warming queue
    this.warmingQueue = [];
    this.startCacheWarming();
  }

  // Generate cache key with versioning
  generateKey(namespace, params) {
    const sorted = Object.keys(params).sort().reduce((obj, key) => {
      obj[key] = params[key];
      return obj;
    }, {});
    
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(sorted))
      .digest('hex')
      .substring(0, 16);
    
    return `${namespace}:v2:${hash}`;
  }

  // Multi-layer get with fallback
  async get(key, fetchFn, options = {}) {
    const ttl = options.ttl || 300; // 5 minutes default
    
    // L1 Check (in-memory)
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== undefined) {
      this.stats.l1Hits++;
      return l1Value;
    }
    this.stats.l1Misses++;
    
    // L2 Check (Redis)
    try {
      const l2Value = await this.redis.get(key);
      if (l2Value) {
        this.stats.l2Hits++;
        const parsed = JSON.parse(l2Value);
        
        // Promote to L1
        this.l1Cache.set(key, parsed);
        
        return parsed;
      }
    } catch (error) {
      console.error('Redis error:', error);
    }
    this.stats.l2Misses++;
    
    // Fetch from source
    this.stats.dbHits++;
    const value = await fetchFn();
    
    // Store in both layers
    await this.set(key, value, ttl);
    
    // Queue for cache warming if frequently accessed
    if (options.warm) {
      this.queueForWarming(key, fetchFn, ttl);
    }
    
    return value;
  }

  // Set value in both cache layers
  async set(key, value, ttl = 300) {
    // L1 Cache
    this.l1Cache.set(key, value);
    
    // L2 Cache with error handling
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  // Batch get for multiple keys
  async batchGet(keys, fetchFn, options = {}) {
    const results = new Map();
    const missingKeys = [];
    
    // Check L1 first
    for (const key of keys) {
      const value = this.l1Cache.get(key);
      if (value !== undefined) {
        results.set(key, value);
        this.stats.l1Hits++;
      } else {
        missingKeys.push(key);
        this.stats.l1Misses++;
      }
    }
    
    if (missingKeys.length === 0) {
      return Array.from(results.values());
    }
    
    // Check L2 for missing keys
    const l2Missing = [];
    try {
      const l2Values = await this.redis.mget(...missingKeys);
      
      missingKeys.forEach((key, index) => {
        const value = l2Values[index];
        if (value) {
          const parsed = JSON.parse(value);
          results.set(key, parsed);
          this.l1Cache.set(key, parsed);
          this.stats.l2Hits++;
        } else {
          l2Missing.push(key);
          this.stats.l2Misses++;
        }
      });
    } catch (error) {
      console.error('Redis mget error:', error);
      l2Missing.push(...missingKeys);
    }
    
    // Fetch missing data
    if (l2Missing.length > 0) {
      const fetchedData = await fetchFn(l2Missing);
      const ttl = options.ttl || 300;
      
      // Store fetched data
      for (let i = 0; i < l2Missing.length; i++) {
        const key = l2Missing[i];
        const value = fetchedData[i];
        if (value !== null && value !== undefined) {
          results.set(key, value);
          await this.set(key, value, ttl);
        }
      }
      
      this.stats.dbHits += l2Missing.length;
    }
    
    // Return in original key order
    return keys.map(key => results.get(key));
  }

  // Invalidate cache entries
  async invalidate(pattern) {
    // Clear L1 cache entries
    const l1Keys = this.l1Cache.keys();
    for (const key of l1Keys) {
      if (key.includes(pattern)) {
        this.l1Cache.del(key);
      }
    }
    
    // Clear L2 cache entries
    try {
      const keys = await this.redis.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis invalidation error:', error);
    }
  }

  // Cache warming for frequently accessed data
  startCacheWarming() {
    setInterval(async () => {
      const batch = this.warmingQueue.splice(0, 10);
      
      for (const item of batch) {
        try {
          const value = await item.fetchFn();
          await this.set(item.key, value, item.ttl);
        } catch (error) {
          console.error('Cache warming error:', error);
        }
      }
    }, 30000); // Every 30 seconds
  }

  queueForWarming(key, fetchFn, ttl) {
    // Avoid duplicates
    const exists = this.warmingQueue.some(item => item.key === key);
    if (!exists) {
      this.warmingQueue.push({ key, fetchFn, ttl });
    }
  }

  // Get cache statistics
  getStats() {
    const total = this.stats.l1Hits + this.stats.l1Misses;
    const l1HitRate = total > 0 ? (this.stats.l1Hits / total * 100).toFixed(2) : 0;
    const l2Total = this.stats.l2Hits + this.stats.l2Misses;
    const l2HitRate = l2Total > 0 ? (this.stats.l2Hits / l2Total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      l1HitRate: `${l1HitRate}%`,
      l2HitRate: `${l2HitRate}%`,
      totalCacheHits: this.stats.l1Hits + this.stats.l2Hits,
      totalRequests: total
    };
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      dbHits: 0
    };
  }
}

// Specialized cache strategies for different data types
class HotelSearchCache extends EnhancedCacheStrategy {
  constructor() {
    super();
    this.namespace = 'hotel:search';
  }

  async cacheLocationSearch(lat, lng, radius, filters, fetchFn) {
    const key = this.generateKey(this.namespace, {
      lat: Math.round(lat * 1000) / 1000, // Round to 3 decimals
      lng: Math.round(lng * 1000) / 1000,
      radius,
      ...filters
    });
    
    return this.get(key, fetchFn, {
      ttl: 300, // 5 minutes
      warm: true
    });
  }

  async cacheHotelDetails(hotelId, fetchFn) {
    const key = `${this.namespace}:details:${hotelId}`;
    return this.get(key, fetchFn, {
      ttl: 3600 // 1 hour
    });
  }
}

class AvailabilityCache extends EnhancedCacheStrategy {
  constructor() {
    super();
    this.namespace = 'availability';
  }

  async cacheAvailability(hotelId, checkIn, checkOut, fetchFn) {
    const key = this.generateKey(this.namespace, {
      hotelId,
      checkIn,
      checkOut
    });
    
    return this.get(key, fetchFn, {
      ttl: 60, // 1 minute for accuracy
      warm: false
    });
  }

  async batchCacheAvailability(queries, fetchFn) {
    const keys = queries.map(q => 
      this.generateKey(this.namespace, {
        hotelId: q.hotelId,
        checkIn: q.checkIn,
        checkOut: q.checkOut
      })
    );
    
    return this.batchGet(keys, fetchFn, {
      ttl: 60
    });
  }
}

class PriceCache extends EnhancedCacheStrategy {
  constructor() {
    super();
    this.namespace = 'price';
  }

  async cachePrices(hotelId, date, fetchFn) {
    const key = `${this.namespace}:${hotelId}:${date}`;
    
    return this.get(key, fetchFn, {
      ttl: 30, // 30 seconds for real-time pricing
      warm: true
    });
  }

  async cacheDeals(fetchFn) {
    const key = `${this.namespace}:deals:best`;
    
    return this.get(key, fetchFn, {
      ttl: 300, // 5 minutes
      warm: true
    });
  }
}

// Export singleton instances
const hotelSearchCache = new HotelSearchCache();
const availabilityCache = new AvailabilityCache();
const priceCache = new PriceCache();

module.exports = {
  EnhancedCacheStrategy,
  hotelSearchCache,
  availabilityCache,
  priceCache,
  
  // Utility function to get all cache stats
  getAllCacheStats: () => ({
    hotelSearch: hotelSearchCache.getStats(),
    availability: availabilityCache.getStats(),
    price: priceCache.getStats()
  }),
  
  // Clear all caches
  clearAllCaches: async () => {
    await hotelSearchCache.invalidate('');
    await availabilityCache.invalidate('');
    await priceCache.invalidate('');
  }
};