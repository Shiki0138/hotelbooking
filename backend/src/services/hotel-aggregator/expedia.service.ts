import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { Hotel, PriceData, SearchParams } from '../../types/hotel.types';
import { ExpediaSearchRequest, ExpediaHotelResponse } from '../../types/api.types';
import { CacheService } from '../cache.service';
import { logger } from '../../utils/logger';

export class ExpediaService {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private partnerId: string;
  private cache: CacheService;

  constructor() {
    this.apiKey = process.env.EXPEDIA_API_KEY || '';
    this.apiSecret = process.env.EXPEDIA_API_SECRET || '';
    this.partnerId = process.env.EXPEDIA_PARTNER_ID || '';
    this.cache = new CacheService();

    this.client = axios.create({
      baseURL: process.env.EXPEDIA_BASE_URL || 'https://api.expediapartnercentral.com/v3',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Partner-Id': this.partnerId
      }
    });

    // リクエストインターセプター（認証）
    this.client.interceptors.request.use((config) => {
      const timestamp = Date.now().toString();
      const signature = this.generateSignature(config.method?.toUpperCase() || 'GET', config.url || '', timestamp);
      
      config.headers['X-Api-Key'] = this.apiKey;
      config.headers['X-Timestamp'] = timestamp;
      config.headers['X-Signature'] = signature;
      
      return config;
    });
  }

  /**
   * Expedia API署名生成
   */
  private generateSignature(method: string, path: string, timestamp: string): string {
    const message = `${method}${path}${timestamp}${this.apiKey}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64');
  }

  /**
   * ホテル検索
   */
  async searchHotels(params: SearchParams): Promise<Hotel[]> {
    try {
      const cacheKey = `expedia:search:${JSON.stringify(params)}`;
      const cached = await this.cache.get<Hotel[]>(cacheKey);
      
      if (cached) {
        logger.info('Expedia search results from cache');
        return cached;
      }

      const searchRequest: ExpediaSearchRequest = {
        destination: params.location || 'Tokyo',
        checkInDate: params.checkIn.toISOString().split('T')[0],
        checkOutDate: params.checkOut.toISOString().split('T')[0],
        adults: params.guests,
        rooms: params.rooms,
        currency: 'JPY',
        locale: 'ja_JP'
      };

      const response = await this.client.get('/hotels/search', { params: searchRequest });
      const hotels = this.transformHotels(response.data.hotels || []);
      
      await this.cache.set(cacheKey, hotels, 300);
      
      return hotels;
    } catch (error) {
      logger.error('Expedia search error:', error);
      return [];
    }
  }

  /**
   * 価格情報取得
   */
  async getPrices(hotelIds: string[], checkIn: Date, checkOut: Date): Promise<PriceData[]> {
    try {
      const cacheKey = `expedia:prices:${hotelIds.join(',')}:${checkIn}:${checkOut}`;
      const cached = await this.cache.get<PriceData[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Expediaは一括価格取得をサポート
      const params = {
        hotelIds: hotelIds.map(id => id.replace('expedia-', '')).join(','),
        checkInDate: checkIn.toISOString().split('T')[0],
        checkOutDate: checkOut.toISOString().split('T')[0],
        adults: 2,
        rooms: 1,
        currency: 'JPY'
      };

      const response = await this.client.get('/hotels/availability', { params });
      const prices = this.transformPrices(response.data.hotels || [], checkIn, checkOut);
      
      await this.cache.set(cacheKey, prices, 300);
      
      return prices;
    } catch (error) {
      logger.error('Expedia price fetch error:', error);
      return [];
    }
  }

  /**
   * アフィリエイトURL生成
   */
  generateAffiliateUrl(hotelId: string, checkIn: Date, checkOut: Date, guests: number = 2): string {
    const baseUrl = 'https://www.expedia.co.jp/Hotel-Search';
    const params = new URLSearchParams({
      hotelId: hotelId.replace('expedia-', ''),
      chkin: checkIn.toISOString().split('T')[0],
      chkout: checkOut.toISOString().split('T')[0],
      adults: guests.toString(),
      rooms: '1',
      affcid: this.partnerId,
      afflid: 'lastminutestay',
      currency: 'JPY',
      locale: 'ja_JP'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Expediaレスポンスを内部形式に変換
   */
  private transformHotels(expediaHotels: ExpediaHotelResponse[]): Hotel[] {
    return expediaHotels.map(hotel => ({
      id: `expedia-${hotel.hotelId}`,
      name: hotel.name,
      description: '',
      address: `${hotel.address.streetAddress}, ${hotel.address.city}, ${hotel.address.province}`,
      city: hotel.address.city,
      prefecture: hotel.address.province,
      country: 'Japan',
      latitude: hotel.coordinates.latitude,
      longitude: hotel.coordinates.longitude,
      category: this.determineCategory(hotel.starRating),
      starRating: hotel.starRating,
      userRating: hotel.guestRating / 2, // 10点満点を5点満点に変換
      reviewCount: hotel.totalReviews,
      amenities: hotel.amenities,
      images: hotel.images.map((img, index) => ({
        url: img.url,
        caption: img.caption,
        type: index === 0 ? 'main' : img.category === 'ROOMS' ? 'room' : 'other',
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
          room.rateInfo.price < min.rateInfo.price ? room : min
        );

        prices.push({
          hotelId: `expedia-${hotel.hotelId}`,
          checkIn,
          checkOut,
          provider: 'expedia',
          price: lowestPriceRoom.rateInfo.price,
          currency: lowestPriceRoom.rateInfo.currency || 'JPY',
          available: lowestPriceRoom.available,
          cancellationPolicy: lowestPriceRoom.cancellationPolicy,
          fetchedAt: new Date()
        });
      }
    });

    return prices;
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