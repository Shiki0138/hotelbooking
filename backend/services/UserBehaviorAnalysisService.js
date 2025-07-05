const { createClient } = require('@supabase/supabase-js');

class UserBehaviorAnalysisService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://demo-project.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key'
    );
  }

  /**
   * Analyze user behavior patterns for personalized recommendations
   */
  async analyzeUserBehavior(userId) {
    try {
      const [
        searchPatterns,
        bookingHistory,
        viewingPatterns,
        pricePreferences
      ] = await Promise.all([
        this.analyzeSearchPatterns(userId),
        this.analyzeBookingHistory(userId),
        this.analyzeViewingPatterns(userId),
        this.analyzePricePreferences(userId)
      ]);

      return {
        userId,
        searchPatterns,
        bookingHistory,
        viewingPatterns,
        pricePreferences,
        behaviorScore: this.calculateBehaviorScore({
          searchPatterns,
          bookingHistory,
          viewingPatterns,
          pricePreferences
        }),
        recommendations: this.generateRecommendations({
          searchPatterns,
          bookingHistory,
          viewingPatterns,
          pricePreferences
        })
      };
    } catch (error) {
      console.error('[UserBehavior] Error analyzing user behavior:', error);
      return null;
    }
  }

  /**
   * Analyze search patterns
   */
  async analyzeSearchPatterns(userId) {
    const { data: searches, error } = await this.supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !searches || searches.length === 0) {
      return {
        totalSearches: 0,
        recentActivity: 'none',
        patterns: {}
      };
    }

    // Time-based analysis
    const now = new Date();
    const last7Days = searches.filter(s => 
      (now - new Date(s.created_at)) / (1000 * 60 * 60 * 24) <= 7
    );
    const last30Days = searches.filter(s => 
      (now - new Date(s.created_at)) / (1000 * 60 * 60 * 24) <= 30
    );

    // Location patterns
    const locationCounts = {};
    const prefectureCounts = {};
    searches.forEach(s => {
      const location = s.search_params?.location;
      const prefecture = s.search_params?.prefecture;
      if (location) {
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
      if (prefecture) {
        prefectureCounts[prefecture] = (prefectureCounts[prefecture] || 0) + 1;
      }
    });

    // Time patterns
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    searches.forEach(s => {
      const date = new Date(s.created_at);
      hourCounts[date.getHours()]++;
      dayCounts[date.getDay()]++;
    });

    // Check-in date patterns
    const advanceBookingDays = [];
    const stayDurations = [];
    searches.forEach(s => {
      const checkIn = s.search_params?.checkinDate;
      const checkOut = s.search_params?.checkoutDate;
      if (checkIn) {
        const searchDate = new Date(s.created_at);
        const checkInDate = new Date(checkIn);
        const daysAhead = Math.floor((checkInDate - searchDate) / (1000 * 60 * 60 * 24));
        if (daysAhead >= 0) {
          advanceBookingDays.push(daysAhead);
        }
      }
      if (checkIn && checkOut) {
        const duration = Math.floor(
          (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
        );
        if (duration > 0) {
          stayDurations.push(duration);
        }
      }
    });

    return {
      totalSearches: searches.length,
      recentActivity: last7Days.length > 10 ? 'high' : 
                     last7Days.length > 3 ? 'medium' : 'low',
      searchesLast7Days: last7Days.length,
      searchesLast30Days: last30Days.length,
      patterns: {
        topLocations: this.getTopItems(locationCounts, 5),
        topPrefectures: this.getTopItems(prefectureCounts, 3),
        peakSearchHours: this.getPeakHours(hourCounts),
        preferredDays: this.getPreferredDays(dayCounts),
        averageAdvanceBooking: this.calculateAverage(advanceBookingDays),
        averageStayDuration: this.calculateAverage(stayDurations),
        searchFrequency: this.calculateFrequency(searches)
      }
    };
  }

  /**
   * Analyze booking history
   */
  async analyzeBookingHistory(userId) {
    const { data: bookings, error } = await this.supabase
      .from('bookings')
      .select('*, hotels(*), rooms(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !bookings || bookings.length === 0) {
      return {
        totalBookings: 0,
        patterns: {}
      };
    }

    // Booking patterns
    const hotelTypes = {};
    const priceRanges = [];
    const bookingLeadTimes = [];
    const seasonalBookings = { spring: 0, summer: 0, autumn: 0, winter: 0 };

    bookings.forEach(booking => {
      // Hotel type analysis
      const hotelType = booking.hotels?.hotel_type || 'standard';
      hotelTypes[hotelType] = (hotelTypes[hotelType] || 0) + 1;

      // Price analysis
      priceRanges.push(booking.total_price);

      // Lead time analysis
      const bookingDate = new Date(booking.created_at);
      const checkInDate = new Date(booking.check_in);
      const leadTime = Math.floor((checkInDate - bookingDate) / (1000 * 60 * 60 * 24));
      if (leadTime >= 0) {
        bookingLeadTimes.push(leadTime);
      }

      // Seasonal analysis
      const month = checkInDate.getMonth() + 1;
      const season = this.getSeason(month);
      seasonalBookings[season]++;
    });

    // Calculate conversion rate
    const conversionRate = await this.calculateConversionRate(userId, bookings.length);

    return {
      totalBookings: bookings.length,
      patterns: {
        preferredHotelTypes: this.getTopItems(hotelTypes, 3),
        averagePrice: this.calculateAverage(priceRanges),
        priceRange: {
          min: Math.min(...priceRanges),
          max: Math.max(...priceRanges)
        },
        averageLeadTime: this.calculateAverage(bookingLeadTimes),
        seasonalPreferences: seasonalBookings,
        conversionRate,
        repeatBookingRate: this.calculateRepeatRate(bookings)
      }
    };
  }

  /**
   * Analyze viewing patterns
   */
  async analyzeViewingPatterns(userId) {
    const { data: views, error } = await this.supabase
      .from('hotel_views')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error || !views || views.length === 0) {
      return {
        totalViews: 0,
        patterns: {}
      };
    }

    // View patterns
    const viewCounts = {};
    const viewDurations = [];
    const viewTimes = [];

    views.forEach(view => {
      // Count views per hotel
      viewCounts[view.hotel_id] = (viewCounts[view.hotel_id] || 0) + 1;

      // View duration
      if (view.duration_seconds) {
        viewDurations.push(view.duration_seconds);
      }

      // View time patterns
      const hour = new Date(view.created_at).getHours();
      viewTimes.push(hour);
    });

    // Most viewed hotels
    const mostViewedHotels = Object.entries(viewCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hotelId, count]) => ({ hotelId, count }));

    return {
      totalViews: views.length,
      patterns: {
        mostViewedHotels,
        averageViewDuration: this.calculateAverage(viewDurations),
        peakViewingHours: this.getPeakHours(this.countByHour(viewTimes)),
        viewsPerSession: this.calculateViewsPerSession(views),
        engagementScore: this.calculateEngagementScore(viewDurations, viewCounts)
      }
    };
  }

  /**
   * Analyze price preferences
   */
  async analyzePricePreferences(userId) {
    const { data: interactions, error } = await this.supabase
      .from('price_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !interactions || interactions.length === 0) {
      return {
        priceSensitivity: 'unknown',
        patterns: {}
      };
    }

    // Analyze price interactions
    const viewedPrices = [];
    const bookedPrices = [];
    const abandonedPrices = [];

    interactions.forEach(interaction => {
      if (interaction.action === 'viewed') {
        viewedPrices.push(interaction.price);
      } else if (interaction.action === 'booked') {
        bookedPrices.push(interaction.price);
      } else if (interaction.action === 'abandoned') {
        abandonedPrices.push(interaction.price);
      }
    });

    // Calculate price sensitivity
    const avgViewed = this.calculateAverage(viewedPrices);
    const avgBooked = this.calculateAverage(bookedPrices);
    const avgAbandoned = this.calculateAverage(abandonedPrices);

    let priceSensitivity = 'medium';
    if (avgBooked > 0 && avgViewed > 0) {
      const ratio = avgBooked / avgViewed;
      if (ratio < 0.8) priceSensitivity = 'high';
      else if (ratio > 1.1) priceSensitivity = 'low';
    }

    return {
      priceSensitivity,
      patterns: {
        averageViewedPrice: avgViewed,
        averageBookedPrice: avgBooked,
        priceDropResponse: this.calculatePriceDropResponse(interactions),
        discountPreference: this.calculateDiscountPreference(interactions),
        priceRangeFlexibility: this.calculatePriceFlexibility(viewedPrices, bookedPrices)
      }
    };
  }

  /**
   * Calculate behavior score
   */
  calculateBehaviorScore(data) {
    let score = 50; // Base score

    // Search activity score
    if (data.searchPatterns.recentActivity === 'high') score += 20;
    else if (data.searchPatterns.recentActivity === 'medium') score += 10;

    // Booking history score
    if (data.bookingHistory.totalBookings > 5) score += 15;
    else if (data.bookingHistory.totalBookings > 2) score += 10;
    else if (data.bookingHistory.totalBookings > 0) score += 5;

    // Engagement score
    if (data.viewingPatterns.patterns?.engagementScore > 70) score += 10;
    else if (data.viewingPatterns.patterns?.engagementScore > 50) score += 5;

    // Price behavior score
    if (data.pricePreferences.priceSensitivity === 'low') score += 5;

    return Math.min(score, 100);
  }

  /**
   * Generate recommendations based on behavior
   */
  generateRecommendations(data) {
    const recommendations = [];

    // Location-based recommendations
    if (data.searchPatterns.patterns?.topLocations?.length > 0) {
      recommendations.push({
        type: 'location',
        priority: 'high',
        locations: data.searchPatterns.patterns.topLocations.map(l => l.value),
        reason: 'Based on your frequent searches'
      });
    }

    // Price-based recommendations
    if (data.bookingHistory.patterns?.averagePrice) {
      const avgPrice = data.bookingHistory.patterns.averagePrice;
      recommendations.push({
        type: 'price_range',
        priority: 'medium',
        minPrice: Math.floor(avgPrice * 0.7),
        maxPrice: Math.ceil(avgPrice * 1.3),
        reason: 'Within your typical budget'
      });
    }

    // Time-based recommendations
    if (data.searchPatterns.patterns?.averageAdvanceBooking > 0) {
      recommendations.push({
        type: 'booking_timing',
        priority: 'low',
        daysInAdvance: data.searchPatterns.patterns.averageAdvanceBooking,
        reason: 'Your usual booking pattern'
      });
    }

    // Seasonal recommendations
    const seasons = data.bookingHistory.patterns?.seasonalPreferences;
    if (seasons) {
      const preferredSeason = Object.entries(seasons)
        .sort((a, b) => b[1] - a[1])[0][0];
      recommendations.push({
        type: 'seasonal',
        priority: 'low',
        season: preferredSeason,
        reason: 'Your preferred travel season'
      });
    }

    return recommendations;
  }

  // Helper methods
  getTopItems(counts, limit) {
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value, count]) => ({ value, count, percentage: 0 }))
      .map((item, _, arr) => ({
        ...item,
        percentage: Math.round((item.count / arr.reduce((sum, i) => sum + i.count, 0)) * 100)
      }));
  }

  calculateAverage(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    return Math.round(numbers.reduce((sum, n) => sum + n, 0) / numbers.length);
  }

  getPeakHours(hourCounts) {
    const total = hourCounts.reduce((sum, count) => sum + count, 0);
    return hourCounts
      .map((count, hour) => ({ hour, count, percentage: (count / total) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  getPreferredDays(dayCounts) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const total = dayCounts.reduce((sum, count) => sum + count, 0);
    return dayCounts
      .map((count, day) => ({ 
        day: days[day], 
        count, 
        percentage: (count / total) * 100 
      }))
      .sort((a, b) => b.count - a.count);
  }

  calculateFrequency(searches) {
    if (searches.length < 2) return 'low';
    const firstSearch = new Date(searches[searches.length - 1].created_at);
    const lastSearch = new Date(searches[0].created_at);
    const daysDiff = Math.floor((lastSearch - firstSearch) / (1000 * 60 * 60 * 24));
    const searchesPerWeek = (searches.length / Math.max(daysDiff, 1)) * 7;
    
    if (searchesPerWeek > 10) return 'very_high';
    if (searchesPerWeek > 5) return 'high';
    if (searchesPerWeek > 2) return 'medium';
    return 'low';
  }

  getSeason(month) {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  async calculateConversionRate(userId, bookingCount) {
    const { count: searchCount } = await this.supabase
      .from('search_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (!searchCount || searchCount === 0) return 0;
    return Math.round((bookingCount / searchCount) * 100);
  }

  calculateRepeatRate(bookings) {
    const hotelCounts = {};
    bookings.forEach(booking => {
      const hotelId = booking.hotel_id;
      hotelCounts[hotelId] = (hotelCounts[hotelId] || 0) + 1;
    });
    
    const repeatBookings = Object.values(hotelCounts).filter(count => count > 1).length;
    return bookings.length > 0 ? Math.round((repeatBookings / bookings.length) * 100) : 0;
  }

  countByHour(hours) {
    const counts = new Array(24).fill(0);
    hours.forEach(hour => counts[hour]++);
    return counts;
  }

  calculateViewsPerSession(views) {
    // Group views by session (views within 30 minutes of each other)
    const sessions = [];
    let currentSession = [];
    
    views.forEach((view, index) => {
      if (index === 0) {
        currentSession.push(view);
      } else {
        const timeDiff = new Date(views[index - 1].created_at) - new Date(view.created_at);
        if (timeDiff < 30 * 60 * 1000) { // 30 minutes
          currentSession.push(view);
        } else {
          sessions.push(currentSession);
          currentSession = [view];
        }
      }
    });
    
    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }
    
    const avgViewsPerSession = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.length, 0) / sessions.length)
      : 0;
    
    return avgViewsPerSession;
  }

  calculateEngagementScore(durations, viewCounts) {
    // Base engagement on view duration and repeat views
    let score = 50;
    
    const avgDuration = this.calculateAverage(durations);
    if (avgDuration > 120) score += 20; // More than 2 minutes
    else if (avgDuration > 60) score += 10; // More than 1 minute
    
    const repeatViews = Object.values(viewCounts).filter(count => count > 1).length;
    const repeatRate = Object.keys(viewCounts).length > 0
      ? repeatViews / Object.keys(viewCounts).length
      : 0;
    
    if (repeatRate > 0.3) score += 20;
    else if (repeatRate > 0.1) score += 10;
    
    return Math.min(score, 100);
  }

  calculatePriceDropResponse(interactions) {
    const priceDrops = interactions.filter(i => i.price_drop_alert);
    const responses = priceDrops.filter(i => i.action === 'booked');
    
    return priceDrops.length > 0
      ? Math.round((responses.length / priceDrops.length) * 100)
      : 0;
  }

  calculateDiscountPreference(interactions) {
    const discounted = interactions.filter(i => i.discount_percentage > 0);
    const bookedDiscounted = discounted.filter(i => i.action === 'booked');
    
    return interactions.length > 0
      ? Math.round((bookedDiscounted.length / interactions.length) * 100)
      : 0;
  }

  calculatePriceFlexibility(viewedPrices, bookedPrices) {
    if (viewedPrices.length === 0 || bookedPrices.length === 0) return 'unknown';
    
    const viewedMin = Math.min(...viewedPrices);
    const viewedMax = Math.max(...viewedPrices);
    const viewedRange = viewedMax - viewedMin;
    
    const bookedMin = Math.min(...bookedPrices);
    const bookedMax = Math.max(...bookedPrices);
    const bookedRange = bookedMax - bookedMin;
    
    const flexibility = bookedRange / viewedRange;
    
    if (flexibility > 0.7) return 'high';
    if (flexibility > 0.4) return 'medium';
    return 'low';
  }
}

module.exports = new UserBehaviorAnalysisService();