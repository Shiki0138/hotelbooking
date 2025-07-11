import { Router, Request, Response } from 'express';
import { HOTEL_DATABASE } from '../data/hotelDatabase';

const router = Router();

// ホテル詳細情報を取得
router.get('/:hotelId', (req: Request, res: Response) => {
  const { hotelId } = req.params;
  if (!hotelId) {
    return res.status(400).json({ error: 'Hotel ID is required' });
  }
  
  const hotel = HOTEL_DATABASE[hotelId];
  
  if (!hotel) {
    return res.status(404).json({ error: 'Hotel not found' });
  }
  
  return res.json(hotel);
});

// すべてのホテルリストを取得
router.get('/', (req: Request, res: Response) => {
  const { category, city, minPrice, maxPrice } = req.query;
  
  let hotels = Object.values(HOTEL_DATABASE);
  
  // フィルタリング
  if (category) {
    hotels = hotels.filter(h => h.category === category);
  }
  if (city) {
    hotels = hotels.filter(h => 
      h.location.city.includes(city as string) || 
      h.location.prefecture.includes(city as string)
    );
  }
  if (minPrice) {
    hotels = hotels.filter(h => h.pricing.minPrice >= Number(minPrice));
  }
  if (maxPrice) {
    hotels = hotels.filter(h => h.pricing.minPrice <= Number(maxPrice));
  }
  
  return res.json({
    data: hotels,
    total: hotels.length
  });
});

// 予約リンク情報を取得
router.post('/:hotelId/booking-links', (req: Request, res: Response) => {
  const { hotelId } = req.params;
  if (!hotelId) {
    return res.status(400).json({ error: 'Hotel ID is required' });
  }
  
  const { checkinDate, checkoutDate, adults = 2, rooms = 1 } = req.body;
  const hotel = HOTEL_DATABASE[hotelId];
  
  if (!hotel) {
    return res.status(404).json({ error: 'Hotel not found' });
  }
  
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID || '';
  
  console.log('Generating booking links for hotel:', hotelId);
  console.log('Affiliate ID:', affiliateId ? 'Set' : 'Not set');
  
  // 各予約サイトのURLを生成
  const bookingLinks = {
    // 公式サイト
    official: {
      name: 'ホテル公式サイト',
      url: hotel.official.bookingUrl || hotel.official.url,
      directBooking: true
    },
    
    // 楽天トラベル（アフィリエイト付き）
    rakuten: {
      name: '楽天トラベル',
      url: affiliateId 
        ? `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(hotel.rakuten.directUrl)}`
        : hotel.rakuten.directUrl,
      affiliate: true
    },
    
    // Agoda
    agoda: hotel.otherSites.agoda ? {
      name: 'Agoda',
      url: `${hotel.otherSites.agoda.url}?checkIn=${checkinDate}&checkOut=${checkoutDate}&adults=${adults}&rooms=${rooms}`,
      affiliate: false
    } : null,
    
    // Booking.com
    booking: hotel.otherSites.booking ? {
      name: 'Booking.com',
      url: `${hotel.otherSites.booking.url}?checkin=${checkinDate}&checkout=${checkoutDate}`,
      affiliate: false
    } : null,
    
    // Expedia
    expedia: hotel.otherSites.expedia ? {
      name: 'Expedia',
      url: `${hotel.otherSites.expedia.url}?chkin=${checkinDate}&chkout=${checkoutDate}`,
      affiliate: false
    } : null,
    
    // Hotels.com
    hotels: hotel.otherSites.hotels ? {
      name: 'Hotels.com',
      url: hotel.otherSites.hotels.url,
      affiliate: false
    } : null
  };
  
  // nullを除外
  const filteredLinks = Object.entries(bookingLinks)
    .filter(([_, value]) => value !== null)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  
  return res.json({
    hotelId,
    hotelName: hotel.name,
    checkinDate,
    checkoutDate,
    bookingLinks: filteredLinks
  });
});

export default router;