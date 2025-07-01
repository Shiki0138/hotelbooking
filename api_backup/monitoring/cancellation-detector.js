import { getSupabaseClient } from '../_lib/supabase.js';
import { Resend } from 'resend';

// Real-time cancellation monitoring system
export class CancellationMonitor {
  constructor() {
    this.supabase = getSupabaseClient();
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.subscriptions = new Map();
  }
  
  // Start monitoring specific hotels
  async startMonitoring(hotelIds = []) {
    const channel = this.supabase
      .channel('cancellation-monitor')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_inventory',
          filter: hotelIds.length > 0 ? `hotel_id=in.(${hotelIds.join(',')})` : undefined
        },
        async (payload) => {
          await this.handleInventoryChange(payload);
        }
      )
      .subscribe();
    
    this.subscriptions.set('main', channel);
    
    console.log('Cancellation monitoring started');
  }
  
  // Handle inventory changes
  async handleInventoryChange(payload) {
    const { old: oldData, new: newData } = payload;
    
    // Check if availability increased (potential cancellation)
    if (newData.available_rooms > oldData.available_rooms) {
      console.log(`Cancellation detected: ${oldData.available_rooms} -> ${newData.available_rooms}`);
      
      // Create cancellation alert
      const alert = await this.createCancellationAlert({
        roomInventoryId: newData.id,
        roomTypeId: newData.room_type_id,
        date: newData.date,
        previousAvailable: oldData.available_rooms,
        currentAvailable: newData.available_rooms,
        price: newData.price
      });
      
      // Find and notify interested users
      await this.notifyInterestedUsers(alert);
    }
  }
  
  // Create cancellation alert record
  async createCancellationAlert(data) {
    const { data: alert, error } = await this.supabase
      .from('cancellation_alerts')
      .insert({
        room_inventory_id: data.roomInventoryId,
        previous_available: data.previousAvailable,
        current_available: data.currentAvailable
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create cancellation alert:', error);
      return null;
    }
    
    return { ...alert, ...data };
  }
  
  // Find users interested in this cancellation
  async findInterestedUsers(alert) {
    // Get hotel and room info
    const { data: roomInfo } = await this.supabase
      .from('room_types')
      .select('*, hotels(*)')
      .eq('id', alert.roomTypeId)
      .single();
    
    if (!roomInfo) return [];
    
    // Find matching preferences
    const { data: preferences } = await this.supabase
      .from('user_preferences')
      .select('*, user_profiles(*)')
      .eq('is_active', true)
      .eq('notify_new_availability', true)
      .or(`hotel_id.eq.${roomInfo.hotel_id},area_name.ilike.%${roomInfo.hotels.city}%`);
    
    // Filter by date and price
    return (preferences || []).filter(pref => {
      // Check date range
      if (pref.checkin_date && pref.checkout_date) {
        const prefStart = new Date(pref.checkin_date);
        const prefEnd = new Date(pref.checkout_date);
        const alertDate = new Date(alert.date);
        
        if (alertDate < prefStart || alertDate > prefEnd) {
          return false;
        }
      }
      
      // Check price range
      if (pref.max_price && alert.price > pref.max_price) {
        return false;
      }
      
      return true;
    });
  }
  
  // Send immediate notifications
  async notifyInterestedUsers(alert) {
    const users = await this.findInterestedUsers(alert);
    
    if (users.length === 0) {
      console.log('No interested users found for cancellation alert');
      return;
    }
    
    console.log(`Notifying ${users.length} users about cancellation`);
    
    // Get hotel details for the notification
    const { data: roomInfo } = await this.supabase
      .from('room_types')
      .select('*, hotels(*)')
      .eq('id', alert.roomTypeId)
      .single();
    
    const notifications = [];
    const emailPromises = [];
    
    for (const user of users) {
      // Create notification record
      notifications.push({
        user_id: user.user_id,
        type: 'cancellation',
        hotel_id: roomInfo.hotel_id,
        room_type_id: alert.roomTypeId,
        check_in_date: alert.date,
        check_out_date: new Date(new Date(alert.date).getTime() + 86400000).toISOString().split('T')[0],
        price: alert.price,
        message: `【緊急】${roomInfo.hotels.name}にキャンセルが発生しました！${alert.date} ¥${alert.price.toLocaleString()}/泊`,
        metadata: {
          room_increase: alert.currentAvailable - alert.previousAvailable,
          total_available: alert.currentAvailable,
          detected_at: new Date().toISOString()
        }
      });
      
      // Prepare email
      if (user.user_profiles.notification_enabled) {
        emailPromises.push(
          this.sendCancellationEmail(
            user.user_profiles.email,
            user.user_profiles.full_name,
            roomInfo.hotels,
            alert
          )
        );
      }
    }
    
    // Save notifications
    if (notifications.length > 0) {
      await this.supabase
        .from('notifications')
        .insert(notifications);
    }
    
    // Send emails in parallel
    await Promise.allSettled(emailPromises);
    
    // Update alert with notified count
    await this.supabase
      .from('cancellation_alerts')
      .update({ notified_users: users.length })
      .eq('id', alert.id);
    
    return users.length;
  }
  
  // Send cancellation email
  async sendCancellationEmail(email, fullName, hotel, alert) {
    const template = {
      subject: `【緊急】${hotel.name}にキャンセルが発生しました`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">キャンセル発生通知</h2>
          
          <p>${fullName}様</p>
          
          <p>ご希望のホテルにキャンセルが発生しました。<br>
          今すぐ予約することをお勧めします。</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${hotel.name}</h3>
            <p style="margin: 10px 0;">
              <strong>チェックイン日:</strong> ${alert.date}<br>
              <strong>料金:</strong> ¥${alert.price.toLocaleString()}/泊<br>
              <strong>空室数:</strong> ${alert.currentAvailable}室
            </p>
            <a href="https://lastminutestay.com/hotels/${hotel.id}?date=${alert.date}" 
               style="display: inline-block; background: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              今すぐ予約する
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            ※キャンセルによる空室は早い者勝ちです。お早めにご予約ください。
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            このメールは自動送信されています。<br>
            配信停止をご希望の場合は、マイページから設定を変更してください。
          </p>
        </div>
      `
    };
    
    try {
      await this.resend.emails.send({
        from: 'LastMinuteStay <alerts@lastminutestay.com>',
        to: email,
        subject: template.subject,
        html: template.html,
        tags: [
          { name: 'type', value: 'cancellation' },
          { name: 'hotel_id', value: hotel.id }
        ]
      });
      
      console.log(`Cancellation email sent to ${email}`);
    } catch (error) {
      console.error(`Failed to send cancellation email to ${email}:`, error);
    }
  }
  
  // Stop monitoring
  stopMonitoring() {
    for (const [key, subscription] of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
    console.log('Cancellation monitoring stopped');
  }
}

// API endpoint for manual monitoring control
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { action, hotelIds } = req.body;
  
  // Verify admin auth (implement your auth check)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const monitor = new CancellationMonitor();
    
    switch (action) {
      case 'start':
        await monitor.startMonitoring(hotelIds);
        return res.status(200).json({
          success: true,
          message: 'Cancellation monitoring started',
          hotelIds
        });
        
      case 'stop':
        monitor.stopMonitoring();
        return res.status(200).json({
          success: true,
          message: 'Cancellation monitoring stopped'
        });
        
      case 'test':
        // Test notification system
        const testAlert = {
          roomTypeId: req.body.roomTypeId,
          date: req.body.date || new Date().toISOString().split('T')[0],
          previousAvailable: 0,
          currentAvailable: 1,
          price: req.body.price || 25000
        };
        
        const notifiedCount = await monitor.notifyInterestedUsers(testAlert);
        
        return res.status(200).json({
          success: true,
          message: 'Test notification sent',
          notifiedUsers: notifiedCount
        });
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Monitoring control error:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}