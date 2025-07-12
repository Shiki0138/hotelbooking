import { Request, Response, NextFunction } from 'express';
import { AffiliateService } from '../services/affiliate.service';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class AffiliateController {
  private affiliateService: AffiliateService;

  constructor() {
    this.affiliateService = new AffiliateService();
  }

  // アフィリエイトクリック追跡
  trackClick = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        hotelId,
        provider,
        sessionId,
        userId
      } = req.body;

      if (!hotelId || !provider || !sessionId) {
        throw new AppError(400, 'Hotel ID, provider, and session ID are required', 'MISSING_REQUIRED_FIELDS');
      }

      // IPアドレスとUser-Agentを取得
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const referrer = req.headers.referer || req.headers.referrer;

      // アフィリエイトURL生成
      const checkIn = req.body.checkIn || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const checkOut = req.body.checkOut || new Date(Date.now() + 172800000).toISOString().split('T')[0];
      const guests = req.body.guests || 2;
      const rooms = req.body.rooms || 1;

      const affiliateUrl = this.affiliateService.generateAffiliateUrl(
        provider,
        hotelId,
        checkIn,
        checkOut,
        guests,
        rooms
      );

      // クリック追跡
      const clickId = await this.affiliateService.trackClick(
        hotelId,
        provider,
        affiliateUrl,
        sessionId,
        ipAddress,
        userAgent,
        userId,
        referrer as string
      );

      res.json({
        success: true,
        data: {
          clickId,
          affiliateUrl,
          redirectUrl: affiliateUrl
        },
        message: 'Click tracked successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // コンバージョン追跡
  trackConversion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        clickId,
        bookingId,
        provider,
        bookingAmount,
        currency
      } = req.body;

      if (!clickId || !bookingId || !provider || !bookingAmount) {
        throw new AppError(400, 'Click ID, booking ID, provider, and booking amount are required', 'MISSING_REQUIRED_FIELDS');
      }

      const conversion = await this.affiliateService.trackConversion(
        clickId,
        bookingId,
        provider,
        bookingAmount,
        currency
      );

      res.json({
        success: true,
        data: { conversion },
        message: 'Conversion tracked successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // アフィリエイト統計取得
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dateFrom, dateTo } = req.query;

      const stats = await this.affiliateService.getAffiliateStats(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  };

  // プロバイダー別統計取得
  getProviderStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { provider } = req.params;

      if (!provider) {
        throw new AppError(400, 'Provider is required', 'MISSING_PROVIDER');
      }

      const stats = await this.affiliateService.getProviderStats(provider);

      res.json({
        success: true,
        data: { provider, stats }
      });
    } catch (error) {
      next(error);
    }
  };

  // アフィリエイトURL生成
  generateUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        provider,
        hotelId,
        checkIn,
        checkOut,
        guests,
        rooms
      } = req.query;

      if (!provider || !hotelId || !checkIn || !checkOut) {
        throw new AppError(400, 'Provider, hotel ID, check-in, and check-out dates are required', 'MISSING_REQUIRED_FIELDS');
      }

      const affiliateUrl = this.affiliateService.generateAffiliateUrl(
        provider as string,
        hotelId as string,
        checkIn as string,
        checkOut as string,
        guests ? parseInt(guests as string) : 2,
        rooms ? parseInt(rooms as string) : 1
      );

      res.json({
        success: true,
        data: {
          provider,
          hotelId,
          affiliateUrl,
          checkIn,
          checkOut,
          guests: guests || 2,
          rooms: rooms || 1
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // コンバージョン状態更新
  updateConversionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { conversionId } = req.params;
      const { status } = req.body;

      if (!conversionId || !status) {
        throw new AppError(400, 'Conversion ID and status are required', 'MISSING_REQUIRED_FIELDS');
      }

      if (!['pending', 'confirmed', 'paid'].includes(status)) {
        throw new AppError(400, 'Invalid status. Must be pending, confirmed, or paid', 'INVALID_STATUS');
      }

      await this.affiliateService.updateConversionStatus(conversionId, status);

      res.json({
        success: true,
        message: 'Conversion status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // 収益レポート生成
  getRevenueReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { period } = req.query; // daily, weekly, monthly

      // 簡易レポート生成
      const stats = await this.affiliateService.getAffiliateStats();
      
      const report = {
        period: period || 'total',
        summary: {
          total_clicks: stats.total_clicks,
          total_conversions: stats.total_conversions,
          conversion_rate: stats.conversion_rate,
          total_commission: stats.total_commission,
          average_commission_per_conversion: stats.total_conversions > 0 
            ? stats.total_commission / stats.total_conversions 
            : 0
        },
        providers: stats.provider_breakdown,
        generated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: { report }
      });
    } catch (error) {
      next(error);
    }
  };

  // アフィリエイトリンクリダイレクト
  redirect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clickId } = req.params;

      if (!clickId) {
        throw new AppError(400, 'Click ID is required', 'MISSING_CLICK_ID');
      }

      // クリック情報取得（実際の実装ではデータベースから）
      // ここでは簡易的にリダイレクト
      const defaultUrl = 'https://www.google.com/travel/hotels';
      
      logger.info('Affiliate redirect', { clickId });
      
      res.redirect(302, defaultUrl);
    } catch (error) {
      next(error);
    }
  };
}