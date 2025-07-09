import { logger } from '../utils/logger';
import { CacheService } from './cacheService';
import { aiSearchService } from './aiSearchService';

interface VoiceSearchRequest {
  audioBlob: Buffer;
  userId?: string;
  language: 'ja-JP' | 'en-US' | 'ko-KR' | 'zh-CN';
  format: 'webm' | 'mp3' | 'wav';
}

interface VoiceSearchResponse {
  transcription: string;
  confidence: number;
  searchResults: any[];
  suggestions: string[];
  processingTime: number;
}

interface SpeechToTextResult {
  text: string;
  confidence: number;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
}

export class VoiceSearchService {
  private cache: CacheService;

  constructor() {
    this.cache = new CacheService();
  }

  /**
   * Process voice search request
   */
  async processVoiceSearch(request: VoiceSearchRequest): Promise<VoiceSearchResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing voice search request', { 
        userId: request.userId, 
        language: request.language,
        audioSize: request.audioBlob.length 
      });

      // Step 1: Convert speech to text
      const transcriptionResult = await this.speechToText(request.audioBlob, request.language);
      
      if (!transcriptionResult.text || transcriptionResult.confidence < 0.6) {
        return {
          transcription: transcriptionResult.text || '',
          confidence: transcriptionResult.confidence,
          searchResults: [],
          suggestions: await this.getVoiceSearchSuggestions(request.language),
          processingTime: Date.now() - startTime
        };
      }

      // Step 2: Process the transcribed text with AI search
      const nlpQuery = await aiSearchService.processNaturalLanguageQuery(transcriptionResult.text);
      
      // Step 3: Get search results (this would integrate with your existing search service)
      const searchResults = await this.performVoiceSearchQuery(nlpQuery, request.userId);

      // Step 4: Get intelligent suggestions for voice search
      const suggestions = await aiSearchService.getIntelligentSuggestions(
        transcriptionResult.text, 
        request.userId
      );

      const response: VoiceSearchResponse = {
        transcription: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        searchResults,
        suggestions,
        processingTime: Date.now() - startTime
      };

      logger.info('Voice search completed', { 
        transcription: transcriptionResult.text,
        resultsCount: searchResults.length,
        processingTime: response.processingTime
      });

      return response;

    } catch (error) {
      logger.error('Error processing voice search', { error, userId: request.userId });
      return {
        transcription: '',
        confidence: 0,
        searchResults: [],
        suggestions: await this.getVoiceSearchSuggestions(request.language),
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Convert speech to text using Web Speech API compatible format
   * In production, this would integrate with services like Google Speech-to-Text,
   * Azure Speech Service, or AWS Transcribe
   */
  private async speechToText(audioBlob: Buffer, language: string): Promise<SpeechToTextResult> {
    try {
      // Simulate speech-to-text processing
      // In production, you would send the audio to a speech recognition service
      
      const cacheKey = `speech_to_text:${this.generateAudioHash(audioBlob)}:${language}`;
      const cached = await this.cache.get<SpeechToTextResult>(cacheKey);
      if (cached) {
        return cached;
      }

      // Mock implementation - in production, replace with actual speech recognition
      const mockResult = await this.mockSpeechRecognition(audioBlob, language);
      
      // Cache the result for 1 hour
      await this.cache.set(cacheKey, mockResult, 3600);
      
      return mockResult;

    } catch (error) {
      logger.error('Error in speech-to-text conversion', { error, language });
      return {
        text: '',
        confidence: 0,
        alternatives: []
      };
    }
  }

  /**
   * Mock speech recognition for development
   * Replace with actual speech recognition service in production
   */
  private async mockSpeechRecognition(_audioBlob: Buffer, language: string): Promise<SpeechToTextResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock responses based on language
    const mockPhrases: { [key: string]: string[] } = {
      'ja-JP': [
        '東京のビジネスホテルを探して',
        '大阪でプール付きのホテル',
        '京都の温泉旅館',
        '新宿駅近くの安いホテル',
        '朝食付きのホテルがほしい'
      ],
      'en-US': [
        'find business hotels in tokyo',
        'hotels with pool in osaka',
        'traditional ryokan in kyoto',
        'cheap hotels near shinjuku station',
        'hotels with breakfast included'
      ],
      'ko-KR': [
        '도쿄의 비즈니스 호텔',
        '수영장이 있는 오사카 호텔',
        '교토의 전통 료칸',
        '신주쿠역 근처 저렴한 호텔'
      ],
      'zh-CN': [
        '东京商务酒店',
        '大阪带游泳池的酒店',
        '京都传统旅馆',
        '新宿站附近便宜酒店'
      ]
    };

    const phrases = mockPhrases[language] || mockPhrases['en-US'];
    const randomPhrase = phrases![Math.floor(Math.random() * phrases!.length)];
    
    return {
      text: randomPhrase,
      confidence: 0.85 + Math.random() * 0.1, // 0.85-0.95
      alternatives: [
        {
          text: randomPhrase,
          confidence: 0.9
        },
        {
          text: phrases![(phrases!.indexOf(randomPhrase) + 1) % phrases!.length],
          confidence: 0.7
        }
      ]
    };
  }

  /**
   * Perform search based on voice query
   */
  private async performVoiceSearchQuery(nlpQuery: any, userId?: string): Promise<any[]> {
    try {
      // This would integrate with your existing hotel search service
      // For now, return mock results
      const mockResults = [
        {
          id: 'hotel_1',
          name: 'Tokyo Business Hotel',
          location: 'Shinjuku, Tokyo',
          price: 8500,
          rating: 4.2,
          amenities: ['wifi', 'breakfast', 'business_center'],
          image: 'https://example.com/hotel1.jpg'
        },
        {
          id: 'hotel_2',
          name: 'Osaka Pool Resort',
          location: 'Namba, Osaka',
          price: 12000,
          rating: 4.5,
          amenities: ['wifi', 'pool', 'spa', 'restaurant'],
          image: 'https://example.com/hotel2.jpg'
        },
        {
          id: 'hotel_3',
          name: 'Kyoto Traditional Ryokan',
          location: 'Gion, Kyoto',
          price: 18000,
          rating: 4.7,
          amenities: ['onsen', 'traditional_dinner', 'garden'],
          image: 'https://example.com/hotel3.jpg'
        }
      ];

      // If user is available, personalize results
      if (userId) {
        const personalizedResults = await aiSearchService.getPersonalizedSearchResults(
          nlpQuery.originalQuery,
          userId,
          mockResults
        );
        return personalizedResults;
      }

      return mockResults;

    } catch (error) {
      logger.error('Error performing voice search query', { error, nlpQuery });
      return [];
    }
  }

  /**
   * Get voice search suggestions based on language
   */
  private async getVoiceSearchSuggestions(language: string): Promise<string[]> {
    const suggestions: { [key: string]: string[] } = {
      'ja-JP': [
        '「東京のホテルを探して」と言ってみてください',
        '「プール付きのホテル」',
        '「朝食付きの安いホテル」',
        '「駅近くのビジネスホテル」'
      ],
      'en-US': [
        'Try saying "find hotels in Tokyo"',
        'Say "hotels with pool"',
        'Try "cheap hotels with breakfast"',
        'Say "business hotels near station"'
      ],
      'ko-KR': [
        '"도쿄 호텔 찾아줘"라고 말해보세요',
        '"수영장 있는 호텔"',
        '"아침식사 포함된 호텔"',
        '"역 근처 비즈니스 호텔"'
      ],
      'zh-CN': [
        '试着说"寻找东京的酒店"',
        '说"带游泳池的酒店"',
        '试试"便宜的含早餐酒店"',
        '说"车站附近的商务酒店"'
      ]
    };

    return suggestions[language] || suggestions['en-US'] || [];
  }

  /**
   * Generate audio hash for caching
   */
  private generateAudioHash(audioBlob: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(audioBlob).digest('hex');
  }

  /**
   * Get supported languages for voice search
   */
  getSupportedLanguages(): Array<{code: string, name: string, flag: string}> {
    return [
      { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
      { code: 'en-US', name: 'English', flag: '🇺🇸' },
      { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
      { code: 'zh-CN', name: '中文', flag: '🇨🇳' }
    ];
  }

  /**
   * Validate audio format and size
   */
  validateAudioInput(audioBlob: Buffer, format: string): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const supportedFormats = ['webm', 'mp3', 'wav'];

    if (audioBlob.length > maxSize) {
      return { valid: false, error: 'Audio file too large. Maximum size is 10MB.' };
    }

    if (!supportedFormats.includes(format)) {
      return { valid: false, error: `Unsupported format. Supported formats: ${supportedFormats.join(', ')}` };
    }

    if (audioBlob.length < 1000) { // Less than 1KB
      return { valid: false, error: 'Audio file too small. Please record at least 1 second of audio.' };
    }

    return { valid: true };
  }

  /**
   * Get voice search analytics
   */
  async getVoiceSearchAnalytics(userId?: string): Promise<any> {
    try {
      const cacheKey = userId ? `voice_analytics:${userId}` : 'voice_analytics:global';
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;

      // Mock analytics data
      const analytics = {
        totalSearches: 1247,
        averageConfidence: 0.87,
        topLanguages: [
          { language: 'ja-JP', percentage: 45 },
          { language: 'en-US', percentage: 30 },
          { language: 'ko-KR', percentage: 15 },
          { language: 'zh-CN', percentage: 10 }
        ],
        commonQueries: [
          '東京のホテル',
          'hotels in tokyo',
          'business hotels',
          'pool hotels'
        ],
        averageProcessingTime: 1200, // ms
        successRate: 92
      };

      await this.cache.set(cacheKey, analytics, 300); // 5 minutes
      return analytics;

    } catch (error) {
      logger.error('Error getting voice search analytics', { error, userId });
      return null;
    }
  }
}

export const voiceSearchService = new VoiceSearchService();