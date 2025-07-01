import { logger } from '../utils/logger';
import { CacheService } from './cacheService';
import { DatabaseService } from './databaseService';

interface NLPSearchQuery {
  originalQuery: string;
  processedQuery: string;
  intent: SearchIntent;
  entities: SearchEntity[];
  confidence: number;
}

interface SearchIntent {
  type: 'location' | 'amenity' | 'price_range' | 'date_range' | 'hotel_type' | 'mixed';
  confidence: number;
}

interface SearchEntity {
  type: 'location' | 'amenity' | 'price' | 'date' | 'hotel_type' | 'rating';
  value: string;
  confidence: number;
  position: [number, number]; // start, end positions in query
}

interface PersonalizedSearchResult {
  hotelId: string;
  relevanceScore: number;
  personalizedScore: number;
  reasons: string[];
}

interface UserProfile {
  preferredLocations: string[];
  preferredAmenities: string[];
  priceRange: { min: number; max: number };
  searchHistory: SearchHistoryItem[];
  bookingHistory: BookingHistoryItem[];
  preferences: UserPreferences;
}

interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  clickedHotels: string[];
  bookedHotel?: string;
}

interface BookingHistoryItem {
  hotelId: string;
  hotelType: string;
  location: string;
  amenities: string[];
  price: number;
  rating: number;
  timestamp: Date;
}

interface UserPreferences {
  hotelTypes: string[];
  amenityPriorities: { [key: string]: number };
  locationPreferences: string[];
  priceWeight: number;
  ratingWeight: number;
  amenityWeight: number;
}

export class AISearchService {
  private cache: CacheService;
  private db: DatabaseService;
  
  // NLP patterns for intent recognition
  private readonly intentPatterns = {
    location: [
      /(?:in|at|near|around)\s+([a-zA-Z\s]+)/i,
      /([a-zA-Z\s]+)(?:\s+hotel|area|district)/i,
      /(tokyo|osaka|kyoto|hiroshima|nara|nikko|hakone)/i
    ],
    amenity: [
      /(?:with|has|have|include)\s+([a-zA-Z\s]+)/i,
      /(wifi|pool|spa|gym|restaurant|bar|parking|breakfast)/i,
      /(onsen|hot\s+spring|tatami|ryokan)/i
    ],
    price_range: [
      /(?:under|below|less\s+than)\s+([0-9,]+)/i,
      /(?:over|above|more\s+than)\s+([0-9,]+)/i,
      /between\s+([0-9,]+)\s+(?:and|to)\s+([0-9,]+)/i,
      /(cheap|budget|expensive|luxury|affordable)/i
    ],
    date_range: [
      /(?:from|check\s+in)\s+([0-9\-\/]+)/i,
      /(?:to|until|check\s+out)\s+([0-9\-\/]+)/i,
      /(tonight|tomorrow|weekend|next\s+week)/i
    ],
    hotel_type: [
      /(business|resort|ryokan|capsule|love|boutique)\s*hotel/i,
      /(traditional|modern|japanese|western)/i
    ]
  };

  private readonly entityExtracters = {
    location: (text: string): SearchEntity[] => {
      const entities: SearchEntity[] = [];
      const locationPattern = /(tokyo|osaka|kyoto|hiroshima|nara|nikko|hakone|shibuya|shinjuku|ginza|akihabara|harajuku)/gi;
      let match;
      while ((match = locationPattern.exec(text)) !== null) {
        entities.push({
          type: 'location',
          value: match[0].toLowerCase(),
          confidence: 0.9,
          position: [match.index, match.index + match[0].length]
        });
      }
      return entities;
    },

    amenity: (text: string): SearchEntity[] => {
      const entities: SearchEntity[] = [];
      const amenityPattern = /(wifi|pool|spa|gym|restaurant|bar|parking|breakfast|onsen|hot spring)/gi;
      let match;
      while ((match = amenityPattern.exec(text)) !== null) {
        entities.push({
          type: 'amenity',
          value: match[0].toLowerCase().replace(' ', '_'),
          confidence: 0.8,
          position: [match.index, match.index + match[0].length]
        });
      }
      return entities;
    },

    price: (text: string): SearchEntity[] => {
      const entities: SearchEntity[] = [];
      const pricePattern = /([0-9,]+)\s*(?:yen|円|dollars?|\$)/gi;
      let match;
      while ((match = pricePattern.exec(text)) !== null) {
        entities.push({
          type: 'price',
          value: match[1].replace(',', ''),
          confidence: 0.95,
          position: [match.index, match.index + match[0].length]
        });
      }
      return entities;
    }
  };

  constructor() {
    this.cache = new CacheService();
    this.db = new DatabaseService();
  }

  /**
   * Natural Language Processing for search queries
   */
  async processNaturalLanguageQuery(query: string): Promise<NLPSearchQuery> {
    try {
      // Check cache first
      const cacheKey = `nlp_query:${query}`;
      const cached = await this.cache.get<NLPSearchQuery>(cacheKey);
      if (cached) {
        return cached;
      }

      const processedQuery = this.preprocessQuery(query);
      const intent = this.detectIntent(processedQuery);
      const entities = this.extractEntities(processedQuery);

      const nlpResult: NLPSearchQuery = {
        originalQuery: query,
        processedQuery,
        intent,
        entities,
        confidence: this.calculateOverallConfidence(intent, entities)
      };

      // Cache for 1 hour
      await this.cache.set(cacheKey, nlpResult, 3600);

      logger.info('NLP query processed', { query, intent: intent.type, entityCount: entities.length });
      return nlpResult;

    } catch (error) {
      logger.error('Error processing NLP query', { error, query });
      // Return basic fallback
      return {
        originalQuery: query,
        processedQuery: query.toLowerCase().trim(),
        intent: { type: 'mixed', confidence: 0.3 },
        entities: [],
        confidence: 0.3
      };
    }
  }

  /**
   * Generate intelligent autocomplete suggestions
   */
  async getIntelligentSuggestions(partialQuery: string, userId?: string): Promise<string[]> {
    try {
      const suggestions: Set<string> = new Set();

      // Get NLP-based suggestions
      const nlpSuggestions = await this.getNLPSuggestions(partialQuery);
      nlpSuggestions.forEach(s => suggestions.add(s));

      // Get personalized suggestions if user is logged in
      if (userId) {
        const personalizedSuggestions = await this.getPersonalizedSuggestions(partialQuery, userId);
        personalizedSuggestions.forEach(s => suggestions.add(s));
      }

      // Get popular query suggestions
      const popularSuggestions = await this.getPopularQuerySuggestions(partialQuery);
      popularSuggestions.forEach(s => suggestions.add(s));

      // Get contextual suggestions
      const contextualSuggestions = await this.getContextualSuggestions(partialQuery);
      contextualSuggestions.forEach(s => suggestions.add(s));

      return Array.from(suggestions).slice(0, 8);

    } catch (error) {
      logger.error('Error generating intelligent suggestions', { error, partialQuery });
      return [];
    }
  }

  /**
   * Personalized search with user history analysis
   */
  async getPersonalizedSearchResults(
    query: string, 
    userId: string, 
    baseResults: any[]
  ): Promise<PersonalizedSearchResult[]> {
    try {
      const userProfile = await this.getUserProfile(userId);
      const nlpQuery = await this.processNaturalLanguageQuery(query);

      const personalizedResults = baseResults.map(hotel => {
        const relevanceScore = this.calculateRelevanceScore(hotel, nlpQuery);
        const personalizedScore = this.calculatePersonalizedScore(hotel, userProfile);
        const combinedScore = (relevanceScore * 0.6) + (personalizedScore * 0.4);

        return {
          hotelId: hotel.id,
          relevanceScore,
          personalizedScore,
          combinedScore,
          reasons: this.generatePersonalizationReasons(hotel, userProfile)
        };
      });

      // Sort by combined score
      personalizedResults.sort((a, b) => b.combinedScore - a.combinedScore);

      // Update user search history
      await this.updateUserSearchHistory(userId, query);

      return personalizedResults;

    } catch (error) {
      logger.error('Error generating personalized search results', { error, query, userId });
      return baseResults.map(hotel => ({
        hotelId: hotel.id,
        relevanceScore: 0.5,
        personalizedScore: 0.5,
        reasons: []
      }));
    }
  }

  /**
   * Predictive search suggestions
   */
  async getPredictiveSearchSuggestions(
    currentQuery: string,
    userId?: string,
    context?: any
  ): Promise<string[]> {
    try {
      const predictions: Set<string> = new Set();

      // Intent-based predictions
      const nlpQuery = await this.processNaturalLanguageQuery(currentQuery);
      const intentPredictions = this.generateIntentBasedPredictions(nlpQuery);
      intentPredictions.forEach(p => predictions.add(p));

      // Time-based predictions
      const timePredictions = this.generateTimeBasedPredictions(currentQuery, context);
      timePredictions.forEach(p => predictions.add(p));

      // Seasonal predictions
      const seasonalPredictions = this.generateSeasonalPredictions(currentQuery);
      seasonalPredictions.forEach(p => predictions.add(p));

      // User behavior predictions
      if (userId) {
        const behaviorPredictions = await this.generateBehaviorBasedPredictions(currentQuery, userId);
        behaviorPredictions.forEach(p => predictions.add(p));
      }

      return Array.from(predictions).slice(0, 6);

    } catch (error) {
      logger.error('Error generating predictive suggestions', { error, currentQuery });
      return [];
    }
  }

  // Private helper methods
  private preprocessQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private detectIntent(query: string): SearchIntent {
    let maxConfidence = 0;
    let detectedIntent: SearchIntent['type'] = 'mixed';

    for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
      let intentConfidence = 0;
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          intentConfidence += 0.3;
        }
      }
      if (intentConfidence > maxConfidence) {
        maxConfidence = intentConfidence;
        detectedIntent = intentType as SearchIntent['type'];
      }
    }

    return {
      type: detectedIntent,
      confidence: Math.min(maxConfidence, 1.0)
    };
  }

  private extractEntities(query: string): SearchEntity[] {
    const allEntities: SearchEntity[] = [];

    for (const [entityType, extractor] of Object.entries(this.entityExtracters)) {
      const entities = extractor(query);
      allEntities.push(...entities);
    }

    // Remove overlapping entities (keep higher confidence ones)
    return this.removeOverlappingEntities(allEntities);
  }

  private removeOverlappingEntities(entities: SearchEntity[]): SearchEntity[] {
    const sorted = entities.sort((a, b) => b.confidence - a.confidence);
    const result: SearchEntity[] = [];

    for (const entity of sorted) {
      const hasOverlap = result.some(existingEntity => {
        const [start1, end1] = entity.position;
        const [start2, end2] = existingEntity.position;
        return (start1 < end2 && end1 > start2);
      });

      if (!hasOverlap) {
        result.push(entity);
      }
    }

    return result;
  }

  private calculateOverallConfidence(intent: SearchIntent, entities: SearchEntity[]): number {
    if (entities.length === 0) return intent.confidence * 0.5;
    
    const avgEntityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
    return (intent.confidence * 0.4) + (avgEntityConfidence * 0.6);
  }

  private async getNLPSuggestions(partialQuery: string): Promise<string[]> {
    const nlpQuery = await this.processNaturalLanguageQuery(partialQuery);
    const suggestions: string[] = [];

    // Generate suggestions based on detected intent
    switch (nlpQuery.intent.type) {
      case 'location':
        suggestions.push(
          `${partialQuery} hotels with pool`,
          `${partialQuery} business hotels`,
          `${partialQuery} ryokan traditional`,
          `${partialQuery} near station`
        );
        break;
      case 'amenity':
        suggestions.push(
          `tokyo hotels ${partialQuery}`,
          `osaka hotels ${partialQuery}`,
          `kyoto hotels ${partialQuery}`
        );
        break;
      case 'price_range':
        suggestions.push(
          `${partialQuery} tokyo`,
          `${partialQuery} business hotels`,
          `${partialQuery} with breakfast`
        );
        break;
    }

    return suggestions.filter(s => s.length <= 100);
  }

  private async getPersonalizedSuggestions(partialQuery: string, userId: string): Promise<string[]> {
    const userProfile = await this.getUserProfile(userId);
    const suggestions: string[] = [];

    // Based on preferred locations
    userProfile.preferredLocations.forEach(location => {
      if (!partialQuery.toLowerCase().includes(location.toLowerCase())) {
        suggestions.push(`${partialQuery} ${location}`);
      }
    });

    // Based on preferred amenities
    userProfile.preferredAmenities.forEach(amenity => {
      if (!partialQuery.toLowerCase().includes(amenity.toLowerCase())) {
        suggestions.push(`${partialQuery} with ${amenity}`);
      }
    });

    return suggestions.slice(0, 4);
  }

  private async getPopularQuerySuggestions(partialQuery: string): Promise<string[]> {
    // This would typically come from analytics data
    const popularQueries = [
      'tokyo business hotels',
      'osaka hotels with onsen',
      'kyoto traditional ryokan',
      'shibuya hotels near station',
      'budget hotels tokyo',
      'luxury hotels ginza'
    ];

    return popularQueries
      .filter(query => query.toLowerCase().includes(partialQuery.toLowerCase()))
      .slice(0, 3);
  }

  private async getContextualSuggestions(partialQuery: string): Promise<string[]> {
    const now = new Date();
    const suggestions: string[] = [];

    // Time-based suggestions
    const hour = now.getHours();
    if (hour >= 22 || hour <= 6) {
      suggestions.push(`${partialQuery} 24 hour check-in`);
    }

    // Season-based suggestions
    const month = now.getMonth();
    if (month >= 2 && month <= 4) { // Spring
      suggestions.push(`${partialQuery} cherry blossom viewing`);
    } else if (month >= 5 && month <= 7) { // Summer
      suggestions.push(`${partialQuery} with pool`);
    } else if (month >= 8 && month <= 10) { // Autumn
      suggestions.push(`${partialQuery} autumn foliage`);
    } else { // Winter
      suggestions.push(`${partialQuery} onsen hot springs`);
    }

    return suggestions;
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    const cacheKey = `user_profile:${userId}`;
    const cached = await this.cache.get<UserProfile>(cacheKey);
    if (cached) return cached;

    // This would typically come from database
    const defaultProfile: UserProfile = {
      preferredLocations: ['tokyo', 'osaka'],
      preferredAmenities: ['wifi', 'breakfast'],
      priceRange: { min: 5000, max: 15000 },
      searchHistory: [],
      bookingHistory: [],
      preferences: {
        hotelTypes: ['business', 'boutique'],
        amenityPriorities: { wifi: 0.9, breakfast: 0.7, pool: 0.5 },
        locationPreferences: ['city_center', 'near_station'],
        priceWeight: 0.3,
        ratingWeight: 0.4,
        amenityWeight: 0.3
      }
    };

    await this.cache.set(cacheKey, defaultProfile, 1800); // 30 minutes
    return defaultProfile;
  }

  private calculateRelevanceScore(hotel: any, nlpQuery: NLPSearchQuery): number {
    let score = 0.5; // base score

    nlpQuery.entities.forEach(entity => {
      switch (entity.type) {
        case 'location':
          if (hotel.location?.toLowerCase().includes(entity.value)) {
            score += 0.3 * entity.confidence;
          }
          break;
        case 'amenity':
          if (hotel.amenities?.some((a: string) => a.toLowerCase().includes(entity.value))) {
            score += 0.2 * entity.confidence;
          }
          break;
        case 'price':
          const price = parseInt(entity.value);
          if (hotel.price && Math.abs(hotel.price - price) < price * 0.2) {
            score += 0.25 * entity.confidence;
          }
          break;
      }
    });

    return Math.min(score, 1.0);
  }

  private calculatePersonalizedScore(hotel: any, userProfile: UserProfile): number {
    let score = 0.5;

    // Location preference
    if (userProfile.preferredLocations.some(loc => 
      hotel.location?.toLowerCase().includes(loc.toLowerCase()))) {
      score += 0.2;
    }

    // Amenity preference
    const matchingAmenities = hotel.amenities?.filter((amenity: string) =>
      userProfile.preferredAmenities.includes(amenity.toLowerCase())
    ) || [];
    score += (matchingAmenities.length / userProfile.preferredAmenities.length) * 0.3;

    // Price preference
    if (hotel.price >= userProfile.priceRange.min && hotel.price <= userProfile.priceRange.max) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private generatePersonalizationReasons(hotel: any, userProfile: UserProfile): string[] {
    const reasons: string[] = [];

    // Check location preference
    userProfile.preferredLocations.forEach(loc => {
      if (hotel.location?.toLowerCase().includes(loc.toLowerCase())) {
        reasons.push(`You frequently search for hotels in ${loc}`);
      }
    });

    // Check amenity preference
    const matchingAmenities = hotel.amenities?.filter((amenity: string) =>
      userProfile.preferredAmenities.includes(amenity.toLowerCase())
    ) || [];
    
    if (matchingAmenities.length > 0) {
      reasons.push(`Has ${matchingAmenities.join(', ')} which you often look for`);
    }

    // Check price range
    if (hotel.price >= userProfile.priceRange.min && hotel.price <= userProfile.priceRange.max) {
      reasons.push(`Within your usual price range`);
    }

    return reasons.slice(0, 3);
  }

  private async updateUserSearchHistory(userId: string, query: string): Promise<void> {
    try {
      const userProfile = await this.getUserProfile(userId);
      userProfile.searchHistory.unshift({
        query,
        timestamp: new Date(),
        clickedHotels: []
      });

      // Keep only last 50 searches
      userProfile.searchHistory = userProfile.searchHistory.slice(0, 50);

      const cacheKey = `user_profile:${userId}`;
      await this.cache.set(cacheKey, userProfile, 1800);
    } catch (error) {
      logger.error('Error updating user search history', { error, userId, query });
    }
  }

  private generateIntentBasedPredictions(nlpQuery: NLPSearchQuery): string[] {
    const predictions: string[] = [];

    switch (nlpQuery.intent.type) {
      case 'location':
        predictions.push(
          `${nlpQuery.processedQuery} with breakfast`,
          `${nlpQuery.processedQuery} business hotels`,
          `${nlpQuery.processedQuery} near station`
        );
        break;
      case 'amenity':
        predictions.push(
          `tokyo ${nlpQuery.processedQuery}`,
          `osaka ${nlpQuery.processedQuery}`,
          `luxury ${nlpQuery.processedQuery}`
        );
        break;
    }

    return predictions;
  }

  private generateTimeBasedPredictions(query: string, context?: any): string[] {
    const now = new Date();
    const predictions: string[] = [];
    const hour = now.getHours();

    if (hour >= 20 || hour <= 8) {
      predictions.push(`${query} late check-in`);
    }

    if (now.getDay() === 5 || now.getDay() === 6) { // Weekend
      predictions.push(`${query} weekend deals`);
    }

    return predictions;
  }

  private generateSeasonalPredictions(query: string): string[] {
    const month = new Date().getMonth();
    const predictions: string[] = [];

    if (month >= 2 && month <= 4) { // Spring
      predictions.push(`${query} sakura season`);
    } else if (month >= 11 || month <= 1) { // Winter
      predictions.push(`${query} winter illumination`);
    }

    return predictions;
  }

  private async generateBehaviorBasedPredictions(query: string, userId: string): Promise<string[]> {
    const userProfile = await this.getUserProfile(userId);
    const predictions: string[] = [];

    // Based on search history patterns
    const recentSearches = userProfile.searchHistory.slice(0, 10);
    const commonTerms = this.extractCommonTerms(recentSearches.map(s => s.query));

    commonTerms.forEach(term => {
      if (!query.toLowerCase().includes(term.toLowerCase())) {
        predictions.push(`${query} ${term}`);
      }
    });

    return predictions.slice(0, 3);
  }

  private extractCommonTerms(queries: string[]): string[] {
    const termFrequency: { [key: string]: number } = {};
    
    queries.forEach(query => {
      const terms = query.toLowerCase().split(/\s+/);
      terms.forEach(term => {
        if (term.length > 2) {
          termFrequency[term] = (termFrequency[term] || 0) + 1;
        }
      });
    });

    return Object.entries(termFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([term]) => term);
  }
}

export const aiSearchService = new AISearchService();