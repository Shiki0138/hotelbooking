// Simple in-memory cache for development
const memoryCache = new Map<string, { value: any; expiry?: number }>();

export class CacheService {
  async get(key: string): Promise<any> {
    const cached = memoryCache.get(key);
    if (!cached) return null;
    
    if (cached.expiry && Date.now() > cached.expiry) {
      memoryCache.delete(key);
      return null;
    }
    
    return cached.value;
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      const expiry = Date.now() + (ttl * 1000);
      memoryCache.set(key, { value, expiry });
    } else {
      memoryCache.set(key, { value });
    }
  }
  
  async del(key: string): Promise<void> {
    if (key.includes('*')) {
      // Simple wildcard support
      const prefix = key.replace('*', '');
      for (const k of memoryCache.keys()) {
        if (k.startsWith(prefix)) {
          memoryCache.delete(k);
        }
      }
    } else {
      memoryCache.delete(key);
    }
  }
  
  async flush(): Promise<void> {
    memoryCache.clear();
  }
}

export const cache = new CacheService();

// Cache key generators
export const cacheKeys = {
  hotel: (id: string) => `hotel:${id}`,
  hotelSearch: (params: string) => `hotel:search:${params}`,
  roomAvailability: (roomId: string, date: string) => `room:availability:${roomId}:${date}`,
  userBookings: (userId: string) => `user:bookings:${userId}`,
  aiSearch: (query: string) => `ai:search:${query}`,
  aiRecommendation: (userId: string) => `ai:recommendation:${userId}`,
  aiNlp: (query: string) => `ai:nlp:${query}`,
  aiPrediction: (query: string) => `ai:prediction:${query}`,
  aiVoice: (audioHash: string) => `ai:voice:${audioHash}`,
  userPreferences: (userId: string) => `user:preferences:${userId}`,
  searchHistory: (userId: string) => `user:search_history:${userId}`,
  watchlist: (userId: string) => `user:watchlist:${userId}`,
  currency: (from: string, to: string) => `currency:${from}:${to}`,
  weather: (location: string) => `weather:${location}`,
  geocoding: (query: string) => `geocoding:${query}`,
  autocomplete: (query: string) => `autocomplete:${query}`,
};

// Redis initialization (mock)
export async function initializeRedis(): Promise<void> {
  console.log('Using in-memory cache (Redis not configured)');
}