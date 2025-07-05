import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

interface WatchlistItem {
  id?: string;
  user_id: string;
  hotel_id: string;
  room_id?: string;
  watch_type: 'price' | 'availability' | 'both';
  target_price?: number;
  price_threshold_percentage?: number;
  watch_dates?: string;
  weekend_only?: boolean;
  notification_channels: string[];
  notification_frequency: 'immediate' | 'daily' | 'weekly';
  is_active?: boolean;
  expires_at?: string;
  initial_price?: number;
}

interface WatchlistNotification {
  watchlist_item_id: string;
  channel: 'email' | 'sms' | 'push' | 'line';
  recipient: string;
  subject?: string;
  message: string;
  hotel_name?: string;
  room_name?: string;
  original_price?: number;
  current_price?: number;
  discount_percentage?: number;
  available_dates?: string[];
}

/**
 * Get user's watchlist items
 */
export const getWatchlistItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { active_only = 'true', limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    let query = supabaseAdmin
      .from('watchlist_items')
      .select(`
        *,
        hotels (
          id,
          name,
          city,
          price,
          image_url
        ),
        rooms (
          id,
          name,
          price,
          max_occupancy
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Error fetching watchlist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch watchlist items'
      });
    }

    res.json({
      success: true,
      data,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: data?.length || 0
      }
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
 * Create a new watchlist item
 */
export const createWatchlistItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const {
      hotel_id,
      room_id,
      watch_type = 'price',
      target_price,
      price_threshold_percentage,
      watch_dates,
      weekend_only = false,
      notification_channels = ['email'],
      notification_frequency = 'immediate',
      expires_at,
      initial_price
    } = req.body;

    // Validate required fields
    if (!hotel_id) {
      return res.status(400).json({
        success: false,
        message: 'hotel_id is required'
      });
    }

    // Validate watch criteria
    if (watch_type === 'price' || watch_type === 'both') {
      if (!target_price && !price_threshold_percentage) {
        return res.status(400).json({
          success: false,
          message: 'Either target_price or price_threshold_percentage is required for price watching'
        });
      }
    }

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('watchlist_items')
      .select('id')
      .eq('user_id', userId)
      .eq('hotel_id', hotel_id)
      .eq('is_active', true)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This hotel is already in your active watchlist'
      });
    }

    // Create watchlist item
    const watchlistItem: WatchlistItem = {
      user_id: userId,
      hotel_id,
      room_id,
      watch_type,
      target_price,
      price_threshold_percentage,
      watch_dates,
      weekend_only,
      notification_channels,
      notification_frequency,
      expires_at,
      initial_price,
      is_active: true
    };

    const { data, error } = await supabaseAdmin
      .from('watchlist_items')
      .insert(watchlistItem)
      .select()
      .single();

    if (error) {
      console.error('Error creating watchlist item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create watchlist item'
      });
    }

    res.status(201).json({
      success: true,
      data,
      message: 'Added to watchlist successfully'
    });
  } catch (error) {
    console.error('Create watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Update a watchlist item
 */
export const updateWatchlistItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const updateData: Partial<WatchlistItem> = {};
    const allowedFields = [
      'watch_type',
      'target_price',
      'price_threshold_percentage',
      'watch_dates',
      'weekend_only',
      'notification_channels',
      'notification_frequency',
      'is_active',
      'expires_at'
    ];

    // Only include fields that were provided
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field as keyof WatchlistItem] = req.body[field];
      }
    });

    const { data, error } = await supabaseAdmin
      .from('watchlist_items')
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
      message: 'Watchlist item updated successfully'
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
 * Delete a watchlist item
 */
export const deleteWatchlistItem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { error } = await supabaseAdmin
      .from('watchlist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting watchlist item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete watchlist item'
      });
    }

    res.json({
      success: true,
      message: 'Removed from watchlist successfully'
    });
  } catch (error) {
    console.error('Delete watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Create multiple watchlist items at once
 */
export const createBatchWatchlistItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    // Add user_id to all items
    const watchlistItems = items.map(item => ({
      ...item,
      user_id: userId,
      is_active: true
    }));

    const { data, error } = await supabaseAdmin
      .from('watchlist_items')
      .insert(watchlistItems)
      .select();

    if (error) {
      console.error('Error creating batch watchlist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create watchlist items'
      });
    }

    res.status(201).json({
      success: true,
      data,
      message: `${data.length} items added to watchlist`
    });
  } catch (error) {
    console.error('Batch create error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Delete multiple watchlist items at once
 */
export const deleteBatchWatchlistItems = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ids } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs array is required'
      });
    }

    const { error } = await supabaseAdmin
      .from('watchlist_items')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting batch:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete watchlist items'
      });
    }

    res.json({
      success: true,
      message: `${ids.length} items removed from watchlist`
    });
  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get price history for a watchlist item
 */
export const getPriceHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Verify ownership
    const { data: watchlistItem } = await supabaseAdmin
      .from('watchlist_items')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!watchlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Watchlist item not found'
      });
    }

    // Get price history
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const { data, error } = await supabaseAdmin
      .from('watchlist_price_history')
      .select('*')
      .eq('watchlist_item_id', id)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching price history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch price history'
      });
    }

    res.json({
      success: true,
      data,
      meta: {
        days: Number(days),
        count: data?.length || 0
      }
    });
  } catch (error) {
    console.error('Price history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get watchlist notifications
 */
export const getWatchlistNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status = 'all', limit = 50, offset = 0 } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    let query = supabaseAdmin
      .from('watchlist_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }

    res.json({
      success: true,
      data,
      pagination: {
        limit: Number(limit),
        offset: Number(offset)
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
 * Mark notification as read
 */
export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('watchlist_notifications')
      .update({ status: 'sent' })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating notification:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update notification'
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get watchlist analytics
 */
export const getWatchlistAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get watchlist stats
    const { data: watchlistItems } = await supabaseAdmin
      .from('watchlist_items')
      .select('*')
      .eq('user_id', userId);

    const activeItems = watchlistItems?.filter(item => item.is_active) || [];
    const totalSavings = activeItems.reduce((sum, item) => {
      if (item.initial_price && item.lowest_price_seen) {
        return sum + (item.initial_price - item.lowest_price_seen);
      }
      return sum;
    }, 0);

    // Get notification stats
    const { data: notifications } = await supabaseAdmin
      .from('watchlist_notifications')
      .select('status')
      .eq('user_id', userId);

    const notificationStats = notifications?.reduce((acc, notif) => {
      acc[notif.status] = (acc[notif.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    res.json({
      success: true,
      data: {
        watchlist: {
          total: watchlistItems?.length || 0,
          active: activeItems.length,
          inactive: (watchlistItems?.length || 0) - activeItems.length,
          totalSavings: Math.round(totalSavings)
        },
        notifications: {
          total: notifications?.length || 0,
          ...notificationStats
        },
        averageDiscount: activeItems.length > 0 
          ? Math.round(activeItems.reduce((sum, item) => {
              if (item.initial_price && item.lowest_price_seen) {
                return sum + ((item.initial_price - item.lowest_price_seen) / item.initial_price * 100);
              }
              return sum;
            }, 0) / activeItems.length)
          : 0
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Trigger price check (development only)
 */
export const triggerPriceCheck = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { watchlist_item_id } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // This would normally trigger the WatchlistMonitorService
    // For now, we'll just return a success response
    res.json({
      success: true,
      message: 'Price check triggered (development mode)'
    });
  } catch (error) {
    console.error('Trigger check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};