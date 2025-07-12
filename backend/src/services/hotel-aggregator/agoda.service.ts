import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { Hotel, PriceData, SearchParams } from '../../types/hotel.types';
import { AgodaSearchRequest, AgodaHotelResponse } from '../../types/api.types';
import { CacheService } from '../cache.service';
import { logger } from '../../utils/logger';

export class AgodaService {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private siteId: string;
  private cache: CacheService;

  constructor() {
    this.apiKey = process.env.AGODA_API_KEY || '';
    this.apiSecret = process.env.AGODA_API_SECRET || '';
    this.siteId = process.env.AGODA_SITE_ID || '';
    this.cache = new CacheService();

    this.client = axios.create({
      baseURL: process.env.AGODA_BASE_URL || 'https://affiliateapi7643.agoda.com/api/v3',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // リクエストインターセプター（認証ヘッダー追加）
    this.client.interceptors.request.use((config) => {
      const timestamp = new Date().toISOString();
      const signature = this.generateSignature(config.url || '', timestamp);
      
      config.headers['X-Agoda-ApiKey'] = this.apiKey;
      config.headers['X-Agoda-Timestamp'] = timestamp;
      config.headers['X-Agoda-Signature'] = signature;
      
      return config;
    });
  }

  /**
   * Agoda API署名生成
   */
  private generateSignature(url: string, timestamp: string): string {
    const message = `${url}${timestamp}${this.apiKey}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  /**
   * ホテル検索
   */
  async searchHotels(params: SearchParams): Promise<Hotel[]> {
    try {
      const cacheKey = `agoda:search:${JSON.stringify(params)}`;
      const cached = await this.cache.get<Hotel[]>(cacheKey);
      
      if (cached) {
        logger.info('Agoda search results from cache');
        return cached;
      }

      const searchRequest: AgodaSearchRequest = {
        cityId: await this.getCityId(params.location || 'Tokyo'),
        checkInDate: params.checkIn.toISOString().split('T')[0],
        checkOutDate: params.checkOut.toISOString().split('T')[0],
        numberOfAdults: params.guests,
        numberOfRooms: params.rooms,
        currency: 'JPY',
        language: 'ja'
      };

      const response = await this.client.post('/hotels/search', searchRequest);
      const hotels = this.transformHotels(response.data.hotels || []);
      
      await this.cache.set(cacheKey, hotels, 300); // 5分キャッシュ
      
      return hotels;
    } catch (error) {
      logger.error('Agoda search error:', error);
      return [];
    }
  }

  /**
   * 価格情報取得
   */
  async getPrices(hotelIds: string[], checkIn: Date, checkOut: Date): Promise<PriceData[]> {
    try {
      const cacheKey = `agoda:prices:${hotelIds.join(',')}:${checkIn}:${checkOut}`;
      const cached = await this.cache.get<PriceData[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const requests = hotelIds.map(id => ({
        hotelId: parseInt(id),
        checkInDate: checkIn.toISOString().split('T')[0],
        checkOutDate: checkOut.toISOString().split('T')[0],
        numberOfAdults: 2,
        numberOfRooms: 1
      }));

      const response = await this.client.post('/hotels/prices', { hotels: requests });
      const prices = this.transformPrices(response.data.hotels || [], checkIn, checkOut);
      
      await this.cache.set(cacheKey, prices, 300);
      
      return prices;
    } catch (error) {
      logger.error('Agoda price fetch error:', error);
      return [];
    }
  }

  /**
   * アフィリエイトURL生成
   */
  generateAffiliateUrl(hotelId: string, checkIn: Date, checkOut: Date, guests: number = 2): string {
    const baseUrl = 'https://www.agoda.com/partners/partnersearch.aspx';
    const params = new URLSearchParams({
      site_id: this.siteId,
      tag: 'lastminutestay',
      hid: hotelId,
      checkin: checkIn.toISOString().split('T')[0],
      checkout: checkOut.toISOString().split('T')[0],
      adults: guests.toString(),
      rooms: '1',
      cid: '1844104' // アフィリエイトキャンペーンID
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 都市ID取得（簡易実装）
   */
  private async getCityId(location: string): Promise<number> {
    const cityMap: Record<string, number> = {
      'Tokyo': 14139,
      '東京': 14139,
      'Osaka': 9395,
      '大阪': 9395,
      'Kyoto': 16858,
      '京都': 16858,
      'Yokohama': 14211,
      '横浜': 14211,
      'Okinawa': 11931,
      '沖縄': 11931
    };

    return cityMap[location] || 14139; // デフォルトは東京
  }

  /**
   * Agodaレスポンスを内部形式に変換
   */
  private transformHotels(agodaHotels: AgodaHotelResponse[]): Hotel[] {
    return agodaHotels.map(hotel => ({
      id: `agoda-${hotel.hotelId}`,
      name: hotel.name,
      description: '',
      address: hotel.address,
      city: this.extractCity(hotel.address),
      prefecture: this.extractPrefecture(hotel.address),
      country: 'Japan',
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      category: this.determineCategory(hotel.starRating),
      starRating: hotel.starRating,
      userRating: hotel.reviewScore,
      reviewCount: hotel.reviewCount,
      amenities: hotel.amenities,
      images: hotel.images.map((url, index) => ({
        url,
        type: index === 0 ? 'main' : 'other',
        order: index
      })),
      checkInTime: '15:00',
      checkOutTime: '11:00',
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  /**
   * 価格データ変換
   */
  private transformPrices(hotels: any[], checkIn: Date, checkOut: Date): PriceData[] {
    const prices: PriceData[] = [];
    
    hotels.forEach(hotel => {
      if (hotel.rooms && hotel.rooms.length > 0) {
        const lowestPriceRoom = hotel.rooms.reduce((min: any, room: any) => 
          room.price < min.price ? room : min
        );

        prices.push({
          hotelId: `agoda-${hotel.hotelId}`,
          checkIn,
          checkOut,
          provider: 'agoda',
          price: lowestPriceRoom.price,
          originalPrice: lowestPriceRoom.originalPrice,
          currency: lowestPriceRoom.currency || 'JPY',
          available: lowestPriceRoom.available,
          cancellationPolicy: lowestPriceRoom.cancellationPolicy,
          fetchedAt: new Date()
        });
      }
    });

    return prices;
  }

  /**
   * 住所から都市を抽出
   */
  private extractCity(address: string): string {
    const cityPatterns = ['東京都', '大阪府', '京都府', '神奈川県', '沖縄県'];
    for (const pattern of cityPatterns) {
      if (address.includes(pattern)) {
        return pattern.replace('都府県', '');
      }
    }
    return '東京';
  }

  /**
   * 住所から都道府県を抽出
   */
  private extractPrefecture(address: string): string {
    const prefectureMatch = address.match(/(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/);
    return prefectureMatch ? prefectureMatch[0] : '東京都';
  }

  /**
   * 星評価からカテゴリを判定
   */
  private determineCategory(starRating: number): Hotel['category'] {
    if (starRating >= 4.5) return 'luxury';
    if (starRating >= 4) return 'boutique';
    if (starRating >= 3.5) return 'business';
    if (starRating >= 3) return 'budget';
    return 'budget';
  }
}