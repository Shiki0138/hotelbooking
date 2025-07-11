import axios from 'axios';
import { cache } from './cacheService';
import { logger } from '../utils/logger';

interface RakutenHotelSearchParams {
  latitude?: number;
  longitude?: number;
  searchRadius?: number;
  checkinDate?: string;
  checkoutDate?: string;
  maxCharge?: number;
  minCharge?: number;
  largeClassCode?: string; // 地域コード
  middleClassCode?: string; // 都道府県コード
  smallClassCode?: string; // 市区町村コード
  hotelChainCode?: string;
  hits?: number; // 結果数
  page?: number;
}

interface RakutenHotel {
  hotelNo: number;
  hotelName: string;
  hotelInformationUrl: string;
  planListUrl: string;
  hotelKanaName: string;
  hotelSpecial: string;
  hotelMinCharge: number;
  latitude: number;
  longitude: number;
  postalCode: string;
  address1: string;
  address2: string;
  telephoneNo: string;
  access: string;
  parkingInformation: string;
  nearestStation: string;
  hotelImageUrl: string;
  hotelThumbnailUrl: string;
  roomImageUrl: string;
  roomThumbnailUrl: string;
  reviewCount: number;
  reviewAverage: number;
  userReview: string;
}

export class RakutenService {
  private baseUrl = 'https://app.rakuten.co.jp/services/api/Travel';
  private applicationId: string;
  private affiliateId?: string;

  constructor() {
    this.applicationId = process.env.RAKUTEN_APP_ID || process.env.RAKUTEN_APPLICATION_ID || '';
    this.affiliateId = process.env.RAKUTEN_AFFILIATE_ID || undefined;
  }

  /**
   * 楽天トラベルAPIでホテルを検索
   */
  async searchHotels(params: RakutenHotelSearchParams): Promise<RakutenHotel[]> {
    const cacheKey = `rakuten:search:${JSON.stringify(params)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.info('Returning cached Rakuten hotel results');
      return cached;
    }

    try {
      const searchParams: any = {
        format: 'json',
        applicationId: this.applicationId,
        hits: params.hits || 30,
        page: params.page || 1,
        sort: '+roomCharge', // 料金の安い順
      };
      
      if (this.affiliateId) {
        searchParams.affiliateId = this.affiliateId;
      }

      // 位置情報検索
      if (params.latitude && params.longitude) {
        searchParams.latitude = params.latitude;
        searchParams.longitude = params.longitude;
        searchParams.searchRadius = params.searchRadius || 3; // デフォルト3km
      }

      // 日付指定
      if (params.checkinDate) {
        searchParams.checkinDate = params.checkinDate;
      }
      if (params.checkoutDate) {
        searchParams.checkoutDate = params.checkoutDate;
      }

      // 料金範囲
      if (params.minCharge) {
        searchParams.minCharge = params.minCharge;
      }
      if (params.maxCharge) {
        searchParams.maxCharge = params.maxCharge;
      }

      // 地域指定
      if (params.largeClassCode) {
        searchParams.largeClassCode = params.largeClassCode;
      }
      if (params.middleClassCode) {
        searchParams.middleClassCode = params.middleClassCode;
      }
      if (params.smallClassCode) {
        searchParams.smallClassCode = params.smallClassCode;
      }

      const response = await axios.get(`${this.baseUrl}/SimpleHotelSearch/20170426`, {
        params: searchParams,
        timeout: 10000,
      });

      const hotels = response.data.hotels?.map((item: any) => ({
        hotelNo: item.hotel[0].hotelBasicInfo.hotelNo,
        hotelName: item.hotel[0].hotelBasicInfo.hotelName,
        hotelInformationUrl: item.hotel[0].hotelBasicInfo.hotelInformationUrl,
        planListUrl: item.hotel[0].hotelBasicInfo.planListUrl,
        hotelKanaName: item.hotel[0].hotelBasicInfo.hotelKanaName,
        hotelSpecial: item.hotel[0].hotelBasicInfo.hotelSpecial,
        hotelMinCharge: item.hotel[0].hotelBasicInfo.hotelMinCharge,
        latitude: item.hotel[0].hotelBasicInfo.latitude,
        longitude: item.hotel[0].hotelBasicInfo.longitude,
        postalCode: item.hotel[0].hotelBasicInfo.postalCode,
        address1: item.hotel[0].hotelBasicInfo.address1,
        address2: item.hotel[0].hotelBasicInfo.address2,
        telephoneNo: item.hotel[0].hotelBasicInfo.telephoneNo,
        access: item.hotel[0].hotelBasicInfo.access,
        parkingInformation: item.hotel[0].hotelBasicInfo.parkingInformation,
        nearestStation: item.hotel[0].hotelBasicInfo.nearestStation,
        hotelImageUrl: item.hotel[0].hotelBasicInfo.hotelImageUrl,
        hotelThumbnailUrl: item.hotel[0].hotelBasicInfo.hotelThumbnailUrl,
        roomImageUrl: item.hotel[0].hotelBasicInfo.roomImageUrl,
        roomThumbnailUrl: item.hotel[0].hotelBasicInfo.roomThumbnailUrl,
        reviewCount: item.hotel[0].hotelBasicInfo.reviewCount,
        reviewAverage: item.hotel[0].hotelBasicInfo.reviewAverage,
        userReview: item.hotel[0].hotelBasicInfo.userReview,
      })) || [];

      await cache.set(cacheKey, hotels, 3600); // 1時間キャッシュ
      return hotels;
    } catch (error) {
      logger.error('Error fetching hotels from Rakuten API:', error);
      throw error;
    }
  }

  /**
   * 高級ホテルを検索（5つ星相当）
   */
  async searchLuxuryHotels(params: RakutenHotelSearchParams): Promise<RakutenHotel[]> {
    // 高級ホテルは料金でフィルタリング
    const luxuryParams = {
      ...params,
      minCharge: params.minCharge || 15000, // 最低15,000円以上
    };
    return this.searchHotels(luxuryParams);
  }

  /**
   * 直前割引のあるホテルを検索
   */
  async searchLastMinuteDeals(params: RakutenHotelSearchParams): Promise<RakutenHotel[]> {
    // 3日以内のチェックインで検索
    const today = new Date();
    const checkinDate = params.checkinDate || today.toISOString().split('T')[0];
    const checkoutDate = params.checkoutDate || 
      new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dealParams = {
      ...params,
    };
    if (checkinDate) dealParams.checkinDate = checkinDate;
    if (checkoutDate) dealParams.checkoutDate = checkoutDate;
    
    return this.searchHotels(dealParams);
  }

  /**
   * 地域コードの取得
   */
  getAreaCodes() {
    return {
      kanto: { code: 'kanto', name: '関東' },
      tokyo: { code: 'tokyo', middleCode: '130000', name: '東京都' },
      osaka: { code: 'osaka', middleCode: '270000', name: '大阪府' },
      kyoto: { code: 'kyoto', middleCode: '260000', name: '京都府' },
      hokkaido: { code: 'hokkaido', middleCode: '010000', name: '北海道' },
      okinawa: { code: 'okinawa', middleCode: '470000', name: '沖縄県' },
    };
  }

  /**
   * 楽天の予約ページURLを生成
   */
  generateBookingUrl(hotel: RakutenHotel, checkinDate: string, checkoutDate: string): string {
    const url = new URL(hotel.planListUrl);
    url.searchParams.set('f_teikei', this.affiliateId || '');
    url.searchParams.set('f_hi', checkinDate.replace(/-/g, ''));
    url.searchParams.set('f_ho', checkoutDate.replace(/-/g, ''));
    url.searchParams.set('f_adult_su', '2'); // デフォルト大人2名
    
    return url.toString();
  }
}