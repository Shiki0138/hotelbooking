import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType;
let memoryCache: Map<string, { value: any; expiry?: number }> = new Map();
let isRedisAvailable = false;

export const initializeRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', err);
      isRedisAvailable = false;
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
      isRedisAvailable = true;
    });
    
    await redisClient.connect();
  } catch (error) {
    logger.warn('Redis connection failed, using in-memory cache', error);
    isRedisAvailable = false;
  }
};

// Enhanced cache service with memory fallback
export class CacheService {
  private memoryCache: Map<string, { value: any; expiry?: number }>;
  private cacheStats: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
  };

  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanupExpired(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (isRedisAvailable && redisClient) {
        const value = await redisClient.get(key);
        if (value) {
          this.cacheStats.hits++;
          return JSON.parse(value);
        }
      }

      // Fall back to memory cache
      const cached = this.memoryCache.get(key);
      if (cached) {
        // Check if expired
        if (cached.expiry && cached.expiry < Date.now()) {
          this.memoryCache.delete(key);
          this.cacheStats.misses++;
          return null;
        }
        this.cacheStats.hits++;
        return cached.value;
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      logger.error('Cache get error', { error, key });
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      // Try Redis first if available
      if (isRedisAvailable && redisClient) {
        if (ttl) {
          await redisClient.setEx(key, ttl, serialized);
        } else {
          await redisClient.set(key, serialized);
        }
      }

      // Also set in memory cache
      this.memoryCache.set(key, {
        value,
        expiry: ttl ? Date.now() + (ttl * 1000) : undefined
      });

      this.cacheStats.sets++;
    } catch (error) {
      logger.error('Cache set error', { error, key });
      // Still set in memory cache even if Redis fails
      this.memoryCache.set(key, {
        value,
        expiry: ttl ? Date.now() + (ttl * 1000) : undefined
      });
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (isRedisAvailable && redisClient) {
        await redisClient.del(key);
      }
      this.memoryCache.delete(key);
      this.cacheStats.deletes++;
    } catch (error) {
      logger.error('Cache delete error', { error, key });
      this.memoryCache.delete(key);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      if (isRedisAvailable && redisClient) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      }

      // Delete from memory cache
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          this.cacheStats.deletes++;
        }
      }
    } catch (error) {
      logger.error('Cache pattern delete error', { error, pattern });
    }
  }

  // Multi-get for batch operations
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    
    // Try Redis multi-get if available
    if (isRedisAvailable && redisClient) {
      try {
        const values = await redisClient.mGet(keys);
        return values.map(v => v ? JSON.parse(v) : null);
      } catch (error) {
        logger.error('Redis mget error', { error });
      }
    }

    // Fall back to individual gets
    for (const key of keys) {
      results.push(await this.get<T>(key));
    }
    
    return results;
  }

  // Multi-set for batch operations
  async mset(items: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    // Process in parallel
    await Promise.all(
      items.map(item => this.set(item.key, item.value, item.ttl))
    );
  }

  // Get cache statistics
  getStats() {
    return {
      ...this.cacheStats,
      memoryCacheSize: this.memoryCache.size,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
      redisAvailable: isRedisAvailable
    };
  }

  // Clean up expired entries in memory cache
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiry && entry.expiry < now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    try {
      if (isRedisAvailable && redisClient) {
        await redisClient.flushAll();
      }
      this.memoryCache.clear();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error', { error });
      this.memoryCache.clear();
    }
  }
}

// Legacy interface for backward compatibility
export const cache = new CacheService();

export const cacheKeys = {
  hotel: (id: string) => `hotel:${id}`,
  hotelSearch: (params: string) => `search:${params}`,
  roomAvailability: (roomId: string, date: string) => `availability:${roomId}:${date}`,
  userBookings: (userId: string) => `bookings:user:${userId}`,
  aiSearch: (query: string) => `ai:search:${query}`,
  aiRecommendation: (userId: string) => `ai:recommend:${userId}`,
  aiNlp: (query: string) => `ai:nlp:${query}`,
  aiPrediction: (query: string, userId?: string) => `ai:predict:${query}:${userId || 'anonymous'}`
};