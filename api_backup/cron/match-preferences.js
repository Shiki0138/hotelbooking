import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Vercel Cron configuration - Run every hour
export const config = {
  schedule: '0 * * * *'
};

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Starting preference matching cron job...');

  try {
    // Get all active preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select(`
        *,
        user_profiles (
          email,
          full_name,
          notification_enabled
        )
      `)
      .eq('is_active', true);

    if (prefError) throw prefError;

    console.log(`Found ${preferences.length} active preferences to match`);

    let totalMatches = 0;
    let notifications = [];

    // Process each preference
    for (const preference of preferences) {
      const matches = await findMatches(preference);
      
      if (matches.length > 0) {
        totalMatches += matches.length;
        
        // Create notifications for new matches
        const newNotifications = await createMatchNotifications(preference, matches);
        notifications.push(...newNotifications);
      }
    }

    // Process notifications queue
    if (notifications.length > 0) {
      await processNotifications(notifications);
    }

    const summary = {
      success: true,
      preferencesChecked: preferences.length,
      totalMatches,
      notificationsCreated: notifications.length,
      timestamp: new Date().toISOString()
    };

    console.log('Preference matching completed:', summary);
    return res.status(200).json(summary);

  } catch (error) {
    console.error('Matching cron error:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Find matches for a preference
async function findMatches(preference) {
  try {
    // Build base query
    let query = supabase
      .from('room_inventory')
      .select(`
        *,
        hotels!inner (
          id,
          name,
          name_en,
          city,
          prefecture,
          address,
          stars,
          rakuten_hotel_no
        )
      `)
      .gt('available_rooms', 0);

    // Date filtering
    const today = new Date();
    const checkInStart = preference.checkin_date ? new Date(preference.checkin_date) : today;
    const checkInEnd = preference.checkout_date ? 
      new Date(preference.checkout_date) : 
      new Date(today.setDate(today.getDate() + 30));

    // Apply flexibility
    if (preference.flexibility_days > 0) {
      checkInStart.setDate(checkInStart.getDate() - preference.flexibility_days);
      checkInEnd.setDate(checkInEnd.getDate() + preference.flexibility_days);
    }

    query = query
      .gte('date', checkInStart.toISOString().split('T')[0])
      .lte('date', checkInEnd.toISOString().split('T')[0]);

    // Price filtering
    if (preference.min_price) {
      query = query.gte('price', preference.min_price);
    }
    if (preference.max_price) {
      query = query.lte('price', preference.max_price);
    }

    // Hotel filtering
    if (preference.hotel_id) {
      query = query.eq('hotel_id', preference.hotel_id);
    }

    // Last minute filter (within 7 days)
    if (preference.notify_last_minute) {
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      query = query.lte('date', sevenDaysLater.toISOString().split('T')[0]);
    }

    // Execute query
    const { data: inventoryData, error } = await query
      .order('price', { ascending: true })
      .limit(10);

    if (error) throw error;

    // Filter by area if specified
    let matches = inventoryData || [];
    if (preference.area_name && !preference.hotel_id) {
      matches = matches.filter(item => 
        item.hotels.city === preference.area_name || 
        item.hotels.prefecture === preference.area_name
      );
    }

    // Check for already notified matches
    const matchIds = matches.map(m => m.id);
    if (matchIds.length > 0) {
      const { data: existingNotifications } = await supabase
        .from('match_notifications')
        .select('room_inventory_id')
        .eq('preference_id', preference.id)
        .in('room_inventory_id', matchIds);

      const notifiedIds = new Set(existingNotifications?.map(n => n.room_inventory_id) || []);
      matches = matches.filter(m => !notifiedIds.has(m.id));
    }

    return matches;
  } catch (error) {
    console.error(`Error finding matches for preference ${preference.id}:`, error);
    return [];
  }
}

// Create notifications for matches
async function createMatchNotifications(preference, matches) {
  const notifications = [];

  for (const match of matches) {
    const daysUntilCheckIn = Math.floor(
      (new Date(match.date) - new Date()) / (1000 * 60 * 60 * 24)
    );

    // Determine notification type
    let notificationType = 'match';
    if (daysUntilCheckIn <= 3) {
      notificationType = 'last_minute';
    } else if (match.price < (preference.min_price || 0) * 1.2) {
      notificationType = 'good_deal';
    }

    // Create notification record
    const notification = {
      preference_id: preference.id,
      user_id: preference.user_id,
      room_inventory_id: match.id,
      hotel_id: match.hotel_id,
      notification_type: notificationType,
      match_data: {
        hotel_name: match.hotels.name,
        date: match.date,
        price: match.price,
        available_rooms: match.available_rooms,
        days_until: daysUntilCheckIn
      },
      status: 'pending',
      created_at: new Date().toISOString()
    };

    notifications.push(notification);

    // Record the match to avoid duplicate notifications
    await supabase
      .from('match_notifications')
      .insert({
        preference_id: preference.id,
        room_inventory_id: match.id,
        notified_at: new Date().toISOString()
      });
  }

  // Batch insert notifications
  if (notifications.length > 0) {
    const { error } = await supabase
      .from('notifications_queue')
      .insert(notifications);

    if (error) {
      console.error('Error creating notifications:', error);
    }
  }

  return notifications;
}

// Process notifications (will be handled by email service)
async function processNotifications(notifications) {
  // Group by user
  const userNotifications = {};
  
  notifications.forEach(notif => {
    if (!userNotifications[notif.user_id]) {
      userNotifications[notif.user_id] = [];
    }
    userNotifications[notif.user_id].push(notif);
  });

  // Mark as ready for email service
  for (const userId in userNotifications) {
    await supabase
      .from('email_queue')
      .insert({
        user_id: userId,
        email_type: 'match_digest',
        notification_ids: userNotifications[userId].map(n => n.id),
        status: 'pending',
        created_at: new Date().toISOString()
      });
  }
}