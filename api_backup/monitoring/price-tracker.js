import { getSupabaseClient } from '../_lib/supabase.js';
import { Resend } from 'resend';
import { HotelSearchAggregator } from '../_lib/hotel-apis/index.js';

// Price tracking and notification system
export class PriceTracker {
  constructor() {
    this.supabase = getSupabaseClient();
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.aggregator = new HotelSearchAggregator({
      rakuten: process.env.RAKUTEN_API_KEY,
      jalan: process.env.JALAN_API_KEY,
      booking: process.env.RAPIDAPI_KEY,
      amadeus: {
        clientId: process.env.AMADEUS_CLIENT_ID,
        clientSecret: process.env.AMADEUS_CLIENT_SECRET
      }
    });
  }
  
  // Track price changes for monitored hotels
  async trackPriceChanges() {
    console.log('Starting price tracking...');
    
    // Get hotels with active monitoring
    const { data: monitoredHotels } = await this.supabase
      .from('hotels')
      .select('*, room_types(*)')
      .in('hotel_type', ['luxury', 'resort'])
      .order('stars', { ascending: false });
    
    if (!monitoredHotels || monitoredHotels.length === 0) {
      console.log('No hotels to monitor');
      return;
    }
    
    const priceChanges = [];
    const dates = this.getCheckDates(); // Next 30 days
    
    for (const hotel of monitoredHotels) {
      try {
        const changes = await this.checkHotelPrices(hotel, dates);
        priceChanges.push(...changes);
      } catch (error) {
        console.error(`Error checking prices for ${hotel.name}:`, error);
      }
    }
    
    // Process significant price drops
    const significantDrops = priceChanges.filter(
      change => change.changePercentage <= -10 // 10% or more discount
    );
    
    if (significantDrops.length > 0) {
      await this.notifyPriceDrops(significantDrops);
    }
    
    return {
      totalChecked: monitoredHotels.length,
      priceChanges: priceChanges.length,
      significantDrops: significantDrops.length
    };
  }
  
  // Get dates to check (next 30 days)
  getCheckDates() {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  }
  
  // Check prices for a specific hotel
  async checkHotelPrices(hotel, dates) {
    const changes = [];
    
    // Get current prices from database
    const { data: currentPrices } = await this.supabase
      .from('room_inventory')
      .select('*')
      .in('room_type_id', hotel.room_types.map(rt => rt.id))
      .in('date', dates);
    
    // Create a map for easy lookup
    const priceMap = new Map();
    currentPrices?.forEach(price => {
      priceMap.set(`${price.room_type_id}_${price.date}`, price);
    });
    
    // Check live prices from APIs
    for (const date of dates.slice(0, 7)) { // Check first week only to limit API calls
      try {
        const searchParams = {
          checkIn: date,
          checkOut: new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0],
          hotelId: hotel.external_ids?.rakuten || hotel.id,
          city: hotel.city
        };
        
        const results = await this.aggregator.searchAllSources(searchParams);
        
        // Find matching hotel in results
        const matchingHotel = results.hotels.find(h => 
          h.name.includes(hotel.name) || hotel.name.includes(h.name)
        );
        
        if (matchingHotel && matchingHotel.lowestPrice) {
          const roomTypeId = hotel.room_types[0]?.id; // Use first room type
          const key = `${roomTypeId}_${date}`;
          const currentPrice = priceMap.get(key);
          
          if (currentPrice && matchingHotel.lowestPrice !== currentPrice.price) {
            const changePercentage = ((matchingHotel.lowestPrice - currentPrice.price) / currentPrice.price) * 100;
            
            changes.push({
              hotelId: hotel.id,
              hotelName: hotel.name,
              roomTypeId,
              date,
              oldPrice: currentPrice.price,
              newPrice: matchingHotel.lowestPrice,
              changeAmount: matchingHotel.lowestPrice - currentPrice.price,
              changePercentage,
              sources: matchingHotel.sources
            });
            
            // Update database with new price
            await this.updatePrice(roomTypeId, date, matchingHotel.lowestPrice, currentPrice.price);
          }
        }
      } catch (error) {
        console.error(`Error checking price for ${hotel.name} on ${date}:`, error);
      }
    }
    
    return changes;
  }
  
  // Update price in database
  async updatePrice(roomTypeId, date, newPrice, oldPrice) {
    // Update inventory
    await this.supabase
      .from('room_inventory')
      .update({
        price: newPrice,
        original_price: oldPrice,
        last_checked_at: new Date().toISOString()
      })
      .eq('room_type_id', roomTypeId)
      .eq('date', date);
    
    // Record in price history
    await this.supabase
      .from('price_history')
      .insert({
        room_type_id: roomTypeId,
        date,
        price: newPrice,
        previous_price: oldPrice,
        change_percentage: ((newPrice - oldPrice) / oldPrice) * 100
      });
  }
  
  // Notify users about price drops
  async notifyPriceDrops(priceDrops) {
    // Group by hotel to avoid multiple notifications
    const dropsByHotel = new Map();
    
    priceDrops.forEach(drop => {
      if (!dropsByHotel.has(drop.hotelId)) {
        dropsByHotel.set(drop.hotelId, []);
      }
      dropsByHotel.get(drop.hotelId).push(drop);
    });
    
    for (const [hotelId, drops] of dropsByHotel) {
      // Find interested users
      const { data: preferences } = await this.supabase
        .from('user_preferences')
        .select('*, user_profiles(*)')
        .eq('is_active', true)
        .eq('notify_price_drop', true)
        .or(`hotel_id.eq.${hotelId},preference_type.eq.area`);
      
      if (!preferences || preferences.length === 0) continue;
      
      // Find best deal
      const bestDeal = drops.reduce((best, current) => 
        current.changePercentage < best.changePercentage ? current : best
      );
      
      // Create notifications
      const notifications = [];
      const emailPromises = [];
      
      for (const pref of preferences) {
        // Check if price is within user's range
        if (pref.max_price && bestDeal.newPrice > pref.max_price) continue;
        
        notifications.push({
          user_id: pref.user_id,
          type: 'price_drop',
          hotel_id: hotelId,
          room_type_id: bestDeal.roomTypeId,
          check_in_date: bestDeal.date,
          price: bestDeal.newPrice,
          previous_price: bestDeal.oldPrice,
          message: `【値下げ】${bestDeal.hotelName} ${Math.abs(bestDeal.changePercentage).toFixed(0)}%OFF！¥${bestDeal.newPrice.toLocaleString()}/泊`,
          metadata: {
            discount_percentage: Math.abs(bestDeal.changePercentage),
            price_drop_amount: Math.abs(bestDeal.changeAmount),
            total_drops: drops.length
          }
        });
        
        if (pref.user_profiles.notification_enabled) {
          emailPromises.push(
            this.sendPriceDropEmail(
              pref.user_profiles.email,
              pref.user_profiles.full_name,
              bestDeal,
              drops
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
      
      // Send emails
      await Promise.allSettled(emailPromises);
    }
  }
  
  // Send price drop email
  async sendPriceDropEmail(email, fullName, bestDeal, allDrops) {
    const dateList = allDrops
      .slice(0, 5)
      .map(d => `${d.date}: ¥${d.oldPrice.toLocaleString()} → ¥${d.newPrice.toLocaleString()}`)
      .join('<br>');
    
    const template = {
      subject: `【値下げ通知】${bestDeal.hotelName} 最大${Math.abs(bestDeal.changePercentage).toFixed(0)}%OFF`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f57c00;">お得な値下げ情報</h2>
          
          <p>${fullName}様</p>
          
          <p>ご希望のホテルで大幅な値下げがありました！</p>
          
          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #e65100;">${bestDeal.hotelName}</h3>
            
            <div style="font-size: 24px; color: #d32f2f; margin: 15px 0;">
              最大 ${Math.abs(bestDeal.changePercentage).toFixed(0)}% OFF
            </div>
            
            <p><strong>値下げ対象日:</strong></p>
            <div style="background: white; padding: 10px; border-radius: 4px;">
              ${dateList}
            </div>
            
            <a href="https://lastminutestay.com/hotels/${bestDeal.hotelId}" 
               style="display: inline-block; background: #f57c00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px;">
              詳細を見る
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            ※価格は変動する可能性があります。お早めにご確認ください。
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            価格追跡: ${bestDeal.sources.join(', ')}<br>
            このメールは自動送信されています。
          </p>
        </div>
      `
    };
    
    try {
      await this.resend.emails.send({
        from: 'LastMinuteStay <deals@lastminutestay.com>',
        to: email,
        subject: template.subject,
        html: template.html,
        tags: [
          { name: 'type', value: 'price_drop' },
          { name: 'hotel_id', value: bestDeal.hotelId },
          { name: 'discount', value: Math.abs(bestDeal.changePercentage).toFixed(0) }
        ]
      });
    } catch (error) {
      console.error(`Failed to send price drop email to ${email}:`, error);
    }
  }
}

// Vercel Cron configuration
export const config = {
  schedule: '0 */6 * * *' // Run every 6 hours
};

// Cron job handler
export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log('Starting price tracking cron job...');
  
  try {
    const tracker = new PriceTracker();
    const results = await tracker.trackPriceChanges();
    
    console.log('Price tracking completed:', results);
    
    return res.status(200).json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Price tracking error:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}