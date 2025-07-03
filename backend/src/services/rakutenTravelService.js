// Enhanced Rakuten Travel API Service for Demo Mode
// Comprehensive hotel search with caching, error handling, and filtering

const axios = require('axios');

class RakutenTravelService {
  constructor() {
    this.baseURL = 'https://app.rakuten.co.jp/services/api/Travel';
    this.appId = process.env.RAKUTEN_APP_ID || '1089506543046478259';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeSum = 0;
    
    // Rate limiting
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms between requests
    
    // Area codes for Japanese regions
    this.areaCodes = {
      tokyo: { largeClassCode: 'japan', middleClassCode: 'tokyo' },
      osaka: { largeClassCode: 'japan', middleClassCode: 'osaka' },
      kyoto: { largeClassCode: 'japan', middleClassCode: 'kyoto' },
      kanagawa: { largeClassCode: 'japan', middleClassCode: 'kanagawa' },
      chiba: { largeClassCode: 'japan', middleClassCode: 'chiba' },
      saitama: { largeClassCode: 'japan', middleClassCode: 'saitama' },
      hokkaido: { largeClassCode: 'japan', middleClassCode: 'hokkaido' },
      okinawa: { largeClassCode: 'japan', middleClassCode: 'okinawa' }
    };
    
    console.log('🏨 Rakuten Travel Service initialized with enhanced features');
  }

  // Enhanced API request with comprehensive error handling
  async makeRequest(endpoint, params = {}) {
    const startTime = Date.now();
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    try {
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📋 Cache hit for:', cacheKey.substring(0, 50) + '...');
        return cached.data;
      }

      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
      }
      this.lastRequestTime = Date.now();

      // Prepare request parameters
      const requestParams = {
        applicationId: this.appId,
        format: 'json',
        formatVersion: 2,
        ...params
      };

      const url = `${this.baseURL}${endpoint}`;
      
      console.log('🔍 Rakuten API Request:', url);
      console.log('📊 Request params:', JSON.stringify(requestParams, null, 2));

      // Make request with timeout
      const response = await axios.get(url, {
        params: requestParams,
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'LastMinuteStay/1.0',
          'Accept': 'application/json'
        }
      });

      // Track metrics
      const responseTime = Date.now() - startTime;
      this.requestCount++;
      this.responseTimeSum += responseTime;

      console.log(`✅ API Success: ${responseTime}ms (Request #${this.requestCount})`);

      // Process and normalize response
      const processedData = this.processResponse(response.data, endpoint);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: processedData,
        timestamp: Date.now()
      });

      return processedData;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.errorCount++;
      
      console.error('❌ Rakuten API Error:', {
        endpoint,
        error: error.message,
        responseTime,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      // Handle different error types
      if (error.code === 'ECONNABORTED') {
        throw new Error('API_TIMEOUT: Request timed out after 10 seconds');
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('🔑 API Authentication error - falling back to mock data');
        return this.getMockData(endpoint, params);
      }
      
      if (error.response?.status === 429) {
        console.warn('⏳ Rate limit exceeded - waiting and retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.makeRequest(endpoint, params);
      }

      // For other errors, try mock data as fallback
      console.warn('🔄 Using mock data as fallback');
      return this.getMockData(endpoint, params);
    }
  }

  // Enhanced response processing
  processResponse(data, endpoint) {
    if (data.error) {
      throw new Error(`Rakuten API Error: ${data.error_description || data.error}`);
    }

    // Handle different endpoint response structures
    if (endpoint.includes('SimpleHotelSearch') || endpoint.includes('KeywordHotelSearch')) {
      return this.normalizeHotelSearchResponse(data);
    }
    
    if (endpoint.includes('VacantHotelSearch')) {
      return this.normalizeVacantSearchResponse(data);
    }
    
    if (endpoint.includes('HotelDetailSearch')) {
      return this.normalizeHotelDetailResponse(data);
    }

    return data;
  }

  // Normalize hotel search response
  normalizeHotelSearchResponse(data) {
    if (!data.hotels || !Array.isArray(data.hotels)) {
      return [];
    }

    return data.hotels.map(item => {
      const hotel = item.hotel && item.hotel[0] ? item.hotel[0] : item;
      const basicInfo = hotel.hotelBasicInfo || {};
      const ratingInfo = hotel.hotelRatingInfo || {};
      
      return {
        id: basicInfo.hotelNo,
        name: basicInfo.hotelName || 'Unknown Hotel',
        nameKana: basicInfo.hotelKanaName,
        description: basicInfo.hotelSpecial || basicInfo.hotelComment,
        address: {
          zipCode: basicInfo.postalCode,
          prefecture: basicInfo.address1,
          city: basicInfo.address2,
          fullAddress: `${basicInfo.address1 || ''}${basicInfo.address2 || ''}`
        },
        location: {
          latitude: parseFloat(basicInfo.latitude) || 0,
          longitude: parseFloat(basicInfo.longitude) || 0
        },
        access: basicInfo.access,
        nearestStation: basicInfo.nearestStation,
        images: {
          main: basicInfo.hotelImageUrl,
          thumbnail: basicInfo.hotelThumbnailUrl
        },
        pricing: {
          minPrice: parseInt(basicInfo.hotelMinCharge) || 0,
          maxPrice: parseInt(basicInfo.hotelMaxCharge) || 0,
          currency: 'JPY'
        },
        rating: {
          overall: parseFloat(basicInfo.reviewAverage) || 0,
          service: parseFloat(ratingInfo.serviceAverage) || 0,
          location: parseFloat(ratingInfo.locationAverage) || 0,
          room: parseFloat(ratingInfo.roomAverage) || 0,
          equipment: parseFloat(ratingInfo.equipmentAverage) || 0,
          bath: parseFloat(ratingInfo.bathAverage) || 0,
          meal: parseFloat(ratingInfo.mealAverage) || 0
        },
        reviewCount: parseInt(basicInfo.reviewCount) || 0,
        roomCount: parseInt(basicInfo.roomCount) || 0,
        checkIn: basicInfo.checkinTime || '15:00',
        checkOut: basicInfo.checkoutTime || '10:00',
        telephone: basicInfo.telephoneNo,
        planListUrl: basicInfo.planListUrl,
        hotelType: this.categorizeHotel(basicInfo),
        lastUpdate: new Date().toISOString()
      };
    });
  }

  // Normalize vacant room search response  
  normalizeVacantSearchResponse(data) {
    const hotels = this.normalizeHotelSearchResponse(data);
    
    // Add availability-specific data
    return hotels.map(hotel => ({
      ...hotel,
      availability: {
        isAvailable: true,
        availableRooms: Math.floor(Math.random() * 10) + 1,
        lastChecked: new Date().toISOString()
      }
    }));
  }

  // Normalize hotel detail response
  normalizeHotelDetailResponse(data) {
    if (!data.hotels || !data.hotels[0]) {
      throw new Error('Hotel detail not found');
    }
    
    const hotels = this.normalizeHotelSearchResponse(data);
    return hotels[0];
  }

  // Categorize hotel type based on basic info
  categorizeHotel(basicInfo) {
    const name = (basicInfo.hotelName || '').toLowerCase();
    const special = (basicInfo.hotelSpecial || '').toLowerCase();
    
    if (name.includes('リゾート') || special.includes('リゾート')) return 'resort';
    if (name.includes('ビジネス') || special.includes('ビジネス')) return 'business';
    if (name.includes('旅館') || special.includes('旅館')) return 'ryokan';
    if (name.includes('ホステル') || name.includes('ゲスト')) return 'hostel';
    if (name.includes('ペンション') || name.includes('民宿')) return 'pension';
    if (name.includes('ホテル')) return 'hotel';
    
    return 'other';
  }

  // Enhanced search with comprehensive filtering
  async searchHotels(searchParams) {
    const {
      area,
      subArea,
      keyword,
      checkInDate,
      checkOutDate,
      guests = 2,
      rooms = 1,
      minPrice,
      maxPrice,
      rating,
      hotelType,
      sortBy = 'price',
      page = 1,
      limit = 30
    } = searchParams;

    let endpoint;
    let params = {
      hits: limit,
      page: page,
      datumType: 1
    };

    // Determine search type and endpoint
    if (checkInDate && checkOutDate) {
      endpoint = '/VacantHotelSearch/20170426';
      params.checkinDate = this.formatDate(checkInDate);
      params.checkoutDate = this.formatDate(checkOutDate);
      params.adultNum = guests;
      params.roomNum = rooms;
    } else if (keyword) {
      endpoint = '/KeywordHotelSearch/20170426';
      params.keyword = keyword;
    } else {
      endpoint = '/SimpleHotelSearch/20170426';
    }

    // Add area filters
    if (area && this.areaCodes[area.toLowerCase()]) {
      const areaCode = this.areaCodes[area.toLowerCase()];
      params.largeClassCode = areaCode.largeClassCode;
      params.middleClassCode = areaCode.middleClassCode;
    }

    // Add sorting
    const sortOptions = {
      'price': '+roomCharge',
      'price_desc': '-roomCharge',
      'rating': '-reviewAverage',
      'name': '+hotelName',
      'distance': '+distance'
    };
    params.sort = sortOptions[sortBy] || '+roomCharge';

    console.log('🔍 Enhanced hotel search with params:', params);

    // Make API request
    let hotels = await this.makeRequest(endpoint, params);

    // Apply client-side filters
    hotels = this.applyFilters(hotels, {
      minPrice,
      maxPrice,
      rating,
      hotelType
    });

    return {
      hotels,
      pagination: {
        page,
        limit,
        total: hotels.length,
        hasMore: hotels.length === limit
      },
      filters: {
        area,
        subArea,
        keyword,
        minPrice,
        maxPrice,
        rating,
        hotelType,
        sortBy
      },
      metrics: this.getMetrics()
    };
  }

  // Apply client-side filters
  applyFilters(hotels, filters) {
    return hotels.filter(hotel => {
      // Price filter
      if (filters.minPrice && hotel.pricing.minPrice < filters.minPrice) return false;
      if (filters.maxPrice && hotel.pricing.minPrice > filters.maxPrice) return false;
      
      // Rating filter
      if (filters.rating && hotel.rating.overall < filters.rating) return false;
      
      // Hotel type filter
      if (filters.hotelType && hotel.hotelType !== filters.hotelType) return false;
      
      return true;
    });
  }

  // Get hotel detail with enhanced information
  async getHotelDetail(hotelId) {
    const params = {
      hotelNo: hotelId,
      datumType: 1
    };

    const hotel = await this.makeRequest('/HotelDetailSearch/20170426', params);
    
    // Add additional computed fields
    return {
      ...hotel,
      priceRange: this.calculatePriceRange(hotel.pricing),
      nearbyStations: this.extractNearbyStations(hotel.access),
      amenities: this.extractAmenities(hotel.description),
      accessibility: this.checkAccessibility(hotel.description)
    };
  }

  // Utility methods
  formatDate(date) {
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  calculatePriceRange(pricing) {
    const min = pricing.minPrice;
    const max = pricing.maxPrice;
    
    if (min === 0 && max === 0) return 'Price not available';
    if (min === max) return `¥${min.toLocaleString()}`;
    return `¥${min.toLocaleString()} - ¥${max.toLocaleString()}`;
  }

  extractNearbyStations(access) {
    if (!access) return [];
    
    const stationRegex = /([^\s]+駅)/g;
    const matches = access.match(stationRegex);
    return matches ? [...new Set(matches)] : [];
  }

  extractAmenities(description) {
    if (!description) return [];
    
    const amenityKeywords = [
      'Wi-Fi', 'WiFi', '無線LAN', 'インターネット',
      '駐車場', 'パーキング',
      '温泉', '大浴場', 'スパ',
      'レストラン', '朝食', '夕食',
      'ジム', 'フィットネス',
      'プール', '会議室', 'ランドリー'
    ];
    
    return amenityKeywords.filter(keyword => 
      description.includes(keyword)
    );
  }

  checkAccessibility(description) {
    if (!description) return {};
    
    return {
      wheelchairAccessible: description.includes('車椅子') || description.includes('バリアフリー'),
      elevatorAvailable: description.includes('エレベーター'),
      parkingAvailable: description.includes('駐車場')
    };
  }

  // Get API metrics for monitoring
  getMetrics() {
    const avgResponseTime = this.requestCount > 0 ? 
      Math.round(this.responseTimeSum / this.requestCount) : 0;
    
    const successRate = this.requestCount > 0 ? 
      Math.round(((this.requestCount - this.errorCount) / this.requestCount) * 100) : 100;

    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      successRate,
      averageResponseTime: avgResponseTime,
      cacheSize: this.cache.size,
      lastUpdated: new Date().toISOString()
    };
  }

  // Mock data for fallback scenarios
  getMockData(endpoint, params) {
    console.log('🎭 Returning mock data for endpoint:', endpoint);
    
    const mockHotels = [
      {
        id: '143637',
        name: 'デモホテル東京',
        nameKana: 'デモホテルトウキョウ',
        description: 'デモモード用のサンプルホテルです。実際の予約はできません。',
        address: {
          zipCode: '100-0001',
          prefecture: '東京都',
          city: '千代田区',
          fullAddress: '東京都千代田区丸の内1-1-1'
        },
        location: {
          latitude: 35.6812,
          longitude: 139.7671
        },
        access: 'JR東京駅徒歩5分',
        nearestStation: '東京駅',
        images: {
          main: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Demo+Hotel',
          thumbnail: 'https://via.placeholder.com/200x150/0066cc/ffffff?text=Demo'
        },
        pricing: {
          minPrice: 8000,
          maxPrice: 25000,
          currency: 'JPY'
        },
        rating: {
          overall: 4.2,
          service: 4.1,
          location: 4.5,
          room: 4.0,
          equipment: 4.2,
          bath: 4.3,
          meal: 3.8
        },
        reviewCount: 1234,
        roomCount: 200,
        checkIn: '15:00',
        checkOut: '10:00',
        telephone: '03-0000-0000',
        hotelType: 'hotel',
        lastUpdate: new Date().toISOString(),
        availability: {
          isAvailable: true,
          availableRooms: 5,
          lastChecked: new Date().toISOString()
        }
      }
    ];

    return mockHotels;
  }

  // Clear cache manually
  clearCache() {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  // Reset metrics
  resetMetrics() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeSum = 0;
    console.log('📊 Metrics reset');
  }
}

module.exports = new RakutenTravelService();