const { createClient } = require('@supabase/supabase-js');
const rakutenService = require('../src/services/rakutenTravelService');
const notificationEmailService = require('./notification-email.service');

class HotelMonitorService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://demo-project.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key'
    );
  }

  /**
   * Monitor all watchlisted hotels for changes
   */
  async monitorWatchlistHotels() {
    try {
      console.log('[HotelMonitor] Starting watchlist monitoring...');
      
      // Get all active watchlist items
      const { data: watchlistItems, error } = await this.supabase
        .from('watchlist')
        .select(`
          *,
          users (
            id,
            email,
            full_name
          )
        `)
        .eq('is_active', true);

      if (error) {
        console.error('[HotelMonitor] Error fetching watchlist:', error);
        return;
      }

      console.log(`[HotelMonitor] Found ${watchlistItems.length} watchlist items to monitor`);

      // Group by hotel to avoid duplicate API calls
      const hotelGroups = this.groupByHotel(watchlistItems);

      // Process each unique hotel
      for (const [hotelKey, items] of Object.entries(hotelGroups)) {
        await this.processHotelGroup(hotelKey, items);
      }

      console.log('[HotelMonitor] Monitoring completed');
    } catch (error) {
      console.error('[HotelMonitor] Fatal error:', error);
    }
  }

  /**
   * Group watchlist items by hotel to optimize API calls
   */
  groupByHotel(watchlistItems) {
    const groups = {};
    
    for (const item of watchlistItems) {
      const key = `${item.hotel_id}_${item.check_in}_${item.check_out}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    
    return groups;
  }

  /**
   * Process a group of watchlist items for the same hotel
   */
  async processHotelGroup(hotelKey, items) {
    try {
      const firstItem = items[0];
      const { hotel_id, check_in, check_out } = firstItem;

      console.log(`[HotelMonitor] Processing hotel ${hotel_id} for ${check_in} to ${check_out}`);

      // Get current hotel data from Rakuten
      const currentData = await this.fetchHotelData(hotel_id, check_in, check_out);
      
      if (!currentData) {
        console.log(`[HotelMonitor] No data available for hotel ${hotel_id}`);
        return;
      }

      // Get previous monitoring data
      const previousData = await this.getPreviousMonitoringData(hotel_id, check_in, check_out);

      // Detect changes
      const changes = this.detectChanges(previousData, currentData);

      // Save current data as history
      await this.saveMonitoringHistory(hotel_id, check_in, check_out, currentData);

      // Process notifications if there are significant changes
      if (changes.hasSignificantChanges) {
        await this.processNotifications(items, changes, currentData);
      }

    } catch (error) {
      console.error(`[HotelMonitor] Error processing hotel group ${hotelKey}:`, error);
    }
  }

  /**
   * Fetch current hotel data from Rakuten API
   */
  async fetchHotelData(hotelId, checkIn, checkOut) {
    try {
      // Search for specific hotel
      const searchParams = {
        hotelNo: hotelId,
        checkinDate: checkIn,
        checkoutDate: checkOut,
        adultNum: 2,
        page: 1,
        hits: 1
      };

      const response = await rakutenService.searchHotels(searchParams);
      
      if (!response.hotels || response.hotels.length === 0) {
        return null;
      }

      const hotel = response.hotels[0];
      
      // Extract pricing and availability data
      const roomTypes = hotel.hotel?.[0]?.hotelRoomInfo || [];
      const availableRooms = roomTypes.filter(room => 
        room.roomInfo?.[0]?.roomCharge && 
        room.roomInfo[0].availability > 0
      );

      const lowestPrice = availableRooms.length > 0
        ? Math.min(...availableRooms.map(room => room.roomInfo[0].roomCharge))
        : null;

      return {
        hotelId,
        hotelName: hotel.hotel?.[0]?.hotelBasicInfo?.hotelName || 'Unknown Hotel',
        isAvailable: availableRooms.length > 0,
        lowestPrice,
        totalRooms: roomTypes.length,
        availableRoomTypes: availableRooms.length,
        roomDetails: availableRooms.map(room => ({
          roomName: room.roomInfo?.[0]?.roomName || 'Standard Room',
          price: room.roomInfo?.[0]?.roomCharge || 0,
          availability: room.roomInfo?.[0]?.availability || 0
        })),
        imageUrl: hotel.hotel?.[0]?.hotelBasicInfo?.hotelImageUrl || null,
        hotelUrl: hotel.hotel?.[0]?.hotelBasicInfo?.hotelInformationUrl || null
      };
    } catch (error) {
      console.error(`[HotelMonitor] Error fetching hotel data for ${hotelId}:`, error);
      return null;
    }
  }

  /**
   * Get previous monitoring data for comparison
   */
  async getPreviousMonitoringData(hotelId, checkIn, checkOut) {
    const { data, error } = await this.supabase
      .from('hotel_monitoring_history')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('check_in', checkIn)
      .eq('check_out', checkOut)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[HotelMonitor] Error fetching previous data:', error);
    }

    return data?.monitoring_data || null;
  }

  /**
   * Detect changes between previous and current data
   */
  detectChanges(previousData, currentData) {
    const changes = {
      hasSignificantChanges: false,
      availabilityChanged: false,
      priceDropped: false,
      priceDropPercentage: 0,
      newlyAvailable: false,
      newRoomsAvailable: [],
      removedRooms: []
    };

    // No previous data means this is the first check
    if (!previousData) {
      changes.hasSignificantChanges = currentData.isAvailable;
      changes.newlyAvailable = currentData.isAvailable;
      return changes;
    }

    // Check availability changes
    if (!previousData.isAvailable && currentData.isAvailable) {
      changes.availabilityChanged = true;
      changes.newlyAvailable = true;
      changes.hasSignificantChanges = true;
    }

    // Check price drops (10% or more)
    if (previousData.lowestPrice && currentData.lowestPrice) {
      const priceDiff = previousData.lowestPrice - currentData.lowestPrice;
      const dropPercentage = (priceDiff / previousData.lowestPrice) * 100;
      
      if (dropPercentage >= 10) {
        changes.priceDropped = true;
        changes.priceDropPercentage = Math.round(dropPercentage);
        changes.hasSignificantChanges = true;
      }
    }

    // Check for new room types
    const previousRoomNames = new Set(
      (previousData.roomDetails || []).map(r => r.roomName)
    );
    const currentRoomNames = new Set(
      (currentData.roomDetails || []).map(r => r.roomName)
    );

    for (const roomName of currentRoomNames) {
      if (!previousRoomNames.has(roomName)) {
        changes.newRoomsAvailable.push(roomName);
        changes.hasSignificantChanges = true;
      }
    }

    return changes;
  }

  /**
   * Save monitoring data to history
   */
  async saveMonitoringHistory(hotelId, checkIn, checkOut, monitoringData) {
    const { error } = await this.supabase
      .from('hotel_monitoring_history')
      .insert({
        hotel_id: hotelId,
        check_in: checkIn,
        check_out: checkOut,
        monitoring_data: monitoringData,
        is_available: monitoringData.isAvailable,
        lowest_price: monitoringData.lowestPrice
      });

    if (error) {
      console.error('[HotelMonitor] Error saving monitoring history:', error);
    }
  }

  /**
   * Process and queue notifications for users
   */
  async processNotifications(watchlistItems, changes, currentData) {
    console.log(`[HotelMonitor] Processing notifications for ${watchlistItems.length} users`);

    for (const item of watchlistItems) {
      try {
        // Check user notification preferences
        const preferences = await this.getUserNotificationPreferences(item.user_id);
        
        if (!preferences || !preferences.email_notifications) {
          continue;
        }

        // Determine notification type
        let notificationType = null;
        let subject = '';
        let priority = 'normal';

        if (changes.newlyAvailable && preferences.availability_alerts) {
          notificationType = 'availability';
          subject = `${currentData.hotelName} is now available!`;
          priority = 'high';
        } else if (changes.priceDropped && preferences.price_drop_alerts) {
          notificationType = 'price_drop';
          subject = `${changes.priceDropPercentage}% price drop at ${currentData.hotelName}`;
          priority = 'high';
        }

        if (notificationType) {
          await this.queueNotification({
            userId: item.user_id,
            userEmail: item.users.email,
            userName: item.users.full_name,
            watchlistId: item.id,
            hotelId: item.hotel_id,
            hotelName: currentData.hotelName,
            checkIn: item.check_in,
            checkOut: item.check_out,
            notificationType,
            subject,
            priority,
            changes,
            currentData
          });
        }

      } catch (error) {
        console.error(`[HotelMonitor] Error processing notification for user ${item.user_id}:`, error);
      }
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId) {
    const { data, error } = await this.supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[HotelMonitor] Error fetching preferences:', error);
    }

    // Return default preferences if none exist
    return data || {
      email_notifications: true,
      availability_alerts: true,
      price_drop_alerts: true
    };
  }

  /**
   * Queue notification for email dispatch
   */
  async queueNotification(notificationData) {
    const { error } = await this.supabase
      .from('notification_queue')
      .insert({
        user_id: notificationData.userId,
        notification_type: notificationData.notificationType,
        priority: notificationData.priority,
        subject: notificationData.subject,
        data: notificationData,
        status: 'pending'
      });

    if (error) {
      console.error('[HotelMonitor] Error queuing notification:', error);
    } else {
      console.log(`[HotelMonitor] Queued ${notificationData.notificationType} notification for ${notificationData.userEmail}`);
    }
  }

  /**
   * Process pending notifications from queue
   */
  async processPendingNotifications() {
    try {
      // Get pending notifications
      const { data: notifications, error } = await this.supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[HotelMonitor] Error fetching notifications:', error);
        return;
      }

      console.log(`[HotelMonitor] Processing ${notifications.length} pending notifications`);

      for (const notification of notifications) {
        await this.sendNotification(notification);
      }

    } catch (error) {
      console.error('[HotelMonitor] Error processing notifications:', error);
    }
  }

  /**
   * Send individual notification
   */
  async sendNotification(notification) {
    try {
      const { data } = notification;

      // Mark as processing
      await this.supabase
        .from('notification_queue')
        .update({ status: 'processing' })
        .eq('id', notification.id);

      // Send email based on type
      let emailSent = false;
      
      if (data.notificationType === 'availability') {
        emailSent = await notificationEmailService.sendAvailabilityAlert(data);
      } else if (data.notificationType === 'price_drop') {
        emailSent = await notificationEmailService.sendDiscountAlert(data);
      }

      // Update status
      await this.supabase
        .from('notification_queue')
        .update({ 
          status: emailSent ? 'sent' : 'failed',
          processed_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      console.log(`[HotelMonitor] Notification ${notification.id} ${emailSent ? 'sent' : 'failed'}`);

    } catch (error) {
      console.error(`[HotelMonitor] Error sending notification ${notification.id}:`, error);
      
      // Mark as failed
      await this.supabase
        .from('notification_queue')
        .update({ 
          status: 'failed',
          error_message: error.message,
          processed_at: new Date().toISOString()
        })
        .eq('id', notification.id);
    }
  }
}

module.exports = new HotelMonitorService();