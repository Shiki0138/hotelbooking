import { getPrisma } from './databaseService';
import { cache } from './cacheService';
import { AdvancedSearchFilters } from '../types/search';
import { logger, loggers } from '../utils/logger';

interface SearchIndex {
  hotelId: string;
  searchVector: string;
  amenitiesSet: Set<string>;
  priceRange: { min: number; max: number };
  location: { lat: number; lng: number };
  propertyType: string;
  starRating: number;
  rating: number;
}

export class SearchOptimizationService {
  private prisma = getPrisma();
  private searchIndexCache: Map<string, SearchIndex> = new Map();
  
  // Initialize search indexes
  async initializeSearchIndexes(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Create text search indexes if not exists
      await this.createDatabaseIndexes();
      
      // Load frequently accessed data into memory
      await this.loadSearchIndexCache();
      
      const duration = Date.now() - startTime;
      loggers.logPerformance('search_index_initialization', duration);
      
      logger.info(`Search indexes initialized in ${duration}ms`);
    } catch (error) {
      logger.error('Failed to initialize search indexes', error);
    }
  }
  
  // Create optimized database indexes
  private async createDatabaseIndexes(): Promise<void> {
    if (!this.prisma) {
      return;
    }
    
    // GIN index for full-text search
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_hotel_search_vector 
      ON "Hotel" USING GIN (to_tsvector('english', name || ' ' || description || ' ' || city));
    `);
    
    // GIST index for geographic queries
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_hotel_location 
      ON "Hotel" USING GIST (point(longitude, latitude));
    `);
    
    // Composite indexes for common filter combinations
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_hotel_filters 
      ON "Hotel" (city, "propertyType", "starRating", rating);
    `);
    
    // Index for availability queries
    await this.prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_availability_search 
      ON "Availability" (date, available) WHERE available > 0;
    `);
  }
  
  // Load search index cache
  private async loadSearchIndexCache(): Promise<void> {
    if (!this.prisma) {
      return;
    }
    
    const hotels = await this.prisma.$queryRaw<any[]>`
      SELECT 
        h.id,
        h.name,
        h.description,
        h.city,
        h.amenities,
        h."propertyType",
        h."starRating",
        h.rating,
        h.latitude,
        h.longitude,
        MIN(r."basePrice") as "minPrice",
        MAX(r."basePrice") as "maxPrice"
      FROM "Hotel" h
      LEFT JOIN "Room" r ON r."hotelId" = h.id
      GROUP BY h.id
    `;
    
    hotels.forEach(hotel => {
      this.searchIndexCache.set(hotel.id, {
        hotelId: hotel.id,
        searchVector: `${hotel.name} ${hotel.description} ${hotel.city}`.toLowerCase(),
        amenitiesSet: new Set(hotel.amenities),
        priceRange: { min: hotel.minPrice || 0, max: hotel.maxPrice || 999999 },
        location: { lat: hotel.latitude, lng: hotel.longitude },
        propertyType: hotel.propertyType,
        starRating: hotel.starRating,
        rating: hotel.rating
      });
    });
  }
  
  // Optimized multi-criteria search
  async performOptimizedSearch(
    filters: AdvancedSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const startTime = Date.now();
    
    // Build optimized query
    const query = this.buildOptimizedQuery(filters);
    
    // Execute parallel queries for better performance
    const [results, total, facets] = await Promise.all([
      this.executeSearchQuery(query, page, limit),
      this.countResults(query),
      this.calculateFacets(filters)
    ]);
    
    const duration = Date.now() - startTime;
    loggers.logPerformance('optimized_search', duration, {
      filterCount: Object.keys(filters).length,
      resultCount: results.length
    });
    
    return {
      results,
      total,
      facets,
      performanceMetrics: {
        searchTime: duration,
        cached: false
      }
    };
  }
  
  // Build optimized query using indexes
  private buildOptimizedQuery(filters: AdvancedSearchFilters): any {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Use full-text search for city/country
    if (filters.city || filters.country) {
      const searchTerm = `${filters.city || ''} ${filters.country || ''}`.trim();
      conditions.push(`
        to_tsvector('english', h.name || ' ' || h.description || ' ' || h.city || ' ' || h.country) 
        @@ plainto_tsquery('english', $${paramIndex})
      `);
      params.push(searchTerm);
      paramIndex++;
    }
    
    // Use indexed columns for filters
    if (filters.propertyTypes?.length) {
      conditions.push(`h."propertyType" = ANY($${paramIndex})`);
      params.push(filters.propertyTypes);
      paramIndex++;
    }
    
    if (filters.starRatings?.length) {
      conditions.push(`h."starRating" = ANY($${paramIndex})`);
      params.push(filters.starRatings);
      paramIndex++;
    }
    
    if (filters.ratings?.minRating) {
      conditions.push(`h.rating >= $${paramIndex}`);
      params.push(filters.ratings.minRating);
      paramIndex++;
    }
    
    // Geographic search using GIST index
    if (filters.location?.maxDistanceFromCenter) {
      conditions.push(`
        ST_DWithin(
          ST_MakePoint(h.longitude, h.latitude)::geography,
          ST_MakePoint($${paramIndex}, $${paramIndex + 1})::geography,
          $${paramIndex + 2}
        )
      `);
      params.push(0, 0, filters.location.maxDistanceFromCenter * 1000); // Convert km to meters
      paramIndex += 3;
    }
    
    // Amenities using GIN index
    if (filters.hotelAmenities) {
      const requiredAmenities = Object.entries(filters.hotelAmenities)
        .filter(([_, required]) => required)
        .map(([amenity]) => amenity);
      
      if (requiredAmenities.length > 0) {
        conditions.push(`h.amenities @> $${paramIndex}`);
        params.push(requiredAmenities);
        paramIndex++;
      }
    }
    
    return { conditions, params };
  }
  
  // Execute search with query plan optimization
  private async executeSearchQuery(
    query: any,
    page: number,
    limit: number
  ): Promise<any[]> {
    const offset = (page - 1) * limit;
    const { conditions, params } = query;
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Use CTE for better query plan
    const sql = `
      WITH filtered_hotels AS (
        SELECT DISTINCT h.*, 
               MIN(a.price) OVER (PARTITION BY h.id) as min_price,
               COUNT(*) OVER () as total_count
        FROM "Hotel" h
        INNER JOIN "Room" r ON r."hotelId" = h.id
        INNER JOIN "Availability" a ON a."roomId" = r.id
        ${whereClause}
        AND a.date >= CURRENT_DATE
        AND a.available > 0
      )
      SELECT * FROM filtered_hotels
      ORDER BY min_price ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
    
    if (!this.prisma) {
      return [];
    }
    
    if (!this.prisma) {
      return [];
    }
    
    return await this.prisma.$queryRawUnsafe(sql, ...params);
  }
  
  // Count results efficiently
  private async countResults(query: any): Promise<number> {
    const { conditions, params } = query;
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const sql = `
      SELECT COUNT(DISTINCT h.id) as count
      FROM "Hotel" h
      ${whereClause}
    `;
    
    if (!this.prisma) {
      return 0;
    }
    
    const result = await this.prisma.$queryRawUnsafe(sql, ...params) as any[];
    return Number(result[0]?.count || 0);
  }
  
  // Calculate facets for filter refinement
  private async calculateFacets(filters: AdvancedSearchFilters): Promise<any> {
    const modifiedFilters = { ...filters };
    delete modifiedFilters.propertyTypes;
    delete modifiedFilters.starRatings;
    delete modifiedFilters.hotelAmenities;
    
    const baseConditions = this.buildOptimizedQuery(modifiedFilters);
    
    // Parallel facet calculations
    const [propertyTypes, starRatings, priceRanges, amenities] = await Promise.all([
      this.calculatePropertyTypeFacets(baseConditions),
      this.calculateStarRatingFacets(baseConditions),
      this.calculatePriceRangeFacets(baseConditions),
      this.calculateAmenityFacets(baseConditions)
    ]);
    
    return {
      propertyTypes,
      starRatings,
      priceRanges,
      amenities
    };
  }
  
  // Calculate property type facets
  private async calculatePropertyTypeFacets(baseQuery: any): Promise<any[]> {
    const { conditions, params } = baseQuery;
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const sql = `
      SELECT h."propertyType" as value, COUNT(DISTINCT h.id) as count
      FROM "Hotel" h
      ${whereClause}
      GROUP BY h."propertyType"
      ORDER BY count DESC
    `;
    
    if (!this.prisma) {
      return [];
    }
    
    return await this.prisma.$queryRawUnsafe(sql, ...params);
  }
  
  // Calculate star rating facets
  private async calculateStarRatingFacets(baseQuery: any): Promise<any[]> {
    const { conditions, params } = baseQuery;
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const sql = `
      SELECT h."starRating" as value, COUNT(DISTINCT h.id) as count
      FROM "Hotel" h
      ${whereClause}
      GROUP BY h."starRating"
      ORDER BY h."starRating" DESC
    `;
    
    if (!this.prisma) {
      return [];
    }
    
    return await this.prisma.$queryRawUnsafe(sql, ...params);
  }
  
  // Calculate price range facets
  private async calculatePriceRangeFacets(baseQuery: any): Promise<any> {
    const { conditions, params } = baseQuery;
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const sql = `
      SELECT 
        MIN(r."basePrice") as min,
        MAX(r."basePrice") as max,
        AVG(r."basePrice") as avg,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY r."basePrice") as q1,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r."basePrice") as median,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY r."basePrice") as q3
      FROM "Hotel" h
      INNER JOIN "Room" r ON r."hotelId" = h.id
      ${whereClause}
    `;
    
    if (!this.prisma) {
      return {};
    }
    
    const result = await this.prisma.$queryRawUnsafe(sql, ...params) as any[];
    return result[0];
  }
  
  // Calculate amenity facets
  private async calculateAmenityFacets(baseQuery: any): Promise<any[]> {
    const { conditions, params } = baseQuery;
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const sql = `
      SELECT amenity, COUNT(*) as count
      FROM (
        SELECT h.id, unnest(h.amenities) as amenity
        FROM "Hotel" h
        ${whereClause}
      ) t
      GROUP BY amenity
      ORDER BY count DESC
      LIMIT 20
    `;
    
    if (!this.prisma) {
      return [];
    }
    
    return await this.prisma.$queryRawUnsafe(sql, ...params);
  }
  
  // Pre-warm cache for popular searches
  async prewarmSearchCache(): Promise<void> {
    const popularSearches = await this.getPopularSearchCombinations();
    
    for (const search of popularSearches) {
      const cacheKey = `search:${JSON.stringify(search)}`;
      const cached = await cache.get(cacheKey);
      
      if (!cached) {
        const results = await this.performOptimizedSearch(search);
        await cache.set(cacheKey, results, 1800); // 30 minutes
      }
    }
    
    logger.info(`Pre-warmed cache for ${popularSearches.length} popular searches`);
  }
  
  // Get popular search combinations
  private async getPopularSearchCombinations(): Promise<AdvancedSearchFilters[]> {
    if (!this.prisma) {
      return [];
    }
    
    const popularCities = await this.prisma.$queryRaw<{ city: string }[]>`
      SELECT city, COUNT(*) as count
      FROM "SearchHistory"
      WHERE timestamp > NOW() - INTERVAL '7 days'
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `;
    
    // Generate common search combinations
    const searches: AdvancedSearchFilters[] = [];
    const commonDateRanges = [
      { days: 1, label: '1 night' },
      { days: 2, label: '2 nights' },
      { days: 3, label: '3 nights' },
      { days: 7, label: '1 week' }
    ];
    
    popularCities.forEach(({ city }) => {
      commonDateRanges.forEach(({ days }) => {
        const checkIn = new Date();
        checkIn.setDate(checkIn.getDate() + 7); // Week from now
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + days);
        
        searches.push({
          city,
          checkIn,
          checkOut,
          guests: 2
        });
      });
    });
    
    return searches;
  }
}