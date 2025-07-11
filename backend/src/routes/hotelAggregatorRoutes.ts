import { Router, Request, Response, NextFunction } from 'express';
import { RakutenService } from '../services/rakutenService';
import { AgodaService } from '../services/agodaService';

const router = Router();
const rakutenService = new RakutenService();
const agodaService = new AgodaService();

interface UnifiedHotel {
  id: string;
  source: 'rakuten' | 'agoda' | 'booking' | 'expedia';
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  images: string[];
  thumbnailUrl: string;
  amenities?: string[];
  bookingUrl: string;
  isLuxury?: boolean;
  isLastMinuteDeal?: boolean;
}

// 全ソースから高級ホテルを検索
router.get('/luxury-hotels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { city, checkinDate, checkoutDate, sources = 'all' } = req.query;
    const allHotels: UnifiedHotel[] = [];

    // 楽天トラベルから取得
    if (sources === 'all' || sources?.includes('rakuten')) {
      try {
        const rakutenHotels = await rakutenService.searchLuxuryHotels({
          checkinDate: checkinDate as string,
          checkoutDate: checkoutDate as string,
          minCharge: 40000,
        });

        const unifiedRakutenHotels = rakutenHotels.map(hotel => ({
          id: `rakuten_${hotel.hotelNo}`,
          source: 'rakuten' as const,
          name: hotel.hotelName,
          description: hotel.hotelSpecial,
          address: `${hotel.address1} ${hotel.address2}`,
          city: hotel.address1.split('都')[0] + '都' || hotel.address1.split('府')[0] + '府',
          country: '日本',
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          rating: hotel.reviewAverage || 4.5,
          reviewCount: hotel.reviewCount,
          price: hotel.hotelMinCharge,
          images: [hotel.hotelImageUrl, hotel.roomImageUrl].filter(Boolean),
          thumbnailUrl: hotel.hotelThumbnailUrl,
          bookingUrl: rakutenService.generateBookingUrl(
            hotel,
            checkinDate as string || new Date().toISOString().split('T')[0],
            checkoutDate as string || new Date(Date.now() + 86400000).toISOString().split('T')[0]
          ),
          isLuxury: true,
        }));

        allHotels.push(...unifiedRakutenHotels);
      } catch (error) {
        console.error('Error fetching from Rakuten:', error);
      }
    }

    // アゴダから取得
    if (sources === 'all' || sources?.includes('agoda')) {
      try {
        const agodaHotels = await agodaService.searchHotels({
          checkIn: checkinDate as string,
          checkOut: checkoutDate as string,
        });

        const unifiedAgodaHotels = agodaHotels
          .filter(hotel => hotel.price >= 40000 && hotel.starRating >= 4)
          .map(hotel => ({
            id: `agoda_${hotel.hotelId}`,
            source: 'agoda' as const,
            name: hotel.hotelName,
            address: hotel.address,
            city: hotel.city,
            country: '日本',
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            rating: hotel.reviewScore / 2, // Convert 10-point scale to 5-point
            reviewCount: hotel.reviewCount,
            price: hotel.price,
            originalPrice: hotel.originalPrice,
            discountPercentage: hotel.discountPercentage,
            images: [hotel.photoUrl],
            thumbnailUrl: hotel.photoUrl,
            bookingUrl: agodaService.generateBookingUrl(
              hotel,
              checkinDate as string || new Date().toISOString().split('T')[0],
              checkoutDate as string || new Date(Date.now() + 86400000).toISOString().split('T')[0]
            ),
            isLuxury: true,
          }));

        allHotels.push(...unifiedAgodaHotels);
      } catch (error) {
        console.error('Error fetching from Agoda:', error);
      }
    }

    // 価格でソート
    allHotels.sort((a, b) => b.price - a.price);

    res.json({
      data: allHotels,
      sources: {
        rakuten: allHotels.filter(h => h.source === 'rakuten').length,
        agoda: allHotels.filter(h => h.source === 'agoda').length,
        total: allHotels.length,
      },
      pagination: {
        page: 1,
        limit: 50,
        total: allHotels.length,
        totalPages: 1,
      }
    });
  } catch (error) {
    next(error);
  }
});

// 全ソースから直前割引を検索
router.get('/last-minute-deals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { city, maxPrice, sources = 'all' } = req.query;
    const allDeals: UnifiedHotel[] = [];

    // 楽天トラベルから取得
    if (sources === 'all' || sources?.includes('rakuten')) {
      try {
        const rakutenDeals = await rakutenService.searchLastMinuteDeals({
          maxCharge: maxPrice ? parseInt(maxPrice as string) : 50000,
        });

        const unifiedRakutenDeals = rakutenDeals.map(hotel => ({
          id: `rakuten_${hotel.hotelNo}`,
          source: 'rakuten' as const,
          name: hotel.hotelName,
          description: hotel.hotelSpecial,
          address: `${hotel.address1} ${hotel.address2}`,
          city: hotel.address1.split('都')[0] + '都' || hotel.address1.split('府')[0] + '府',
          country: '日本',
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          rating: hotel.reviewAverage || 4.5,
          reviewCount: hotel.reviewCount,
          price: hotel.hotelMinCharge,
          originalPrice: Math.floor(hotel.hotelMinCharge * 1.4),
          discountPercentage: 30,
          images: [hotel.hotelImageUrl, hotel.roomImageUrl].filter(Boolean),
          thumbnailUrl: hotel.hotelThumbnailUrl,
          bookingUrl: rakutenService.generateBookingUrl(
            hotel,
            new Date().toISOString().split('T')[0],
            new Date(Date.now() + 86400000).toISOString().split('T')[0]
          ),
          isLastMinuteDeal: true,
        }));

        allDeals.push(...unifiedRakutenDeals);
      } catch (error) {
        console.error('Error fetching deals from Rakuten:', error);
      }
    }

    // アゴダから取得
    if (sources === 'all' || sources?.includes('agoda')) {
      try {
        const agodaHotels = await agodaService.searchHotels({
          checkIn: new Date().toISOString().split('T')[0],
          checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        });

        const agodaDeals = agodaHotels
          .filter(hotel => hotel.discountPercentage && hotel.discountPercentage >= 20)
          .map(hotel => ({
            id: `agoda_${hotel.hotelId}`,
            source: 'agoda' as const,
            name: hotel.hotelName,
            address: hotel.address,
            city: hotel.city,
            country: '日本',
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            rating: hotel.reviewScore / 2,
            reviewCount: hotel.reviewCount,
            price: hotel.price,
            originalPrice: hotel.originalPrice,
            discountPercentage: hotel.discountPercentage,
            images: [hotel.photoUrl],
            thumbnailUrl: hotel.photoUrl,
            bookingUrl: agodaService.generateBookingUrl(
              hotel,
              new Date().toISOString().split('T')[0],
              new Date(Date.now() + 86400000).toISOString().split('T')[0]
            ),
            isLastMinuteDeal: true,
          }));

        allDeals.push(...agodaDeals);
      } catch (error) {
        console.error('Error fetching deals from Agoda:', error);
      }
    }

    // 割引率でソート
    allDeals.sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0));

    res.json({
      data: allDeals,
      sources: {
        rakuten: allDeals.filter(h => h.source === 'rakuten').length,
        agoda: allDeals.filter(h => h.source === 'agoda').length,
        total: allDeals.length,
      },
      pagination: {
        page: 1,
        limit: 50,
        total: allDeals.length,
        totalPages: 1,
      }
    });
  } catch (error) {
    next(error);
  }
});

// 価格比較
router.post('/compare-prices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelName, checkinDate, checkoutDate } = req.body;
    const comparisons = [];

    // 各サービスで同じホテルを検索して価格を比較
    // この実装は簡略版です。実際には各APIのホテルマッチングロジックが必要です。

    res.json({
      hotelName,
      checkinDate,
      checkoutDate,
      comparisons,
      bestDeal: comparisons[0] || null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;