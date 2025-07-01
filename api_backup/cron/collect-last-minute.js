import { getSupabaseClient } from '../_lib/supabase.js';
import { retryWithBackoff } from '../_middleware.js';

// Vercel Cron Job configuration
export const config = {
  schedule: '0 */2 * * *' // Run every 2 hours
};

// Get luxury hotels to monitor
async function getLuxuryHotels() {
  const supabase = getSupabaseClient();
  
  const { data: hotels, error } = await supabase
    .from('hotels')
    .select('id, name, external_ids, room_types(id, name)')
    .eq('hotel_type', 'luxury')
    .order('stars', { ascending: false });
  
  if (error) throw error;
  return hotels || [];
}

// Check availability for specific date ranges
async function checkLastMinuteAvailability(hotel, daysAhead) {
  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + daysAhead);
  
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 1);
  
  // Mock API call - replace with actual implementation
  const mockAvailability = {
    rooms: hotel.room_types.map(roomType => ({
      roomTypeId: roomType.id,
      available: Math.floor(Math.random() * 3), // 0-2 rooms
      price: 20000 + Math.floor(Math.random() * 30000),
      originalPrice: 35000 + Math.floor(Math.random() * 40000)
    }))
  };
  
  return {
    hotel,
    checkInDate: checkInDate.toISOString().split('T')[0],
    checkOutDate: checkOutDate.toISOString().split('T')[0],
    availability: mockAvailability
  };
}

// Update database with collected data
async function updateInventory(data) {
  const supabase = getSupabaseClient();
  const updates = [];
  
  for (const room of data.availability.rooms) {
    if (room.available > 0) {
      updates.push({
        room_type_id: room.roomTypeId,
        date: data.checkInDate,
        total_rooms: 10, // Default, should come from API
        available_rooms: room.available,
        price: room.price,
        original_price: room.originalPrice,
        is_last_minute: true,
        last_checked_at: new Date().toISOString()
      });
    }
  }
  
  if (updates.length > 0) {
    const { error } = await supabase
      .from('room_inventory')
      .upsert(updates, {
        onConflict: 'room_type_id,date'
      });
    
    if (error) {
      console.error('Failed to update inventory:', error);
    }
  }
  
  return updates.length;
}

// Find users interested in these hotels
async function findInterestedUsers(hotelId, checkInDate) {
  const supabase = getSupabaseClient();
  
  const { data: preferences, error } = await supabase
    .from('user_preferences')
    .select('*, user_profiles(*)')
    .eq('is_active', true)
    .eq('notify_last_minute', true)
    .or(`hotel_id.eq.${hotelId},preference_type.eq.area`);
  
  if (error) {
    console.error('Failed to find interested users:', error);
    return [];
  }
  
  // Filter by date flexibility
  return preferences.filter(pref => {
    if (!pref.checkin_date) return true;
    
    const prefDate = new Date(pref.checkin_date);
    const targetDate = new Date(checkInDate);
    const daysDiff = Math.abs(targetDate - prefDate) / (1000 * 60 * 60 * 24);
    
    return daysDiff <= (pref.flexibility_days || 0);
  });
}

// Create notifications for matched users
async function createNotifications(hotel, availability, users) {
  const supabase = getSupabaseClient();
  const notifications = [];
  
  for (const user of users) {
    const bestDeal = availability.availability.rooms
      .filter(r => r.available > 0)
      .sort((a, b) => a.price - b.price)[0];
    
    if (bestDeal) {
      const discount = Math.round((1 - bestDeal.price / bestDeal.originalPrice) * 100);
      
      notifications.push({
        user_id: user.user_id,
        type: 'last_minute',
        hotel_id: hotel.id,
        room_type_id: bestDeal.roomTypeId,
        check_in_date: availability.checkInDate,
        check_out_date: availability.checkOutDate,
        price: bestDeal.price,
        previous_price: bestDeal.originalPrice,
        message: `【直前割】${hotel.name}に空室が出ました！${discount}%OFF ¥${bestDeal.price.toLocaleString()}/泊`,
        metadata: {
          discount_percentage: discount,
          days_before: availability.daysAhead,
          available_rooms: bestDeal.available
        }
      });
    }
  }
  
  if (notifications.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .insert(notifications);
    
    if (error) {
      console.error('Failed to create notifications:', error);
    }
  }
  
  return notifications.length;
}

// Main cron job handler
export default async function handler(req, res) {
  // Verify this is called by Vercel Cron
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log('Starting last-minute availability collection...');
  
  try {
    const hotels = await getLuxuryHotels();
    console.log(`Found ${hotels.length} luxury hotels to check`);
    
    let totalUpdates = 0;
    let totalNotifications = 0;
    
    // Check availability for 1, 3, and 7 days ahead
    const daysToCheck = [1, 3, 7];
    
    for (const hotel of hotels) {
      for (const days of daysToCheck) {
        try {
          // Check availability
          const availability = await retryWithBackoff(
            () => checkLastMinuteAvailability(hotel, days),
            3,
            1000
          );
          
          // Update inventory
          const updates = await updateInventory(availability);
          totalUpdates += updates;
          
          // Find and notify interested users
          if (updates > 0) {
            const users = await findInterestedUsers(hotel.id, availability.checkInDate);
            const notifications = await createNotifications(hotel, availability, users);
            totalNotifications += notifications;
          }
        } catch (error) {
          console.error(`Failed to check hotel ${hotel.id} for ${days} days:`, error);
        }
      }
    }
    
    const summary = {
      success: true,
      hotelsChecked: hotels.length,
      daysChecked: daysToCheck,
      inventoryUpdates: totalUpdates,
      notificationsCreated: totalNotifications,
      timestamp: new Date().toISOString()
    };
    
    console.log('Last-minute collection completed:', summary);
    
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}