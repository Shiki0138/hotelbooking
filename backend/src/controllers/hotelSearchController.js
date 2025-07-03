// Enhanced Hotel Search Controller for Demo Mode
// Comprehensive search API with advanced filtering and caching

const rakutenService = require('../services/rakutenTravelService');
const { validationResult } = require('express-validator');

class HotelSearchController {
  constructor() {
    this.searchHistory = new Map();
    this.popularSearches = new Map();
    console.log('🔍 Hotel Search Controller initialized');
  }

  // Enhanced hotel search with comprehensive filtering
  async searchHotels(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const searchParams = {
        // Location parameters
        area: req.query.area,
        subArea: req.query.subArea,
        keyword: req.query.keyword,
        
        // Date parameters
        checkInDate: req.query.checkInDate,
        checkOutDate: req.query.checkOutDate,
        
        // Guest parameters
        guests: parseInt(req.query.guests) || 2,
        rooms: parseInt(req.query.rooms) || 1,
        
        // Price filters
        minPrice: req.query.minPrice ? parseInt(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice) : undefined,
        
        // Quality filters
        rating: req.query.rating ? parseFloat(req.query.rating) : undefined,
        hotelType: req.query.hotelType,
        
        // Pagination and sorting
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 30, 100), // Max 100
        sortBy: req.query.sortBy || 'price'
      };

      console.log('🔍 Processing enhanced search request:', searchParams);

      // Track search for analytics
      this.trackSearch(searchParams);

      // Perform search
      const startTime = Date.now();
      const searchResults = await rakutenService.searchHotels(searchParams);
      const searchTime = Date.now() - startTime;

      // Enhance results with additional data
      const enhancedResults = {
        ...searchResults,
        searchParams,
        searchTime,
        timestamp: new Date().toISOString(),
        totalResults: searchResults.hotels.length,
        popularFilters: this.getPopularFilters(),
        suggestions: this.generateSearchSuggestions(searchParams)
      };

      // Add search metadata
      if (req.user) {
        this.saveSearchHistory(req.user.id, searchParams, enhancedResults);
      }

      res.json({
        success: true,
        data: enhancedResults
      });

    } catch (error) {
      console.error('❌ Hotel search error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error.message,
        fallback: 'Using cached or mock data'
      });
    }
  }

  // Get hotel details with enhanced information
  async getHotelDetail(req, res) {
    try {
      const { hotelId } = req.params;
      
      if (!hotelId) {
        return res.status(400).json({
          success: false,
          error: 'Hotel ID is required'
        });
      }

      console.log('🏨 Fetching hotel detail for ID:', hotelId);

      const startTime = Date.now();
      const hotelDetail = await rakutenService.getHotelDetail(hotelId);
      const fetchTime = Date.now() - startTime;

      // Add availability check for specific dates if provided
      const checkInDate = req.query.checkInDate;
      const checkOutDate = req.query.checkOutDate;
      
      if (checkInDate && checkOutDate) {
        hotelDetail.availabilityCheck = await this.checkAvailability(
          hotelId, 
          checkInDate, 
          checkOutDate,
          req.query.guests || 2,
          req.query.rooms || 1
        );
      }

      // Add similar hotels
      hotelDetail.similarHotels = await this.findSimilarHotels(hotelDetail);

      res.json({
        success: true,
        data: {
          hotel: hotelDetail,
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

  // Check availability for specific dates
  async checkAvailability(hotelId, checkInDate, checkOutDate, guests, rooms) {
    try {
      const availabilityParams = {
        hotelId,
        checkInDate,
        checkOutDate,
        guests,
        rooms
      };

      // This would normally call a specific availability API
      // For demo mode, we'll simulate availability
      const isWeekend = this.isWeekend(new Date(checkInDate));
      const daysBetween = this.calculateDaysBetween(checkInDate, checkOutDate);
      
      return {
        isAvailable: Math.random() > 0.2, // 80% availability rate
        availableRooms: Math.floor(Math.random() * 10) + 1,
        totalPrice: this.calculateEstimatedPrice(daysBetween, isWeekend),
        pricePerNight: this.calculateEstimatedPrice(1, isWeekend),
        nights: daysBetween,
        checkInDate,
        checkOutDate,
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Availability check error:', error);
      return {
        isAvailable: false,
        error: 'Availability check failed'
      };
    }
  }

  // Find similar hotels based on location and price range
  async findSimilarHotels(hotel) {
    try {
      const searchParams = {
        area: hotel.address.prefecture === '東京都' ? 'tokyo' :
              hotel.address.prefecture === '大阪府' ? 'osaka' :
              hotel.address.prefecture === '京都府' ? 'kyoto' : 'tokyo',
        minPrice: Math.max(0, hotel.pricing.minPrice - 5000),
        maxPrice: hotel.pricing.maxPrice + 5000,
        limit: 5
      };

      const results = await rakutenService.searchHotels(searchParams);
      
      // Filter out the current hotel and return top 3
      return results.hotels
        .filter(h => h.id !== hotel.id)
        .slice(0, 3)
        .map(h => ({
          id: h.id,
          name: h.name,
          pricing: h.pricing,
          rating: h.rating,
          images: h.images
        }));

    } catch (error) {
      console.error('❌ Similar hotels error:', error);
      return [];
    }
  }

  // Get search suggestions based on popular queries
  async getSearchSuggestions(req, res) {
    try {
      const { query } = req.query;
      
      const suggestions = {
        locations: this.getLocationSuggestions(query),
        hotels: this.getHotelSuggestions(query),
        popular: this.getPopularSearchTerms(),
        recent: req.user ? this.getUserRecentSearches(req.user.id) : []
      };

      res.json({
        success: true,
        data: suggestions
      });

    } catch (error) {
      console.error('❌ Search suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suggestions'
      });
    }
  }

  // Get available filters and their options
  async getSearchFilters(req, res) {
    try {
      const filters = {
        areas: [
          { code: 'tokyo', name: '東京都', popular: true },
          { code: 'osaka', name: '大阪府', popular: true },
          { code: 'kyoto', name: '京都府', popular: true },
          { code: 'kanagawa', name: '神奈川県', popular: false },
          { code: 'chiba', name: '千葉県', popular: false },
          { code: 'saitama', name: '埼玉県', popular: false },
          { code: 'hokkaido', name: '北海道', popular: true },
          { code: 'okinawa', name: '沖縄県', popular: true }
        ],
        priceRanges: [
          { min: 0, max: 5000, label: '5,000円未満' },
          { min: 5000, max: 10000, label: '5,000円〜10,000円' },
          { min: 10000, max: 20000, label: '10,000円〜20,000円' },
          { min: 20000, max: 50000, label: '20,000円〜50,000円' },
          { min: 50000, max: null, label: '50,000円以上' }
        ],
        hotelTypes: [
          { code: 'business', label: 'ビジネスホテル' },
          { code: 'hotel', label: 'シティホテル' },
          { code: 'resort', label: 'リゾートホテル' },
          { code: 'ryokan', label: '旅館' },
          { code: 'pension', label: 'ペンション・民宿' }
        ],
        ratings: [
          { min: 4.5, label: '4.5以上' },
          { min: 4.0, label: '4.0以上' },
          { min: 3.5, label: '3.5以上' },
          { min: 3.0, label: '3.0以上' }
        ],
        sortOptions: [
          { code: 'price', label: '料金が安い順' },
          { code: 'price_desc', label: '料金が高い順' },
          { code: 'rating', label: '評価が高い順' },
          { code: 'name', label: '名前順' }
        ]
      };

      res.json({
        success: true,
        data: filters
      });

    } catch (error) {
      console.error('❌ Get filters error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get filters'
      });
    }
  }

  // Get API health and metrics
  async getSearchMetrics(req, res) {
    try {
      const metrics = rakutenService.getMetrics();
      
      const additionalMetrics = {
        searchesLast24h: this.getSearchCount24h(),
        popularAreas: this.getPopularAreas(),
        averageSearchTime: metrics.averageResponseTime,
        cacheHitRate: this.calculateCacheHitRate(),
        uptime: process.uptime()
      };

      res.json({
        success: true,
        data: {
          ...metrics,
          ...additionalMetrics,
          status: metrics.successRate > 90 ? 'healthy' : 'degraded'
        }
      });

    } catch (error) {
      console.error('❌ Metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get metrics'
      });
    }
  }

  // Helper methods
  trackSearch(searchParams) {
    const searchKey = JSON.stringify(searchParams);
    const count = this.popularSearches.get(searchKey) || 0;
    this.popularSearches.set(searchKey, count + 1);
    
    // Keep only top 100 searches
    if (this.popularSearches.size > 100) {
      const sorted = [...this.popularSearches.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100);
      this.popularSearches.clear();
      sorted.forEach(([key, value]) => this.popularSearches.set(key, value));
    }
  }

  saveSearchHistory(userId, searchParams, results) {
    if (!this.searchHistory.has(userId)) {
      this.searchHistory.set(userId, []);
    }
    
    const userHistory = this.searchHistory.get(userId);
    userHistory.unshift({
      searchParams,
      resultCount: results.totalResults,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 searches per user
    if (userHistory.length > 50) {
      userHistory.splice(50);
    }
  }

  generateSearchSuggestions(searchParams) {
    const suggestions = [];
    
    if (searchParams.area) {
      suggestions.push(`${searchParams.area}の高評価ホテル`);
      suggestions.push(`${searchParams.area}の格安ホテル`);
    }
    
    if (searchParams.checkInDate) {
      const date = new Date(searchParams.checkInDate);
      const isWeekend = this.isWeekend(date);
      if (isWeekend) {
        suggestions.push('週末限定プラン');
      } else {
        suggestions.push('平日お得プラン');
      }
    }
    
    return suggestions.slice(0, 5);
  }

  isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  calculateDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calculateEstimatedPrice(nights, isWeekend) {
    const basePrice = isWeekend ? 12000 : 8000;
    const variation = Math.random() * 5000;
    return Math.round((basePrice + variation) * nights);
  }

  getLocationSuggestions(query) {
    const locations = ['東京', '大阪', '京都', '横浜', '新宿', '渋谷', '銀座'];
    if (!query) return locations;
    
    return locations.filter(loc => 
      loc.includes(query) || query.includes(loc)
    );
  }

  getHotelSuggestions(query) {
    const hotels = ['ホテル', 'リゾート', '旅館', 'ビジネスホテル'];
    if (!query) return hotels;
    
    return hotels.filter(hotel => 
      hotel.includes(query) || query.includes(hotel)
    );
  }

  getPopularSearchTerms() {
    return ['東京駅周辺', '新宿 ビジネスホテル', '京都 旅館', '大阪 格安'];
  }

  getUserRecentSearches(userId) {
    const history = this.searchHistory.get(userId) || [];
    return history.slice(0, 5).map(h => h.searchParams);
  }

  getPopularFilters() {
    return {
      areas: ['tokyo', 'osaka', 'kyoto'],
      priceRanges: ['5000-10000', '10000-20000'],
      hotelTypes: ['business', 'hotel']
    };
  }

  getSearchCount24h() {
    // This would normally query a database
    return Math.floor(Math.random() * 1000) + 500;
  }

  getPopularAreas() {
    const areaStats = [...this.popularSearches.entries()]
      .map(([search, count]) => {
        try {
          const params = JSON.parse(search);
          return { area: params.area, count };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reduce((acc, { area, count }) => {
        if (area) {
          acc[area] = (acc[area] || 0) + count;
        }
        return acc;
      }, {});

    return Object.entries(areaStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area, count]) => ({ area, count }));
  }

  calculateCacheHitRate() {
    // This would normally be calculated from actual cache metrics
    return Math.round(Math.random() * 30 + 70); // 70-100%
  }
}

module.exports = new HotelSearchController();