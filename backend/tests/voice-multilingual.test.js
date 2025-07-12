/**
 * 4-Language Voice Search Comprehensive Tests
 * Testing Japanese, English, Korean, Chinese voice search functionality
 * Author: worker2
 * Date: 2025-06-23
 */

const { voiceSearchService } = require('../src/services/voiceSearchService');

describe('Multi-Language Voice Search Tests', () => {
  
  // Test Suite 1: Language Support Validation
  describe('1. Language Support Validation', () => {
    
    test('Should support all 4 target languages', () => {
      const languages = voiceSearchService.getSupportedLanguages();
      
      expect(languages).toHaveLength(4);
      
      const expectedLanguages = [
        { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
        { code: 'en-US', name: 'English', flag: '🇺🇸' },
        { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
        { code: 'zh-CN', name: '中文', flag: '🇨🇳' }
      ];
      
      expectedLanguages.forEach(expected => {
        expect(languages).toContainEqual(expected);
      });
      
      console.log('✅ All 4 languages supported correctly');
    });
  });

  // Test Suite 2: Japanese Voice Search
  describe('2. Japanese (ja-JP) Voice Search Tests', () => {
    
    test('Should process Japanese hotel queries', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const request = {
        audioBlob: mockAudioBuffer,
        language: 'ja-JP',
        format: 'webm'
      };
      
      const result = await voiceSearchService.processVoiceSearch(request);
      
      expect(result).toBeDefined();
      expect(result.transcription).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      
      // Japanese-specific validation
      const japanesePhrases = [
        '東京のビジネスホテルを探して',
        '大阪でプール付きのホテル', 
        '京都の温泉旅館',
        '新宿駅近くの安いホテル',
        '朝食付きのホテルがほしい'
      ];
      
      expect(japanesePhrases).toContain(result.transcription);
      console.log(`✅ Japanese transcription: "${result.transcription}"`);
    });

    test('Should provide Japanese language suggestions', async () => {
      const suggestions = await voiceSearchService.getVoiceSearchSuggestions('ja-JP');
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // All suggestions should be in Japanese
      suggestions.forEach(suggestion => {
        expect(suggestion).toMatch(/[ひらがなカタカナ漢字]/);
      });
      
      console.log('✅ Japanese suggestions generated correctly');
    });

    test('Should handle Japanese-specific hotel terms', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const request = {
        audioBlob: mockAudioBuffer,
        language: 'ja-JP',
        format: 'webm'
      };
      
      const result = await voiceSearchService.processVoiceSearch(request);
      
      // Check for Japanese hotel-specific terms in results
      const expectedTerms = ['ビジネス', 'ホテル', '旅館', '温泉', '朝食'];
      const hasJapaneseTerms = expectedTerms.some(term => 
        result.transcription.includes(term) || 
        result.suggestions.some(s => s.includes(term))
      );
      
      expect(hasJapaneseTerms).toBe(true);
      console.log('✅ Japanese hotel terms recognized');
    });
  });

  // Test Suite 3: English Voice Search
  describe('3. English (en-US) Voice Search Tests', () => {
    
    test('Should process English hotel queries', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const request = {
        audioBlob: mockAudioBuffer,
        language: 'en-US',
        format: 'webm'
      };
      
      const result = await voiceSearchService.processVoiceSearch(request);
      
      expect(result).toBeDefined();
      expect(result.transcription).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      
      // English-specific validation
      const englishPhrases = [
        'find business hotels in tokyo',
        'hotels with pool in osaka',
        'traditional ryokan in kyoto', 
        'cheap hotels near shinjuku station',
        'hotels with breakfast included'
      ];
      
      expect(englishPhrases).toContain(result.transcription);
      console.log(`✅ English transcription: "${result.transcription}"`);
    });

    test('Should provide English language suggestions', async () => {
      const suggestions = await voiceSearchService.getVoiceSearchSuggestions('en-US');
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // All suggestions should be in English
      suggestions.forEach(suggestion => {
        expect(suggestion).toMatch(/^[a-zA-Z\s"'.,-]+$/);
      });
      
      console.log('✅ English suggestions generated correctly');
    });

    test('Should handle English hotel terminology', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const request = {
        audioBlob: mockAudioBuffer,
        language: 'en-US',
        format: 'webm'
      };
      
      const result = await voiceSearchService.processVoiceSearch(request);
      
      // Check for English hotel terms
      const expectedTerms = ['hotel', 'business', 'luxury', 'budget', 'breakfast', 'pool'];
      const hasEnglishTerms = expectedTerms.some(term => 
        result.transcription.toLowerCase().includes(term) ||
        result.suggestions.some(s => s.toLowerCase().includes(term))
      );
      
      expect(hasEnglishTerms).toBe(true);
      console.log('✅ English hotel terms recognized');
    });
  });

  // Test Suite 4: Korean Voice Search
  describe('4. Korean (ko-KR) Voice Search Tests', () => {
    
    test('Should process Korean hotel queries', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const request = {
        audioBlob: mockAudioBuffer,
        language: 'ko-KR',
        format: 'webm'
      };
      
      const result = await voiceSearchService.processVoiceSearch(request);
      
      expect(result).toBeDefined();
      expect(result.transcription).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      
      // Korean-specific validation
      const koreanPhrases = [
        '도쿄의 비즈니스 호텔',
        '수영장이 있는 오사카 호텔',
        '교토의 전통 료칸',
        '신주쿠역 근처 저렴한 호텔'
      ];
      
      expect(koreanPhrases).toContain(result.transcription);
      console.log(`✅ Korean transcription: "${result.transcription}"`);
    });

    test('Should provide Korean language suggestions', async () => {
      const suggestions = await voiceSearchService.getVoiceSearchSuggestions('ko-KR');
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // All suggestions should contain Korean characters
      suggestions.forEach(suggestion => {
        expect(suggestion).toMatch(/[ㄱ-ㅎㅏ-ㅣ가-힣]/);
      });
      
      console.log('✅ Korean suggestions generated correctly');
    });

    test('Should handle Korean hotel terminology', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const request = {
        audioBlob: mockAudioBuffer,
        language: 'ko-KR',
        format: 'webm'
      };
      
      const result = await voiceSearchService.processVoiceSearch(request);
      
      // Check for Korean hotel terms
      const expectedTerms = ['호텔', '비즈니스', '수영장', '료칸', '저렴한'];
      const hasKoreanTerms = expectedTerms.some(term => 
        result.transcription.includes(term) ||
        result.suggestions.some(s => s.includes(term))
      );
      
      expect(hasKoreanTerms).toBe(true);
      console.log('✅ Korean hotel terms recognized');
    });
  });

  // Test Suite 5: Chinese Voice Search
  describe('5. Chinese (zh-CN) Voice Search Tests', () => {
    
    test('Should process Chinese hotel queries', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const request = {
        audioBlob: mockAudioBuffer,
        language: 'zh-CN',
        format: 'webm'
      };
      
      const result = await voiceSearchService.processVoiceSearch(request);
      
      expect(result).toBeDefined();
      expect(result.transcription).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      
      // Chinese-specific validation
      const chinesePhrases = [
        '东京商务酒店',
        '大阪带游泳池的酒店', 
        '京都传统旅馆',
        '新宿站附近便宜酒店'
      ];
      
      expect(chinesePhrases).toContain(result.transcription);
      console.log(`✅ Chinese transcription: "${result.transcription}"`);
    });

    test('Should provide Chinese language suggestions', async () => {
      const suggestions = await voiceSearchService.getVoiceSearchSuggestions('zh-CN');
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      
      // All suggestions should contain Chinese characters
      suggestions.forEach(suggestion => {
        expect(suggestion).toMatch(/[\u4e00-\u9fff]/);
      });
      
      console.log('✅ Chinese suggestions generated correctly');
    });

    test('Should handle Chinese hotel terminology', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const request = {
        audioBlob: mockAudioBuffer,
        language: 'zh-CN',
        format: 'webm'
      };
      
      const result = await voiceSearchService.processVoiceSearch(request);
      
      // Check for Chinese hotel terms
      const expectedTerms = ['酒店', '商务', '游泳池', '旅馆', '便宜'];
      const hasChineseTerms = expectedTerms.some(term => 
        result.transcription.includes(term) ||
        result.suggestions.some(s => s.includes(term))
      );
      
      expect(hasChineseTerms).toBe(true);
      console.log('✅ Chinese hotel terms recognized');
    });
  });

  // Test Suite 6: Cross-Language Consistency
  describe('6. Cross-Language Consistency Tests', () => {
    
    test('Should maintain consistent response structure across languages', async () => {
      const languages = ['ja-JP', 'en-US', 'ko-KR', 'zh-CN'];
      const mockAudioBuffer = Buffer.alloc(2000);
      const results = [];
      
      for (const language of languages) {
        const request = {
          audioBlob: mockAudioBuffer,
          language,
          format: 'webm'
        };
        
        const result = await voiceSearchService.processVoiceSearch(request);
        results.push({ language, result });
        
        // Validate consistent structure
        expect(result).toHaveProperty('transcription');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('searchResults');
        expect(result).toHaveProperty('suggestions');
        expect(result).toHaveProperty('processingTime');
        
        expect(Array.isArray(result.searchResults)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(typeof result.confidence).toBe('number');
        expect(typeof result.processingTime).toBe('number');
      }
      
      console.log('✅ Consistent response structure across all languages');
    });

    test('Should handle language switching seamlessly', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const languageSequence = ['ja-JP', 'en-US', 'ko-KR', 'zh-CN', 'ja-JP'];
      
      for (const language of languageSequence) {
        const request = {
          audioBlob: mockAudioBuffer,
          language,
          format: 'webm'
        };
        
        const result = await voiceSearchService.processVoiceSearch(request);
        expect(result).toBeDefined();
        expect(result.transcription).toBeDefined();
      }
      
      console.log('✅ Language switching handled seamlessly');
    });

    test('Should provide appropriate suggestions for each language', async () => {
      const languages = ['ja-JP', 'en-US', 'ko-KR', 'zh-CN'];
      
      for (const language of languages) {
        const suggestions = await voiceSearchService.getVoiceSearchSuggestions(language);
        
        expect(suggestions).toBeDefined();
        expect(Array.isArray(suggestions)).toBe(true);
        expect(suggestions.length).toBeGreaterThan(0);
        
        // Verify suggestions are in the correct language
        switch (language) {
          case 'ja-JP':
            expect(suggestions.some(s => /[ひらがなカタカナ漢字]/.test(s))).toBe(true);
            break;
          case 'en-US':
            expect(suggestions.some(s => /^[a-zA-Z\s"'.,-]+$/.test(s))).toBe(true);
            break;
          case 'ko-KR':
            expect(suggestions.some(s => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(s))).toBe(true);
            break;
          case 'zh-CN':
            expect(suggestions.some(s => /[\u4e00-\u9fff]/.test(s))).toBe(true);
            break;
        }
      }
      
      console.log('✅ Language-appropriate suggestions provided');
    });
  });

  // Test Suite 7: Performance Across Languages
  describe('7. Performance Across Languages', () => {
    
    test('Should maintain consistent performance across all languages', async () => {
      const languages = ['ja-JP', 'en-US', 'ko-KR', 'zh-CN'];
      const mockAudioBuffer = Buffer.alloc(2000);
      const performanceResults = [];
      
      for (const language of languages) {
        const startTime = Date.now();
        
        const request = {
          audioBlob: mockAudioBuffer,
          language,
          format: 'webm'
        };
        
        const result = await voiceSearchService.processVoiceSearch(request);
        const processingTime = Date.now() - startTime;
        
        performanceResults.push({
          language,
          processingTime,
          reportedTime: result.processingTime
        });
        
        // Each language should process within 5 seconds
        expect(processingTime).toBeLessThan(5000);
      }
      
      // Calculate average processing time
      const avgProcessingTime = performanceResults.reduce((sum, r) => sum + r.processingTime, 0) / performanceResults.length;
      
      // No language should take more than 150% of average time
      performanceResults.forEach(result => {
        expect(result.processingTime).toBeLessThan(avgProcessingTime * 1.5);
      });
      
      console.log('✅ Consistent performance across languages');
      console.log(`Average processing time: ${avgProcessingTime.toFixed(2)}ms`);
    });

    test('Should handle concurrent multi-language requests', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      
      const concurrentRequests = [
        voiceSearchService.processVoiceSearch({
          audioBlob: mockAudioBuffer,
          language: 'ja-JP',
          format: 'webm'
        }),
        voiceSearchService.processVoiceSearch({
          audioBlob: mockAudioBuffer,
          language: 'en-US',
          format: 'webm'
        }),
        voiceSearchService.processVoiceSearch({
          audioBlob: mockAudioBuffer,
          language: 'ko-KR',
          format: 'webm'
        }),
        voiceSearchService.processVoiceSearch({
          audioBlob: mockAudioBuffer,
          language: 'zh-CN',
          format: 'webm'
        })
      ];
      
      const results = await Promise.allSettled(concurrentRequests);
      
      // All requests should complete successfully
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        expect(result.value).toBeDefined();
      });
      
      console.log('✅ Concurrent multi-language requests handled successfully');
    });
  });

  // Test Suite 8: Error Handling
  describe('8. Multi-Language Error Handling', () => {
    
    test('Should handle invalid language codes gracefully', async () => {
      const mockAudioBuffer = Buffer.alloc(2000);
      const invalidLanguages = ['xx-XX', 'invalid', 'fr-FR', 'de-DE'];
      
      for (const language of invalidLanguages) {
        const request = {
          audioBlob: mockAudioBuffer,
          language,
          format: 'webm'
        };
        
        // Should not throw error, but may return low confidence
        const result = await voiceSearchService.processVoiceSearch(request);
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      }
      
      console.log('✅ Invalid language codes handled gracefully');
    });

    test('Should provide fallback suggestions for unsupported languages', async () => {
      const unsupportedLanguages = ['fr-FR', 'de-DE', 'es-ES'];
      
      for (const language of unsupportedLanguages) {
        const suggestions = await voiceSearchService.getVoiceSearchSuggestions(language);
        
        // Should fallback to English suggestions
        expect(suggestions).toBeDefined();
        expect(Array.isArray(suggestions)).toBe(true);
        expect(suggestions.length).toBeGreaterThan(0);
      }
      
      console.log('✅ Fallback suggestions provided for unsupported languages');
    });
  });
});

// Test runner for multi-language voice search
const runMultiLanguageVoiceTests = async () => {
  console.log('🎤 Starting Multi-Language Voice Search Tests...\n');
  
  try {
    console.log('📋 Test Suite: 4-Language Voice Search');
    console.log('🌍 Languages: Japanese, English, Korean, Chinese');
    console.log('👨‍💻 Author: worker2');
    console.log('📅 Date: 2025-06-23\n');
    
    console.log('Testing voice search functionality across all supported languages...\n');
    
  } catch (error) {
    console.error('❌ Multi-language voice test execution failed:', error);
    process.exit(1);
  }
};

module.exports = {
  runMultiLanguageVoiceTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runMultiLanguageVoiceTests();
}