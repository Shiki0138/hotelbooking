import { HotelSearchAggregator } from '../_lib/hotel-apis/index.js';
import { getSupabaseClient } from '../_lib/supabase.js';
import { errorResponse, rateLimit } from '../_middleware.js';

// Initialize multi-source aggregator
const getAggregator = () => {
  return new HotelSearchAggregator({
    rakuten: process.env.RAKUTEN_API_KEY,
    jalan: process.env.JALAN_API_KEY,
    booking: process.env.RAPIDAPI_KEY,
    amadeus: {
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET
    }
  });
};

// Save search results to database
async function saveSearchResults(results) {
  const supabase = getSupabaseClient();
  const inventoryUpdates = [];
  
  for (const dateResult of results) {
    for (const hotel of dateResult.hotels) {
      // First, ensure hotel exists in database
      const { data: existingHotel } = await supabase
        .from('hotels')
        .select('id, room_types(id)')
        .eq('name', hotel.name)
        .single();
      
      let hotelId;
      let roomTypeId;
      
      if (existingHotel) {
        hotelId = existingHotel.id;
        roomTypeId = existingHotel.room_types[0]?.id;
      } else {
        // Create new hotel entry
        const { data: newHotel } = await supabase
          .from('hotels')
          .insert({
            name: hotel.name,
            name_en: hotel.nameEn,
            address: hotel.address,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            hotel_type: 'luxury', // Default, should be determined by price/rating
            external_ids: {
              rakuten: hotel.originalData?.hotelNo,
              booking: hotel.originalData?.hotel_id,
              amadeus: hotel.originalData?.hotelId
            }
          })
          .select()
          .single();
        
        if (newHotel) {
          hotelId = newHotel.id;
          
          // Create default room type
          const { data: newRoomType } = await supabase
            .from('room_types')
            .insert({
              hotel_id: hotelId,
              name: 'Standard Room',
              max_occupancy: 2
            })
            .select()
            .single();
          
          roomTypeId = newRoomType?.id;
        }
      }
      
      // Update inventory
      if (hotelId && roomTypeId && hotel.availability > 0) {
        inventoryUpdates.push({
          room_type_id: roomTypeId,
          date: dateResult.checkIn,
          total_rooms: 10, // Default estimate
          available_rooms: hotel.availability,
          price: hotel.lowestPrice || hotel.price,
          is_last_minute: dateResult.daysAhead <= 7,
          last_checked_at: new Date().toISOString()
        });
      }
    }
  }
  
  // Batch upsert inventory
  if (inventoryUpdates.length > 0) {
    await supabase
      .from('room_inventory')
      .upsert(inventoryUpdates, {
        onConflict: 'room_type_id,date'
      });
  }
  
  return inventoryUpdates.length;
}

// Find and notify users for matching preferences
async function notifyMatchingUsers(results) {
  const supabase = getSupabaseClient();
  const notifications = [];
  
  // Get active preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*, user_profiles(*)')
    .eq('is_active', true)
    .eq('notify_last_minute', true);
  
  for (const pref of preferences || []) {
    for (const dateResult of results) {
      const matchingHotels = dateResult.hotels.filter(hotel => {
        // Price range filter
        if (pref.min_price && hotel.lowestPrice < pref.min_price) return false;
        if (pref.max_price && hotel.lowestPrice > pref.max_price) return false;
        
        // Area filter
        if (pref.preference_type === 'area' && pref.area_name) {
          if (!hotel.address.includes(pref.area_name)) return false;
        }
        
        return true;
      });
      
      if (matchingHotels.length > 0) {
        const bestDeal = matchingHotels[0]; // Already sorted by price
        
        notifications.push({
          user_id: pref.user_id,
          type: 'last_minute',
          check_in_date: dateResult.checkIn,
          check_out_date: dateResult.checkOut,
          price: bestDeal.lowestPrice,
          message: `【${dateResult.daysAhead}日後】${bestDeal.name}に空室があります！¥${bestDeal.lowestPrice.toLocaleString()}/泊〜`,
          metadata: {
            hotel_name: bestDeal.name,
            days_ahead: dateResult.daysAhead,
            sources: bestDeal.sources,
            total_matches: matchingHotels.length
          }
        });
      }
    }
  }
  
  // Create notifications
  if (notifications.length > 0) {
    await supabase
      .from('notifications')
      .insert(notifications);
  }
  
  return notifications.length;
}

// Main handler
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse(new Error('Method not allowed'), 405));
  }
  
  try {
    // Parse parameters
    const {
      city,
      prefecture,
      latitude,
      longitude,
      radius,
      minPrice,
      maxPrice,
      daysAhead = '2,3,7', // Comma-separated days
      saveResults = 'true',
      notifyUsers = 'true'
    } = req.query;
    
    // Validate input
    if (!city && !prefecture && (!latitude || !longitude)) {
      return res.status(400).json(
        errorResponse(new Error('Location parameters required'), 400)
      );
    }
    
    // Parse days ahead
    const daysArray = daysAhead.split(',').map(d => parseInt(d)).filter(d => d > 0);
    
    // Build search parameters
    const searchParams = {
      city,
      prefecture,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      radius: radius ? parseInt(radius) : 5,
      cityCode: city === '東京' || city === 'Tokyo' ? 'TYO' : undefined
    };
    
    // Search multiple dates across all sources
    const aggregator = getAggregator();
    const results = await aggregator.searchMultipleDates(searchParams, daysArray);
    
    // Process results
    let savedCount = 0;
    let notificationCount = 0;
    
    if (saveResults === 'true') {
      savedCount = await saveSearchResults(results);
    }
    
    if (notifyUsers === 'true' && savedCount > 0) {
      notificationCount = await notifyMatchingUsers(results);
    }
    
    // Prepare response
    const response = {
      success: true,
      data: {
        searchParams,
        daysSearched: daysArray,
        results: results.map(r => ({
          daysAhead: r.daysAhead,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          hotelCount: r.hotels.length,
          lowestPrice: Math.min(...r.hotels.map(h => h.lowestPrice || Infinity)),
          sources: r.sources,
          hotels: r.hotels.slice(0, 10) // Top 10 for each date
        })),
        processing: {
          inventoryUpdated: savedCount,
          notificationsSent: notificationCount
        }
      },
      timestamp: new Date().toISOString()
    };
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Multi-date search error:', error);
    
    // Detailed error response for debugging
    return res.status(500).json({
      error: {
        message: error.message,
        code: 'SEARCH_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
}

// Apply rate limiting - 20 requests per minute per IP
export default rateLimit(60000, 20)(handler);