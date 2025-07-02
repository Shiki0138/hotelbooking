// Unified API endpoint - Updated July 2, 2025
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  try {
    // Route to appropriate handler based on path
    if (pathname === '/api/main' || pathname === '/api/') {
      return res.status(200).json({
        message: 'LastMinuteStay API',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          search: '/api/hotels/search-simple',
          auth: '/api/auth/login'
        }
      });
    }
    
    // Health check
    if (pathname === '/api/health') {
      return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    }
    
    // Hotel search
    if (pathname.includes('/api/hotels/search')) {
      const { location, checkinDate, checkoutDate } = req.body || req.query;
      const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID || '1098905933829691615';
      
      const params = new URLSearchParams({
        applicationId: RAKUTEN_APP_ID,
        keyword: location || '東京',
        checkinDate: (checkinDate || new Date().toISOString().split('T')[0]).replace(/-/g, ''),
        checkoutDate: (checkoutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]).replace(/-/g, ''),
        hits: '30',
        datumType: '1',
        sort: '+roomCharge'
      });

      const response = await fetch(
        `https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426?${params}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || 'Rakuten API error');
      }

      const hotels = (data.hotels || []).map(item => {
        const hotel = item.hotel[0].hotelBasicInfo;
        return {
          id: hotel.hotelNo,
          name: hotel.hotelName,
          location: `${hotel.prefecture} ${hotel.city}`,
          image: hotel.hotelImageUrl,
          originalPrice: hotel.hotelMaxCharge || 100000,
          discountPrice: hotel.hotelMinCharge,
          discount: hotel.hotelMaxCharge ? 
            Math.round((1 - hotel.hotelMinCharge / hotel.hotelMaxCharge) * 100) : 30,
          rating: hotel.reviewAverage || 4.5,
          features: hotel.hotelSpecial ? hotel.hotelSpecial.split('、').slice(0, 4) : [],
          availability: '空室あり'
        };
      });

      return res.status(200).json({
        success: true,
        hotels,
        total: data.pagingInfo?.recordCount || hotels.length
      });
    }
    
    // Default 404
    return res.status(404).json({ error: 'Not found' });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message,
      message: 'API処理エラー'
    });
  }
}