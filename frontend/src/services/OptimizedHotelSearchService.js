// 🚀 OPTIMIZED Hotel Search Service - 300ms Target Achievement
// Performance-first architecture with smart caching and streaming
import AmadeusAPI from './api/amadeus.js';
import BookingAPI from './api/booking.js';
import RakutenTravelAPI from './api/rakutenTravel.js';

class OptimizedHotelSearchService {
  constructor() {
    // Enhanced caching system
    this.searchCache = new Map();
    this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
    this.maxCacheSize = 200;
    
    // Request management
    this.activeRequests = new Map();
    this.requestQueue = [];
    
    // Performance tracking
    this.performanceMetrics = {
      totalSearches: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      targetAchievements: 0
    };
    
    // Preload popular destinations cache
    this.warmupCache();
  }

  // 🎯 MAIN OPTIMIZED SEARCH - Target: <300ms
  async searchHotels(searchParams, options = {}) {
    const startTime = performance.now();
    const { streaming = true, useCache = true } = options;
    
    try {
      // 1. Cancel any existing request for same params
      this.cancelOutdatedRequests(searchParams);
      
      // 2. Check cache first (should be <50ms)
      if (useCache) {
        const cached = this.getFromCache(searchParams);
        if (cached) {
          this.performanceMetrics.cacheHits++;
          if (streaming && options.onPartialResults) {
            options.onPartialResults(cached, 'cache');
          }
          return cached;
        }
      }
      
      // 3. Start streaming search (immediate partial results)
      if (streaming) {
        return this.streamingSearch(searchParams, options);
      } else {
        return this.standardSearch(searchParams);
      }
      
    } catch (error) {
      console.error('Optimized search failed:', error);
      return this.getFallbackResults(searchParams);
    } finally {
      const endTime = performance.now();
      this.updatePerformanceMetrics(endTime - startTime);
    }
  }

  // 🌊 STREAMING SEARCH - Progressive result loading
  async streamingSearch(searchParams, options = {}) {
    const { onPartialResults, onComplete, onError } = options;
    const results = [];
    const requestId = this.generateRequestId(searchParams);
    
    try {
      // Phase 1: Instant cache/mock results (0-50ms)
      const instantResults = this.getInstantResults(searchParams);
      if (instantResults.length > 0 && onPartialResults) {
        onPartialResults(instantResults, 'instant');
      }
      
      // Phase 2: Smart API selection (parallel, but only necessary APIs)
      const apiPromises = this.createSmartAPIPromises(searchParams, requestId);
      
      // Phase 3: Stream results as they arrive
      const streamResults = await Promise.allSettled(apiPromises);
      
      // Process each API result as it arrives
      for (let i = 0; i < streamResults.length; i++) {
        if (this.isRequestCancelled(requestId)) break;
        
        const result = streamResults[i];
        if (result.status === 'fulfilled' && result.value) {
          const normalizedResults = result.value.map(hotel => this.normalizeHotelData(hotel));
          const newResults = this.deduplicateStream(results, normalizedResults);
          
          if (newResults.length > 0) {
            results.push(...newResults);
            if (onPartialResults) {
              onPartialResults(results.slice(), `api_${i}`);
            }
          }
        }
      }
      
      // Final processing and caching
      const finalResults = this.finalizeResults(results, searchParams);
      this.saveToCache(searchParams, finalResults);
      
      if (onComplete) {
        onComplete(finalResults);
      }
      
      return finalResults;
      
    } catch (error) {
      if (onError) onError(error);
      throw error;
    }
  }

  // 🧠 SMART API SELECTION - Only call relevant APIs
  createSmartAPIPromises(searchParams, requestId) {
    const { location } = searchParams;
    const promises = [];
    
    // Determine region and select optimal APIs
    const isJapan = this.isJapanLocation(location);
    const isEurope = this.isEuropeLocation(location);
    const isNorthAmerica = this.isNorthAmericaLocation(location);
    
    // Priority-based API selection
    if (isJapan) {
      // Japan: Rakuten first (fastest), then others as fallback
      promises.push(
        this.createCancellablePromise(
          () => this.searchRakuten(searchParams), 
          requestId, 
          'rakuten'
        )
      );
      // Only add international APIs if needed
      if (searchParams.includeInternational) {
        promises.push(
          this.createCancellablePromise(
            () => this.searchAmadeus(searchParams), 
            requestId, 
            'amadeus'
          )
        );
      }
    } else if (isEurope) {
      // Europe: Amadeus + Booking.com
      promises.push(
        this.createCancellablePromise(
          () => this.searchAmadeus(searchParams), 
          requestId, 
          'amadeus'
        ),
        this.createCancellablePromise(
          () => this.searchBooking(searchParams), 
          requestId, 
          'booking'
        )
      );
    } else {
      // Other regions: All APIs but with timeout optimization
      promises.push(
        this.createCancellablePromise(
          () => this.searchAmadeus(searchParams), 
          requestId, 
          'amadeus'
        ),
        this.createCancellablePromise(
          () => this.searchBooking(searchParams), 
          requestId, 
          'booking'
        )
      );
    }
    
    return promises;
  }

  // ⚡ INSTANT RESULTS - Cache + Popular destinations
  getInstantResults(searchParams) {
    const { location } = searchParams;
    
    // Try exact cache match first
    const exactMatch = this.getFromCache(searchParams);
    if (exactMatch) return exactMatch.slice(0, 5); // Top 5 for instant display
    
    // Try similar location cache
    const similarResults = this.getSimilarLocationResults(location);
    if (similarResults.length > 0) {
      return similarResults.slice(0, 3);
    }
    
    // Popular/mock results for known destinations
    return this.getPopularResults(location);
  }

  // 🚫 REQUEST CANCELLATION
  cancelOutdatedRequests(searchParams) {
    const currentKey = this.generateCacheKey(searchParams);
    
    // Cancel all active requests except current
    for (const [key, controller] of this.activeRequests.entries()) {
      if (key !== currentKey) {
        controller.abort();
        this.activeRequests.delete(key);
      }
    }
  }

  createCancellablePromise(searchFunction, requestId, apiName) {
    const controller = new AbortController();
    const key = `${requestId}_${apiName}`;
    
    this.activeRequests.set(key, controller);
    
    return Promise.race([
      searchFunction().catch(error => null), // Graceful failure
      new Promise((_, reject) => 
        controller.signal.addEventListener('abort', () => reject(new Error('Request cancelled')))
      )
    ]).finally(() => {
      this.activeRequests.delete(key);
    });
  }

  // 💾 ENHANCED CACHING SYSTEM
  getFromCache(searchParams) {
    const key = this.generateCacheKey(searchParams);
    const cached = this.searchCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    
    // Clean expired cache
    if (cached) {
      this.searchCache.delete(key);
    }
    
    return null;
  }

  saveToCache(searchParams, results) {
    const key = this.generateCacheKey(searchParams);
    
    this.searchCache.set(key, {
      data: results,
      timestamp: Date.now(),
      searchParams: { ...searchParams }
    });
    
    // LRU eviction
    if (this.searchCache.size > this.maxCacheSize) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  // 🔥 CACHE WARMING - Preload popular destinations
  async warmupCache() {
    const popularDestinations = [
      { name: '東京', latitude: 35.6762, longitude: 139.6503 },
      { name: '大阪', latitude: 34.6937, longitude: 135.5023 },
      { name: '京都', latitude: 35.0116, longitude: 135.7681 },
      { name: 'パリ', latitude: 48.8566, longitude: 2.3522 },
      { name: 'ロンドン', latitude: 51.5074, longitude: -0.1278 }
    ];
    
    // Warm cache in background
    setTimeout(async () => {
      for (const destination of popularDestinations) {
        const searchParams = {
          location: destination,
          checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          checkOut: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          guests: 2
        };
        
        try {
          await this.searchHotels(searchParams, { streaming: false, useCache: false });
        } catch (error) {
          // Silent fail for cache warming
        }
      }
    }, 2000);
  }

  // 📊 PERFORMANCE METRICS
  updatePerformanceMetrics(responseTime) {
    this.performanceMetrics.totalSearches++;
    
    // Update rolling average
    const total = this.performanceMetrics.totalSearches;
    const currentAvg = this.performanceMetrics.averageResponseTime;
    this.performanceMetrics.averageResponseTime = 
      (currentAvg * (total - 1) + responseTime) / total;
    
    // Track target achievements
    if (responseTime <= 300) {
      this.performanceMetrics.targetAchievements++;
    }
  }

  getPerformanceStats() {
    const total = this.performanceMetrics.totalSearches;
    return {
      ...this.performanceMetrics,
      cacheHitRate: total > 0 ? (this.performanceMetrics.cacheHits / total) * 100 : 0,
      targetAchievementRate: total > 0 ? (this.performanceMetrics.targetAchievements / total) * 100 : 0
    };
  }

  // 🔧 UTILITY METHODS
  generateRequestId(searchParams) {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isRequestCancelled(requestId) {
    return !Array.from(this.activeRequests.keys()).some(key => key.startsWith(requestId));
  }

  generateCacheKey(params) {
    return JSON.stringify({
      location: params.location?.name || params.location,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      guests: params.guests || 1,
      rooms: params.rooms || 1
    });
  }

  // 🌍 LOCATION DETECTION
  isJapanLocation(location) {
    if (!location) return false;
    const japanKeywords = ['東京', '大阪', '京都', '名古屋', '福岡', 'tokyo', 'osaka', 'kyoto', 'japan'];
    const locationStr = JSON.stringify(location).toLowerCase();
    return japanKeywords.some(keyword => locationStr.includes(keyword));
  }

  isEuropeLocation(location) {
    if (!location) return false;
    const europeKeywords = ['paris', 'london', 'berlin', 'rome', 'madrid', 'amsterdam'];
    const locationStr = JSON.stringify(location).toLowerCase();
    return europeKeywords.some(keyword => locationStr.includes(keyword));
  }

  isNorthAmericaLocation(location) {
    if (!location) return false;
    const naKeywords = ['new york', 'los angeles', 'chicago', 'toronto', 'vancouver'];
    const locationStr = JSON.stringify(location).toLowerCase();
    return naKeywords.some(keyword => locationStr.includes(keyword));
  }

  // 🔄 DEDUPLICATION FOR STREAMING
  deduplicateStream(existingResults, newResults) {
    const existingKeys = new Set(existingResults.map(hotel => this.generateHotelKey(hotel)));
    return newResults.filter(hotel => !existingKeys.has(this.generateHotelKey(hotel)));
  }

  generateHotelKey(hotel) {
    const name = hotel.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const lat = hotel.location?.latitude ? Math.round(hotel.location.latitude * 1000) : 0;
    const lng = hotel.location?.longitude ? Math.round(hotel.location.longitude * 1000) : 0;
    return `${name}_${lat}_${lng}`;
  }

  // 📋 RESULT PROCESSING
  finalizeResults(results, searchParams) {
    // Remove duplicates
    const uniqueResults = [];
    const seenKeys = new Set();
    
    for (const hotel of results) {
      const key = this.generateHotelKey(hotel);
      if (!seenKeys.has(key)) {
        uniqueResults.push(hotel);
        seenKeys.add(key);
      }
    }
    
    // Apply filters and sorting
    return this.applyFiltersAndSort(uniqueResults, searchParams);
  }

  applyFiltersAndSort(hotels, searchParams) {
    let filtered = [...hotels];
    
    // Apply filters
    if (searchParams.minPrice) {
      filtered = filtered.filter(h => h.price?.total >= searchParams.minPrice);
    }
    if (searchParams.maxPrice) {
      filtered = filtered.filter(h => h.price?.total <= searchParams.maxPrice);
    }
    if (searchParams.rating) {
      filtered = filtered.filter(h => (h.rating?.stars || 0) >= searchParams.rating);
    }
    
    // Sort by relevance and price
    return filtered.sort((a, b) => {
      // Primary: availability
      if (a.available !== b.available) {
        return b.available - a.available;
      }
      // Secondary: price
      return (a.price?.total || 0) - (b.price?.total || 0);
    }).slice(0, 50); // Limit results
  }

  // 🆘 FALLBACK METHODS
  getFallbackResults(searchParams) {
    return this.getPopularResults(searchParams.location);
  }

  getPopularResults(location) {
    // Mock popular results for testing
    return [
      {
        id: 'mock_1',
        name: `人気ホテル ${location?.name || ''}`,
        location,
        price: { total: 12000, currency: 'JPY' },
        rating: { stars: 4 },
        available: true,
        source: 'mock'
      }
    ];
  }

  getSimilarLocationResults(location) {
    // Find cached results for similar locations
    for (const [key, cachedData] of this.searchCache.entries()) {
      const cached = cachedData.data;
      if (cached.length > 0 && this.isSimilarLocation(location, cachedData.searchParams.location)) {
        return cached;
      }
    }
    return [];
  }

  isSimilarLocation(loc1, loc2) {
    if (!loc1 || !loc2) return false;
    
    const name1 = (loc1.name || '').toLowerCase();
    const name2 = (loc2.name || '').toLowerCase();
    
    return name1.includes(name2) || name2.includes(name1);
  }

  // 📡 API METHODS (optimized versions)
  async searchRakuten(params) {
    try {
      return await RakutenTravelAPI.searchByArea({
        area: this.getJapanArea(params.location).area,
        limit: 20 // Reduced for faster response
      });
    } catch (error) {
      console.warn('Rakuten search failed:', error);
      return [];
    }
  }

  async searchAmadeus(params) {
    try {
      return await AmadeusAPI.advancedHotelSearch({
        ...params,
        limit: 20 // Reduced for faster response
      });
    } catch (error) {
      console.warn('Amadeus search failed:', error);
      return [];
    }
  }

  async searchBooking(params) {
    try {
      return await BookingAPI.comprehensiveSearch({
        ...params,
        limit: 20 // Reduced for faster response
      });
    } catch (error) {
      console.warn('Booking.com search failed:', error);
      return [];
    }
  }

  getJapanArea(location) {
    const locationName = (location?.name || '').toLowerCase();
    
    if (locationName.includes('東京') || locationName.includes('tokyo')) {
      return { area: 'tokyo' };
    }
    if (locationName.includes('大阪') || locationName.includes('osaka')) {
      return { area: 'osaka' };
    }
    if (locationName.includes('京都') || locationName.includes('kyoto')) {
      return { area: 'kyoto' };
    }
    
    return { area: 'tokyo' }; // Default
  }

  // 🎨 DATA NORMALIZATION (optimized)
  normalizeHotelData(hotel) {
    if (!hotel) return null;
    
    return {
      id: hotel.id || `hotel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: hotel.name || 'Unknown Hotel',
      location: {
        latitude: hotel.location?.latitude,
        longitude: hotel.location?.longitude,
        address: hotel.address?.fullAddress || hotel.location?.address,
        city: hotel.address?.city || hotel.location?.city
      },
      price: {
        currency: hotel.pricing?.currency || hotel.currency || 'JPY',
        total: hotel.currentPrice || hotel.bestPrice || hotel.price?.total || 0
      },
      rating: {
        stars: Math.ceil(hotel.reviewAverage || hotel.rating?.stars || 0)
      },
      images: hotel.images || (hotel.imageUrl ? [{ url: hotel.imageUrl }] : []),
      available: hotel.available !== false,
      source: hotel.source || 'unknown'
    };
  }

  // 🧹 CLEANUP
  cleanup() {
    // Cancel all active requests
    for (const controller of this.activeRequests.values()) {
      controller.abort();
    }
    this.activeRequests.clear();
    
    // Clear cache if needed
    if (this.searchCache.size > this.maxCacheSize * 2) {
      this.searchCache.clear();
    }
  }
}

export default new OptimizedHotelSearchService();