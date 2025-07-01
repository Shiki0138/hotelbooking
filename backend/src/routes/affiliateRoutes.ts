import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

/**
 * アフィリエイトクリックトラッキング
 */
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { eventType, data, timestamp } = req.body;
    
    // クリックデータの検証
    if (!eventType || !data) {
      return res.status(400).json({
        error: 'Missing required fields: eventType, data'
      });
    }

    // ここでクリックデータを保存（実際の実装時）
    // await affiliateService.saveTrackingData(eventType, data);
    
    console.log(`Affiliate tracking: ${eventType}`, {
      hotelId: data.hotelId,
      otaType: data.otaType,
      sessionId: data.sessionId,
      timestamp: data.timestamp
    });

    res.json({
      success: true,
      message: 'Tracking data recorded'
    });
  } catch (error) {
    console.error('Affiliate tracking error:', error);
    res.status(500).json({
      error: 'Failed to track affiliate data'
    });
  }
});

/**
 * トラッキングピクセル
 */
router.get('/pixel', (req: Request, res: Response) => {
  const { hotel_id, session_id } = req.query;
  
  // ログ記録
  console.log('Tracking pixel loaded:', {
    hotelId: hotel_id,
    sessionId: session_id,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // 1x1の透明なGIF画像を返す
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  res.send(pixel);
});

/**
 * アフィリエイト統計取得
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { period = 'daily', hotelId, otaType } = req.query;
    
    // デモ用統計データ
    const stats = {
      period,
      totalClicks: Math.floor(Math.random() * 1000) + 100,
      totalConversions: Math.floor(Math.random() * 50) + 5,
      conversionRate: ((Math.random() * 5) + 1).toFixed(2),
      estimatedRevenue: Math.floor(Math.random() * 50000) + 10000,
      byOta: {
        rakuten: {
          clicks: Math.floor(Math.random() * 200) + 20,
          conversions: Math.floor(Math.random() * 10) + 1,
          revenue: Math.floor(Math.random() * 10000) + 2000
        },
        jalan: {
          clicks: Math.floor(Math.random() * 150) + 15,
          conversions: Math.floor(Math.random() * 8) + 1,
          revenue: Math.floor(Math.random() * 8000) + 1500
        },
        yahoo: {
          clicks: Math.floor(Math.random() * 100) + 10,
          conversions: Math.floor(Math.random() * 5) + 1,
          revenue: Math.floor(Math.random() * 5000) + 1000
        },
        booking: {
          clicks: Math.floor(Math.random() * 300) + 30,
          conversions: Math.floor(Math.random() * 15) + 2,
          revenue: Math.floor(Math.random() * 15000) + 3000
        },
        agoda: {
          clicks: Math.floor(Math.random() * 250) + 25,
          conversions: Math.floor(Math.random() * 12) + 1,
          revenue: Math.floor(Math.random() * 12000) + 2500
        },
        expedia: {
          clicks: Math.floor(Math.random() * 180) + 18,
          conversions: Math.floor(Math.random() * 9) + 1,
          revenue: Math.floor(Math.random() * 9000) + 1800
        }
      },
      timeline: Array.from({ length: 24 }, (_, i) => ({
        time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
        clicks: Math.floor(Math.random() * 50),
        conversions: Math.floor(Math.random() * 5)
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch affiliate stats'
    });
  }
});

/**
 * 価格比較データ取得
 */
router.get('/price-comparison/:hotelId', async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { checkIn, checkOut, guests, rooms } = req.query;
    
    // デモ用価格データ生成
    const basePrice = Math.floor(Math.random() * 20000) + 10000;
    
    const priceData = {
      hotelId,
      checkIn,
      checkOut,
      guests: parseInt(guests as string) || 2,
      rooms: parseInt(rooms as string) || 1,
      prices: {
        rakuten: basePrice + Math.floor(Math.random() * 4000 - 2000),
        jalan: basePrice + Math.floor(Math.random() * 4000 - 2000),
        yahoo: basePrice + Math.floor(Math.random() * 4000 - 2000),
        booking: basePrice + Math.floor(Math.random() * 4000 - 2000),
        agoda: basePrice + Math.floor(Math.random() * 4000 - 2000),
        expedia: basePrice + Math.floor(Math.random() * 4000 - 2000)
      },
      lastUpdated: new Date().toISOString(),
      isEstimated: true
    };

    // 最安値・最高値の計算
    const validPrices = Object.values(priceData.prices).filter(p => p > 0);
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    const cheapestOta = Object.entries(priceData.prices).find(([ota, price]) => price === minPrice)?.[0];

    res.json({
      ...priceData,
      minPrice,
      maxPrice,
      cheapestOta,
      averagePrice: Math.round(validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length),
      validCount: validPrices.length
    });
  } catch (error) {
    console.error('Price comparison error:', error);
    res.status(500).json({
      error: 'Failed to fetch price comparison data'
    });
  }
});

/**
 * アフィリエイトリンク生成
 */
router.post('/generate-link', async (req: Request, res: Response) => {
  try {
    const { hotelId, otaType, bookingParams } = req.body;
    
    if (!hotelId || !otaType) {
      return res.status(400).json({
        error: 'Missing required fields: hotelId, otaType'
      });
    }

    // デモ用リンク生成
    const baseUrls = {
      rakuten: 'https://travel.rakuten.co.jp/hotel',
      jalan: 'https://www.jalan.net/hotel',
      yahoo: 'https://travel.yahoo.co.jp/hotel',
      booking: 'https://www.booking.com/hotel/jp',
      agoda: 'https://www.agoda.com/hotel',
      expedia: 'https://www.expedia.co.jp/hotel'
    };

    const baseUrl = baseUrls[otaType as keyof typeof baseUrls];
    if (!baseUrl) {
      return res.status(400).json({
        error: 'Invalid OTA type'
      });
    }

    // パラメータ付きリンクを生成
    const params = new URLSearchParams();
    if (bookingParams?.checkIn) params.set('checkin', bookingParams.checkIn);
    if (bookingParams?.checkOut) params.set('checkout', bookingParams.checkOut);
    if (bookingParams?.guests) params.set('guests', bookingParams.guests.toString());
    if (bookingParams?.rooms) params.set('rooms', bookingParams.rooms.toString());

    const link = `${baseUrl}/${hotelId}${params.toString() ? '?' + params.toString() : ''}`;

    res.json({
      success: true,
      link,
      otaType,
      hotelId,
      bookingParams
    });
  } catch (error) {
    console.error('Link generation error:', error);
    res.status(500).json({
      error: 'Failed to generate affiliate link'
    });
  }
});

export default router;