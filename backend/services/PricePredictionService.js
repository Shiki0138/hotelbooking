const { createClient } = require('@supabase/supabase-js');
const cacheService = require('./PricePredictionCacheService');

class PricePredictionService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://demo-project.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key'
    );
    this.cache = cacheService;
  }

  /**
   * Collect and store price history data for ML training
   */
  async collectPriceHistory(hotelId, roomId, priceData) {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const month = now.getMonth() + 1;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Calculate days until check-in
      const checkInDate = new Date(priceData.checkIn);
      const daysUntilCheckin = Math.floor((checkInDate - now) / (1000 * 60 * 60 * 24));
      
      // Determine season
      const season = this.getSeason(month);
      
      // Calculate discount percentage
      const discountPercentage = priceData.basePrice > 0 
        ? Math.round(((priceData.basePrice - priceData.price) / priceData.basePrice) * 100)
        : 0;

      const historyRecord = {
        hotel_id: hotelId,
        room_id: roomId,
        date: now.toISOString().split('T')[0],
        price: priceData.price,
        base_price: priceData.basePrice || priceData.price,
        discount_percentage: discountPercentage,
        day_of_week: dayOfWeek,
        month: month,
        is_weekend: isWeekend,
        is_holiday: this.isHoliday(now),
        days_until_checkin: daysUntilCheckin,
        season: season,
        occupancy_rate: priceData.occupancyRate || null,
        search_volume: priceData.searchVolume || null,
        competitor_avg_price: priceData.competitorAvgPrice || null,
        local_event: priceData.localEvent || null,
        event_impact_score: priceData.eventImpactScore || 0
      };

      const { error } = await this.supabase
        .from('price_history_ml')
        .upsert(historyRecord, {
          onConflict: 'hotel_id,room_id,date'
        });

      if (error) {
        console.error('[PricePrediction] Error collecting price history:', error);
      }
    } catch (error) {
      console.error('[PricePrediction] Fatal error in collectPriceHistory:', error);
    }
  }

  /**
   * Generate 7-day price predictions using statistical methods
   */
  async generatePredictions(hotelId, roomId, checkInDate) {
    try {
      // Check cache first
      const cached = await this.cache.getCachedPredictions(hotelId, roomId, checkInDate);
      if (cached) {
        return cached;
      }

      // Get historical data
      const historicalData = await this.getHistoricalData(hotelId, roomId);
      
      if (!historicalData || historicalData.length < 7) {
        // Use demo predictions if insufficient data
        const predictions = await this.generateDemoPredictions(hotelId, roomId, checkInDate);
        await this.cache.cachePredictions(hotelId, roomId, checkInDate, predictions);
        return predictions;
      }

      // Prepare data for analysis
      const pricesByDayOfWeek = this.groupPricesByDayOfWeek(historicalData);
      const pricesByMonth = this.groupPricesByMonth(historicalData);
      const pricesByDaysAhead = this.groupPricesByDaysAhead(historicalData);
      
      // Calculate statistical parameters
      const stats = this.calculatePriceStatistics(historicalData);
      
      // Generate predictions for next 7 days
      const predictions = [];
      const startDate = new Date(checkInDate);
      
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(targetDate.getDate() + i);
        
        const prediction = await this.predictPriceForDate(
          hotelId,
          roomId,
          targetDate,
          stats,
          pricesByDayOfWeek,
          pricesByMonth,
          pricesByDaysAhead,
          historicalData
        );
        
        predictions.push(prediction);
      }

      // Cache the predictions
      await this.cache.cachePredictions(hotelId, roomId, checkInDate, predictions);

      return predictions;
    } catch (error) {
      console.error('[PricePrediction] Error generating predictions:', error);
      return this.generateDemoPredictions(hotelId, roomId, checkInDate);
    }
  }

  /**
   * Predict price for a specific date using multiple factors
   */
  async predictPriceForDate(hotelId, roomId, targetDate, stats, pricesByDayOfWeek, pricesByMonth, pricesByDaysAhead, historicalData) {
    const dayOfWeek = targetDate.getDay();
    const month = targetDate.getMonth() + 1;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = this.isHoliday(targetDate);
    const daysAhead = Math.floor((targetDate - new Date()) / (1000 * 60 * 60 * 24));
    
    // Base prediction using weighted average
    let predictedPrice = stats.avgPrice;
    let confidenceScore = 60; // Base confidence
    
    // Day of week adjustment
    if (pricesByDayOfWeek[dayOfWeek]) {
      const dayAvg = pricesByDayOfWeek[dayOfWeek].avg;
      predictedPrice = predictedPrice * 0.7 + dayAvg * 0.3;
      confidenceScore += 10;
    }
    
    // Seasonal adjustment
    if (pricesByMonth[month]) {
      const monthAvg = pricesByMonth[month].avg;
      const seasonalFactor = monthAvg / stats.avgPrice;
      predictedPrice *= seasonalFactor;
      confidenceScore += 5;
    }
    
    // Weekend premium
    if (isWeekend) {
      predictedPrice *= 1.15; // 15% weekend premium
    }
    
    // Holiday premium
    if (isHoliday) {
      predictedPrice *= 1.25; // 25% holiday premium
    }
    
    // Days ahead adjustment (prices tend to increase as date approaches)
    if (daysAhead <= 7) {
      predictedPrice *= (1 + (7 - daysAhead) * 0.02); // 2% increase per day
    } else if (daysAhead > 30) {
      predictedPrice *= 0.95; // 5% early booking discount
    }
    
    // Calculate price range based on historical volatility
    const priceRange = stats.stdDev * 1.5;
    const priceLow = Math.max(predictedPrice - priceRange, stats.minPrice);
    const priceHigh = Math.min(predictedPrice + priceRange, stats.maxPrice);
    
    // Determine recommendation
    const recommendation = this.determineRecommendation(
      predictedPrice,
      stats,
      daysAhead,
      isWeekend,
      isHoliday
    );
    
    // Adjust confidence based on data quality
    if (historicalData.length > 30) confidenceScore += 10;
    if (historicalData.length > 60) confidenceScore += 10;
    confidenceScore = Math.min(confidenceScore, 95);
    
    // Save prediction
    const predictionRecord = {
      hotel_id: hotelId,
      room_id: roomId,
      prediction_date: new Date().toISOString().split('T')[0],
      target_date: targetDate.toISOString().split('T')[0],
      days_ahead: daysAhead,
      predicted_price: Math.round(predictedPrice),
      confidence_score: confidenceScore,
      price_range_low: Math.round(priceLow),
      price_range_high: Math.round(priceHigh),
      recommendation: recommendation.type,
      recommendation_reason: recommendation.reason,
      model_version: '1.0',
      features_used: {
        dayOfWeek,
        month,
        isWeekend,
        isHoliday,
        daysAhead,
        historicalDataPoints: historicalData.length
      }
    };
    
    await this.savePrediction(predictionRecord);
    
    return predictionRecord;
  }

  /**
   * Determine buy recommendation based on predicted price and timing
   */
  determineRecommendation(predictedPrice, stats, daysAhead, isWeekend, isHoliday) {
    // Price relative to historical average
    const priceRatio = predictedPrice / stats.avgPrice;
    
    // Immediate booking scenarios
    if (daysAhead <= 3) {
      return {
        type: 'book_now',
        reason: 'Last minute booking - prices unlikely to drop'
      };
    }
    
    if (priceRatio < 0.85) {
      return {
        type: 'book_now',
        reason: 'Price is 15% below average - excellent deal'
      };
    }
    
    if (isHoliday && daysAhead <= 14) {
      return {
        type: 'book_now',
        reason: 'Holiday period approaching - limited availability expected'
      };
    }
    
    // Wait scenarios
    if (priceRatio > 1.2 && daysAhead > 14) {
      return {
        type: 'wait',
        reason: 'Price is 20% above average - likely to decrease'
      };
    }
    
    if (!isWeekend && daysAhead > 30) {
      return {
        type: 'wait',
        reason: 'Weekday booking with plenty of time - monitor for deals'
      };
    }
    
    // Monitor scenarios
    return {
      type: 'monitor',
      reason: 'Price is near average - watch for changes'
    };
  }

  /**
   * Calculate statistical parameters from historical data
   */
  calculatePriceStatistics(historicalData) {
    const prices = historicalData.map(d => d.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    // Calculate standard deviation
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      avgPrice,
      minPrice,
      maxPrice,
      stdDev,
      dataPoints: prices.length
    };
  }

  /**
   * Group prices by day of week for pattern analysis
   */
  groupPricesByDayOfWeek(historicalData) {
    const groups = {};
    
    historicalData.forEach(record => {
      const day = record.day_of_week;
      if (!groups[day]) {
        groups[day] = { prices: [], count: 0, sum: 0 };
      }
      groups[day].prices.push(record.price);
      groups[day].sum += record.price;
      groups[day].count += 1;
    });
    
    // Calculate averages
    Object.keys(groups).forEach(day => {
      groups[day].avg = groups[day].sum / groups[day].count;
    });
    
    return groups;
  }

  /**
   * Group prices by month for seasonal analysis
   */
  groupPricesByMonth(historicalData) {
    const groups = {};
    
    historicalData.forEach(record => {
      const month = record.month;
      if (!groups[month]) {
        groups[month] = { prices: [], count: 0, sum: 0 };
      }
      groups[month].prices.push(record.price);
      groups[month].sum += record.price;
      groups[month].count += 1;
    });
    
    // Calculate averages
    Object.keys(groups).forEach(month => {
      groups[month].avg = groups[month].sum / groups[month].count;
    });
    
    return groups;
  }

  /**
   * Group prices by days ahead for booking timing analysis
   */
  groupPricesByDaysAhead(historicalData) {
    const groups = {
      immediate: { range: [0, 3], prices: [], sum: 0, count: 0 },
      week: { range: [4, 7], prices: [], sum: 0, count: 0 },
      twoWeeks: { range: [8, 14], prices: [], sum: 0, count: 0 },
      month: { range: [15, 30], prices: [], sum: 0, count: 0 },
      advance: { range: [31, 90], prices: [], sum: 0, count: 0 }
    };
    
    historicalData.forEach(record => {
      const daysAhead = record.days_until_checkin;
      
      Object.entries(groups).forEach(([key, group]) => {
        if (daysAhead >= group.range[0] && daysAhead <= group.range[1]) {
          group.prices.push(record.price);
          group.sum += record.price;
          group.count += 1;
        }
      });
    });
    
    // Calculate averages
    Object.keys(groups).forEach(key => {
      if (groups[key].count > 0) {
        groups[key].avg = groups[key].sum / groups[key].count;
      }
    });
    
    return groups;
  }

  /**
   * Get historical price data for analysis
   */
  async getHistoricalData(hotelId, roomId) {
    const { data, error } = await this.supabase
      .from('price_history_ml')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('room_id', roomId)
      .order('date', { ascending: false })
      .limit(90); // Last 90 days
    
    if (error) {
      console.error('[PricePrediction] Error fetching historical data:', error);
      return null;
    }
    
    return data;
  }

  /**
   * Save prediction to database
   */
  async savePrediction(prediction) {
    const { error } = await this.supabase
      .from('price_predictions')
      .insert(prediction);
    
    if (error) {
      console.error('[PricePrediction] Error saving prediction:', error);
    }
  }

  /**
   * Generate demo predictions when no historical data available
   */
  generateDemoPredictions(hotelId, roomId, checkInDate) {
    const predictions = [];
    const basePrice = 15000 + Math.random() * 10000;
    const startDate = new Date(checkInDate);
    
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + i);
      
      const dayOfWeek = targetDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Generate realistic price variations
      let price = basePrice;
      if (isWeekend) price *= 1.2;
      if (i < 3) price *= 1.1; // Near-term premium
      
      // Add some randomness
      price += (Math.random() - 0.5) * 2000;
      
      const recommendation = i === 0 && price < basePrice * 1.1 ? 'book_now' : 
                           i > 4 ? 'wait' : 'monitor';
      
      predictions.push({
        hotel_id: hotelId,
        room_id: roomId,
        prediction_date: new Date().toISOString().split('T')[0],
        target_date: targetDate.toISOString().split('T')[0],
        days_ahead: i,
        predicted_price: Math.round(price),
        confidence_score: 75 - i * 2,
        price_range_low: Math.round(price * 0.9),
        price_range_high: Math.round(price * 1.1),
        recommendation: recommendation,
        recommendation_reason: this.getDemoRecommendationReason(recommendation, i),
        model_version: 'demo',
        features_used: { demo: true }
      });
    }
    
    return predictions;
  }

  /**
   * Get demo recommendation reason
   */
  getDemoRecommendationReason(recommendation, daysAhead) {
    const reasons = {
      book_now: 'Current price is below average - good time to book',
      wait: 'Prices may decrease as the date approaches',
      monitor: 'Price is stable - continue monitoring for changes'
    };
    return reasons[recommendation];
  }

  /**
   * Determine season based on month
   */
  getSeason(month) {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * Check if date is a Japanese holiday
   */
  isHoliday(date) {
    // Simplified holiday check - in production, use proper holiday API
    const holidays = [
      '01-01', // New Year
      '02-11', // National Foundation Day
      '04-29', // Showa Day
      '05-03', // Constitution Day
      '05-04', // Greenery Day
      '05-05', // Children's Day
      '08-11', // Mountain Day
      '09-23', // Autumnal Equinox
      '11-03', // Culture Day
      '11-23', // Labor Thanksgiving Day
      '12-23'  // Emperor's Birthday
    ];
    
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidays.includes(monthDay);
  }

  /**
   * Get latest predictions for a hotel/room
   */
  async getLatestPredictions(hotelId, roomId) {
    const { data, error } = await this.supabase
      .from('price_predictions')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('room_id', roomId)
      .eq('prediction_date', new Date().toISOString().split('T')[0])
      .order('target_date', { ascending: true });
    
    if (error) {
      console.error('[PricePrediction] Error fetching predictions:', error);
      return null;
    }
    
    return data;
  }

  /**
   * Analyze search history for user behavior patterns
   */
  async analyzeSearchHistory(userId) {
    try {
      // Check cache first
      const cached = await this.cache.getCachedUserAnalysis(userId);
      if (cached) {
        return cached;
      }

      // Get user's search history
      const { data: searches, error } = await this.supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error || !searches || searches.length === 0) {
        return null;
      }
      
      // Analyze patterns
      const patterns = {
        preferredLocations: this.extractTopValues(searches, 'location', 3),
        preferredPriceRange: this.calculatePriceRange(searches),
        preferredDates: this.analyzeDatePatterns(searches),
        searchFrequency: this.calculateSearchFrequency(searches),
        bookingProbability: this.estimateBookingProbability(searches)
      };
      
      // Cache the analysis
      await this.cache.cacheUserAnalysis(userId, patterns);
      
      return patterns;
    } catch (error) {
      console.error('[PricePrediction] Error analyzing search history:', error);
      return null;
    }
  }

  /**
   * Extract top values from search data
   */
  extractTopValues(searches, field, limit) {
    const counts = {};
    searches.forEach(search => {
      const value = search.search_params?.[field];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value, count]) => ({ value, count }));
  }

  /**
   * Calculate preferred price range from searches
   */
  calculatePriceRange(searches) {
    const prices = searches
      .map(s => s.search_params?.maxPrice)
      .filter(p => p && p > 0);
    
    if (prices.length === 0) return null;
    
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    return {
      average: Math.round(avgPrice),
      min: minPrice,
      max: maxPrice
    };
  }

  /**
   * Analyze date patterns in searches
   */
  analyzeDatePatterns(searches) {
    const dayPatterns = { weekday: 0, weekend: 0 };
    const advanceBooking = [];
    
    searches.forEach(search => {
      const checkIn = search.search_params?.checkinDate;
      if (checkIn) {
        const date = new Date(checkIn);
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          dayPatterns.weekend++;
        } else {
          dayPatterns.weekday++;
        }
        
        // Calculate advance booking days
        const searchDate = new Date(search.created_at);
        const daysAhead = Math.floor((date - searchDate) / (1000 * 60 * 60 * 24));
        if (daysAhead > 0) {
          advanceBooking.push(daysAhead);
        }
      }
    });
    
    const avgAdvanceBooking = advanceBooking.length > 0
      ? Math.round(advanceBooking.reduce((sum, d) => sum + d, 0) / advanceBooking.length)
      : 14;
    
    return {
      preferredType: dayPatterns.weekend > dayPatterns.weekday ? 'weekend' : 'weekday',
      averageAdvanceBooking: avgAdvanceBooking
    };
  }

  /**
   * Calculate search frequency
   */
  calculateSearchFrequency(searches) {
    if (searches.length < 2) return 'low';
    
    const firstSearch = new Date(searches[searches.length - 1].created_at);
    const lastSearch = new Date(searches[0].created_at);
    const daysDiff = Math.floor((lastSearch - firstSearch) / (1000 * 60 * 60 * 24));
    
    const searchesPerWeek = (searches.length / Math.max(daysDiff, 1)) * 7;
    
    if (searchesPerWeek > 10) return 'high';
    if (searchesPerWeek > 3) return 'medium';
    return 'low';
  }

  /**
   * Estimate booking probability based on search patterns
   */
  estimateBookingProbability(searches) {
    // Factors that increase booking probability
    let score = 50; // Base score
    
    // Repeated searches for same location
    const locations = searches.map(s => s.search_params?.location).filter(l => l);
    const uniqueLocations = new Set(locations);
    if (locations.length > 0 && uniqueLocations.size / locations.length < 0.3) {
      score += 20; // Focused on specific locations
    }
    
    // Recent search intensity
    const recentSearches = searches.filter(s => {
      const daysAgo = Math.floor((new Date() - new Date(s.created_at)) / (1000 * 60 * 60 * 24));
      return daysAgo <= 7;
    });
    if (recentSearches.length > 5) {
      score += 15; // High recent activity
    }
    
    // Consistent date ranges
    const dateRanges = searches
      .map(s => s.search_params?.checkinDate)
      .filter(d => d)
      .slice(0, 5);
    if (dateRanges.length > 3) {
      const uniqueDates = new Set(dateRanges);
      if (uniqueDates.size <= 2) {
        score += 15; // Searching for specific dates
      }
    }
    
    return Math.min(score, 90);
  }
}

module.exports = new PricePredictionService();