import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class CacheService {
  private redis: Redis | null = null;
  private inMemoryCache: Map<string, { data: any; expiresAt: Date }> = new Map();

  constructor() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3
        });

        this.redis.on('error', (err) => {
          logger.error('Redis error:', err);
        });

        this.redis.on('connect', () => {
          logger.info('Redis connected');
        });
      } else {
        logger.info('Redis URL not provided, using in-memory cache');
      }
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
    }
  }

  /**
   * キャッシュから値を取得
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Redisが利用可能な場合
      if (this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          return JSON.parse(value);
        }
      } else {
        // インメモリキャッシュから取得
        const cached = this.inMemoryCache.get(key);
        if (cached && cached.expiresAt > new Date()) {
          return cached.data;
        } else if (cached) {
          // 期限切れの場合は削除
          this.inMemoryCache.delete(key);
        }
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * キャッシュに値を設定
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      if (this.redis) {
        await this.redis.set(key, serialized, 'EX', ttlSeconds);
      } else {
        // インメモリキャッシュに保存
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);
        
        this.inMemoryCache.set(key, {
          data: value,
          expiresAt
        });

        // メモリリークを防ぐため、古いエントリを定期的に削除
        this.cleanupInMemoryCache();
      }
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * キャッシュから値を削除
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.inMemoryCache.delete(key);
      }
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  /**
   * パターンマッチでキャッシュを削除
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // インメモリキャッシュでパターンマッチ
        const keysToDelete: string[] = [];
        this.inMemoryCache.forEach((_, key) => {
          if (key.includes(pattern.replace('*', ''))) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => this.inMemoryCache.delete(key));
      }
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
    }
  }

  /**
   * キャッシュをクリア
   */
  async clear(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.flushdb();
      } else {
        this.inMemoryCache.clear();
      }
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * インメモリキャッシュのクリーンアップ
   */
  private cleanupInMemoryCache(): void {
    const now = new Date();
    const keysToDelete: string[] = [];
    
    this.inMemoryCache.forEach((value, key) => {
      if (value.expiresAt <= now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.inMemoryCache.delete(key));

    // キャッシュサイズが大きくなりすぎた場合、古いエントリを削除
    const maxSize = 1000;
    if (this.inMemoryCache.size > maxSize) {
      const entries = Array.from(this.inMemoryCache.entries());
      entries.sort((a, b) => a[1].expiresAt.getTime() - b[1].expiresAt.getTime());
      
      const toRemove = entries.slice(0, entries.length - maxSize);
      toRemove.forEach(([key]) => this.inMemoryCache.delete(key));
    }
  }

  /**
   * 接続を閉じる
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}