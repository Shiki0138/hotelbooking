const Redis = require('ioredis');

class PricePredictionCacheService {
  constructor() {
    this.redis = process.env.REDIS_URL 
      ? new Redis(process.env.REDIS_URL)
      : null;
    
    this.cacheEnabled = !!this.redis;
    this.defaultTTL = 3600; // 1 hour
    this.predictionTTL = 7200; // 2 hours for predictions
    this.trendTTL = 1800; // 30 minutes for trends
  }

  /**
   * Get cached predictions
   */
  async getCachedPredictions(hotelId, roomId, checkIn) {
    if (!this.cacheEnabled) return null;
    
    try {
      const key = this.getPredictionKey(hotelId, roomId, checkIn);
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`[Cache] Hit: Predictions for ${hotelId}/${roomId}`);
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('[Cache] Error getting cached predictions:', error);
      return null;
    }
  }

  /**
   * Cache predictions
   */
  async cachePredictions(hotelId, roomId, checkIn, predictions) {
    if (!this.cacheEnabled || !predictions) return;
    
    try {
      const key = this.getPredictionKey(hotelId, roomId, checkIn);
      await this.redis.setex(
        key,
        this.predictionTTL,
        JSON.stringify(predictions)
      );
      console.log(`[Cache] Stored: Predictions for ${hotelId}/${roomId}`);
    } catch (error) {
      console.error('[Cache] Error caching predictions:', error);
    }
  }

  /**
   * Get cached price trends
   */
  async getCachedTrends(hotelId, roomId) {
    if (!this.cacheEnabled) return null;
    
    try {
      const key = this.getTrendKey(hotelId, roomId);
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`[Cache] Hit: Trends for ${hotelId}/${roomId}`);
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('[Cache] Error getting cached trends:', error);
      return null;
    }
  }

  /**
   * Cache price trends
   */
  async cacheTrends(hotelId, roomId, trends) {
    if (!this.cacheEnabled || !trends) return;
    
    try {
      const key = this.getTrendKey(hotelId, roomId);
      await this.redis.setex(
        key,
        this.trendTTL,
        JSON.stringify(trends)
      );
      console.log(`[Cache] Stored: Trends for ${hotelId}/${roomId}`);
    } catch (error) {
      console.error('[Cache] Error caching trends:', error);
    }
  }

  /**
   * Get cached user analysis
   */
  async getCachedUserAnalysis(userId) {
    if (!this.cacheEnabled) return null;
    
    try {
      const key = this.getUserAnalysisKey(userId);
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`[Cache] Hit: User analysis for ${userId}`);
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('[Cache] Error getting cached user analysis:', error);
      return null;
    }
  }

  /**
   * Cache user analysis
   */
  async cacheUserAnalysis(userId, analysis) {
    if (!this.cacheEnabled || !analysis) return;
    
    try {
      const key = this.getUserAnalysisKey(userId);
      await this.redis.setex(
        key,
        this.defaultTTL,
        JSON.stringify(analysis)
      );
      console.log(`[Cache] Stored: User analysis for ${userId}`);
    } catch (error) {
      console.error('[Cache] Error caching user analysis:', error);
    }
  }

  /**
   * Batch get predictions for multiple hotels
   */
  async getBatchCachedPredictions(hotels) {
    if (!this.cacheEnabled || !hotels || hotels.length === 0) return {};
    
    try {
      const pipeline = this.redis.pipeline();
      const keys = hotels.map(h => this.getPredictionKey(h.hotelId, h.roomId || 'default', h.checkIn));
      
      keys.forEach(key => pipeline.get(key));
      
      const results = await pipeline.exec();
      const cached = {};
      
      results.forEach((result, index) => {
        if (result[1]) {
          const hotel = hotels[index];
          const key = `${hotel.hotelId}_${hotel.roomId || 'default'}`;
          cached[key] = JSON.parse(result[1]);
        }
      });
      
      const hitRate = Object.keys(cached).length / hotels.length;
      console.log(`[Cache] Batch hit rate: ${(hitRate * 100).toFixed(1)}%`);
      
      return cached;
    } catch (error) {
      console.error('[Cache] Error getting batch cached predictions:', error);
      return {};
    }
  }

  /**
   * Invalidate predictions cache for a hotel
   */
  async invalidatePredictions(hotelId, roomId) {
    if (!this.cacheEnabled) return;
    
    try {
      const pattern = `prediction:${hotelId}:${roomId || '*'}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`[Cache] Invalidated ${keys.length} prediction entries for ${hotelId}`);
      }
    } catch (error) {
      console.error('[Cache] Error invalidating predictions:', error);
    }
  }

  /**
   * Warm up cache with popular hotels
   */
  async warmupCache(popularHotels) {
    if (!this.cacheEnabled || !popularHotels || popularHotels.length === 0) return;
    
    console.log(`[Cache] Warming up cache for ${popularHotels.length} popular hotels`);
    
    // This would typically fetch and cache predictions for popular hotels
    // Implementation depends on your specific requirements
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (!this.cacheEnabled) return null;
    
    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();
      
      // Parse Redis info
      const stats = {};
      info.split('\n').forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key.trim()] = value.trim();
        }
      });
      
      return {
        totalKeys: dbSize,
        hitRate: stats.keyspace_hits && stats.keyspace_misses
          ? (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2)
          : 0,
        memoryUsed: stats.used_memory_human || 'N/A',
        connectedClients: stats.connected_clients || 0
      };
    } catch (error) {
      console.error('[Cache] Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Clear all prediction-related cache
   */
  async clearPredictionCache() {
    if (!this.cacheEnabled) return;
    
    try {
      const patterns = [
        'prediction:*',
        'trend:*',
        'user-analysis:*'
      ];
      
      let totalDeleted = 0;
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          totalDeleted += keys.length;
        }
      }
      
      console.log(`[Cache] Cleared ${totalDeleted} prediction-related cache entries`);
      return totalDeleted;
    } catch (error) {
      console.error('[Cache] Error clearing prediction cache:', error);
      return 0;
    }
  }

  // Key generation methods
  getPredictionKey(hotelId, roomId, checkIn) {
    const checkInStr = checkIn || 'default';
    return `prediction:${hotelId}:${roomId}:${checkInStr}`;
  }

  getTrendKey(hotelId, roomId) {
    return `trend:${hotelId}:${roomId}`;
  }

  getUserAnalysisKey(userId) {
    return `user-analysis:${userId}`;
  }

  /**
   * Check if cache is available
   */
  isAvailable() {
    return this.cacheEnabled && this.redis && this.redis.status === 'ready';
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      console.log('[Cache] Redis connection closed');
    }
  }
}

// Singleton instance
module.exports = new PricePredictionCacheService();