import { createClient } from '@supabase/supabase-js';

class RealtimeService {
  constructor() {
    this.supabase = null;
    this.subscriptions = new Map();
    this.callbacks = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Initialize Supabase client
  initialize(supabaseUrl, supabaseAnonKey) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }

  // Subscribe to hotel inventory updates
  subscribeToHotel(hotelId, callback) {
    const channelName = `hotel_${hotelId}`;
    
    if (this.subscriptions.has(channelName)) {
      console.log(`Already subscribed to ${channelName}`);
      return;
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_inventory',
          filter: `hotel_id=eq.${hotelId}`
        },
        (payload) => {
          console.log('Inventory update:', payload);
          this.handleInventoryUpdate(hotelId, payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_inventory',
          filter: `hotel_id=eq.${hotelId}`
        },
        (payload) => {
          // Check for price changes
          if (payload.old.price !== payload.new.price) {
            this.handlePriceChange(hotelId, payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${channelName}`);
          this.reconnectAttempts = 0;
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to ${channelName}`);
          this.handleReconnect(hotelId);
        }
      });

    this.subscriptions.set(channelName, channel);
    this.callbacks.set(hotelId, callback);
  }

  // Subscribe to area updates
  subscribeToArea(area, callback) {
    const channelName = `area_${area.replace(/\s+/g, '_')}`;
    
    if (this.subscriptions.has(channelName)) {
      return;
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_inventory'
        },
        async (payload) => {
          // Check if hotel is in the specified area
          const hotel = await this.getHotelInfo(payload.new.hotel_id);
          if (hotel && (hotel.city === area || hotel.prefecture === area)) {
            this.handleAreaUpdate(area, payload, hotel);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    this.callbacks.set(area, callback);
  }

  // Handle inventory updates
  handleInventoryUpdate(hotelId, payload) {
    const callback = this.callbacks.get(hotelId);
    if (callback) {
      const updateInfo = {
        type: 'inventory_update',
        hotelId,
        date: payload.new.date,
        availableRooms: payload.new.available_rooms,
        previousAvailable: payload.old?.available_rooms,
        price: payload.new.price,
        timestamp: new Date().toISOString()
      };

      // Check if this is a new availability (cancellation)
      if (payload.old?.available_rooms === 0 && payload.new.available_rooms > 0) {
        updateInfo.type = 'new_availability';
        updateInfo.isCancellation = true;
      }

      callback(updateInfo);
    }
  }

  // Handle price changes
  handlePriceChange(hotelId, payload) {
    const callback = this.callbacks.get(hotelId);
    if (callback) {
      const priceChange = {
        type: 'price_change',
        hotelId,
        date: payload.new.date,
        oldPrice: payload.old.price,
        newPrice: payload.new.price,
        changeAmount: payload.new.price - payload.old.price,
        changePercentage: ((payload.new.price - payload.old.price) / payload.old.price) * 100,
        timestamp: new Date().toISOString()
      };

      callback(priceChange);
    }
  }

  // Handle area updates
  handleAreaUpdate(area, payload, hotel) {
    const callback = this.callbacks.get(area);
    if (callback) {
      callback({
        type: 'area_update',
        area,
        hotel: {
          id: hotel.id,
          name: hotel.name,
          address: hotel.address
        },
        inventory: payload.new,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get hotel information
  async getHotelInfo(hotelId) {
    const { data, error } = await this.supabase
      .from('hotels')
      .select('*')
      .eq('id', hotelId)
      .single();

    if (error) {
      console.error('Error fetching hotel info:', error);
      return null;
    }

    return data;
  }

  // Auto-refresh every 5 minutes
  startAutoRefresh(hotelIds = []) {
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      console.log('Auto-refreshing hotel data...');
      
      for (const hotelId of hotelIds) {
        try {
          const { data, error } = await this.supabase
            .from('room_inventory')
            .select('*')
            .eq('hotel_id', hotelId)
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true })
            .limit(7); // Next 7 days

          if (!error && data) {
            const callback = this.callbacks.get(hotelId);
            if (callback) {
              callback({
                type: 'auto_refresh',
                hotelId,
                inventory: data,
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error(`Error refreshing hotel ${hotelId}:`, error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Stop auto-refresh
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Unsubscribe from updates
  unsubscribe(channelName) {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(channelName);
      
      // Remove callback
      const id = channelName.replace(/^(hotel_|area_)/, '');
      this.callbacks.delete(id);
    }
  }

  // Unsubscribe from all
  unsubscribeAll() {
    this.subscriptions.forEach((subscription, channelName) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
    this.callbacks.clear();
    this.stopAutoRefresh();
  }

  // Handle reconnection
  handleReconnect(hotelId) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        const callback = this.callbacks.get(hotelId);
        if (callback) {
          this.unsubscribe(`hotel_${hotelId}`);
          this.subscribeToHotel(hotelId, callback);
        }
      }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)); // Exponential backoff
    } else {
      console.error('Max reconnection attempts reached');
      const callback = this.callbacks.get(hotelId);
      if (callback) {
        callback({
          type: 'connection_error',
          hotelId,
          message: '接続が切断されました。ページを更新してください。'
        });
      }
    }
  }
}

// Export singleton instance
export default new RealtimeService();