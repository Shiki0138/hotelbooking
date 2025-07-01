// Simple Rakuten Hotel Search API
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { location, checkinDate, checkoutDate } = req.method === 'GET' ? req.query : req.body;
    
    // Use environment variable or fallback to provided App ID
    const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID || '1098905933829691615';
    
    // Format dates
    const checkin = checkinDate || new Date().toISOString().split('T')[0];
    const checkout = checkoutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    // Build Rakuten API URL
    const params = new URLSearchParams({
      applicationId: RAKUTEN_APP_ID,
      keyword: location || '東京',
      checkinDate: checkin.replace(/-/g, ''),
      checkoutDate: checkout.replace(/-/g, ''),
      hits: '30',
      page: '1',
      datumType: '1',
      sort: '+roomCharge'
    });

    const apiUrl = `https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426?${params}`;
    
    // Call Rakuten API
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || 'Rakuten API error');
    }

    // Transform data
    const hotels = (data.hotels || []).map(item => {
      const hotel = item.hotel[0].hotelBasicInfo;
      return {
        id: hotel.hotelNo,
        name: hotel.hotelName,
        location: `${hotel.prefecture} ${hotel.city}`,
        address: hotel.address1 + hotel.address2,
        image: hotel.hotelImageUrl,
        thumbnail: hotel.hotelThumbnailUrl,
        originalPrice: hotel.hotelMaxCharge || 100000,
        discountPrice: hotel.hotelMinCharge,
        discount: hotel.hotelMaxCharge ? 
          Math.round((1 - hotel.hotelMinCharge / hotel.hotelMaxCharge) * 100) : 30,
        rating: hotel.reviewAverage || 4.5,
        reviewCount: hotel.reviewCount || 0,
        features: hotel.hotelSpecial ? hotel.hotelSpecial.split('、').slice(0, 4) : [],
        availability: '空室あり',
        description: hotel.hotelSpecial || '',
        infoUrl: hotel.hotelInformationUrl
      };
    });

    return res.status(200).json({
      success: true,
      hotels,
      total: data.pagingInfo?.recordCount || hotels.length
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'ホテル検索エラーが発生しました'
    });
  }
}