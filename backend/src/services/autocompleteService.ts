import { getPrisma } from './databaseService';
import { cache } from './cacheService';
import { logger } from '../utils/logger';

interface AutocompleteResult {
  id: string;
  type: 'city' | 'hotel' | 'landmark' | 'area';
  text: string;
  displayText: string;
  subtitle?: string;
  score: number;
  metadata?: {
    country?: string;
    hotelCount?: number;
    coordinates?: { lat: number; lng: number };
    starRating?: number;
    rating?: number;
  };
}

interface UserSearchHistory {
  userId?: string;
  recentSearches: string[];
  frequentSearches: Record<string, number>;
}

export class AutocompleteService {
  private prisma = getPrisma();
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly RESULTS_LIMIT = 10;
  
  // Main autocomplete function with optimized performance
  async getAutocompleteSuggestions(
    query: string,
    userId?: string,
    limit: number = 10
  ): Promise<AutocompleteResult[]> {
    const startTime = Date.now();
    
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `autocomplete:${normalizedQuery}:${userId || 'anonymous'}`;
    
    // Check cache first
    const cached = await cache.get<AutocompleteResult[]>(cacheKey);
    if (cached) {
      logger.debug(`Autocomplete cache hit: ${normalizedQuery} (${Date.now() - startTime}ms)`);
      return cached.slice(0, limit);
    }
    
    // Get suggestions from multiple sources in parallel
    const [
      cityResults,
      hotelResults,
      landmarkResults,
      historyResults
    ] = await Promise.all([
      this.getCitySuggestions(normalizedQuery),
      this.getHotelSuggestions(normalizedQuery),
      this.getLandmarkSuggestions(normalizedQuery),
      userId ? this.getHistoryBasedSuggestions(normalizedQuery, userId) : Promise.resolve([])
    ]);
    
    // Combine and score results
    const allResults = [
      ...historyResults, // History gets highest priority
      ...cityResults,
      ...hotelResults,
      ...landmarkResults
    ];
    
    // Remove duplicates and sort by score
    const uniqueResults = this.deduplicateAndScore(allResults, normalizedQuery);
    const finalResults = uniqueResults.slice(0, limit);
    
    // Cache results
    await cache.set(cacheKey, finalResults, this.CACHE_TTL);
    
    const duration = Date.now() - startTime;
    logger.debug(`Autocomplete completed: ${normalizedQuery} (${duration}ms, ${finalResults.length} results)`);
    
    return finalResults;
  }
  
  // Optimized city suggestions with full-text search
  private async getCitySuggestions(query: string): Promise<AutocompleteResult[]> {
    if (!this.prisma) {
      return [];
    }
    
    const cities = await this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT
        city,
        country,
        COUNT(h.id) as hotel_count,
        AVG(h.latitude) as avg_lat,
        AVG(h.longitude) as avg_lng,
        ts_rank_cd(to_tsvector('english', city || ' ' || country), plainto_tsquery('english', ${query})) as rank
      FROM "Hotel" h
      WHERE to_tsvector('english', city || ' ' || country) @@ plainto_tsquery('english', ${query})
        OR city ILIKE ${`%${query}%`}
        OR country ILIKE ${`%${query}%`}
      GROUP BY city, country
      ORDER BY rank DESC, hotel_count DESC
      LIMIT ${this.RESULTS_LIMIT}
    `;
    
    return cities.map((city: any) => ({
      id: `city:${city.city}:${city.country}`,
      type: 'city' as const,
      text: `${city.city}, ${city.country}`,
      displayText: city.city,
      subtitle: `${city.country} • ${city.hotel_count}件のホテル`,
      score: Number(city.rank) * 100 + Math.min(Number(city.hotel_count), 50),
      metadata: {
        country: city.country,
        hotelCount: Number(city.hotel_count),
        coordinates: {
          lat: Number(city.avg_lat),
          lng: Number(city.avg_lng)
        }
      }
    }));
  }
  
  // Optimized hotel suggestions
  private async getHotelSuggestions(query: string): Promise<AutocompleteResult[]> {
    if (!this.prisma) {
      return [];
    }
    
    const hotels = await this.prisma.$queryRaw<any[]>`
      SELECT
        id,
        name,
        city,
        country,
        "starRating",
        rating,
        latitude,
        longitude,
        ts_rank_cd(to_tsvector('english', name || ' ' || city), plainto_tsquery('english', ${query})) as rank
      FROM "Hotel"
      WHERE to_tsvector('english', name || ' ' || city) @@ plainto_tsquery('english', ${query})
        OR name ILIKE ${`%${query}%`}
      ORDER BY rank DESC, rating DESC, "reviewCount" DESC
      LIMIT ${this.RESULTS_LIMIT}
    `;
    
    return hotels.map((hotel: any) => ({
      id: `hotel:${hotel.id}`,
      type: 'hotel' as const,
      text: hotel.name,
      displayText: hotel.name,
      subtitle: `${hotel.city}, ${hotel.country} • ⭐${hotel.starRating} • 評価${hotel.rating.toFixed(1)}`,
      score: Number(hotel.rank) * 80 + hotel.rating * 10,
      metadata: {
        country: hotel.country,
        starRating: hotel.starRating,
        rating: hotel.rating,
        coordinates: {
          lat: hotel.latitude,
          lng: hotel.longitude
        }
      }
    }));
  }
  
  // Landmark and area suggestions
  private async getLandmarkSuggestions(query: string): Promise<AutocompleteResult[]> {
    // Popular landmarks and areas (could be expanded with a dedicated table)
    const landmarks = [
      { name: '東京駅', city: '東京', country: '日本', type: 'station' },
      { name: '新宿', city: '東京', country: '日本', type: 'area' },
      { name: '渋谷', city: '東京', country: '日本', type: 'area' },
      { name: '浅草', city: '東京', country: '日本', type: 'area' },
      { name: '銀座', city: '東京', country: '日本', type: 'area' },
      { name: '大阪駅', city: '大阪', country: '日本', type: 'station' },
      { name: '梅田', city: '大阪', country: '日本', type: 'area' },
      { name: '難波', city: '大阪', country: '日本', type: 'area' },
      { name: '京都駅', city: '京都', country: '日本', type: 'station' },
      { name: '祇園', city: '京都', country: '日本', type: 'area' }
    ];
    
    const matches = landmarks.filter(landmark => 
      landmark.name.toLowerCase().includes(query) ||
      landmark.city.toLowerCase().includes(query)
    );
    
    return matches.map(landmark => ({
      id: `landmark:${landmark.name}:${landmark.city}`,
      type: 'landmark' as const,
      text: `${landmark.name}, ${landmark.city}`,
      displayText: landmark.name,
      subtitle: `${landmark.city}, ${landmark.country} • ${landmark.type === 'station' ? '駅' : 'エリア'}`,
      score: 50,
      metadata: {
        country: landmark.country
      }
    }));
  }
  
  // History-based personalized suggestions
  private async getHistoryBasedSuggestions(
    query: string,
    userId: string
  ): Promise<AutocompleteResult[]> {
    const historyKey = `search-history:${userId}`;
    const history = await cache.get<UserSearchHistory>(historyKey);
    
    if (!history) return [];
    
    const results: AutocompleteResult[] = [];
    
    // Check recent searches
    history.recentSearches.forEach((search, index) => {
      if (search.toLowerCase().includes(query)) {
        results.push({
          id: `history:recent:${search}`,
          type: 'city',
          text: search,
          displayText: search,
          subtitle: '最近の検索',
          score: 200 - index * 10 // More recent = higher score
        });
      }
    });
    
    // Check frequent searches
    Object.entries(history.frequentSearches).forEach(([search, count]) => {
      if (search.toLowerCase().includes(query) && 
          !results.find(r => r.text === search)) {
        results.push({
          id: `history:frequent:${search}`,
          type: 'city',
          text: search,
          displayText: search,
          subtitle: `よく検索 (${count}回)`,
          score: 150 + Math.min(count * 5, 50)
        });
      }
    });
    
    return results;
  }
  
  // Remove duplicates and apply final scoring
  private deduplicateAndScore(
    results: AutocompleteResult[],
    query: string
  ): AutocompleteResult[] {
    const seen = new Set<string>();
    const unique: AutocompleteResult[] = [];
    
    // Sort by score first
    results.sort((a, b) => b.score - a.score);
    
    for (const result of results) {
      const key = `${result.type}:${result.text.toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        
        // Boost score for exact matches
        if (result.displayText.toLowerCase().startsWith(query)) {
          result.score += 100;
        }
        
        // Boost score for exact prefix match
        const words = result.displayText.toLowerCase().split(' ');
        if (words.some(word => word.startsWith(query))) {
          result.score += 50;
        }
        
        unique.push(result);
      }
    }
    
    return unique.sort((a, b) => b.score - a.score);
  }
  
  // Update user search history
  async updateSearchHistory(userId: string, searchTerm: string): Promise<void> {
    const historyKey = `search-history:${userId}`;
    const history = await cache.get<UserSearchHistory>(historyKey) || {
      recentSearches: [],
      frequentSearches: {}
    };
    
    // Update recent searches
    history.recentSearches = history.recentSearches.filter(s => s !== searchTerm);
    history.recentSearches.unshift(searchTerm);
    history.recentSearches = history.recentSearches.slice(0, 10); // Keep last 10
    
    // Update frequent searches
    history.frequentSearches[searchTerm] = (history.frequentSearches[searchTerm] || 0) + 1;
    
    // Keep only top 20 frequent searches
    const sortedFrequent = Object.entries(history.frequentSearches)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    history.frequentSearches = Object.fromEntries(sortedFrequent);
    
    await cache.set(historyKey, history, 86400 * 30); // 30 days
  }
  
  // Pre-warm cache for popular searches
  async prewarmAutocompleteCache(): Promise<void> {
    const popularTerms = [
      '東京', '大阪', '京都', '福岡', '札幌', '名古屋',
      'Tokyo', 'Osaka', 'Kyoto', '新宿', '渋谷', '銀座'
    ];
    
    await Promise.all(
      popularTerms.map(term => 
        this.getAutocompleteSuggestions(term).catch(err =>
          logger.error(`Failed to prewarm autocomplete for "${term}"`, err)
        )
      )
    );
    
    logger.info(`Pre-warmed autocomplete cache for ${popularTerms.length} popular terms`);
  }
}