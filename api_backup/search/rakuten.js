import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Rakuten Travel API client (Free tier)
class RakutenTravelAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://app.rakuten.co.jp/services/api/Travel';
  }

  async searchHotels(params) {
    const url = new URL(`${this.baseUrl}/SimpleHotelSearch/20170426`);
    
    // Set API parameters
    url.searchParams.append('applicationId', this.apiKey);
    url.searchParams.append('format', 'json');
    url.searchParams.append('datumType', '1'); // WGS84
    url.searchParams.append('checkinDate', params.checkIn);
    url.searchParams.append('checkoutDate', params.checkOut);
    url.searchParams.append('adultNum', params.adults || '2');
    
    // Location parameters
    if (params.latitude && params.longitude) {
      url.searchParams.append('latitude', params.latitude);
      url.searchParams.append('longitude', params.longitude);
      url.searchParams.append('searchRadius', '5'); // 5km radius
    } else if (params.largeClassCode) {
      url.searchParams.append('largeClassCode', params.largeClassCode);
    }
    
    // Price range
    if (params.minPrice) {
      url.searchParams.append('minCharge', params.minPrice);
    }
    if (params.maxPrice) {
      url.searchParams.append('maxCharge', params.maxPrice);
    }
    
    // Sorting
    url.searchParams.append('sort', '+roomCharge'); // Sort by price ascending
    
    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Rakuten API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Rakuten API error:', error);
      throw error;
    }
  }
}

// Area codes for major cities
const AREA_CODES = {
  '東京都': 'japan13',
  '大阪府': 'japan27',
  '京都府': 'japan26',
  '神奈川県': 'japan14',
  '愛知県': 'japan23',
  '福岡県': 'japan40',
  '北海道': 'japan01',
  '沖縄県': 'japan47'
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    city,
    prefecture,
    checkIn,
    checkOut,
    minPrice,
    maxPrice,
    adults = '2',
    updateDatabase = 'true'
  } = req.query;

  // Validate required parameters
  if (!checkIn || !checkOut) {
    return res.status(400).json({ 
      error: 'チェックイン日とチェックアウト日を指定してください' 
    });
  }

  try {
    const rakutenAPI = new RakutenTravelAPI(process.env.RAKUTEN_API_KEY);
    
    // Build search parameters
    const searchParams = {
      checkIn: checkIn.replace(/-/g, ''),
      checkOut: checkOut.replace(/-/g, ''),
      adults,
      minPrice,
      maxPrice
    };
    
    // Add location parameter
    if (prefecture && AREA_CODES[prefecture]) {
      searchParams.largeClassCode = AREA_CODES[prefecture];
    }
    
    // Search via Rakuten API
    console.log('Searching Rakuten API with params:', searchParams);
    const rakutenData = await rakutenAPI.searchHotels(searchParams);
    
    if (!rakutenData.hotels || rakutenData.hotels.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          hotels: [],
          source: 'rakuten',
          message: '該当するホテルが見つかりませんでした'
        }
      });
    }
    
    // Process and format results
    const hotels = rakutenData.hotels.map(item => {
      const hotel = item.hotel[0].hotelBasicInfo;
      const roomInfo = item.hotel[1]?.roomInfo?.[0]?.roomBasicInfo;
      
      return {
        rakutenHotelNo: hotel.hotelNo,
        name: hotel.hotelName,
        nameEn: hotel.hotelKanaName,
        address: hotel.address1 + hotel.address2,
        city: hotel.address2,
        prefecture: hotel.address1.split(/都|道|府|県/)[0] + (hotel.address1.includes('都') ? '都' : 
                    hotel.address1.includes('道') ? '道' : 
                    hotel.address1.includes('府') ? '府' : '県'),
        latitude: parseFloat(hotel.latitude),
        longitude: parseFloat(hotel.longitude),
        telephoneNo: hotel.telephoneNo,
        reviewAverage: parseFloat(hotel.reviewAverage || 0),
        reviewCount: parseInt(hotel.reviewCount || 0),
        thumbnailUrl: hotel.hotelThumbnailUrl,
        price: roomInfo?.roomCharge || 0,
        roomName: roomInfo?.roomName || '部屋情報なし',
        planName: roomInfo?.planName || '',
        availableRooms: 1 // Rakuten doesn't provide exact count
      };
    });
    
    // Update database if requested
    if (updateDatabase === 'true') {
      await updateHotelDatabase(hotels, checkIn);
    }
    
    return res.status(200).json({
      success: true,
      data: {
        hotels: hotels.slice(0, 20), // Limit to 20 results
        totalResults: rakutenData.pagingInfo?.recordCount || hotels.length,
        source: 'rakuten',
        searchParams
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Rakuten search error:', error);
    
    // Fallback to database search
    console.log('Falling back to database search...');
    return fallbackToDatabaseSearch(req, res);
  }
}

// Update hotel information in database
async function updateHotelDatabase(hotels, checkInDate) {
  for (const hotel of hotels) {
    try {
      // Check if hotel exists
      const { data: existingHotel } = await supabase
        .from('hotels')
        .select('id')
        .eq('rakuten_hotel_no', hotel.rakutenHotelNo)
        .single();
      
      let hotelId;
      
      if (existingHotel) {
        hotelId = existingHotel.id;
        
        // Update hotel info
        await supabase
          .from('hotels')
          .update({
            name: hotel.name,
            name_en: hotel.nameEn,
            updated_at: new Date().toISOString()
          })
          .eq('id', hotelId);
      } else {
        // Insert new hotel
        const { data: newHotel } = await supabase
          .from('hotels')
          .insert({
            rakuten_hotel_no: hotel.rakutenHotelNo,
            name: hotel.name,
            name_en: hotel.nameEn,
            address: hotel.address,
            city: hotel.city,
            prefecture: hotel.prefecture,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            stars: Math.round(hotel.reviewAverage) || 3,
            base_price: hotel.price
          })
          .select()
          .single();
        
        hotelId = newHotel?.id;
      }
      
      // Update inventory
      if (hotelId && hotel.price > 0) {
        await supabase
          .from('room_inventory')
          .upsert({
            hotel_id: hotelId,
            date: checkInDate,
            available_rooms: hotel.availableRooms,
            price: hotel.price,
            last_checked_at: new Date().toISOString()
          }, {
            onConflict: 'hotel_id,date'
          });
      }
    } catch (error) {
      console.error(`Failed to update hotel ${hotel.name}:`, error);
    }
  }
}

// Fallback to database search
async function fallbackToDatabaseSearch(req, res) {
  const { checkIn, city, prefecture, minPrice, maxPrice } = req.query;
  
  let query = supabase
    .from('hotels')
    .select(`
      *,
      room_inventory!inner (
        date,
        available_rooms,
        price
      )
    `)
    .eq('room_inventory.date', checkIn)
    .gt('room_inventory.available_rooms', 0);
  
  if (city) query = query.eq('city', city);
  if (prefecture) query = query.eq('prefecture', prefecture);
  if (minPrice) query = query.gte('room_inventory.price', minPrice);
  if (maxPrice) query = query.lte('room_inventory.price', maxPrice);
  
  const { data: hotels, error } = await query.order('room_inventory.price');
  
  if (error) {
    return res.status(500).json({ error: 'データベースエラー' });
  }
  
  const results = hotels.map(hotel => ({
    ...hotel,
    price: hotel.room_inventory[0]?.price || hotel.base_price,
    availableRooms: hotel.room_inventory[0]?.available_rooms || 0
  }));
  
  return res.status(200).json({
    success: true,
    data: {
      hotels: results,
      source: 'database',
      message: 'キャッシュデータから取得しました'
    }
  });
}