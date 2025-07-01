import { Hotel, Prisma } from '@prisma/client';
import { getPrisma } from './databaseService';
import { cache } from './cacheService';
import { 
  AdvancedSearchFilters, 
  SortOptions, 
  SearchAggregations,
  PriceDistribution,
  SearchSuggestion
} from '../types/search';
import { PaginatedResponse } from '../types';
import { logger } from '../utils/logger';

export class AdvancedSearchService {
  private prisma = getPrisma();
  
  async searchHotels(
    filters: AdvancedSearchFilters,
    sortOptions: SortOptions,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Hotel & { score: number; minPrice: number }>> {
    const cacheKey = `advanced-search:${JSON.stringify({ filters, sortOptions, page, limit })}`;
    const cached = await cache.get<PaginatedResponse<Hotel & { score: number; minPrice: number }>>(cacheKey);
    
    if (cached && process.env.NODE_ENV === 'production') {
      logger.debug('Returning cached advanced search results');
      return cached;
    }
    
    // Build complex where clause
    const whereClause = this.buildWhereClause(filters);
    
    // Build dynamic query with scoring
    const hotels = await this.executeSearchQuery(
      whereClause,
      filters,
      sortOptions,
      page,
      limit
    );
    
    const total = await this.countSearchResults(whereClause, filters);
    
    const result = {
      data: hotels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
    
    // Cache for shorter time for dynamic searches
    await cache.set(cacheKey, result, 300); // 5 minutes
    
    return result;
  }
  
  private buildWhereClause(filters: AdvancedSearchFilters): Prisma.HotelWhereInput {
    const where: Prisma.HotelWhereInput = {};
    
    // Basic filters
    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters.country) {
      where.country = { contains: filters.country, mode: 'insensitive' };
    }
    
    // Property types
    if (filters.propertyTypes?.length) {
      where.propertyType = { in: filters.propertyTypes };
    }
    
    // Star ratings
    if (filters.starRatings?.length) {
      where.starRating = { in: filters.starRatings };
    }
    
    // Minimum rating
    if (filters.ratings?.minRating) {
      where.rating = { gte: filters.ratings.minRating };
    }
    
    // Hotel amenities
    if (filters.hotelAmenities) {
      const requiredAmenities: string[] = [];
      Object.entries(filters.hotelAmenities).forEach(([amenity, required]) => {
        if (required) requiredAmenities.push(amenity);
      });
      if (requiredAmenities.length > 0) {
        where.amenities = { hasEvery: requiredAmenities };
      }
    }
    
    // Location filters
    if (filters.location) {
      const locationConditions: Prisma.HotelWhereInput[] = [];
      
      if (filters.location.cityCenter) {
        locationConditions.push({ distanceFromCenter: { lte: 2 } });
      }
      if (filters.location.maxDistanceFromCenter) {
        locationConditions.push({ 
          distanceFromCenter: { lte: filters.location.maxDistanceFromCenter } 
        });
      }
      if (filters.location.nearBeach) {
        locationConditions.push({ tags: { has: 'beach-nearby' } });
      }
      if (filters.location.nearAirport) {
        locationConditions.push({ tags: { has: 'airport-nearby' } });
      }
      
      if (locationConditions.length > 0) {
        where.AND = locationConditions;
      }
    }
    
    return where;
  }
  
  private async executeSearchQuery(
    whereClause: Prisma.HotelWhereInput,
    filters: AdvancedSearchFilters,
    sortOptions: SortOptions,
    page: number,
    limit: number
  ): Promise<(Hotel & { score: number; minPrice: number })[]> {
    const skip = (page - 1) * limit;
    
    // Build scoring formula
    const scoringFormula = this.buildScoringFormula(filters);
    
    // Execute query with dynamic scoring
    const query = `
      WITH hotel_scores AS (
        SELECT DISTINCT 
          h.*,
          MIN(a.price) as "minPrice",
          ${scoringFormula} as score
        FROM "Hotel" h
        INNER JOIN "Room" r ON r."hotelId" = h.id
        INNER JOIN "Availability" a ON a."roomId" = r.id
        WHERE 
          a.date >= $1::date
          AND a.date < $2::date
          AND a.available >= 1
          AND r.capacity >= $3
          ${filters.priceRange ? `AND a.price >= $4 AND a.price <= $5` : ''}
          ${this.buildWhereSQL(whereClause)}
        GROUP BY h.id
        HAVING COUNT(DISTINCT a.date) = $6
      )
      SELECT * FROM hotel_scores
      ORDER BY ${this.getSortColumn(sortOptions.sortBy)} ${sortOptions.sortOrder}
      LIMIT $7 OFFSET $8
    `;
    
    const nights = Math.ceil((filters.checkOut.getTime() - filters.checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    const params: any[] = [
      filters.checkIn,
      filters.checkOut,
      filters.guests,
      ...(filters.priceRange ? [filters.priceRange.min, filters.priceRange.max] : []),
      nights,
      limit,
      skip
    ];
    
    if (!this.prisma) {
      return [];
    }
    
    const result = await this.prisma.$queryRawUnsafe(query, ...params);
    return result as (Hotel & { score: number; minPrice: number })[];
  }
  
  private buildScoringFormula(filters: AdvancedSearchFilters): string {
    // Build a relevance score based on multiple factors
    const scoreComponents: string[] = [];
    
    // Base score from rating
    scoreComponents.push('(h.rating * 20)');
    
    // Bonus for matching amenities
    if (filters.hotelAmenities) {
      Object.entries(filters.hotelAmenities).forEach(([amenity, required]) => {
        if (required) {
          scoreComponents.push(`(CASE WHEN '${amenity}' = ANY(h.amenities) THEN 10 ELSE 0 END)`);
        }
      });
    }
    
    // Review count influence
    scoreComponents.push('(LEAST(h."reviewCount" / 100.0, 10))');
    
    // Location score
    if (filters.location?.cityCenter) {
      scoreComponents.push('(CASE WHEN h."distanceFromCenter" < 1 THEN 20 ELSE 0 END)');
    }
    
    // Price competitiveness (inverse relationship)
    scoreComponents.push('(100 - (MIN(a.price) / 10))');
    
    return scoreComponents.join(' + ');
  }
  
  private buildWhereSQL(whereClause: Prisma.HotelWhereInput): string {
    const conditions: string[] = [];
    
    if (whereClause.city && typeof whereClause.city === 'object' && 'contains' in whereClause.city) {
      conditions.push(`h.city ILIKE '%${whereClause.city.contains}%'`);
    }
    if (whereClause.country && typeof whereClause.country === 'object' && 'contains' in whereClause.country) {
      conditions.push(`h.country ILIKE '%${whereClause.country.contains}%'`);
    }
    if (whereClause.rating && typeof whereClause.rating === 'object' && 'gte' in whereClause.rating) {
      conditions.push(`h.rating >= ${whereClause.rating.gte}`);
    }
    
    return conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  }
  
  private getSortColumn(sortBy: string): string {
    const sortMap: Record<string, string> = {
      price: '"minPrice"',
      rating: 'rating',
      distance: '"distanceFromCenter"',
      popularity: '"reviewCount"',
      deals: '(100 - "minPrice")',
      reviewScore: 'rating',
      newest: '"createdAt"',
      score: 'score'
    };
    
    return sortMap[sortBy] || 'score';
  }
  
  private async countSearchResults(
    whereClause: Prisma.HotelWhereInput,
    filters: AdvancedSearchFilters
  ): Promise<number> {
    if (!this.prisma) {
      return 0;
    }
    
    const count = await this.prisma.hotel.count({
      where: {
        ...whereClause,
        rooms: {
          some: {
            capacity: { gte: filters.guests },
            availabilities: {
              some: {
                date: { gte: filters.checkIn, lt: filters.checkOut },
                available: { gte: 1 }
              }
            }
          }
        }
      }
    });
    
    return count;
  }
  
  async getSearchAggregations(
    filters: AdvancedSearchFilters
  ): Promise<SearchAggregations> {
    const modifiedFilters = { ...filters };
    delete modifiedFilters.priceRange;
    
    const hotels = await this.searchHotels(
      modifiedFilters, // Get all for aggregation
      { sortBy: 'price', sortOrder: 'asc' },
      1,
      1000 // Get more for accurate aggregations
    );
    
    // Calculate price distribution
    const prices = hotels.data.map(h => h.minPrice);
    const priceDistribution = this.calculatePriceDistribution(prices);
    
    // Count amenities
    const amenitiesCount: Record<string, number> = {};
    hotels.data.forEach(hotel => {
      hotel.amenities?.forEach(amenity => {
        amenitiesCount[amenity] = (amenitiesCount[amenity] || 0) + 1;
      });
    });
    
    // Ratings distribution
    const ratingsDistribution: Record<number, number> = {};
    hotels.data.forEach(hotel => {
      const rating = Math.floor(hotel.rating || 0);
      ratingsDistribution[rating] = (ratingsDistribution[rating] || 0) + 1;
    });
    
    // Property types count
    const propertyTypesCount: Record<string, number> = {};
    hotels.data.forEach(hotel => {
      const type = (hotel as any).propertyType || 'hotel';
      propertyTypesCount[type] = (propertyTypesCount[type] || 0) + 1;
    });
    
    // Location clusters (simplified)
    const locationClusters = this.calculateLocationClusters(hotels.data);
    
    return {
      priceDistribution,
      amenitiesCount,
      ratingsDistribution,
      propertyTypesCount,
      locationClusters
    };
  }
  
  private calculatePriceDistribution(prices: number[]): PriceDistribution {
    if (prices.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        distribution: []
      };
    }
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Create price buckets
    const bucketSize = Math.ceil((max - min) / 5);
    const distribution = [];
    
    for (let i = 0; i < 5; i++) {
      const rangeMin = min + (i * bucketSize);
      const rangeMax = min + ((i + 1) * bucketSize);
      const count = prices.filter(p => p >= rangeMin && p < rangeMax).length;
      
      distribution.push({
        range: `¥${rangeMin.toLocaleString()} - ¥${rangeMax.toLocaleString()}`,
        count,
        percentage: (count / prices.length) * 100
      });
    }
    
    return { min, max, average, distribution };
  }
  
  private calculateLocationClusters(hotels: any[]): any[] {
    // Simplified clustering - group by city
    const clusters: Record<string, any> = {};
    
    hotels.forEach(hotel => {
      const city = hotel.city;
      if (!clusters[city]) {
        clusters[city] = {
          name: city,
          count: 0,
          latSum: 0,
          lngSum: 0
        };
      }
      clusters[city].count++;
      clusters[city].latSum += hotel.latitude;
      clusters[city].lngSum += hotel.longitude;
    });
    
    return Object.values(clusters).map(cluster => ({
      name: cluster.name,
      count: cluster.count,
      centerLat: cluster.latSum / cluster.count,
      centerLng: cluster.lngSum / cluster.count
    }));
  }
  
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    
    // Search cities
    if (!this.prisma) {
      return [];
    }
    
    const cities = await this.prisma.hotel.findMany({
      where: {
        city: { contains: query, mode: 'insensitive' }
      },
      select: {
        city: true,
        country: true
      },
      distinct: ['city'],
      take: 5
    });
    
    cities.forEach(city => {
      suggestions.push({
        type: 'city',
        value: city.city,
        displayName: `${city.city}, ${city.country}`,
        metadata: { country: city.country }
      });
    });
    
    // Search hotels
    if (!this.prisma) {
      return suggestions;
    }
    
    const hotels = await this.prisma.hotel.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' }
      },
      select: {
        id: true,
        name: true,
        city: true,
        latitude: true,
        longitude: true
      },
      take: 5
    });
    
    hotels.forEach(hotel => {
      suggestions.push({
        type: 'hotel',
        value: hotel.id,
        displayName: `${hotel.name} (${hotel.city})`,
        metadata: {
          coordinates: {
            lat: hotel.latitude,
            lng: hotel.longitude
          }
        }
      });
    });
    
    return suggestions;
  }
}