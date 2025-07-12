import { Hotel, PriceData, SearchParams, HotelWithPrice } from '../../types/hotel.types';
import { AgodaService } from './agoda.service';
import { BookingComService } from './booking.service';
import { ExpediaService } from './expedia.service';
import { logger } from '../../utils/logger';

export class HotelAggregatorService {
  private agoda: AgodaService;
  private booking: BookingComService;
  private expedia: ExpediaService;

  constructor() {
    this.agoda = new AgodaService();
    this.booking = new BookingComService();
    this.expedia = new ExpediaService();
  }

  /**
   * 複数のプロバイダーから統合検索
   */
  async searchHotels(params: SearchParams): Promise<HotelWithPrice[]> {
    try {
      // 並列で全プロバイダーから検索
      const [agodaHotels, bookingHotels, expediaHotels] = await Promise.all([
        this.agoda.searchHotels(params),
        this.booking.searchHotels(params),
        this.expedia.searchHotels(params)
      ]);

      // ホテルをマージして重複を除去
      const mergedHotels = this.mergeHotels([
        ...agodaHotels,
        ...bookingHotels,
        ...expediaHotels
      ]);

      // 価格情報を取得
      const hotelsWithPrices = await this.attachPrices(
        mergedHotels,
        params.checkIn,
        params.checkOut
      );

      // フィルタリングとソート
      return this.filterAndSort(hotelsWithPrices, params);
    } catch (error) {
      logger.error('Hotel aggregator search error:', error);
      throw error;
    }
  }

  /**
   * 特定ホテルの全プロバイダー価格取得
   */
  async getHotelPrices(hotelId: string, checkIn: Date, checkOut: Date): Promise<PriceData[]> {
    try {
      // ホテルIDから元のプロバイダーIDを抽出
      const providerIds = this.extractProviderIds(hotelId);
      
      const pricePromises: Promise<PriceData[]>[] = [];
      
      if (providerIds.agoda) {
        pricePromises.push(this.agoda.getPrices([providerIds.agoda], checkIn, checkOut));
      }
      if (providerIds.booking) {
        pricePromises.push(this.booking.getPrices([providerIds.booking], checkIn, checkOut));
      }
      if (providerIds.expedia) {
        pricePromises.push(this.expedia.getPrices([providerIds.expedia], checkIn, checkOut));
      }

      const priceResults = await Promise.all(pricePromises);
      return priceResults.flat();
    } catch (error) {
      logger.error('Get hotel prices error:', error);
      return [];
    }
  }

  /**
   * アフィリエイトURL生成
   */
  generateBookingUrl(
    hotelId: string,
    provider: 'agoda' | 'booking' | 'expedia',
    checkIn: Date,
    checkOut: Date,
    guests: number = 2
  ): string {
    const providerIds = this.extractProviderIds(hotelId);
    
    switch (provider) {
      case 'agoda':
        return this.agoda.generateAffiliateUrl(
          providerIds.agoda || hotelId,
          checkIn,
          checkOut,
          guests
        );
      case 'booking':
        return this.booking.generateAffiliateUrl(
          providerIds.booking || hotelId,
          checkIn,
          checkOut,
          guests
        );
      case 'expedia':
        return this.expedia.generateAffiliateUrl(
          providerIds.expedia || hotelId,
          checkIn,
          checkOut,
          guests
        );
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * ホテルの重複をマージ
   */
  private mergeHotels(hotels: Hotel[]): Hotel[] {
    const hotelMap = new Map<string, Hotel>();
    
    hotels.forEach(hotel => {
      // 名前と位置で同一ホテルを判定
      const key = `${hotel.name.toLowerCase()}-${hotel.latitude.toFixed(3)}-${hotel.longitude.toFixed(3)}`;
      
      if (!hotelMap.has(key)) {
        // 統合IDを生成
        hotel.id = this.generateUnifiedId(hotel);
        hotelMap.set(key, hotel);
      } else {
        // 既存のホテル情報を補完
        const existing = hotelMap.get(key)!;
        this.mergeHotelData(existing, hotel);
      }
    });

    return Array.from(hotelMap.values());
  }

  /**
   * ホテルデータをマージ
   */
  private mergeHotelData(target: Hotel, source: Hotel): void {
    // より詳細な情報で上書き
    if (!target.description && source.description) {
      target.description = source.description;
    }
    
    // アメニティを統合
    const amenitiesSet = new Set([...target.amenities, ...source.amenities]);
    target.amenities = Array.from(amenitiesSet);
    
    // 画像を統合（重複除去）
    const imageUrls = new Set(target.images.map(img => img.url));
    source.images.forEach(img => {
      if (!imageUrls.has(img.url)) {
        target.images.push(img);
      }
    });
    
    // レビュー情報を平均化
    const totalReviews = target.reviewCount + source.reviewCount;
    if (totalReviews > 0) {
      target.userRating = (
        (target.userRating * target.reviewCount + source.userRating * source.reviewCount) /
        totalReviews
      );
      target.reviewCount = totalReviews;
    }
  }

  /**
   * 統合ホテルIDを生成
   */
  private generateUnifiedId(hotel: Hotel): string {
    const baseId = hotel.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const providerId = hotel.id.split('-')[0];
    return `unified-${baseId}-${providerId}`;
  }

  /**
   * プロバイダーIDを抽出
   */
  private extractProviderIds(unifiedId: string): {
    agoda?: string;
    booking?: string;
    expedia?: string;
  } {
    // 実際の実装では、データベースから取得
    // ここでは簡易実装
    return {
      agoda: `agoda-${unifiedId}`,
      booking: `booking-${unifiedId}`,
      expedia: `expedia-${unifiedId}`
    };
  }

  /**
   * 価格情報を付与
   */
  private async attachPrices(
    hotels: Hotel[],
    checkIn: Date,
    checkOut: Date
  ): Promise<HotelWithPrice[]> {
    const hotelIds = hotels.map(h => h.id);
    
    // 全プロバイダーから価格を取得
    const [agodaPrices, bookingPrices, expediaPrices] = await Promise.all([
      this.agoda.getPrices(hotelIds, checkIn, checkOut),
      this.booking.getPrices(hotelIds, checkIn, checkOut),
      this.expedia.getPrices(hotelIds, checkIn, checkOut)
    ]);

    // 価格マップを作成
    const priceMap = new Map<string, PriceData[]>();
    [...agodaPrices, ...bookingPrices, ...expediaPrices].forEach(price => {
      const hotelId = price.hotelId.replace(/^(agoda|booking|expedia)-/, 'unified-');
      if (!priceMap.has(hotelId)) {
        priceMap.set(hotelId, []);
      }
      priceMap.get(hotelId)!.push(price);
    });

    // ホテルに価格情報を付与
    return hotels.map(hotel => {
      const prices = priceMap.get(hotel.id) || [];
      const availablePrices = prices.filter(p => p.available);
      
      return {
        ...hotel,
        prices,
        lowestPrice: availablePrices.length > 0
          ? Math.min(...availablePrices.map(p => p.price))
          : undefined,
        highestPrice: availablePrices.length > 0
          ? Math.max(...availablePrices.map(p => p.price))
          : undefined
      };
    });
  }

  /**
   * フィルタリングとソート
   */
  private filterAndSort(
    hotels: HotelWithPrice[],
    params: SearchParams
  ): HotelWithPrice[] {
    let filtered = hotels;

    // 価格フィルター
    if (params.priceMin !== undefined || params.priceMax !== undefined) {
      filtered = filtered.filter(hotel => {
        if (!hotel.lowestPrice) return false;
        if (params.priceMin && hotel.lowestPrice < params.priceMin) return false;
        if (params.priceMax && hotel.lowestPrice > params.priceMax) return false;
        return true;
      });
    }

    // 星評価フィルター
    if (params.starRating && params.starRating.length > 0) {
      filtered = filtered.filter(hotel =>
        params.starRating!.includes(Math.floor(hotel.starRating))
      );
    }

    // アメニティフィルター
    if (params.amenities && params.amenities.length > 0) {
      filtered = filtered.filter(hotel =>
        params.amenities!.every(amenity =>
          hotel.amenities.includes(amenity)
        )
      );
    }

    // ソート
    switch (params.sortBy) {
      case 'price':
        filtered.sort((a, b) => (a.lowestPrice || 999999) - (b.lowestPrice || 999999));
        break;
      case 'rating':
        filtered.sort((a, b) => b.userRating - a.userRating);
        break;
      case 'popularity':
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      default:
        // デフォルトは関連性（現在は評価順）
        filtered.sort((a, b) => b.userRating - a.userRating);
    }

    // ページネーション
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;

    return filtered.slice(start, end);
  }
}