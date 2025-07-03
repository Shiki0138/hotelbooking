// Real-Time Hotel Controller
// Handles vacant hotel searches, detailed information, and price monitoring

const rakutenRealTime = require('../services/rakutenRealTimeService');
const { supabase } = require('../config/supabase');
const { validationResult } = require('express-validator');

class RealTimeHotelController {
  constructor() {
    this.priceAlerts = new Map();
    console.log('🏨 Real-Time Hotel Controller initialized');
  }

  // Search for vacant hotels with real availability
  async searchVacantHotels(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        checkinDate,
        checkoutDate,
        latitude,
        longitude,
        searchRadius = 3,
        adultNum = 2,
        roomNum = 1,
        maxCharge,
        minCharge,
        hotelType,
        onsenFlag,
        sortType = 'standard',
        page = 1,
        hits = 30
      } = req.query;

      // Validate required parameters
      if (!checkinDate || !checkoutDate) {
        return res.status(400).json({
          success: false,
          error: 'Check-in and check-out dates are required'
        });
      }

      // If no location provided, default to Tokyo Station
      const searchParams = {
        checkinDate,
        checkoutDate,
        latitude: latitude || 35.6812,
        longitude: longitude || 139.7671,
        searchRadius,
        adultNum: parseInt(adultNum),
        roomNum: parseInt(roomNum),
        maxCharge: maxCharge ? parseInt(maxCharge) : undefined,
        minCharge: minCharge ? parseInt(minCharge) : undefined,
        hotelType,
        onsenFlag: onsenFlag === 'true',
        sortType,
        page: parseInt(page),
        hits: parseInt(hits)
      };

      console.log('🔍 Searching vacant hotels:', searchParams);

      const startTime = Date.now();
      const results = await rakutenRealTime.searchVacantHotels(searchParams);
      const searchTime = Date.now() - startTime;

      // Track search for user if authenticated
      if (req.user) {
        this.trackUserSearch(req.user.id, searchParams, results.total);
      }

      // Format response with additional metadata
      const response = {
        success: true,
        data: {
          hotels: results.hotels,
          pagination: {
            total: results.total,
            page: results.page,
            pageCount: results.pageCount,
            first: results.first,
            last: results.last,
            hasMore: results.page < results.pageCount
          },
          searchParams,
          searchTime,
          timestamp: new Date().toISOString(),
          isFallback: results.isFallback || false
        }
      };

      res.json(response);

    } catch (error) {
      console.error('❌ Vacant hotel search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error.message
      });
    }
  }

  // Get detailed hotel information with room plans
  async getHotelDetail(req, res) {
    try {
      const { hotelNo } = req.params;
      const {
        checkinDate,
        checkoutDate,
        adultNum = 2,
        roomNum = 1
      } = req.query;

      if (!hotelNo) {
        return res.status(400).json({
          success: false,
          error: 'Hotel number is required'
        });
      }

      console.log('🏨 Fetching hotel detail:', hotelNo);

      const startTime = Date.now();
      const hotelDetail = await rakutenRealTime.getHotelDetail(hotelNo, {
        checkinDate,
        checkoutDate,
        adultNum: parseInt(adultNum),
        roomNum: parseInt(roomNum)
      });
      const fetchTime = Date.now() - startTime;

      // Get price history if available
      const priceHistory = await this.getHotelPriceHistory(hotelNo);

      // Check if user has this hotel in watchlist
      let isWatching = false;
      if (req.user) {
        isWatching = await this.checkWatchlistStatus(req.user.id, hotelNo);
      }

      res.json({
        success: true,
        data: {
          hotel: hotelDetail,
          priceHistory,
          isWatching,
          fetchTime,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Hotel detail error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hotel details',
        message: error.message
      });
    }
  }

  // Get price history for a hotel
  async getHotelPriceHistory(hotelNo) {
    try {
      const { data, error } = await supabase
        .from('price_history_15min')
        .select('*')
        .eq('hotel_no', hotelNo)
        .order('checked_at', { ascending: false })
        .limit(96); // Last 24 hours

      if (error) throw error;

      // Group by room type and calculate statistics
      const priceStats = {};
      data.forEach(record => {
        const key = `${record.room_type}_${record.plan_name}`;
        if (!priceStats[key]) {
          priceStats[key] = {
            roomType: record.room_type,
            planName: record.plan_name,
            prices: [],
            currentPrice: null,
            lowestPrice: Infinity,
            highestPrice: 0,
            averagePrice: 0
          };
        }
        
        priceStats[key].prices.push({
          price: record.price,
          timestamp: record.checked_at,
          availabilityStatus: record.availability_status
        });
        
        if (!priceStats[key].currentPrice) {
          priceStats[key].currentPrice = record.price;
        }
        
        priceStats[key].lowestPrice = Math.min(priceStats[key].lowestPrice, record.price);
        priceStats[key].highestPrice = Math.max(priceStats[key].highestPrice, record.price);
      });

      // Calculate averages
      Object.values(priceStats).forEach(stat => {
        const sum = stat.prices.reduce((acc, p) => acc + p.price, 0);
        stat.averagePrice = Math.round(sum / stat.prices.length);
      });

      return {
        stats: Object.values(priceStats),
        lastUpdated: data[0]?.checked_at || new Date().toISOString()
      };

    } catch (error) {
      console.error('Price history error:', error);
      return { stats: [], error: true };
    }
  }

  // Add hotel to user's watchlist
  async addToWatchlist(req, res) {
    try {
      const userId = req.user.id;
      const {
        hotelNo,
        targetPrice,
        checkinDate,
        checkoutDate,
        adultNum = 2,
        alertConditions = {}
      } = req.body;

      if (!hotelNo) {
        return res.status(400).json({
          success: false,
          error: 'Hotel number is required'
        });
      }

      // Get hotel basic info first
      const hotelDetail = await rakutenRealTime.getHotelDetail(hotelNo);

      // Save to watchlist
      const { data, error } = await supabase
        .from('watchlist_extended')
        .insert({
          user_id: userId,
          hotel_no: hotelNo,
          hotel_name: hotelDetail.hotelName,
          target_price: targetPrice,
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
          adult_num: adultNum,
          alert_conditions: alertConditions
        })
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.json({
        success: true,
        data: {
          watchlistId: data.id,
          hotelNo: data.hotel_no,
          hotelName: data.hotel_name,
          message: 'Hotel added to watchlist'
        }
      });

    } catch (error) {
      console.error('❌ Add to watchlist error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add to watchlist'
      });
    }
  }

  // Remove from watchlist
  async removeFromWatchlist(req, res) {
    try {
      const userId = req.user.id;
      const { watchlistId } = req.params;

      const { error } = await supabase
        .from('watchlist_extended')
        .delete()
        .eq('id', watchlistId)
        .eq('user_id', userId);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.json({
        success: true,
        message: 'Removed from watchlist'
      });

    } catch (error) {
      console.error('❌ Remove from watchlist error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove from watchlist'
      });
    }
  }

  // Get user's watchlist
  async getUserWatchlist(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('watchlist_extended')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      // Get current prices for watchlist hotels
      const watchlistWithPrices = await Promise.all(
        data.map(async (item) => {
          try {
            const currentData = await rakutenRealTime.getHotelDetail(
              item.hotel_no,
              {
                checkinDate: item.checkin_date,
                checkoutDate: item.checkout_date,
                adultNum: item.adult_num
              }
            );

            const lowestPrice = Math.min(
              ...currentData.roomPlans
                .filter(plan => plan.total)
                .map(plan => plan.total)
            );

            return {
              ...item,
              currentPrice: lowestPrice,
              priceChange: item.target_price ? lowestPrice - item.target_price : 0,
              hasAvailability: currentData.roomPlans.some(plan => plan.availableRoomNum > 0)
            };
          } catch (error) {
            return {
              ...item,
              currentPrice: null,
              priceChange: 0,
              hasAvailability: false,
              error: true
            };
          }
        })
      );

      res.json({
        success: true,
        data: {
          watchlist: watchlistWithPrices,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });

    } catch (error) {
      console.error('❌ Get watchlist error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch watchlist'
      });
    }
  }

  // Check price alerts (called by cron job)
  async checkPriceAlerts(req, res) {
    try {
      console.log('🔔 Checking price alerts...');

      // Get all active watchlist items
      const { data: watchlistItems, error } = await supabase
        .from('watchlist_extended')
        .select('*')
        .gte('checkout_date', new Date().toISOString());

      if (error) throw error;

      const alerts = [];

      // Check each watchlist item
      for (const item of watchlistItems) {
        try {
          const hotelData = await rakutenRealTime.getHotelDetail(
            item.hotel_no,
            {
              checkinDate: item.checkin_date,
              checkoutDate: item.checkout_date,
              adultNum: item.adult_num
            }
          );

          const lowestPrice = Math.min(
            ...hotelData.roomPlans
              .filter(plan => plan.total)
              .map(plan => plan.total)
          );

          const conditions = item.alert_conditions || {};
          let shouldAlert = false;
          let alertType = '';
          let message = '';

          // Check various alert conditions
          if (conditions.priceDropAlert && lowestPrice < item.target_price) {
            shouldAlert = true;
            alertType = 'price_drop';
            message = `価格が目標価格を下回りました！現在: ¥${lowestPrice.toLocaleString()}`;
          }

          if (conditions.availabilityAlert && hotelData.roomPlans.some(plan => plan.availableRoomNum > 0)) {
            const wasUnavailable = await this.checkPreviousAvailability(item.hotel_no);
            if (wasUnavailable) {
              shouldAlert = true;
              alertType = 'new_availability';
              message = '新しい空室が見つかりました！';
            }
          }

          if (conditions.lastRoomAlert && hotelData.roomPlans.some(plan => plan.availableRoomNum === 1)) {
            shouldAlert = true;
            alertType = 'last_room';
            message = '残り1室のプランがあります！';
          }

          if (shouldAlert) {
            alerts.push({
              userId: item.user_id,
              hotelNo: item.hotel_no,
              hotelName: item.hotel_name,
              alertType,
              message,
              currentPrice: lowestPrice,
              targetPrice: item.target_price,
              checkinDate: item.checkin_date,
              checkoutDate: item.checkout_date
            });
          }

        } catch (error) {
          console.error(`Failed to check hotel ${item.hotel_no}:`, error);
        }
      }

      // Send alerts (would integrate with email service)
      for (const alert of alerts) {
        await this.sendPriceAlert(alert);
      }

      res.json({
        success: true,
        data: {
          checkedItems: watchlistItems.length,
          alertsSent: alerts.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Price alert check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check price alerts'
      });
    }
  }

  // Helper methods
  async trackUserSearch(userId, searchParams, resultCount) {
    try {
      await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          search_params: searchParams,
          result_count: resultCount,
          searched_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to track search:', error);
    }
  }

  async checkWatchlistStatus(userId, hotelNo) {
    try {
      const { data, error } = await supabase
        .from('watchlist_extended')
        .select('id')
        .eq('user_id', userId)
        .eq('hotel_no', hotelNo)
        .single();

      return !error && data;
    } catch (error) {
      return false;
    }
  }

  async checkPreviousAvailability(hotelNo) {
    try {
      const { data } = await supabase
        .from('price_history_15min')
        .select('availability_status')
        .eq('hotel_no', hotelNo)
        .order('checked_at', { ascending: false })
        .limit(10);

      return data?.some(record => record.availability_status === 'unavailable');
    } catch (error) {
      return false;
    }
  }

  async sendPriceAlert(alert) {
    // This would integrate with the email service
    console.log('📧 Sending price alert:', alert);
    
    // Record the alert
    await supabase
      .from('price_alerts_sent')
      .insert({
        user_id: alert.userId,
        hotel_no: alert.hotelNo,
        alert_type: alert.alertType,
        message: alert.message,
        current_price: alert.currentPrice,
        sent_at: new Date().toISOString()
      });
  }

  // Get API metrics
  async getMetrics(req, res) {
    try {
      const metrics = rakutenRealTime.getMetrics();
      
      // Get additional database metrics
      const { count: hotelCount } = await supabase
        .from('hotels_realtime')
        .select('*', { count: 'exact', head: true });

      const { count: priceRecordCount } = await supabase
        .from('price_history_15min')
        .select('*', { count: 'exact', head: true });

      const { count: watchlistCount } = await supabase
        .from('watchlist_extended')
        .select('*', { count: 'exact', head: true });

      res.json({
        success: true,
        data: {
          api: metrics,
          database: {
            totalHotels: hotelCount,
            priceRecords: priceRecordCount,
            activeWatchlists: watchlistCount
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Get metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get metrics'
      });
    }
  }
}

module.exports = new RealTimeHotelController();