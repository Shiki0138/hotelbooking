import { Hotel } from '@prisma/client';
import { getPrisma } from './databaseService';
import { UserPreferenceService } from './userPreferenceService';
import { cache } from './cacheService';
import { logger } from '../utils/logger';
import { AdvancedSearchFilters } from '../types/search';

interface RecommendationScore {
  hotelId: string;
  score: number;
  reasons: string[];
}

interface RecommendationContext {
  userId: string;
  currentSearch?: AdvancedSearchFilters;
  excludeHotels?: string[];
  limit?: number;
}

export class RecommendationService {
  private prisma = getPrisma();
  private preferenceService = new UserPreferenceService();
  
  // Get personalized recommendations
  async getPersonalizedRecommendations(
    context: RecommendationContext
  ): Promise<(Hotel & { recommendationScore: number; reasons: string[] })[]> {
    const cacheKey = `recommendations:${context.userId}:${JSON.stringify(context)}`;
    const cached = await cache.get<(Hotel & { recommendationScore: number; reasons: string[] })[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    try {
      // Get user behavior and preferences
      const [userBehavior, favoriteHotels, searchHistory] = await Promise.all([
        this.preferenceService.getUserBehavior(context.userId),
        this.preferenceService.getFavoriteHotels(context.userId),
        this.preferenceService.getSearchHistory(context.userId, 20)
      ]);
      
      // Generate recommendations based on multiple factors
      const recommendations = await this.generateRecommendations(
        userBehavior,
        favoriteHotels,
        searchHistory,
        context
      );
      
      // Cache for 1 hour
      await cache.set(cacheKey, recommendations, 3600);
      
      logger.info(`Generated ${recommendations.length} recommendations for user ${context.userId}`);
      
      return recommendations;
    } catch (error) {
      logger.error('Failed to generate recommendations', error);
      return [];
    }
  }
  
  // Generate recommendations based on user data
  private async generateRecommendations(
    userBehavior: any,
    favoriteHotels: string[],
    _searchHistory: any[],
    context: RecommendationContext
  ): Promise<(Hotel & { recommendationScore: number; reasons: string[] })[]> {
    const scores: Map<string, RecommendationScore> = new Map();
    
    // 1. Content-based filtering from favorites
    if (favoriteHotels.length > 0) {
      await this.scoreBasedOnFavorites(favoriteHotels, scores);
    }
    
    // 2. Collaborative filtering from similar users
    await this.scoreBasedOnSimilarUsers(context.userId, scores);
    
    // 3. Location preference scoring
    if (userBehavior?.preferredCities) {
      await this.scoreBasedOnLocationPreferences(userBehavior.preferredCities, scores);
    }
    
    // 4. Amenity preference scoring
    if (userBehavior?.preferredAmenities) {
      await this.scoreBasedOnAmenityPreferences(userBehavior.preferredAmenities, scores);
    }
    
    // 5. Price range preference scoring
    if (userBehavior?.priceRange) {
      await this.scoreBasedOnPricePreferences(userBehavior.priceRange, scores);
    }
    
    // 6. Trending hotels scoring
    await this.scoreBasedOnTrending(scores);
    
    // 7. New hotels bonus
    await this.scoreNewHotels(scores);
    
    // Sort by score and fetch hotel details
    const topRecommendations = Array.from(scores.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, context.limit || 20);
    
    const hotelIds = topRecommendations.map(([id]) => id);
    
    if (!this.prisma) {
      return [];
    }
    
    const hotels = await this.prisma.hotel.findMany({
      where: {
        id: { in: hotelIds },
        ...(context.excludeHotels && {
          id: { notIn: context.excludeHotels }
        })
      },
      include: {
        rooms: {
          take: 1,
          orderBy: { basePrice: 'asc' }
        }
      }
    });
    
    // Map scores and reasons to hotels
    return hotels.map(hotel => ({
      ...hotel,
      recommendationScore: scores.get(hotel.id)?.score || 0,
      reasons: scores.get(hotel.id)?.reasons || []
    })).sort((a, b) => b.recommendationScore - a.recommendationScore);
  }
  
  // Score based on favorite hotels (content-based)
  private async scoreBasedOnFavorites(
    favoriteHotels: string[],
    scores: Map<string, RecommendationScore>
  ): Promise<void> {
    if (!this.prisma) {
      return;
    }
    
    const favorites = await this.prisma.hotel.findMany({
      where: { id: { in: favoriteHotels } }
    });
    
    if (favorites.length === 0) return;
    
    // Extract common features from favorites
    const commonAmenities: Record<string, number> = {};
    const commonCities: Record<string, number> = {};
    let avgRating = 0;
    let avgStarRating = 0;
    
    favorites.forEach(hotel => {
      hotel.amenities.forEach(amenity => {
        commonAmenities[amenity] = (commonAmenities[amenity] || 0) + 1;
      });
      commonCities[hotel.city] = (commonCities[hotel.city] || 0) + 1;
      avgRating += hotel.rating;
      avgStarRating += hotel.starRating;
    });
    
    avgRating /= favorites.length;
    avgStarRating /= favorites.length;
    
    // Find similar hotels
    if (!this.prisma) {
      return;
    }
    
    const similarHotels = await this.prisma.hotel.findMany({
      where: {
        OR: [
          { city: { in: Object.keys(commonCities) } },
          { amenities: { hasSome: Object.keys(commonAmenities) } },
          { rating: { gte: avgRating - 0.5 } },
          { starRating: Math.round(avgStarRating) }
        ],
        id: { notIn: favoriteHotels }
      },
      take: 100
    });
    
    // Score similar hotels
    similarHotels.forEach(hotel => {
      let score = 0;
      const reasons: string[] = [];
      
      // City match
      if (hotel.city && commonCities[hotel.city]) {
        const cityScore = commonCities[hotel.city];
        if (cityScore) {
          score += 20 * cityScore;
          reasons.push(`お気に入りと同じエリア: ${hotel.city}`);
        }
      }
      
      // Amenity matches
      const matchedAmenities = hotel.amenities.filter(a => commonAmenities[a]);
      score += matchedAmenities.length * 15;
      if (matchedAmenities.length > 0) {
        reasons.push(`お気に入りと同じ設備あり`);
      }
      
      // Rating similarity
      if (Math.abs(hotel.rating - avgRating) < 0.5) {
        score += 10;
        reasons.push('お気に入りと同等の評価');
      }
      
      this.updateScore(scores, hotel.id, score, reasons);
    });
  }
  
  // Score based on similar users (collaborative filtering)
  private async scoreBasedOnSimilarUsers(
    userId: string,
    scores: Map<string, RecommendationScore>
  ): Promise<void> {
    if (!this.prisma) {
      return;
    }
    
    // Find users with similar search patterns
    const userSearches = await this.prisma.searchHistory.findMany({
      where: { userId },
      select: { filters: true },
      take: 10
    });
    
    if (userSearches.length === 0) return;
    
    // Find other users who searched for similar criteria
    if (!this.prisma) {
      return;
    }
    
    const similarUsers = await this.prisma.$queryRaw<{ userId: string; similarity: number }[]>`
      SELECT DISTINCT sh."userId", COUNT(*) as similarity
      FROM "SearchHistory" sh
      WHERE sh."userId" != ${userId}
        AND sh.filters::text LIKE ANY(${userSearches.map(s => `%${JSON.stringify(s.filters)}%`)})
      GROUP BY sh."userId"
      ORDER BY similarity DESC
      LIMIT 20
    `;
    
    if (similarUsers.length === 0) return;
    
    // Get hotels favorited by similar users
    const similarUserIds = similarUsers.map(u => u.userId);
    
    if (!this.prisma) {
      return;
    }
    
    const recommendedHotels = await this.prisma.favoriteHotel.findMany({
      where: {
        userId: { in: similarUserIds }
      },
      select: {
        hotelId: true,
        userId: true
      }
    });
    
    // Score based on how many similar users liked each hotel
    const hotelScores: Record<string, number> = {};
    recommendedHotels.forEach(fav => {
      hotelScores[fav.hotelId] = (hotelScores[fav.hotelId] || 0) + 1;
    });
    
    Object.entries(hotelScores).forEach(([hotelId, count]) => {
      const score = count * 25;
      const reasons = [`${count}人の似た好みのユーザーがお気に入り登録`];
      this.updateScore(scores, hotelId, score, reasons);
    });
  }
  
  // Score based on location preferences
  private async scoreBasedOnLocationPreferences(
    preferredCities: Record<string, number>,
    scores: Map<string, RecommendationScore>
  ): Promise<void> {
    const topCities = Object.entries(preferredCities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city]) => city);
    
    if (topCities.length === 0) return;
    
    if (!this.prisma) {
      return;
    }
    
    const hotels = await this.prisma.hotel.findMany({
      where: {
        city: { in: topCities }
      },
      select: {
        id: true,
        city: true
      },
      take: 50
    });
    
    hotels.forEach(hotel => {
      const searchCount = preferredCities[hotel.city] || 0;
      const score = Math.min(searchCount * 10, 30);
      const reasons = [`よく検索するエリア: ${hotel.city}`];
      this.updateScore(scores, hotel.id, score, reasons);
    });
  }
  
  // Score based on amenity preferences
  private async scoreBasedOnAmenityPreferences(
    preferredAmenities: Record<string, number>,
    scores: Map<string, RecommendationScore>
  ): Promise<void> {
    const topAmenities = Object.entries(preferredAmenities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([amenity]) => amenity);
    
    if (topAmenities.length === 0) return;
    
    if (!this.prisma) {
      return;
    }
    
    const hotels = await this.prisma.hotel.findMany({
      where: {
        amenities: { hasSome: topAmenities }
      },
      select: {
        id: true,
        amenities: true
      },
      take: 100
    });
    
    hotels.forEach(hotel => {
      let score = 0;
      const matchedAmenities = hotel.amenities.filter(a => topAmenities.includes(a));
      score = matchedAmenities.length * 8;
      
      if (score > 0) {
        const reasons = ['お好みの設備を完備'];
        this.updateScore(scores, hotel.id, score, reasons);
      }
    });
  }
  
  // Score based on price preferences
  private async scoreBasedOnPricePreferences(
    priceRange: { min: number; max: number },
    scores: Map<string, RecommendationScore>
  ): Promise<void> {
    // This would typically join with room prices
    // Simplified for this implementation
    const avgMin = priceRange.min;
    const avgMax = priceRange.max;
    
    if (!this.prisma) {
      return;
    }
    
    const hotels = await this.prisma.$queryRaw<{ id: string; avgPrice: number }[]>`
      SELECT h.id, AVG(r."basePrice") as "avgPrice"
      FROM "Hotel" h
      INNER JOIN "Room" r ON r."hotelId" = h.id
      GROUP BY h.id
      HAVING AVG(r."basePrice") BETWEEN ${avgMin * 0.8} AND ${avgMax * 1.2}
      LIMIT 50
    `;
    
    hotels.forEach(hotel => {
      if (hotel.avgPrice >= avgMin && hotel.avgPrice <= avgMax) {
        const score = 20;
        const reasons = ['予算内の価格帯'];
        this.updateScore(scores, hotel.id, score, reasons);
      }
    });
  }
  
  // Score based on trending hotels
  private async scoreBasedOnTrending(
    scores: Map<string, RecommendationScore>
  ): Promise<void> {
    if (!this.prisma) {
      return;
    }
    
    // Get hotels with recent high booking activity
    const trendingHotels = await this.prisma.$queryRaw<{ hotelId: string; bookingCount: bigint }[]>`
      SELECT r."hotelId", COUNT(b.id) as "bookingCount"
      FROM "Booking" b
      INNER JOIN "Room" r ON r.id = b."roomId"
      WHERE b."createdAt" > NOW() - INTERVAL '7 days'
        AND b.status = 'CONFIRMED'
      GROUP BY r."hotelId"
      ORDER BY "bookingCount" DESC
      LIMIT 20
    `;
    
    trendingHotels.forEach(hotel => {
      const score = Math.min(Number(hotel.bookingCount) * 2, 30);
      const reasons = ['今週の人気ホテル'];
      this.updateScore(scores, hotel.hotelId, score, reasons);
    });
  }
  
  // Score new hotels
  private async scoreNewHotels(
    scores: Map<string, RecommendationScore>
  ): Promise<void> {
    if (!this.prisma) {
      return;
    }
    
    const newHotels = await this.prisma.hotel.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        id: true
      },
      take: 10
    });
    
    newHotels.forEach(hotel => {
      const score = 15;
      const reasons = ['新着ホテル'];
      this.updateScore(scores, hotel.id, score, reasons);
    });
  }
  
  // Update score helper
  private updateScore(
    scores: Map<string, RecommendationScore>,
    hotelId: string,
    additionalScore: number,
    reasons: string[]
  ): void {
    const existing = scores.get(hotelId);
    if (existing) {
      existing.score += additionalScore;
      existing.reasons.push(...reasons);
    } else {
      scores.set(hotelId, {
        hotelId,
        score: additionalScore,
        reasons
      });
    }
  }
  
  // Get similar hotels (for "you might also like")
  async getSimilarHotels(hotelId: string, limit: number = 5): Promise<Hotel[]> {
    if (!this.prisma) {
      return [];
    }
    
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    
    if (!hotel) return [];
    
    // Find hotels with similar characteristics
    if (!this.prisma) {
      return [];
    }
    
    const similarHotels = await this.prisma.hotel.findMany({
      where: {
        id: { not: hotelId },
        OR: [
          { city: hotel.city },
          { propertyType: hotel.propertyType },
          { starRating: hotel.starRating },
          { amenities: { hasSome: hotel.amenities.slice(0, 5) } }
        ],
        rating: {
          gte: hotel.rating - 0.5,
          lte: hotel.rating + 0.5
        }
      },
      take: limit * 2,
      orderBy: { rating: 'desc' }
    });
    
    // Score and sort by similarity
    const scored = similarHotels.map(h => {
      let score = 0;
      
      // Same city
      if (h.city === hotel.city) score += 30;
      
      // Same property type
      if (h.propertyType === hotel.propertyType) score += 20;
      
      // Similar star rating
      if (Math.abs(h.starRating - hotel.starRating) <= 1) score += 15;
      
      // Common amenities
      const commonAmenities = h.amenities.filter(a => hotel.amenities.includes(a));
      score += commonAmenities.length * 5;
      
      // Similar rating
      score += Math.max(0, 10 - Math.abs(h.rating - hotel.rating) * 10);
      
      return { hotel: h, score };
    });
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.hotel);
  }
}