import { CacheService } from './cache.service';
import { logger } from '../utils/logger';

export interface AffiliateClick {
  id: string;
  user_id?: string;
  session_id: string;
  hotel_id: string;
  provider: string;
  affiliate_url: string;
  ip_address: string;
  user_agent: string;
  referrer?: string;
  created_at: Date;
}

export interface AffiliateConversion {
  id: string;
  click_id: string;
  booking_id: string;
  provider: string;
  commission_amount: number;
  commission_currency: string;
  conversion_date: Date;
  status: 'pending' | 'confirmed' | 'paid';
  created_at: Date;
}

export interface AffiliateStats {
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
  total_commission: number;
  provider_breakdown: {
    [provider: string]: {
      clicks: number;
      conversions: number;
      commission: number;
    };
  };
}

export class AffiliateService {
  private cache: CacheService;
  private commissionRates = {
    agoda: 0.04,    // 4%
    booking: 0.03,  // 3%
    expedia: 0.035  // 3.5%
  };

  constructor() {
    this.cache = new CacheService();
  }

  // アフィリエイトクリックの記録
  async trackClick(
    hotelId: string,
    provider: string,
    affiliateUrl: string,
    sessionId: string,
    ipAddress: string,
    userAgent: string,
    userId?: string,
    referrer?: string
  ): Promise<string> {
    try {
      const clickId = this.generateId();
      
      const click: AffiliateClick = {
        id: clickId,
        user_id: userId,
        session_id: sessionId,
        hotel_id: hotelId,
        provider,
        affiliate_url: affiliateUrl,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer,
        created_at: new Date()
      };

      // クリック情報をキャッシュに保存
      await this.cache.set(`affiliate_click:${clickId}`, click, 86400); // 24時間

      // 統計情報更新
      await this.updateClickStats(provider);

      logger.info('Affiliate click tracked', {
        clickId,
        hotelId,
        provider,
        sessionId
      });

      return clickId;
    } catch (error) {
      logger.error('Error tracking affiliate click:', error);
      throw error;
    }
  }

  // コンバージョンの記録
  async trackConversion(
    clickId: string,
    bookingId: string,
    provider: string,
    bookingAmount: number,
    currency: string = 'JPY'
  ): Promise<AffiliateConversion> {
    try {
      const click = await this.cache.get(`affiliate_click:${clickId}`);
      if (!click) {
        throw new Error('Original click not found');
      }

      const commissionRate = this.commissionRates[provider as keyof typeof this.commissionRates] || 0.03;
      const commissionAmount = bookingAmount * commissionRate;

      const conversion: AffiliateConversion = {
        id: this.generateId(),
        click_id: clickId,
        booking_id: bookingId,
        provider,
        commission_amount: commissionAmount,
        commission_currency: currency,
        conversion_date: new Date(),
        status: 'pending',
        created_at: new Date()
      };

      // コンバージョン情報をキャッシュに保存
      await this.cache.set(`affiliate_conversion:${conversion.id}`, conversion, 2592000); // 30日間

      // 統計情報更新
      await this.updateConversionStats(provider, commissionAmount);

      logger.info('Affiliate conversion tracked', {
        conversionId: conversion.id,
        clickId,
        bookingId,
        provider,
        commissionAmount
      });

      return conversion;
    } catch (error) {
      logger.error('Error tracking affiliate conversion:', error);
      throw error;
    }
  }

  // アフィリエイトURL生成
  generateAffiliateUrl(
    provider: string,
    hotelId: string,
    checkIn: string,
    checkOut: string,
    guests: number = 2,
    rooms: number = 1
  ): string {
    const baseUrls = {
      agoda: 'https://www.agoda.com/partners/track.html',
      booking: 'https://www.booking.com/hotel/jp/',
      expedia: 'https://www.expedia.co.jp/h/'
    };

    const affiliateIds = {
      agoda: process.env.AGODA_AFFILIATE_ID || 'demo-affiliate',
      booking: process.env.BOOKING_AFFILIATE_ID || 'demo-affiliate',
      expedia: process.env.EXPEDIA_AFFILIATE_ID || 'demo-affiliate'
    };

    try {
      switch (provider) {
        case 'agoda':
          return `${baseUrls.agoda}?affiliateId=${affiliateIds.agoda}&hotelId=${hotelId}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${guests}&rooms=${rooms}`;
        
        case 'booking':
          return `${baseUrls.booking}${hotelId}.html?aid=${affiliateIds.booking}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${guests}&no_rooms=${rooms}`;
        
        case 'expedia':
          return `${baseUrls.expedia}${hotelId}.Hotel-Information?chkin=${checkIn}&chkout=${checkOut}&rm1=a${guests}&referrer=${affiliateIds.expedia}`;
        
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Error generating affiliate URL:', error);
      throw error;
    }
  }

  // アフィリエイト統計取得
  async getAffiliateStats(dateFrom?: Date, dateTo?: Date): Promise<AffiliateStats> {
    try {
      // キャッシュから基本統計を取得
      const statsKey = 'affiliate_stats_global';
      const cachedStats = await this.cache.get(statsKey);

      if (cachedStats) {
        return cachedStats as AffiliateStats;
      }

      // デフォルト統計（実際の実装では、データベースから取得）
      const defaultStats: AffiliateStats = {
        total_clicks: 0,
        total_conversions: 0,
        conversion_rate: 0,
        total_commission: 0,
        provider_breakdown: {
          agoda: { clicks: 0, conversions: 0, commission: 0 },
          booking: { clicks: 0, conversions: 0, commission: 0 },
          expedia: { clicks: 0, conversions: 0, commission: 0 }
        }
      };

      // 1時間キャッシュ
      await this.cache.set(statsKey, defaultStats, 3600);
      return defaultStats;
    } catch (error) {
      logger.error('Error getting affiliate stats:', error);
      throw error;
    }
  }

  // プロバイダー別統計取得
  async getProviderStats(provider: string): Promise<any> {
    try {
      const providerStatsKey = `affiliate_stats_${provider}`;
      const stats = await this.cache.get(providerStatsKey);

      return stats || {
        provider,
        clicks: 0,
        conversions: 0,
        commission: 0,
        conversion_rate: 0
      };
    } catch (error) {
      logger.error('Error getting provider stats:', error);
      throw error;
    }
  }

  // コンバージョン状態更新
  async updateConversionStatus(conversionId: string, status: 'pending' | 'confirmed' | 'paid'): Promise<void> {
    try {
      const conversion = await this.cache.get(`affiliate_conversion:${conversionId}`);
      if (!conversion) {
        throw new Error('Conversion not found');
      }

      const updatedConversion = {
        ...conversion,
        status,
        updated_at: new Date()
      };

      await this.cache.set(`affiliate_conversion:${conversionId}`, updatedConversion, 2592000);

      logger.info('Conversion status updated', {
        conversionId,
        status
      });
    } catch (error) {
      logger.error('Error updating conversion status:', error);
      throw error;
    }
  }

  // クリック統計更新
  private async updateClickStats(provider: string): Promise<void> {
    try {
      const statsKey = `affiliate_stats_${provider}`;
      const stats = await this.cache.get(statsKey) || { clicks: 0, conversions: 0, commission: 0 };
      
      stats.clicks = (stats.clicks || 0) + 1;
      await this.cache.set(statsKey, stats, 3600);

      // グローバル統計も更新
      const globalStatsKey = 'affiliate_stats_global';
      const globalStats = await this.cache.get(globalStatsKey) || { total_clicks: 0 };
      globalStats.total_clicks = (globalStats.total_clicks || 0) + 1;
      await this.cache.set(globalStatsKey, globalStats, 3600);
    } catch (error) {
      logger.error('Error updating click stats:', error);
    }
  }

  // コンバージョン統計更新
  private async updateConversionStats(provider: string, commissionAmount: number): Promise<void> {
    try {
      const statsKey = `affiliate_stats_${provider}`;
      const stats = await this.cache.get(statsKey) || { clicks: 0, conversions: 0, commission: 0 };
      
      stats.conversions = (stats.conversions || 0) + 1;
      stats.commission = (stats.commission || 0) + commissionAmount;
      await this.cache.set(statsKey, stats, 3600);

      // グローバル統計も更新
      const globalStatsKey = 'affiliate_stats_global';
      const globalStats = await this.cache.get(globalStatsKey) || { total_conversions: 0, total_commission: 0 };
      globalStats.total_conversions = (globalStats.total_conversions || 0) + 1;
      globalStats.total_commission = (globalStats.total_commission || 0) + commissionAmount;
      await this.cache.set(globalStatsKey, globalStats, 3600);
    } catch (error) {
      logger.error('Error updating conversion stats:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}