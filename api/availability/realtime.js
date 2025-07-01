import { getSupabaseClient } from '../_lib/supabase.js';
import { getCircuitBreaker, errorResponse, retryWithBackoff } from '../_middleware.js';

// External API clients (to be replaced with actual implementations)
const getRakutenClient = () => {
  // Rakuten Travel API client
  return {
    searchAvailability: async (params) => {
      // Mock implementation - replace with actual API call
      return {
        hotels: [
          {
            hotelNo: params.hotelId,
            hotelName: 'Mock Hotel',
            rooms: [
              {
                roomClass: 'standard',
                roomName: 'Standard Room',
                planName: 'Standard Plan',
                charge: 25000,
                availableRooms: Math.floor(Math.random() * 5),
                total: 10
              }
            ]
          }
        ]
      };
    }
  };
};

// Check real-time availability from multiple sources
async function checkRealtimeAvailability(hotelId, checkIn, checkOut) {
  const circuitBreaker = getCircuitBreaker('availability-check');
  
  return circuitBreaker.execute(async () => {
    const supabase = getSupabaseClient();
    
    // Get hotel information
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('*, room_types(*)')
      .eq('id', hotelId)
      .single();
    
    if (hotelError) throw hotelError;
    
    // Check if we have recent data (within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentData } = await supabase
      .from('room_inventory')
      .select('*')
      .eq('room_type_id', hotel.room_types[0]?.id)
      .gte('date', checkIn)
      .lte('date', checkOut)
      .gte('last_checked_at', fiveMinutesAgo);
    
    if (recentData && recentData.length > 0) {
      return {
        source: 'cache',
        hotel,
        availability: recentData,
        lastChecked: recentData[0].last_checked_at
      };
    }
    
    // Fetch from external API
    const rakutenClient = getRakutenClient();
    const externalData = await rakutenClient.searchAvailability({
      hotelId: hotel.external_ids?.rakuten_id || hotelId,
      checkinDate: checkIn,
      checkoutDate: checkOut
    });
    
    // Update our database with fresh data
    const availability = [];
    for (const room of externalData.hotels[0]?.rooms || []) {
      const roomType = hotel.room_types.find(rt => 
        rt.name === room.roomName || rt.external_ids?.rakuten === room.roomClass
      );
      
      if (roomType) {
        const inventoryData = {
          room_type_id: roomType.id,
          date: checkIn,
          total_rooms: room.total || 10,
          available_rooms: room.availableRooms || 0,
          price: room.charge || 0,
          last_checked_at: new Date().toISOString()
        };
        
        // Upsert inventory data
        const { data, error } = await supabase
          .from('room_inventory')
          .upsert(inventoryData, {
            onConflict: 'room_type_id,date'
          })
          .select()
          .single();
        
        if (!error) {
          availability.push(data);
        }
      }
    }
    
    return {
      source: 'api',
      hotel,
      availability,
      lastChecked: new Date().toISOString()
    };
  });
}

// WebSocket support for real-time updates
export function setupRealtimeSubscription(hotelId, callback) {
  const supabase = getSupabaseClient();
  
  const subscription = supabase
    .channel(`hotel-${hotelId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_inventory',
        filter: `hotel_id=eq.${hotelId}`
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  return subscription;
}

// API Handler
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse(new Error('Method not allowed'), 405));
  }
  
  try {
    const { hotelId, checkIn, checkOut } = req.query;
    
    if (!hotelId || !checkIn || !checkOut) {
      return res.status(400).json(
        errorResponse(new Error('Missing required parameters'), 400)
      );
    }
    
    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate >= checkOutDate) {
      return res.status(400).json(
        errorResponse(new Error('Invalid date range'), 400)
      );
    }
    
    // Check availability with retry
    const availability = await retryWithBackoff(
      () => checkRealtimeAvailability(hotelId, checkIn, checkOut),
      3,
      1000
    );
    
    // Set appropriate cache headers
    if (availability.source === 'cache') {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      res.setHeader('X-Data-Source', 'cache');
    } else {
      res.setHeader('Cache-Control', 's-maxage=60');
      res.setHeader('X-Data-Source', 'api');
    }
    
    return res.status(200).json({
      success: true,
      data: availability,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Availability check error:', error);
    return res.status(500).json(errorResponse(error));
  }
}