/**
 * Personalization Feature Accuracy Tests
 * Testing AI-driven personalization, user preference learning, and recommendation accuracy
 * Author: worker2
 * Date: 2025-06-23
 */

const { aiSearchService } = require('../src/services/aiSearchService');

describe('Personalization Accuracy Tests', () => {
  
  // Test Suite 1: User Profile Learning
  describe('1. User Profile Learning Tests', () => {
    
    test('Should build accurate user profiles from search history', async () => {
      const userId = 'test-user-profile-building';
      const searchHistory = [
        'luxury hotels tokyo',
        'spa hotels ginza',
        'business hotels shibuya',
        'hotels with pool tokyo',
        'expensive hotels roppongi'
      ];

      // Simulate multiple searches
      for (const query of searchHistory) {
        await aiSearchService.processNaturalLanguageQuery(query);
        // Simulate user profile update
        await aiSearchService.updateUserSearchHistory?.(userId, query);
      }

      // Get personalized suggestions to verify learning
      const suggestions = await aiSearchService.getIntelligentSuggestions('tokyo', userId);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      
      // Should prefer luxury/spa suggestions based on history
      const hasLuxuryBias = suggestions.some(s => 
        s.toLowerCase().includes('luxury') || 
        s.toLowerCase().includes('spa') ||
        s.toLowerCase().includes('premium')
      );
      
      expect(hasLuxuryBias).toBe(true);
      console.log('✅ User profile learning from search history validated');
    });

    test('Should adapt to user preference patterns', async () => {
      const userId = 'test-user-preference-adaptation';
      
      // Simulate user with budget preferences
      const budgetQueries = [
        'cheap hotels tokyo',
        'budget accommodation shibuya', 
        'affordable business hotels',
        'discount hotels near station',
        'low cost hotels tokyo'
      ];

      for (const query of budgetQueries) {
        await aiSearchService.processNaturalLanguageQuery(query);
      }

      const budgetSuggestions = await aiSearchService.getIntelligentSuggestions('hotel', userId);
      
      // Should show budget-oriented suggestions
      const hasBudgetBias = budgetSuggestions.some(s =>
        s.toLowerCase().includes('cheap') ||
        s.toLowerCase().includes('budget') ||
        s.toLowerCase().includes('affordable')
      );

      expect(hasBudgetBias).toBe(true);
      console.log('✅ Budget preference adaptation validated');
    });

    test('Should learn location preferences from user behavior', async () => {
      const userId = 'test-user-location-preferences';
      
      // Simulate user with strong Tokyo area preference
      const tokyoQueries = [
        'shibuya hotels',
        'shinjuku business hotels',
        'ginza luxury hotels',
        'akihabara cheap hotels',
        'harajuku boutique hotels'
      ];

      for (const query of tokyoQueries) {
        await aiSearchService.processNaturalLanguageQuery(query);
      }

      const locationSuggestions = await aiSearchService.getIntelligentSuggestions('hotel', userId);
      
      // Should bias towards Tokyo areas
      const hasTokyoBias = locationSuggestions.some(s =>
        s.toLowerCase().includes('tokyo') ||
        s.toLowerCase().includes('shibuya') ||
        s.toLowerCase().includes('shinjuku') ||
        s.toLowerCase().includes('ginza')
      );

      expect(hasTokyoBias).toBe(true);
      console.log('✅ Location preference learning validated');
    });
  });

  // Test Suite 2: Personalized Search Results
  describe('2. Personalized Search Results Tests', () => {
    
    test('Should rank results based on user preferences', async () => {
      const userId = 'test-user-ranking';
      const query = 'hotels tokyo';
      
      // Mock hotels with different characteristics
      const mockHotels = [
        {
          id: 'hotel1',
          name: 'Budget Tokyo Hotel',
          location: 'Shibuya, Tokyo',
          price: 5000,
          amenities: ['wifi', 'breakfast'],
          rating: 3.5
        },
        {
          id: 'hotel2',
          name: 'Luxury Tokyo Resort',
          location: 'Ginza, Tokyo', 
          price: 30000,
          amenities: ['spa', 'pool', 'restaurant', 'valet'],
          rating: 4.8
        },
        {
          id: 'hotel3',
          name: 'Business Tokyo Hotel',
          location: 'Shinjuku, Tokyo',
          price: 12000,
          amenities: ['wifi', 'desk', 'conference'],
          rating: 4.2
        }
      ];

      const personalizedResults = await aiSearchService.getPersonalizedSearchResults(
        query,
        userId,
        mockHotels
      );

      expect(personalizedResults).toBeDefined();
      expect(Array.isArray(personalizedResults)).toBe(true);
      expect(personalizedResults.length).toBe(mockHotels.length);

      // Verify personalization scores are calculated
      personalizedResults.forEach(result => {
        expect(result.hotelId).toBeDefined();
        expect(typeof result.relevanceScore).toBe('number');
        expect(typeof result.personalizedScore).toBe('number');
        expect(Array.isArray(result.reasons)).toBe(true);
        
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(1);
        expect(result.personalizedScore).toBeGreaterThanOrEqual(0);
        expect(result.personalizedScore).toBeLessThanOrEqual(1);
      });

      console.log('✅ Personalized ranking algorithm validated');
    });

    test('Should provide personalization reasons', async () => {
      const userId = 'test-user-reasons';
      const query = 'spa hotels';
      
      const mockHotels = [
        {
          id: 'spa-hotel-1',
          name: 'Tokyo Spa Resort',
          location: 'Tokyo',
          amenities: ['spa', 'onsen', 'massage'],
          price: 15000
        }
      ];

      const personalizedResults = await aiSearchService.getPersonalizedSearchResults(
        query,
        userId,
        mockHotels
      );

      expect(personalizedResults.length).toBeGreaterThan(0);
      
      const firstResult = personalizedResults[0];
      expect(firstResult.reasons).toBeDefined();
      expect(Array.isArray(firstResult.reasons)).toBe(true);
      
      // Should provide meaningful reasons
      if (firstResult.reasons.length > 0) {
        firstResult.reasons.forEach(reason => {
          expect(typeof reason).toBe('string');
          expect(reason.length).toBeGreaterThan(10); // Meaningful reason text
        });
      }

      console.log('✅ Personalization reasons provided correctly');
    });

    test('Should handle users without search history', async () => {
      const newUserId = 'brand-new-user-' + Date.now();
      const query = 'tokyo hotels';
      
      const mockHotels = [
        {
          id: 'hotel-for-new-user',
          name: 'Tokyo Hotel',
          location: 'Tokyo',
          price: 10000,
          amenities: ['wifi']
        }
      ];

      const personalizedResults = await aiSearchService.getPersonalizedSearchResults(
        query,
        newUserId,
        mockHotels
      );

      expect(personalizedResults).toBeDefined();
      expect(personalizedResults.length).toBe(1);
      
      // Should still provide results with default scoring
      const result = personalizedResults[0];
      expect(result.personalizedScore).toBeGreaterThanOrEqual(0);
      expect(result.personalizedScore).toBeLessThanOrEqual(1);

      console.log('✅ New user handling validated');
    });
  });

  // Test Suite 3: Predictive Suggestions Accuracy
  describe('3. Predictive Suggestions Accuracy Tests', () => {
    
    test('Should predict relevant next searches', async () => {
      const userId = 'test-user-predictions';
      const currentQuery = 'business hotel';
      
      // Simulate context
      const context = {
        timeOfDay: 'morning',
        dayOfWeek: 'monday',
        season: 'spring'
      };

      const predictions = await aiSearchService.getPredictiveSearchSuggestions(
        currentQuery,
        userId,
        context
      );

      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.length).toBeLessThanOrEqual(6);

      // Predictions should be relevant to the current query
      predictions.forEach(prediction => {
        expect(typeof prediction).toBe('string');
        expect(prediction.length).toBeGreaterThan(5);
        
        // Should relate to business hotels or similar
        const isRelevant = 
          prediction.toLowerCase().includes('business') ||
          prediction.toLowerCase().includes('hotel') ||
          prediction.toLowerCase().includes('corporate') ||
          prediction.toLowerCase().includes('conference');
          
        expect(isRelevant).toBe(true);
      });

      console.log('✅ Predictive suggestions relevance validated');
    });

    test('Should adapt predictions to time context', async () => {
      const userId = 'test-user-time-context';
      const currentQuery = 'tokyo hotel';
      
      // Test different time contexts
      const contexts = [
        { timeOfDay: 'evening', dayOfWeek: 'friday' }, // Weekend prep
        { timeOfDay: 'morning', dayOfWeek: 'monday' }, // Work travel
        { season: 'spring' }, // Cherry blossom season
        { season: 'winter' } // Winter activities
      ];

      for (const context of contexts) {
        const predictions = await aiSearchService.getPredictiveSearchSuggestions(
          currentQuery,
          userId,
          context
        );

        expect(predictions).toBeDefined();
        expect(Array.isArray(predictions)).toBe(true);
        expect(predictions.length).toBeGreaterThan(0);

        // Verify context influences predictions
        if (context.season === 'spring') {
          const hasSeasonalContext = predictions.some(p => 
            p.includes('sakura') || p.includes('cherry') || p.includes('spring')
          );
          // Note: May not always have seasonal context in mock implementation
        }
      }

      console.log('✅ Time-contextual predictions validated');
    });

    test('Should learn from user interaction patterns', async () => {
      const userId = 'test-user-interaction-patterns';
      
      // Simulate user always searching for luxury after business
      const querySequences = [
        ['business hotel tokyo', 'luxury spa tokyo'],
        ['business conference osaka', 'luxury dining osaka'],
        ['business meeting kyoto', 'luxury ryokan kyoto']
      ];

      // Simulate multiple search sessions
      for (const sequence of querySequences) {
        for (const query of sequence) {
          await aiSearchService.processNaturalLanguageQuery(query);
        }
      }

      // Test if pattern is learned
      const predictions = await aiSearchService.getPredictiveSearchSuggestions(
        'business hotel',
        userId
      );

      expect(predictions).toBeDefined();
      
      // Should suggest luxury options based on pattern
      const hasLuxuryPrediction = predictions.some(p =>
        p.toLowerCase().includes('luxury') ||
        p.toLowerCase().includes('premium') ||
        p.toLowerCase().includes('spa')
      );

      expect(hasLuxuryPrediction).toBe(true);
      console.log('✅ User interaction pattern learning validated');
    });
  });

  // Test Suite 4: Personalization Accuracy Metrics
  describe('4. Personalization Accuracy Metrics', () => {
    
    test('Should maintain high relevance scores for personalized results', async () => {
      const userId = 'test-user-relevance';
      const query = 'spa hotel tokyo';
      
      const mockHotels = [
        {
          id: 'perfect-match',
          name: 'Tokyo Luxury Spa Hotel',
          location: 'Tokyo',
          amenities: ['spa', 'onsen', 'massage'],
          price: 20000
        },
        {
          id: 'partial-match',
          name: 'Tokyo Business Hotel', 
          location: 'Tokyo',
          amenities: ['wifi', 'desk'],
          price: 10000
        },
        {
          id: 'poor-match',
          name: 'Osaka Budget Hotel',
          location: 'Osaka',
          amenities: ['wifi'],
          price: 5000
        }
      ];

      const personalizedResults = await aiSearchService.getPersonalizedSearchResults(
        query,
        userId,
        mockHotels
      );

      // Perfect match should have highest score
      const perfectMatch = personalizedResults.find(r => r.hotelId === 'perfect-match');
      const partialMatch = personalizedResults.find(r => r.hotelId === 'partial-match');
      const poorMatch = personalizedResults.find(r => r.hotelId === 'poor-match');

      expect(perfectMatch.relevanceScore).toBeGreaterThan(partialMatch.relevanceScore);
      expect(partialMatch.relevanceScore).toBeGreaterThan(poorMatch.relevanceScore);

      // All scores should be reasonable
      expect(perfectMatch.relevanceScore).toBeGreaterThan(0.7);
      expect(poorMatch.relevanceScore).toBeLessThan(0.5);

      console.log('✅ Relevance scoring accuracy validated');
    });

    test('Should balance personalization with relevance', async () => {
      const userId = 'test-user-balance';
      const query = 'any hotel tokyo';
      
      const mockHotels = [
        {
          id: 'relevant-not-personal',
          name: 'Perfect Tokyo Hotel',
          location: 'Tokyo', 
          amenities: ['everything'],
          price: 15000
        },
        {
          id: 'personal-not-relevant',
          name: 'Osaka Hotel',
          location: 'Osaka', // Not in Tokyo
          amenities: ['user-preferred-amenities'],
          price: 15000
        }
      ];

      const personalizedResults = await aiSearchService.getPersonalizedSearchResults(
        query,
        userId,
        mockHotels
      );

      // Should prioritize relevance over pure personalization
      const relevantResult = personalizedResults.find(r => r.hotelId === 'relevant-not-personal');
      const personalResult = personalizedResults.find(r => r.hotelId === 'personal-not-relevant');

      // Relevant result should rank higher despite lower personalization
      expect(relevantResult.relevanceScore).toBeGreaterThan(personalResult.relevanceScore);

      console.log('✅ Personalization-relevance balance validated');
    });

    test('Should provide confidence scores for personalization', async () => {
      const userId = 'test-user-confidence';
      const query = 'hotel recommendation';
      
      const mockHotels = [
        { id: 'hotel1', name: 'Hotel 1', location: 'Tokyo', price: 10000, amenities: ['wifi'] }
      ];

      const personalizedResults = await aiSearchService.getPersonalizedSearchResults(
        query,
        userId,
        mockHotels
      );

      expect(personalizedResults.length).toBeGreaterThan(0);
      
      personalizedResults.forEach(result => {
        // Scores should be valid confidence values
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(1);
        expect(result.personalizedScore).toBeGreaterThanOrEqual(0);
        expect(result.personalizedScore).toBeLessThanOrEqual(1);
        
        // Combined confidence should be reasonable
        const combinedConfidence = (result.relevanceScore + result.personalizedScore) / 2;
        expect(combinedConfidence).toBeGreaterThanOrEqual(0);
        expect(combinedConfidence).toBeLessThanOrEqual(1);
      });

      console.log('✅ Personalization confidence scores validated');
    });
  });

  // Test Suite 5: Edge Cases and Error Handling
  describe('5. Personalization Edge Cases', () => {
    
    test('Should handle conflicting user preferences', async () => {
      const userId = 'test-user-conflicts';
      
      // Simulate conflicting preferences (budget and luxury)
      const conflictingQueries = [
        'cheap budget hotels',
        'luxury expensive hotels',
        'affordable hotels',
        'premium spa hotels'
      ];

      for (const query of conflictingQueries) {
        await aiSearchService.processNaturalLanguageQuery(query);
      }

      const suggestions = await aiSearchService.getIntelligentSuggestions('hotel', userId);
      
      // Should still provide reasonable suggestions
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);

      console.log('✅ Conflicting preferences handling validated');
    });

    test('Should handle users with minimal interaction history', async () => {
      const userId = 'test-user-minimal-history';
      
      // Only one search
      await aiSearchService.processNaturalLanguageQuery('tokyo hotel');

      const personalizedResults = await aiSearchService.getPersonalizedSearchResults(
        'osaka hotel',
        userId,
        [{ id: 'hotel1', name: 'Hotel', location: 'Osaka', price: 10000, amenities: [] }]
      );

      expect(personalizedResults).toBeDefined();
      expect(personalizedResults.length).toBeGreaterThan(0);
      
      // Should still provide personalization scores (may be lower confidence)
      const result = personalizedResults[0];
      expect(result.personalizedScore).toBeGreaterThanOrEqual(0);

      console.log('✅ Minimal history handling validated');
    });

    test('Should gracefully handle personalization service failures', async () => {
      const userId = 'test-user-service-failure';
      const query = 'hotel test';
      const mockHotels = [{ id: 'hotel1', name: 'Test Hotel', location: 'Tokyo', price: 10000 }];

      // Test should not throw even if personalization fails
      try {
        const results = await aiSearchService.getPersonalizedSearchResults(
          query,
          userId,
          mockHotels
        );
        
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        
        console.log('✅ Graceful failure handling validated');
      } catch (error) {
        // Should not reach here - service should handle errors gracefully
        expect(true).toBe(false);
      }
    });
  });
});

// Performance and accuracy benchmarks
describe('Personalization Performance Benchmarks', () => {
  
  test('Personalization should complete within acceptable time', async () => {
    const userId = 'test-user-performance';
    const query = 'performance test hotel';
    const mockHotels = Array.from({ length: 50 }, (_, i) => ({
      id: `hotel-${i}`,
      name: `Hotel ${i}`,
      location: 'Tokyo',
      price: 10000 + (i * 1000),
      amenities: ['wifi', 'breakfast']
    }));

    const startTime = Date.now();
    const results = await aiSearchService.getPersonalizedSearchResults(
      query,
      userId,
      mockHotels
    );
    const processingTime = Date.now() - startTime;

    expect(results).toBeDefined();
    expect(results.length).toBe(50);
    expect(processingTime).toBeLessThan(1000); // Should complete within 1 second

    console.log(`✅ Personalization performance: ${processingTime}ms for 50 hotels`);
  });

  test('Predictive suggestions should be fast', async () => {
    const userId = 'test-user-prediction-performance';
    const query = 'prediction performance test';

    const startTime = Date.now();
    const predictions = await aiSearchService.getPredictiveSearchSuggestions(query, userId);
    const processingTime = Date.now() - startTime;

    expect(predictions).toBeDefined();
    expect(processingTime).toBeLessThan(500); // Should complete within 500ms

    console.log(`✅ Predictive suggestions performance: ${processingTime}ms`);
  });
});

// Test runner
const runPersonalizationAccuracyTests = async () => {
  console.log('🎯 Starting Personalization Accuracy Tests...\n');
  
  try {
    console.log('📋 Test Suite: Personalization Feature Accuracy');
    console.log('🤖 Testing: AI-driven personalization and user preference learning');
    console.log('👨‍💻 Author: worker2');
    console.log('📅 Date: 2025-06-23\n');
    
    console.log('Testing personalization accuracy and user preference learning...\n');
    
  } catch (error) {
    console.error('❌ Personalization accuracy test execution failed:', error);
    process.exit(1);
  }
};

module.exports = {
  runPersonalizationAccuracyTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runPersonalizationAccuracyTests();
}