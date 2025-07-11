import axios from 'axios';
import { cache } from './cacheService';
import { logger } from '../utils/logger';

interface AgodaHotelSearchParams {
  cityId?: number;
  checkIn?: string;
  checkOut?: string;
  numberOfRooms?: number;
  adults?: number;
  children?: number;
  currency?: string;
  language?: string;
}

interface AgodaHotel {
  hotelId: number;
  hotelName: string;
  address: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  starRating: number;
  reviewScore: number;
  reviewCount: number;
  photoUrl: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  deepLink: string;
}

export class AgodaService {
  private baseUrl = 'https://affiliateapi7643.agoda.com/api/v4';
  private apiKey: string;
  private siteId: string;

  constructor() {
    this.apiKey = process.env.AGODA_API_KEY || '';
    this.siteId = process.env.AGODA_SITE_ID || '';
  }

  /**
   * アゴダのホテルを検索
   */
  async searchHotels(params: AgodaHotelSearchParams): Promise<AgodaHotel[]> {
    const cacheKey = `agoda:search:${JSON.stringify(params)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.info('Returning cached Agoda hotel results');
      return cached;
    }

    // Note: This is a mock implementation
    // In production, you would need to register with Agoda Affiliate Program
    // and use their actual API endpoints
    const mockHotels: AgodaHotel[] = [
      {
        hotelId: 2298764,
        hotelName: 'コンラッド東京',
        address: '東京都港区東新橋1-9-1',
        city: '東京',
        countryCode: 'JP',
        latitude: 35.6619,
        longitude: 139.7631,
        starRating: 5,
        reviewScore: 9.0,
        reviewCount: 4521,
        photoUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop',
        price: 52000,
        originalPrice: 65000,
        discountPercentage: 20,
        deepLink: `https://www.agoda.com/partners/partnersearch.aspx?site_id=${this.siteId}&hid=2298764`
      },
      {
        hotelId: 432156,
        hotelName: 'アンダーズ東京',
        address: '東京都港区虎ノ門1-23-4',
        city: '東京',
        countryCode: 'JP',
        latitude: 35.6677,
        longitude: 139.7497,
        starRating: 5,
        reviewScore: 9.2,
        reviewCount: 3210,
        photoUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop',
        price: 58000,
        originalPrice: 72000,
        discountPercentage: 19,
        deepLink: `https://www.agoda.com/partners/partnersearch.aspx?site_id=${this.siteId}&hid=432156`
      }
    ];

    await cache.set(cacheKey, mockHotels, 3600);
    return mockHotels;
  }

  /**
   * 都市IDを取得（日本の主要都市）
   */
  getCityIds() {
    return {
      tokyo: 14266,
      osaka: 17298,
      kyoto: 17301,
      yokohama: 14271,
      nagoya: 17306,
      sapporo: 17326,
      fukuoka: 17313,
      kobe: 17302,
      okinawa: 59807,
      sendai: 17322
    };
  }

  /**
   * アゴダの予約URLを生成
   */
  generateBookingUrl(hotel: AgodaHotel, checkIn: string, checkOut: string): string {
    const baseUrl = hotel.deepLink;
    const url = new URL(baseUrl);
    url.searchParams.set('cid', this.siteId);
    url.searchParams.set('checkIn', checkIn);
    url.searchParams.set('checkOut', checkOut);
    url.searchParams.set('los', '1');
    url.searchParams.set('adults', '2');
    url.searchParams.set('childs', '0');
    url.searchParams.set('rooms', '1');
    
    return url.toString();
  }
}