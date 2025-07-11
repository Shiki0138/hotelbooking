import { Router, Request, Response, NextFunction } from 'express';
import { RakutenService } from '../services/rakutenService';
import { authenticate } from '../middleware/auth';

const router = Router();
const rakutenService = new RakutenService();

// 高級ホテル一覧を取得
router.get('/luxury-hotels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      city, 
      checkinDate, 
      checkoutDate,
      minPrice,
      maxPrice,
      page = 1
    } = req.query;

    // 地域コードの変換
    const areaCodes = rakutenService.getAreaCodes();
    let middleClassCode;
    if (city) {
      const cityLower = city.toString().toLowerCase();
      if (cityLower.includes('tokyo') || cityLower.includes('東京')) {
        middleClassCode = areaCodes.tokyo.middleCode;
      } else if (cityLower.includes('osaka') || cityLower.includes('大阪')) {
        middleClassCode = areaCodes.osaka.middleCode;
      } else if (cityLower.includes('kyoto') || cityLower.includes('京都')) {
        middleClassCode = areaCodes.kyoto.middleCode;
      }
    }

    const searchParams: any = {
      checkinDate: checkinDate as string,
      checkoutDate: checkoutDate as string,
      minCharge: minPrice ? parseInt(minPrice as string) : 15000,
      page: parseInt(page as string),
      hits: 20,
    };
    
    if (middleClassCode) {
      searchParams.middleClassCode = middleClassCode;
    }
    if (maxPrice) {
      searchParams.maxCharge = parseInt(maxPrice as string);
    }

    const hotels = await rakutenService.searchLuxuryHotels(searchParams);

    // フロントエンド用にデータを整形
    const formattedHotels = hotels.map(hotel => ({
      id: hotel.hotelNo.toString(),
      name: hotel.hotelName,
      description: hotel.hotelSpecial,
      address: `${hotel.address1} ${hotel.address2}`,
      city: hotel.address1.split('都')[0] + '都' || hotel.address1.split('府')[0] + '府',
      country: '日本',
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      rating: hotel.reviewAverage || 4.5,
      reviewCount: hotel.reviewCount,
      minPrice: hotel.hotelMinCharge,
      images: [hotel.hotelImageUrl, hotel.roomImageUrl].filter(Boolean),
      thumbnailUrl: hotel.hotelThumbnailUrl,
      access: hotel.access,
      nearestStation: hotel.nearestStation,
      rakutenUrl: hotel.planListUrl,
      isLuxury: hotel.hotelMinCharge >= 15000,
    }));

    res.json({
      data: formattedHotels,
      pagination: {
        page: parseInt(page as string),
        limit: 20,
        total: formattedHotels.length,
        totalPages: Math.ceil(formattedHotels.length / 20),
      }
    });
  } catch (error) {
    next(error);
  }
});

// 直前割引ホテルを取得
router.get('/last-minute-deals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { city, maxPrice } = req.query;

    const areaCodes = rakutenService.getAreaCodes();
    let middleClassCode;
    if (city) {
      const cityLower = city.toString().toLowerCase();
      if (cityLower.includes('tokyo') || cityLower.includes('東京')) {
        middleClassCode = areaCodes.tokyo.middleCode;
      } else if (cityLower.includes('osaka') || cityLower.includes('大阪')) {
        middleClassCode = areaCodes.osaka.middleCode;
      } else if (cityLower.includes('kyoto') || cityLower.includes('京都')) {
        middleClassCode = areaCodes.kyoto.middleCode;
      }
    }

    const searchParams: any = {
      hits: 30,
    };
    
    if (middleClassCode) {
      searchParams.middleClassCode = middleClassCode;
    }
    if (maxPrice) {
      searchParams.maxCharge = parseInt(maxPrice as string);
    }

    const hotels = await rakutenService.searchLastMinuteDeals(searchParams);

    // 割引率を計算（仮の実装）
    const formattedHotels = hotels.map(hotel => ({
      id: hotel.hotelNo.toString(),
      name: hotel.hotelName,
      description: hotel.hotelSpecial,
      address: `${hotel.address1} ${hotel.address2}`,
      city: hotel.address1.split('都')[0] + '都' || hotel.address1.split('府')[0] + '府',
      country: '日本',
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      rating: hotel.reviewAverage || 4.5,
      reviewCount: hotel.reviewCount,
      originalPrice: Math.floor(hotel.hotelMinCharge * 1.3), // 仮の通常価格
      discountedPrice: hotel.hotelMinCharge,
      discountPercentage: 30, // 仮の割引率
      images: [hotel.hotelImageUrl, hotel.roomImageUrl].filter(Boolean),
      thumbnailUrl: hotel.hotelThumbnailUrl,
      access: hotel.access,
      nearestStation: hotel.nearestStation,
      rakutenUrl: hotel.planListUrl,
      isLastMinuteDeal: true,
    }));

    res.json({
      data: formattedHotels,
      pagination: {
        page: 1,
        limit: 30,
        total: formattedHotels.length,
        totalPages: 1,
      }
    });
  } catch (error) {
    next(error);
  }
});

// 予約URLを生成
router.post('/booking-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelNo, hotelName, planListUrl, checkinDate, checkoutDate } = req.body;

    const bookingUrl = rakutenService.generateBookingUrl(
      {
        hotelNo,
        hotelName,
        planListUrl,
        // その他の必須フィールドはダミー値
        hotelInformationUrl: '',
        hotelKanaName: '',
        hotelSpecial: '',
        hotelMinCharge: 0,
        latitude: 0,
        longitude: 0,
        postalCode: '',
        address1: '',
        address2: '',
        telephoneNo: '',
        access: '',
        parkingInformation: '',
        nearestStation: '',
        hotelImageUrl: '',
        hotelThumbnailUrl: '',
        roomImageUrl: '',
        roomThumbnailUrl: '',
        reviewCount: 0,
        reviewAverage: 0,
        userReview: '',
      },
      checkinDate,
      checkoutDate
    );

    res.json({ bookingUrl });
  } catch (error) {
    next(error);
  }
});

// お気に入り条件の保存（認証必要）
router.post('/favorite-conditions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { cities, priceRange, hotelTypes, notificationEnabled } = req.body;

    // TODO: Supabaseに保存
    // 現在は仮の実装
    res.json({
      message: 'お気に入り条件を保存しました',
      data: {
        userId,
        cities,
        priceRange,
        hotelTypes,
        notificationEnabled,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;