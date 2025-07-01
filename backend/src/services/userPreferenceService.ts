import { getPrisma } from './databaseService';
import { cache } from './cacheService';
import { SearchHistory, SearchPreferences, AdvancedSearchFilters } from '../types/search';
import { logger, loggers } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class UserPreferenceService {
  private prisma = getPrisma();
  
  // Save search history
  async saveSearchHistory(
    userId: string,
    filters: AdvancedSearchFilters,
    resultCount: number,
    clickedHotels?: string[]
  ): Promise<void> {
    try {
      const searchHistory: SearchHistory = {
        id: uuidv4(),
        userId,
        filters,
        timestamp: new Date(),
        resultCount,
        clickedHotels: clickedHotels || []
      };
      
      // Save to database
      if (!this.prisma) {
        throw new Error('Database connection not available');
      }
      
      await this.prisma.searchHistory.create({
        data: {
          id: searchHistory.id,
          userId,
          filters: JSON.stringify(filters),
          timestamp: searchHistory.timestamp,
          resultCount,
          clickedHotels: clickedHotels || []
        }
      });
      
      // Update user behavior cache for recommendations
      await this.updateUserBehaviorCache(userId, filters, clickedHotels);
      
      loggers.logBusinessEvent('search_saved', {
        userId,
        searchId: searchHistory.id,
        resultCount
      });
    } catch (error) {
      logger.error('Failed to save search history', error);
    }
  }
  
  // Get search history
  async getSearchHistory(userId: string, limit: number = 10): Promise<SearchHistory[]> {
    const cacheKey = `search-history:${userId}`;
    const cached = await cache.get<SearchHistory[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    if (!this.prisma) {
      return [];
    }
    
    const history = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    
    const searchHistory = history.map(h => ({
      id: h.id,
      userId: h.userId,
      filters: JSON.parse(h.filters as string) as AdvancedSearchFilters,
      timestamp: h.timestamp,
      resultCount: h.resultCount,
      clickedHotels: h.clickedHotels
    }));
    
    await cache.set(cacheKey, searchHistory, 3600); // 1 hour cache
    
    return searchHistory;
  }
  
  // Save favorite hotel
  async addFavoriteHotel(userId: string, hotelId: string): Promise<void> {
    if (!this.prisma) {
      throw new Error('Database connection not available');
    }
    
    await this.prisma.favoriteHotel.create({
      data: {
        userId,
        hotelId,
        createdAt: new Date()
      }
    });
    
    // Invalidate cache
    await cache.del(`favorites:${userId}`);
    
    loggers.logBusinessEvent('hotel_favorited', { userId, hotelId });
  }
  
  // Remove favorite hotel
  async removeFavoriteHotel(userId: string, hotelId: string): Promise<void> {
    if (!this.prisma) {
      throw new Error('Database connection not available');
    }
    
    await this.prisma.favoriteHotel.deleteMany({
      where: {
        userId,
        hotelId
      }
    });
    
    // Invalidate cache
    await cache.del(`favorites:${userId}`);
    
    loggers.logBusinessEvent('hotel_unfavorited', { userId, hotelId });
  }
  
  // Get favorite hotels
  async getFavoriteHotels(userId: string): Promise<string[]> {
    const cacheKey = `favorites:${userId}`;
    const cached = await cache.get<string[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    if (!this.prisma) {
      return [];
    }
    
    const favorites = await this.prisma.favoriteHotel.findMany({
      where: { userId },
      select: { hotelId: true },
      orderBy: { createdAt: 'desc' }
    });
    
    const hotelIds = favorites.map(f => f.hotelId);
    await cache.set(cacheKey, hotelIds, 3600);
    
    return hotelIds;
  }
  
  // Save search preferences
  async saveSearchPreferences(
    userId: string,
    preferences: Partial<SearchPreferences>
  ): Promise<void> {
    if (!this.prisma) {
      throw new Error('Database connection not available');
    }
    
    await this.prisma.userPreference.upsert({
      where: { userId },
      update: {
        searchPreferences: JSON.stringify(preferences),
        updatedAt: new Date()
      },
      create: {
        userId,
        searchPreferences: JSON.stringify(preferences),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Invalidate cache
    await cache.del(`preferences:${userId}`);
  }
  
  // Get search preferences
  async getSearchPreferences(userId: string): Promise<SearchPreferences | null> {
    const cacheKey = `preferences:${userId}`;
    const cached = await cache.get<SearchPreferences>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    if (!this.prisma) {
      return null;
    }
    
    const prefs = await this.prisma.userPreference.findUnique({
      where: { userId }
    });
    
    if (!prefs || !prefs.searchPreferences) {
      return null;
    }
    
    const preferences = JSON.parse(prefs.searchPreferences as string) as SearchPreferences;
    await cache.set(cacheKey, preferences, 3600);
    
    return preferences;
  }
  
  // Set price alert
  async setPriceAlert(
    userId: string,
    destination: string,
    maxPrice: number,
    checkIn: Date,
    checkOut: Date
  ): Promise<void> {
    if (!this.prisma) {
      throw new Error('Database connection not available');
    }
    
    await this.prisma.priceAlert.create({
      data: {
        userId,
        destination,
        maxPrice,
        checkIn,
        checkOut,
        isActive: true,
        createdAt: new Date()
      }
    });
    
    loggers.logBusinessEvent('price_alert_created', {
      userId,
      destination,
      maxPrice
    });
  }
  
  // Get active price alerts
  async getActivePriceAlerts(userId: string): Promise<any[]> {
    if (!this.prisma) {
      return [];
    }
    
    return await this.prisma.priceAlert.findMany({
      where: {
        userId,
        isActive: true,
        checkIn: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  // Update user behavior cache for AI recommendations
  private async updateUserBehaviorCache(
    userId: string,
    filters: AdvancedSearchFilters,
    clickedHotels?: string[]
  ): Promise<void> {
    const behaviorKey = `user-behavior:${userId}`;
    const behavior = await cache.get<any>(behaviorKey) || {
      searchCount: 0,
      preferredCities: {},
      preferredAmenities: {},
      priceRange: { min: Infinity, max: 0 },
      clickedHotels: [],
      lastSearches: []
    };
    
    // Update search count
    behavior.searchCount++;
    
    // Track preferred cities
    if (filters.city) {
      behavior.preferredCities[filters.city] = 
        (behavior.preferredCities[filters.city] || 0) + 1;
    }
    
    // Track preferred amenities
    if (filters.hotelAmenities) {
      Object.entries(filters.hotelAmenities).forEach(([amenity, value]) => {
        if (value) {
          behavior.preferredAmenities[amenity] = 
            (behavior.preferredAmenities[amenity] || 0) + 1;
        }
      });
    }
    
    // Update price range preferences
    if (filters.priceRange) {
      behavior.priceRange.min = Math.min(behavior.priceRange.min, filters.priceRange.min);
      behavior.priceRange.max = Math.max(behavior.priceRange.max, filters.priceRange.max);
    }
    
    // Track clicked hotels
    if (clickedHotels) {
      behavior.clickedHotels.push(...clickedHotels);
      // Keep only last 50 clicked hotels
      if (behavior.clickedHotels.length > 50) {
        behavior.clickedHotels = behavior.clickedHotels.slice(-50);
      }
    }
    
    // Track last searches
    behavior.lastSearches.push({
      filters,
      timestamp: new Date()
    });
    // Keep only last 20 searches
    if (behavior.lastSearches.length > 20) {
      behavior.lastSearches = behavior.lastSearches.slice(-20);
    }
    
    await cache.set(behaviorKey, behavior, 86400); // 24 hours cache
  }
  
  // Get user behavior for recommendations
  async getUserBehavior(userId: string): Promise<any> {
    const behaviorKey = `user-behavior:${userId}`;
    return await cache.get(behaviorKey);
  }
}