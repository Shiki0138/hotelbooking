const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://demo-project.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key'
);

/**
 * Get user's watchlist
 */
exports.getWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: watchlist, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching watchlist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch watchlist'
      });
    }

    res.json({
      success: true,
      data: watchlist
    });
  } catch (error) {
    console.error('Watchlist fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Add hotel to watchlist
 */
exports.addToWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      hotel_id,
      hotel_name,
      check_in,
      check_out,
      guests_count = 2,
      target_price
    } = req.body;

    // Validate required fields
    if (!hotel_id || !hotel_name || !check_in || !check_out) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate dates
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }

    // Check if already exists
    const { data: existing, error: checkError } = await supabase
      .from('watchlist')
      .select('id')
      .eq('user_id', userId)
      .eq('hotel_id', hotel_id)
      .eq('check_in', check_in)
      .eq('check_out', check_out)
      .single();

    if (existing && !checkError) {
      return res.status(409).json({
        success: false,
        message: 'This hotel is already in your watchlist for these dates'
      });
    }

    // Add to watchlist
    const { data, error } = await supabase
      .from('watchlist')
      .insert({
        user_id: userId,
        hotel_id,
        hotel_name,
        check_in,
        check_out,
        guests_count,
        target_price,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding to watchlist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add to watchlist'
      });
    }

    // Ensure user has notification preferences
    await ensureNotificationPreferences(userId);

    res.status(201).json({
      success: true,
      data,
      message: 'Added to watchlist successfully'
    });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update watchlist item
 */
exports.updateWatchlistItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { target_price, is_active } = req.body;

    const updateData = {};
    if (target_price !== undefined) updateData.target_price = target_price;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('watchlist')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating watchlist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update watchlist item'
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Watchlist item not found'
      });
    }

    res.json({
      success: true,
      data,
      message: 'Watchlist updated successfully'
    });
  } catch (error) {
    console.error('Update watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Remove from watchlist
 */
exports.removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing from watchlist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove from watchlist'
      });
    }

    res.json({
      success: true,
      message: 'Removed from watchlist successfully'
    });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get notification preferences
 */
exports.getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching preferences:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch notification preferences'
      });
    }

    // Return default preferences if none exist
    const preferences = data || {
      email_notifications: true,
      availability_alerts: true,
      price_drop_alerts: true,
      price_drop_threshold: 10,
      booking_reminders: true
    };

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update notification preferences
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      email_notifications,
      availability_alerts,
      price_drop_alerts,
      price_drop_threshold,
      booking_reminders
    } = req.body;

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('user_notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    const preferencesData = {
      email_notifications,
      availability_alerts,
      price_drop_alerts,
      price_drop_threshold,
      booking_reminders
    };

    if (existing) {
      // Update existing preferences
      result = await supabase
        .from('user_notification_preferences')
        .update(preferencesData)
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // Create new preferences
      result = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: userId,
          ...preferencesData
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating preferences:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update notification preferences'
      });
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get notification history
 */
exports.getNotificationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Get notifications from queue
    const { data: notifications, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch notification history'
      });
    }

    res.json({
      success: true,
      data: notifications,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Ensure user has notification preferences
 */
async function ensureNotificationPreferences(userId) {
  try {
    const { data: existing } = await supabase
      .from('user_notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existing) {
      await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: userId,
          email_notifications: true,
          availability_alerts: true,
          price_drop_alerts: true,
          price_drop_threshold: 10,
          booking_reminders: true
        });
    }
  } catch (error) {
    console.error('Error ensuring notification preferences:', error);
  }
}