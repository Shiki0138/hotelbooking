/**
 * Comprehensive AI Search Functionality Tests
 * Testing all modalities: Text, Voice, Image search
 * Author: worker2
 * Date: 2025-06-23
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Mock Express app for testing
const express = require('express');
const app = express();
app.use(express.json());

// Import AI services for direct testing
const { aiSearchService } = require('../src/services/aiSearchService');
const { voiceSearchService } = require('../src/services/voiceSearchService');
const { imageSearchService } = require('../src/services/imageSearchService');

describe('AI Search Functionality Tests', () => {
  
  // Test Suite 1: Natural Language Processing Search
  describe('1. NLP Text Search Tests', () => {
    
    test('Should process simple Japanese hotel query', async () => {
      const query = '東京のビジネスホテルを探して';
      const result = await aiSearchService.processNaturalLanguageQuery(query);
      
      expect(result).toBeDefined();
      expect(result.originalQuery).toBe(query);
      expect(result.intent.type).toBe('location');
      expect(result.entities).toContainEqual(
        expect.objectContaining({
          type: 'location',
          value: 'tokyo'
        })
      );
      expect(result.confidence).toBeGreaterThan(0.5);
      
      console.log('✅ Japanese NLP Query Test Passed');
    });

    test('Should process complex English hotel query with amenities', async () => {
      const query = 'luxury hotels with spa and pool in Osaka under 20000 yen';
      const result = await aiSearchService.processNaturalLanguageQuery(query);
      
      expect(result).toBeDefined();
      expect(result.intent.type).toBeOneOf(['location', 'amenity', 'mixed']);
      expect(result.entities).toContainEqual(
        expect.objectContaining({
          type: 'location',
          value: 'osaka'
        })
      );
      expect(result.entities).toContainEqual(
        expect.objectContaining({
          type: 'amenity',
          value: 'spa'
        })
      );
      expect(result.entities).toContainEqual(
        expect.objectContaining({
          type: 'amenity', 
          value: 'pool'
        })
      );
      
      console.log('✅ Complex English NLP Query Test Passed');
    });

    test('Should generate intelligent autocomplete suggestions', async () => {
      const partialQuery = 'kyoto';
      const suggestions = await aiSearchService.getIntelligentSuggestions(partialQuery);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('kyoto'))).toBe(true);
      
      console.log('✅ Autocomplete Suggestions Test Passed');
    });

    test('Should handle edge cases and malformed queries', async () => {
      const edgeCases = [
        '', // Empty query
        '   ', // Whitespace only
        '123456789', // Numbers only
        'あいうえお', // Hiragana only
        '!@#$%^&*()', // Special characters
        'very very very very very very very very very very long query that exceeds normal length'
      ];

      for (const query of edgeCases) {
        const result = await aiSearchService.processNaturalLanguageQuery(query);
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
      
      console.log('✅ Edge Cases Test Passed');
    });
  });

  // Test Suite 2: Voice Search Tests
  describe('2. Voice Search Functionality Tests', () => {
    
    test('Should validate supported languages', () => {
      const languages = voiceSearchService.getSupportedLanguages();
      
      expect(languages).toBeDefined();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBe(4);
      
      const expectedLanguages = ['ja-JP', 'en-US', 'ko-KR', 'zh-CN'];
      expectedLanguages.forEach(lang => {
        expect(languages).toContainEqual(
          expect.objectContaining({
            code: lang
          })
        );
      });
      
      console.log('✅ Voice Languages Validation Test Passed');
    });

    test('Should validate audio input correctly', () => {
      // Test valid audio
      const validAudio = Buffer.alloc(5000); // 5KB audio buffer
      const validResult = voiceSearchService.validateAudioInput(validAudio, 'webm');
      expect(validResult.valid).toBe(true);
      
      // Test invalid size
      const largeAudio = Buffer.alloc(11 * 1024 * 1024); // 11MB audio buffer
      const sizeResult = voiceSearchService.validateAudioInput(largeAudio, 'webm');
      expect(sizeResult.valid).toBe(false);
      expect(sizeResult.error).toContain('too large');
      
      // Test invalid format
      const formatResult = voiceSearchService.validateAudioInput(validAudio, 'invalid');
      expect(formatResult.valid).toBe(false);
      expect(formatResult.error).toContain('Unsupported format');
      
      // Test too small
      const smallAudio = Buffer.alloc(500); // 500 bytes
      const smallResult = voiceSearchService.validateAudioInput(smallAudio, 'webm');
      expect(smallResult.valid).toBe(false);
      expect(smallResult.error).toContain('too small');
      
      console.log('✅ Audio Input Validation Test Passed');
    });

    test('Should process mock voice search requests', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const voiceRequest = {
        audioBlob: mockAudioBuffer,
        userId: 'test-user-123',
        language: 'ja-JP',
        format: 'webm'
      };

      const result = await voiceSearchService.processVoiceSearch(voiceRequest);
      
      expect(result).toBeDefined();
      expect(result.transcription).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.searchResults)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
      
      console.log('✅ Voice Search Processing Test Passed');
    });

    test('Should handle different language voice searches', async () => {
      const languages = ['ja-JP', 'en-US', 'ko-KR', 'zh-CN'];
      const mockAudioBuffer = Buffer.alloc(2000);

      for (const language of languages) {
        const voiceRequest = {
          audioBlob: mockAudioBuffer,
          language,
          format: 'webm'
        };

        const result = await voiceSearchService.processVoiceSearch(voiceRequest);
        expect(result).toBeDefined();
        expect(result.transcription).toBeDefined();
        
        // Check if suggestions are language-appropriate
        const suggestions = await voiceSearchService.getVoiceSearchSuggestions(language);
        expect(Array.isArray(suggestions)).toBe(true);
        expect(suggestions.length).toBeGreaterThan(0);
      }
      
      console.log('✅ Multi-language Voice Search Test Passed');
    });
  });

  // Test Suite 3: Image Search Tests
  describe('3. Image Search Functionality Tests', () => {
    
    test('Should validate supported image search types', () => {
      const types = imageSearchService.getSupportedSearchTypes();
      
      expect(types).toBeDefined();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBe(5);
      
      const expectedTypes = ['exterior', 'interior', 'amenity', 'room_type', 'general'];
      expectedTypes.forEach(type => {
        expect(types).toContainEqual(
          expect.objectContaining({
            type: type
          })
        );
      });
      
      console.log('✅ Image Search Types Validation Test Passed');
    });

    test('Should validate image input correctly', () => {
      // Create mock image buffer
      const validImage = Buffer.alloc(1024 * 1024); // 1MB image
      const validResult = imageSearchService.validateImage(validImage, 'image/jpeg');
      expect(validResult.valid).toBe(true);
      
      // Test invalid size
      const largeImage = Buffer.alloc(6 * 1024 * 1024); // 6MB image
      const sizeResult = imageSearchService.validateImage(largeImage, 'image/jpeg');
      expect(sizeResult.valid).toBe(false);
      expect(sizeResult.error).toContain('too large');
      
      // Test invalid format
      const formatResult = imageSearchService.validateImage(validImage, 'image/gif');
      expect(formatResult.valid).toBe(false);
      expect(formatResult.error).toContain('Unsupported');
      
      console.log('✅ Image Input Validation Test Passed');
    });

    test('Should process mock image search requests', async () => {
      const mockImageBuffer = Buffer.alloc(1024 * 1024); // 1MB mock image
      const imageRequest = {
        imageData: mockImageBuffer,
        searchType: 'interior',
        userId: 'test-user-123',
        mimeType: 'image/jpeg'
      };

      const result = await imageSearchService.processImageSearch(imageRequest);
      
      expect(result).toBeDefined();
      expect(result.analysisResults).toBeDefined();
      expect(result.analysisResults.detectedFeatures).toBeDefined();
      expect(Array.isArray(result.analysisResults.detectedFeatures)).toBe(true);
      expect(result.analysisResults.confidence).toBeGreaterThanOrEqual(0);
      expect(result.analysisResults.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.searchResults)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.processingTime).toBeGreaterThan(0);
      
      console.log('✅ Image Search Processing Test Passed');
    });

    test('Should handle different image search types', async () => {
      const searchTypes = ['exterior', 'interior', 'amenity', 'room_type', 'general'];
      const mockImageBuffer = Buffer.alloc(1024 * 1024);

      for (const searchType of searchTypes) {
        const imageRequest = {
          imageData: mockImageBuffer,
          searchType,
          mimeType: 'image/jpeg'
        };

        const result = await imageSearchService.processImageSearch(imageRequest);
        expect(result).toBeDefined();
        expect(result.analysisResults.hotelType).toBeDefined();
        
        // Verify analysis is appropriate for search type
        if (searchType === 'interior') {
          expect(result.analysisResults.roomType).toBeDefined();
        }
      }
      
      console.log('✅ Multi-type Image Search Test Passed');
    });
  });

  // Test Suite 4: Personalization Tests
  describe('4. Personalization Functionality Tests', () => {
    
    test('Should generate personalized search results', async () => {
      const query = 'luxury hotels tokyo';
      const userId = 'test-user-personalization';
      const mockBaseResults = [
        {
          id: 'hotel1',
          name: 'Tokyo Luxury Hotel',
          location: 'Ginza, Tokyo',
          price: 25000,
          amenities: ['spa', 'pool', 'restaurant']
        },
        {
          id: 'hotel2', 
          name: 'Business Hotel Tokyo',
          location: 'Shinjuku, Tokyo',
          price: 12000,
          amenities: ['wifi', 'breakfast', 'gym']
        }
      ];

      const personalizedResults = await aiSearchService.getPersonalizedSearchResults(
        query,
        userId,
        mockBaseResults
      );
      
      expect(personalizedResults).toBeDefined();
      expect(Array.isArray(personalizedResults)).toBe(true);
      expect(personalizedResults.length).toBe(mockBaseResults.length);
      
      personalizedResults.forEach(result => {
        expect(result.hotelId).toBeDefined();
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(1);
        expect(result.personalizedScore).toBeGreaterThanOrEqual(0);
        expect(result.personalizedScore).toBeLessThanOrEqual(1);
        expect(Array.isArray(result.reasons)).toBe(true);
      });
      
      console.log('✅ Personalization Test Passed');
    });

    test('Should generate predictive search suggestions', async () => {
      const currentQuery = 'tokyo hotel';
      const userId = 'test-user-predictive';
      const mockContext = {
        timeOfDay: 'evening',
        dayOfWeek: 'friday',
        season: 'spring'
      };

      const predictions = await aiSearchService.getPredictiveSearchSuggestions(
        currentQuery,
        userId,
        mockContext
      );
      
      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.length).toBeLessThanOrEqual(6);
      
      console.log('✅ Predictive Search Test Passed');
    });
  });

  // Test Suite 5: Integration Tests
  describe('5. Cross-Modal Integration Tests', () => {
    
    test('Should maintain consistency across search modalities', async () => {
      const testQuery = '東京のスパ付きホテル';
      
      // Test text search
      const textResult = await aiSearchService.processNaturalLanguageQuery(testQuery);
      
      // Test voice search with same query
      const mockAudioBuffer = Buffer.alloc(2000);
      const voiceRequest = {
        audioBlob: mockAudioBuffer,
        language: 'ja-JP',
        format: 'webm'
      };
      const voiceResult = await voiceSearchService.processVoiceSearch(voiceRequest);
      
      // Both should detect spa-related intent
      expect(textResult.entities.some(e => e.type === 'amenity')).toBe(true);
      expect(voiceResult.suggestions.some(s => s.includes('spa') || s.includes('スパ'))).toBe(true);
      
      console.log('✅ Cross-Modal Consistency Test Passed');
    });

    test('Should handle concurrent AI operations', async () => {
      const promises = [
        aiSearchService.processNaturalLanguageQuery('tokyo hotels'),
        aiSearchService.getIntelligentSuggestions('osaka'),
        aiSearchService.getPredictiveSearchSuggestions('kyoto hotel', 'user1'),
        voiceSearchService.processVoiceSearch({
          audioBlob: Buffer.alloc(2000),
          language: 'ja-JP',
          format: 'webm'
        }),
        imageSearchService.processImageSearch({
          imageData: Buffer.alloc(1024 * 1024),
          searchType: 'interior',
          mimeType: 'image/jpeg'
        })
      ];

      const results = await Promise.allSettled(promises);
      
      // All operations should complete successfully
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        expect(result.value).toBeDefined();
      });
      
      console.log('✅ Concurrent Operations Test Passed');
    });
  });

  // Performance Benchmarks
  describe('6. Performance Benchmarks', () => {
    
    test('NLP processing should complete within 2 seconds', async () => {
      const startTime = Date.now();
      await aiSearchService.processNaturalLanguageQuery('find luxury hotels in tokyo with spa');
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(2000);
      console.log(`✅ NLP Performance: ${processingTime}ms`);
    });

    test('Voice search should complete within 5 seconds', async () => {
      const startTime = Date.now();
      await voiceSearchService.processVoiceSearch({
        audioBlob: Buffer.alloc(2000),
        language: 'ja-JP',
        format: 'webm'
      });
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(5000);
      console.log(`✅ Voice Search Performance: ${processingTime}ms`);
    });

    test('Image search should complete within 3 seconds', async () => {
      const startTime = Date.now();
      await imageSearchService.processImageSearch({
        imageData: Buffer.alloc(1024 * 1024),
        searchType: 'interior',
        mimeType: 'image/jpeg'
      });
      const processingTime = Date.now() - startTime;
      
      expect(processingTime).toBeLessThan(3000);
      console.log(`✅ Image Search Performance: ${processingTime}ms`);
    });
  });
});

// Custom Jest matchers
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      message: () => `expected ${received} to be one of ${expected.join(', ')}`,
      pass
    };
  }
});

// Test runner configuration
const runTests = async () => {
  console.log('🚀 Starting AI Search Functionality Tests...\n');
  
  try {
    // Initialize test environment
    console.log('📋 Test Suite: AI Search Functionality');
    console.log('👨‍💻 Author: worker2');
    console.log('📅 Date: 2025-06-23\n');
    
    // Run test suites
    console.log('Running tests...\n');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
};

module.exports = {
  runTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}