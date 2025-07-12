import { Request, Response, NextFunction } from 'express';
import { HotelAggregatorService } from '../services/hotel-aggregator/aggregator.service';
import { SearchParams } from '../types/hotel.types';
import { ApiResponse } from '../types/api.types';
import { logger } from '../utils/logger';
import { validationResult } from 'express-validator';

export class HotelController {
  private aggregatorService: HotelAggregatorService;

  constructor() {
    this.aggregatorService = new HotelAggregatorService();
  }

  /**
   * ホテル検索
   * GET /api/hotels/search
   */
  searchHotels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // バリデーションエラーチェック
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        } as ApiResponse);
        return;
      }

      // 検索パラメータの構築
      const searchParams: SearchParams = {
        location: req.query.location as string,
        checkIn: new Date(req.query.checkIn as string),
        checkOut: new Date(req.query.checkOut as string),
        guests: parseInt(req.query.guests as string) || 2,
        rooms: parseInt(req.query.rooms as string) || 1,
        priceMin: req.query.priceMin ? parseInt(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseInt(req.query.priceMax as string) : undefined,
        starRating: req.query.starRating ? (req.query.starRating as string).split(',').map(Number) : undefined,
        amenities: req.query.amenities ? (req.query.amenities as string).split(',') : undefined,
        sortBy: req.query.sortBy as 'price' | 'rating' | 'distance' | 'popularity',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      // ホテル検索実行
      const startTime = Date.now();
      const hotels = await this.aggregatorService.searchHotels(searchParams);
      const duration = Date.now() - startTime;

      logger.info('Hotel search completed', {
        location: searchParams.location,
        resultsCount: hotels.length,
        duration: `${duration}ms`
      });

      // レスポンス
      res.json({
        success: true,
        data: {
          hotels,
          totalCount: hotels.length,
          page: searchParams.page,
          limit: searchParams.limit
        },
        meta: {
          cached: false,
          cachedAt: new Date()
        }
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  /**
   * ホテル詳細取得
   * GET /api/hotels/:hotelId
   */
  getHotelDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { hotelId } = req.params;
      const { checkIn, checkOut } = req.query;

      if (!checkIn || !checkOut) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Check-in and check-out dates are required'
          }
        } as ApiResponse);
        return;
      }

      // 価格情報を取得
      const prices = await this.aggregatorService.getHotelPrices(
        hotelId,
        new Date(checkIn as string),
        new Date(checkOut as string)
      );

      res.json({
        success: true,
        data: {
          hotelId,
          prices
        }
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 予約リダイレクトURL生成
   * POST /api/hotels/:hotelId/booking-url
   */
  generateBookingUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { hotelId } = req.params;
      const { provider, checkIn, checkOut, guests } = req.body;

      if (!provider || !checkIn || !checkOut) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Provider, check-in, and check-out dates are required'
          }
        } as ApiResponse);
        return;
      }

      const bookingUrl = this.aggregatorService.generateBookingUrl(
        hotelId,
        provider,
        new Date(checkIn),
        new Date(checkOut),
        guests || 2
      );

      // クリックトラッキング（後で実装）
      logger.info('Booking URL generated', {
        hotelId,
        provider,
        userId: (req as any).user?.id
      });

      res.json({
        success: true,
        data: {
          bookingUrl,
          provider,
          trackingId: `${Date.now()}-${hotelId}-${provider}`
        }
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 人気ホテル取得
   * GET /api/hotels/popular
   */
  getPopularHotels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { location, limit } = req.query;

      // シンプルな実装（後でデータベースから取得）
      const searchParams: SearchParams = {
        location: location as string || 'Tokyo',
        checkIn: new Date(),
        checkOut: new Date(Date.now() + 86400000),
        guests: 2,
        rooms: 1,
        sortBy: 'popularity',
        limit: parseInt(limit as string) || 10
      };

      const hotels = await this.aggregatorService.searchHotels(searchParams);

      res.json({
        success: true,
        data: hotels
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 週末空室状況
   * GET /api/hotels/weekend-availability
   */
  getWeekendAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 今週末の日付を計算
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilSaturday = dayOfWeek === 0 ? 6 : (6 - dayOfWeek);
      const saturday = new Date(today);
      saturday.setDate(today.getDate() + daysUntilSaturday);
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);

      const searchParams: SearchParams = {
        location: req.query.location as string || 'Tokyo',
        checkIn: saturday,
        checkOut: sunday,
        guests: 2,
        rooms: 1,
        sortBy: 'price',
        limit: 50
      };

      const hotels = await this.aggregatorService.searchHotels(searchParams);

      res.json({
        success: true,
        data: {
          checkIn: saturday,
          checkOut: sunday,
          hotels: hotels.filter(h => h.prices.some(p => p.available))
        }
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  };
}