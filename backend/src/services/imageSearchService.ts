import { logger } from '../utils/logger';
import { CacheService } from './cacheService';
import { aiSearchService } from './aiSearchService';

interface ImageSearchRequest {
  imageData: Buffer;
  searchType: 'exterior' | 'interior' | 'amenity' | 'room_type' | 'general';
  userId?: string;
  mimeType: string;
}

interface ImageSearchResponse {
  analysisResults: ImageAnalysisResult;
  searchResults: HotelSearchResult[];
  suggestions: string[];
  confidence: number;
  processingTime: number;
}

interface ImageAnalysisResult {
  detectedFeatures: DetectedFeature[];
  hotelType: string;
  roomType?: string;
  amenities: string[];
  style: string;
  colors: ColorPalette;
  architecture?: string;
  confidence: number;
}

interface DetectedFeature {
  type: 'building' | 'room' | 'amenity' | 'furniture' | 'view' | 'decoration';
  name: string;
  confidence: number;
  bbox?: [number, number, number, number]; // x, y, width, height
}

interface HotelSearchResult {
  hotelId: string;
  name: string;
  location: string;
  images: string[];
  similarity: number;
  matchingFeatures: string[];
  price: number;
  rating: number;
}

interface ColorPalette {
  dominant: string;
  secondary: string[];
  mood: 'warm' | 'cool' | 'neutral' | 'vibrant';
}

export class ImageSearchService {
  private cache: CacheService;

  // Feature detection patterns for hotel/room analysis
  private readonly featurePatterns = {
    hotelTypes: {
      'business': ['desk', 'chair', 'lamp', 'minimal', 'clean', 'modern'],
      'luxury': ['marble', 'chandelier', 'gold', 'silk', 'premium', 'elegant'],
      'ryokan': ['tatami', 'futon', 'wood', 'traditional', 'paper', 'zen'],
      'resort': ['pool', 'beach', 'palm', 'vacation', 'relaxation', 'tropical'],
      'boutique': ['unique', 'artistic', 'design', 'trendy', 'creative', 'stylish'],
      'capsule': ['pod', 'compact', 'efficient', 'minimal', 'small', 'modern']
    },
    
    roomTypes: {
      'single': ['single_bed', 'compact', 'solo', 'small_space'],
      'double': ['double_bed', 'couple', 'romantic'],
      'twin': ['two_beds', 'separate_beds', 'friends', 'business_travel'],
      'suite': ['living_room', 'separate_areas', 'luxury', 'spacious'],
      'japanese': ['tatami', 'futon', 'traditional', 'washitsu'],
      'western': ['bed', 'chair', 'desk', 'modern']
    },

    amenities: {
      'pool': ['swimming', 'water', 'tiles', 'poolside', 'deck'],
      'spa': ['massage', 'relaxation', 'wellness', 'treatment'],
      'gym': ['equipment', 'fitness', 'weights', 'treadmill'],
      'restaurant': ['dining', 'table', 'food', 'kitchen', 'chef'],
      'bar': ['drinks', 'cocktail', 'alcohol', 'lounge'],
      'onsen': ['hot_spring', 'bath', 'natural', 'rocks', 'steam'],
      'garden': ['plants', 'flowers', 'green', 'nature', 'outdoor'],
      'view': ['window', 'cityscape', 'mountain', 'ocean', 'landscape']
    }
  };

  constructor() {
    this.cache = new CacheService();
  }

  /**
   * Process image search request
   */
  async processImageSearch(request: ImageSearchRequest): Promise<ImageSearchResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing image search request', { 
        userId: request.userId,
        searchType: request.searchType,
        imageSize: request.imageData.length,
        mimeType: request.mimeType
      });

      // Validate image
      const validation = this.validateImage(request.imageData, request.mimeType);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Step 1: Analyze the image
      const analysisResults = await this.analyzeImage(request.imageData, request.searchType);

      // Step 2: Search for similar hotels based on analysis
      const searchResults = await this.findSimilarHotels(analysisResults, request.userId);

      // Step 3: Generate search suggestions based on detected features
      const suggestions = await this.generateSearchSuggestions(analysisResults);

      const response: ImageSearchResponse = {
        analysisResults,
        searchResults,
        suggestions,
        confidence: analysisResults.confidence,
        processingTime: Date.now() - startTime
      };

      logger.info('Image search completed', {
        detectedFeatures: analysisResults.detectedFeatures.length,
        resultsCount: searchResults.length,
        processingTime: response.processingTime
      });

      return response;

    } catch (error) {
      logger.error('Error processing image search', { error, userId: request.userId });
      return {
        analysisResults: this.getDefaultAnalysisResult(),
        searchResults: [],
        suggestions: await this.getDefaultSuggestions(),
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze uploaded image to detect features, style, and type
   */
  private async analyzeImage(imageData: Buffer, searchType: string): Promise<ImageAnalysisResult> {
    try {
      const imageHash = this.generateImageHash(imageData);
      const cacheKey = `image_analysis:${imageHash}:${searchType}`;
      const cached = await this.cache.get<ImageAnalysisResult>(cacheKey);
      if (cached) {
        return cached;
      }

      // In production, this would use computer vision APIs like:
      // - Google Vision API
      // - Azure Computer Vision
      // - AWS Rekognition
      // - TensorFlow.js models
      
      const analysisResult = await this.mockImageAnalysis(searchType);
      
      // Cache for 24 hours
      await this.cache.set(cacheKey, analysisResult, 86400);
      
      return analysisResult;

    } catch (error) {
      logger.error('Error analyzing image', { error, searchType });
      return this.getDefaultAnalysisResult();
    }
  }

  /**
   * Mock image analysis for development
   * Replace with actual computer vision service in production
   */
  private async mockImageAnalysis(searchType: string): Promise<ImageAnalysisResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockResults = {
      exterior: {
        detectedFeatures: [
          { type: 'building' as const, name: 'modern_facade', confidence: 0.92, bbox: [10, 20, 300, 400] },
          { type: 'building' as const, name: 'glass_windows', confidence: 0.88, bbox: [50, 100, 200, 300] },
          { type: 'amenity' as const, name: 'entrance_lobby', confidence: 0.85, bbox: [120, 350, 60, 80] }
        ],
        hotelType: 'business',
        amenities: ['parking', 'lobby', 'reception'],
        style: 'modern',
        architecture: 'contemporary',
        colors: {
          dominant: '#2C3E50',
          secondary: ['#ECF0F1', '#34495E'],
          mood: 'cool' as const
        },
        confidence: 0.89
      },

      interior: {
        detectedFeatures: [
          { type: 'room' as const, name: 'double_bed', confidence: 0.95, bbox: [50, 100, 200, 150] },
          { type: 'furniture' as const, name: 'desk', confidence: 0.82, bbox: [10, 200, 80, 100] },
          { type: 'amenity' as const, name: 'tv', confidence: 0.78, bbox: [200, 50, 60, 40] },
          { type: 'view' as const, name: 'city_view', confidence: 0.75, bbox: [250, 20, 100, 200] }
        ],
        hotelType: 'business',
        roomType: 'double',
        amenities: ['wifi', 'tv', 'desk', 'city_view'],
        style: 'modern',
        colors: {
          dominant: '#F8F9FA',
          secondary: ['#495057', '#6C757D'],
          mood: 'neutral' as const
        },
        confidence: 0.87
      },

      amenity: {
        detectedFeatures: [
          { type: 'amenity' as const, name: 'swimming_pool', confidence: 0.96, bbox: [20, 50, 300, 200] },
          { type: 'amenity' as const, name: 'pool_deck', confidence: 0.88, bbox: [0, 250, 340, 50] },
          { type: 'decoration' as const, name: 'poolside_chairs', confidence: 0.75, bbox: [280, 100, 50, 60] }
        ],
        hotelType: 'resort',
        amenities: ['pool', 'deck', 'outdoor_seating'],
        style: 'resort',
        colors: {
          dominant: '#3498DB',
          secondary: ['#E74C3C', '#F39C12'],
          mood: 'vibrant' as const
        },
        confidence: 0.91
      }
    };

    return mockResults[searchType as keyof typeof mockResults] || mockResults.interior;
  }

  /**
   * Find hotels with similar features/style to the analyzed image
   */
  private async findSimilarHotels(
    analysisResults: ImageAnalysisResult, 
    userId?: string
  ): Promise<HotelSearchResult[]> {
    try {
      // Mock hotel database search based on detected features
      const mockHotels = [
        {
          hotelId: 'hotel_001',
          name: 'Tokyo Modern Business Hotel',
          location: 'Shinjuku, Tokyo',
          images: [
            'https://example.com/hotel1_exterior.jpg',
            'https://example.com/hotel1_room.jpg',
            'https://example.com/hotel1_lobby.jpg'
          ],
          similarity: 0.92,
          matchingFeatures: ['modern_facade', 'glass_windows', 'business_style'],
          price: 12000,
          rating: 4.3
        },
        {
          hotelId: 'hotel_002',
          name: 'Osaka Contemporary Resort',
          location: 'Namba, Osaka',
          images: [
            'https://example.com/hotel2_exterior.jpg',
            'https://example.com/hotel2_pool.jpg',
            'https://example.com/hotel2_room.jpg'
          ],
          similarity: 0.87,
          matchingFeatures: ['contemporary_design', 'pool', 'modern_rooms'],
          price: 15500,
          rating: 4.5
        },
        {
          hotelId: 'hotel_003',
          name: 'Kyoto Traditional Ryokan',
          location: 'Gion, Kyoto',
          images: [
            'https://example.com/hotel3_exterior.jpg',
            'https://example.com/hotel3_room.jpg',
            'https://example.com/hotel3_garden.jpg'
          ],
          similarity: 0.73,
          matchingFeatures: ['traditional_style', 'natural_materials', 'zen_atmosphere'],
          price: 22000,
          rating: 4.7
        }
      ];

      // Filter and rank based on analysis results
      const relevantHotels = mockHotels
        .filter(hotel => this.calculateSimilarity(hotel, analysisResults) > 0.6)
        .sort((a, b) => b.similarity - a.similarity);

      // If user is available, apply personalization
      if (userId) {
        return await this.personalizeImageSearchResults(relevantHotels, userId, analysisResults);
      }

      return relevantHotels;

    } catch (error) {
      logger.error('Error finding similar hotels', { error, analysisResults });
      return [];
    }
  }

  /**
   * Calculate similarity between hotel and image analysis
   */
  private calculateSimilarity(hotel: any, analysis: ImageAnalysisResult): number {
    let similarity = 0.5; // Base similarity

    // Check hotel type match
    if (hotel.name.toLowerCase().includes(analysis.hotelType)) {
      similarity += 0.2;
    }

    // Check amenity matches
    const detectedAmenities = analysis.amenities || [];
    const matchingAmenities = detectedAmenities.filter(amenity =>
      hotel.matchingFeatures.some((feature: string) => feature.includes(amenity))
    );
    similarity += (matchingAmenities.length / Math.max(detectedAmenities.length, 1)) * 0.3;

    return Math.min(similarity, 1.0);
  }

  /**
   * Personalize image search results based on user preferences
   */
  private async personalizeImageSearchResults(
    hotels: HotelSearchResult[],
    userId: string,
    analysisResults: ImageAnalysisResult
  ): Promise<HotelSearchResult[]> {
    try {
      // This would integrate with the AI search service for personalization
      const query = this.generateQueryFromAnalysis(analysisResults);
      const personalizedScores = await aiSearchService.getPersonalizedSearchResults(
        query,
        userId,
        hotels
      );

      // Combine image similarity with personalization
      return hotels.map(hotel => {
        const personalizedResult = personalizedScores.find(p => p.hotelId === hotel.hotelId);
        if (personalizedResult) {
          return {
            ...hotel,
            similarity: (hotel.similarity * 0.7) + (personalizedResult.personalizedScore * 0.3)
          };
        }
        return hotel;
      }).sort((a, b) => b.similarity - a.similarity);

    } catch (error) {
      logger.error('Error personalizing image search results', { error, userId });
      return hotels;
    }
  }

  /**
   * Generate text query from image analysis for personalization
   */
  private generateQueryFromAnalysis(analysis: ImageAnalysisResult): string {
    const parts: string[] = [];

    parts.push(analysis.hotelType);
    if (analysis.roomType) parts.push(analysis.roomType);
    parts.push(...analysis.amenities.slice(0, 3));
    parts.push(analysis.style);

    return parts.join(' ');
  }

  /**
   * Generate search suggestions based on image analysis
   */
  private async generateSearchSuggestions(analysis: ImageAnalysisResult): Promise<string[]> {
    const suggestions: string[] = [];

    // Hotel type based suggestions
    suggestions.push(`${analysis.hotelType} hotels`);
    
    // Amenity based suggestions
    analysis.amenities.forEach(amenity => {
      suggestions.push(`hotels with ${amenity.replace('_', ' ')}`);
    });

    // Style based suggestions
    suggestions.push(`${analysis.style} style hotels`);

    // Room type suggestions
    if (analysis.roomType) {
      suggestions.push(`${analysis.roomType} room hotels`);
    }

    // Location suggestions based on detected features
    const locationSuggestions = this.getLocationSuggestionsFromFeatures(analysis.detectedFeatures);
    suggestions.push(...locationSuggestions);

    return suggestions.slice(0, 8);
  }

  /**
   * Get location suggestions based on detected features
   */
  private getLocationSuggestionsFromFeatures(features: DetectedFeature[]): string[] {
    const suggestions: string[] = [];

    features.forEach(feature => {
      switch (feature.name) {
        case 'city_view':
          suggestions.push('hotels with city view');
          break;
        case 'ocean_view':
          suggestions.push('oceanfront hotels');
          break;
        case 'mountain_view':
          suggestions.push('mountain resort hotels');
          break;
        case 'traditional_garden':
          suggestions.push('hotels with traditional gardens');
          break;
      }
    });

    return suggestions.slice(0, 3);
  }

  /**
   * Validate uploaded image
   */
  private validateImage(imageData: Buffer, mimeType: string): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (imageData.length > maxSize) {
      return { valid: false, error: 'Image file too large. Maximum size is 5MB.' };
    }

    if (!supportedTypes.includes(mimeType)) {
      return { 
        valid: false, 
        error: `Unsupported image format. Supported formats: ${supportedTypes.join(', ')}` 
      };
    }

    if (imageData.length < 1000) { // Less than 1KB
      return { valid: false, error: 'Image file too small.' };
    }

    return { valid: true };
  }

  /**
   * Generate image hash for caching
   */
  private generateImageHash(imageData: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(imageData).digest('hex');
  }

  /**
   * Get default analysis result for error cases
   */
  private getDefaultAnalysisResult(): ImageAnalysisResult {
    return {
      detectedFeatures: [],
      hotelType: 'general',
      amenities: [],
      style: 'modern',
      colors: {
        dominant: '#000000',
        secondary: [],
        mood: 'neutral'
      },
      confidence: 0
    };
  }

  /**
   * Get default suggestions for error cases
   */
  private async getDefaultSuggestions(): Promise<string[]> {
    return [
      'business hotels',
      'luxury hotels',
      'hotels with pool',
      'traditional ryokan',
      'boutique hotels',
      'budget hotels'
    ];
  }

  /**
   * Get supported image search types
   */
  getSupportedSearchTypes(): Array<{type: string, description: string, icon: string}> {
    return [
      { type: 'exterior', description: 'Hotel building exterior and facade', icon: '🏢' },
      { type: 'interior', description: 'Hotel rooms and interior spaces', icon: '🛏️' },
      { type: 'amenity', description: 'Hotel amenities like pools, spas, restaurants', icon: '🏊' },
      { type: 'room_type', description: 'Specific room types and layouts', icon: '🚪' },
      { type: 'general', description: 'General hotel search by image', icon: '🔍' }
    ];
  }

  /**
   * Get image search analytics
   */
  async getImageSearchAnalytics(userId?: string): Promise<any> {
    try {
      const cacheKey = userId ? `image_analytics:${userId}` : 'image_analytics:global';
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;

      // Mock analytics data
      const analytics = {
        totalSearches: 892,
        averageConfidence: 0.84,
        topSearchTypes: [
          { type: 'interior', percentage: 35 },
          { type: 'exterior', percentage: 28 },
          { type: 'amenity', percentage: 20 },
          { type: 'room_type', percentage: 12 },
          { type: 'general', percentage: 5 }
        ],
        detectedFeatures: [
          'modern_facade',
          'swimming_pool',
          'city_view',
          'traditional_style',
          'luxury_amenities'
        ],
        averageProcessingTime: 1800, // ms
        successRate: 88
      };

      await this.cache.set(cacheKey, analytics, 300); // 5 minutes
      return analytics;

    } catch (error) {
      logger.error('Error getting image search analytics', { error, userId });
      return null;
    }
  }
}

export const imageSearchService = new ImageSearchService();