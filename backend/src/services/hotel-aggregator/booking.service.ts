import axios, { AxiosInstance } from 'axios';
import { Hotel, PriceData, SearchParams } from '../../types/hotel.types';
import { BookingSearchRequest, BookingHotelResponse } from '../../types/api.types';
import { CacheService } from '../cache.service';
import { logger } from '../../utils/logger';

export class BookingComService {
  private client: AxiosInstance;
  private apiKey: string;
  private affiliateId: string;
  private cache: CacheService;

  constructor() {
    this.apiKey = process.env.BOOKING_COM_API_KEY || '';
    this.affiliateId = process.env.BOOKING_COM_AFFILIATE_ID || '';
    this.cache = new CacheService();

    this.client = axios.create({
      baseURL: process.env.BOOKING_COM_BASE_URL || 'https://distribution-xml.booking.com/2.0',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(this.apiKey).toString('base64')}`
      }
    });
  }

  /**
   * ホテル検索
   */
  async searchHotels(params: SearchParams): Promise<Hotel[]> {
    try {
      const cacheKey = `booking:search:${JSON.stringify(params)}`;
      const cached = await this.cache.get<Hotel[]>(cacheKey);
      
      if (cached) {
        logger.info('Booking.com search results from cache');
        return cached;
      }

      const destId = await this.getDestinationId(params.location || 'Tokyo');
      
      const searchRequest: BookingSearchRequest = {
        dest_ids: destId,
        checkin: params.checkIn.toISOString().split('T')[0],
        checkout: params.checkOut.toISOString().split('T')[0],
        guest_qty: params.guests,
        room_qty: params.rooms,
        currency: 'JPY',
        locale: 'ja'
      };

      const response = await this.client.get('/hotels', { params: searchRequest });
      const hotels = this.transformHotels(response.data.result || []);
      
      await this.cache.set(cacheKey, hotels, 300);
      
      return hotels;
    } catch (error) {
      logger.error('Booking.com search error:', error);
      return [];
    }
  }

  /**
   * 価格情報取得
   */
  async getPrices(hotelIds: string[], checkIn: Date, checkOut: Date): Promise<PriceData[]> {
    try {
      const cacheKey = `booking:prices:${hotelIds.join(',')}:${checkIn}:${checkOut}`;
      const cached = await this.cache.get<PriceData[]>(cacheKey);
      
      if (cached) {
        return cached;
      }

      // Booking.comは個別のホテルごとに価格を取得
      const pricePromises = hotelIds.map(id => this.getHotelPrice(id, checkIn, checkOut));
      const prices = await Promise.all(pricePromises);
      
      const validPrices = prices.filter(p => p !== null) as PriceData[];
      await this.cache.set(cacheKey, validPrices, 300);
      
      return validPrices;
    } catch (error) {
      logger.error('Booking.com price fetch error:', error);
      return [];
    }
  }

  /**
   * 個別ホテルの価格取得
   */
  private async getHotelPrice(hotelId: string, checkIn: Date, checkOut: Date): Promise<PriceData | null> {
    try {
      const params = {
        hotel_ids: hotelId.replace('booking-', ''),
        checkin: checkIn.toISOString().split('T')[0],
        checkout: checkOut.toISOString().split('T')[0],
        guest_qty: 2,
        room_qty: 1,
        currency: 'JPY'
      };

      const response = await this.client.get('/hotels/availability', { params });
      
      if (response.data.result && response.data.result.length > 0) {
        const hotel = response.data.result[0];
        const room = hotel.rooms && hotel.rooms.length > 0 ? hotel.rooms[0] : null;
        
        if (room) {
          return {
            hotelId,
            checkIn,
            checkOut,
            provider: 'booking',
            price: room.price,
            currency: room.currency || 'JPY',
            available: room.availability > 0,
            roomsLeft: room.availability,
            cancellationPolicy: room.cancellation_info,
            fetchedAt: new Date()
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`Booking.com hotel price error for ${hotelId}:`, error);
      return null;
    }
  }

  /**
   * アフィリエイトURL生成
   */
  generateAffiliateUrl(hotelId: string, checkIn: Date, checkOut: Date, guests: number = 2): string {
    const baseUrl = 'https://www.booking.com/hotel/jp';
    const hotelSlug = hotelId.replace('booking-', '');
    const params = new URLSearchParams({
      aid: this.affiliateId,
      checkin: checkIn.toISOString().split('T')[0],
      checkout: checkOut.toISOString().split('T')[0],
      group_adults: guests.toString(),
      no_rooms: '1',
      group_children: '0',
      req_adults: guests.toString(),
      req_children: '0',
      selected_currency: 'JPY',
      label: 'lastminutestay'
    });

    return `${baseUrl}/${hotelSlug}.ja.html?${params.toString()}`;
  }

  /**
   * 目的地ID取得
   */
  private async getDestinationId(location: string): Promise<string> {
    const destMap: Record<string, string> = {
      'Tokyo': '-246227',
      '東京': '-246227',
      'Osaka': '-240905',
      '大阪': '-240905',
      'Kyoto': '-235402',
      '京都': '-235402',
      'Yokohama': '-249935',
      '横浜': '-249935',
      'Okinawa': '-235842',
      '沖縄': '-235842'
    };

    return destMap[location] || '-246227'; // デフォルトは東京
  }

  /**
   * Booking.comレスポンスを内部形式に変換
   */
  private transformHotels(bookingHotels: BookingHotelResponse[]): Hotel[] {
    return bookingHotels.map(hotel => ({
      id: `booking-${hotel.hotel_id}`,
      name: hotel.name,
      description: '',
      address: hotel.address,
      city: this.extractCity(hotel.address),
      prefecture: this.extractPrefecture(hotel.address),
      country: 'Japan',
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      category: this.determineCategory(hotel.star_rating),
      starRating: hotel.star_rating,
      userRating: hotel.review_score / 2, // Booking.comは10点満点なので5点満点に変換
      reviewCount: hotel.review_count,
      amenities: hotel.facilities,
      images: hotel.photo_urls.map((url, index) => ({
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
   * 住所から都市を抽出
   */
  private extractCity(address: string): string {
    const cityPatterns = ['東京', '大阪', '京都', '横浜', '沖縄', '札幌', '名古屋', '福岡', '神戸'];
    for (const pattern of cityPatterns) {
      if (address.includes(pattern)) {
        return pattern;
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
    if (starRating >= 5) return 'luxury';
    if (starRating >= 4) return 'boutique';
    if (starRating >= 3.5) return 'business';
    if (starRating >= 3) return 'budget';
    return 'budget';
  }
}