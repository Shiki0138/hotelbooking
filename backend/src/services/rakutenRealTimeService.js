// Real-Time Rakuten Travel API Service
// Full integration with VacantHotelSearch and HotelDetailSearch APIs

const axios = require('axios');
const { supabase } = require('../config/supabase');

class RakutenRealTimeService {
  constructor() {
    this.baseURL = 'https://app.rakuten.co.jp/services/api/Travel';
    this.appId = process.env.RAKUTEN_APP_ID || '1089506543046478259';
    this.affiliateId = process.env.RAKUTEN_AFFILIATE_ID || '3c19f91d.8f2b6b96.3c19f91e.9e7c7d5f';
    
    // Cache configuration for different data types
    this.cacheConfig = {
      search: 5 * 60 * 1000,      // 5 minutes for search results
      detail: 10 * 60 * 1000,     // 10 minutes for hotel details
      price: 15 * 60 * 1000       // 15 minutes for price data
    };
    
    this.cache = new Map();
    this.priceHistory = new Map();
    
    // Metrics tracking
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      errors: 0,
      lastUpdate: new Date()
    };
    
    console.log('🏨 RakutenRealTimeService initialized with real API integration');
  }

  // Enhanced vacant hotel search with discount detection
  async searchVacantHotels(params) {
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
      hotelChainCode,
      hotelType,
      onsenFlag,
      sortType = 'standard',
      page = 1,
      hits = 30,
      squeezeCondition = 'all' // 絞り込み条件追加
    } = params;

    const cacheKey = `vacant_${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey, 'search');
    if (cached) return cached;

    try {
      const queryParams = {
        applicationId: this.appId,
        affiliateId: this.affiliateId,
        format: 'json',
        formatVersion: 2,
        checkinDate: this.formatDate(checkinDate),
        checkoutDate: this.formatDate(checkoutDate),
        latitude,
        longitude,
        searchRadius,
        datumType: 1, // World geodetic system
        adultNum,
        roomNum,
        responseType: 'large', // Get detailed information
        page,
        hits,
        sort: this.getSortParameter(sortType)
      };

      // Add optional filters
      if (maxCharge) queryParams.maxCharge = maxCharge;
      if (minCharge) queryParams.minCharge = minCharge;
      if (hotelChainCode) queryParams.hotelChainCode = hotelChainCode;
      if (hotelType) queryParams.hotelType = hotelType;
      if (onsenFlag !== undefined) queryParams.onsenFlag = onsenFlag ? 1 : 0;

      console.log('🔍 Searching vacant hotels with params:', queryParams);

      const response = await axios.get(`${this.baseURL}/VacantHotelSearch/20170426`, {
        params: queryParams,
        timeout: 10000
      });

      this.metrics.apiCalls++;

      if (response.data.error) {
        throw new Error(response.data.error_description || 'API Error');
      }

      const processedData = this.processVacantHotelResponse(response.data);
      
      // Save to cache and database
      this.setCache(cacheKey, processedData, 'search');
      await this.saveHotelsToDatabase(processedData.hotels);

      return processedData;

    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Vacant hotel search error:', error.message);
      
      // Return cached or database results as fallback
      return this.getFallbackHotels(params);
    }
  }

  // Get detailed hotel information with room plans
  async getHotelDetail(hotelNo, params = {}) {
    const {
      checkinDate,
      checkoutDate,
      adultNum = 2,
      roomNum = 1
    } = params;

    const cacheKey = `detail_${hotelNo}_${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey, 'detail');
    if (cached) return cached;

    try {
      const queryParams = {
        applicationId: this.appId,
        affiliateId: this.affiliateId,
        format: 'json',
        formatVersion: 2,
        hotelNo,
        responseType: 'large',
        datumType: 1
      };

      // Add date parameters for room availability
      if (checkinDate && checkoutDate) {
        queryParams.checkinDate = this.formatDate(checkinDate);
        queryParams.checkoutDate = this.formatDate(checkoutDate);
        queryParams.adultNum = adultNum;
        queryParams.roomNum = roomNum;
      }

      console.log('🏨 Fetching hotel detail for:', hotelNo);

      const response = await axios.get(`${this.baseURL}/HotelDetailSearch/20170426`, {
        params: queryParams,
        timeout: 10000
      });

      this.metrics.apiCalls++;

      if (response.data.error) {
        throw new Error(response.data.error_description || 'API Error');
      }

      const processedData = this.processHotelDetailResponse(response.data);
      
      // Track price history
      if (processedData.roomPlans) {
        await this.trackPriceHistory(hotelNo, processedData.roomPlans);
      }

      this.setCache(cacheKey, processedData, 'detail');
      return processedData;

    } catch (error) {
      this.metrics.errors++;
      console.error('❌ Hotel detail error:', error.message);
      throw error;
    }
  }

  // Process vacant hotel search response
  processVacantHotelResponse(data) {
    if (!data.hotels || !Array.isArray(data.hotels)) {
      return { hotels: [], total: 0, page: 1 };
    }

    const hotels = data.hotels.map(item => {
      const hotel = item.hotel[0];
      const hotelBasicInfo = hotel.hotelBasicInfo;
      const hotelRatingInfo = hotel.hotelRatingInfo || {};
      const roomInfo = item.roomInfo || [];

      return {
        hotelNo: hotelBasicInfo.hotelNo,
        hotelName: hotelBasicInfo.hotelName,
        hotelKanaName: hotelBasicInfo.hotelKanaName,
        hotelInformationUrl: hotelBasicInfo.hotelInformationUrl,
        planListUrl: hotelBasicInfo.planListUrl,
        dpPlanListUrl: hotelBasicInfo.dpPlanListUrl,
        
        // Location
        address1: hotelBasicInfo.address1,
        address2: hotelBasicInfo.address2,
        postalCode: hotelBasicInfo.postalCode,
        telephoneNo: hotelBasicInfo.telephoneNo,
        latitude: parseFloat(hotelBasicInfo.latitude),
        longitude: parseFloat(hotelBasicInfo.longitude),
        access: hotelBasicInfo.access,
        nearestStation: hotelBasicInfo.nearestStation,
        
        // Images
        hotelImageUrl: hotelBasicInfo.hotelImageUrl,
        hotelThumbnailUrl: hotelBasicInfo.hotelThumbnailUrl,
        roomImageUrl: hotelBasicInfo.roomImageUrl,
        
        // Pricing
        hotelMinCharge: hotelBasicInfo.hotelMinCharge,
        hotelMaxCharge: hotelBasicInfo.hotelMaxCharge,
        
        // Ratings
        reviewCount: hotelBasicInfo.reviewCount,
        reviewAverage: hotelBasicInfo.reviewAverage,
        serviceAverage: hotelRatingInfo.serviceAverage,
        locationAverage: hotelRatingInfo.locationAverage,
        roomAverage: hotelRatingInfo.roomAverage,
        equipmentAverage: hotelRatingInfo.equipmentAverage,
        bathAverage: hotelRatingInfo.bathAverage,
        mealAverage: hotelRatingInfo.mealAverage,
        
        // Facilities
        hotelSpecial: hotelBasicInfo.hotelSpecial,
        checkinTime: hotelBasicInfo.checkinTime,
        checkoutTime: hotelBasicInfo.checkoutTime,
        
        // Available rooms with real-time pricing
        availableRooms: roomInfo.map(room => ({
          roomClass: room.roomBasicInfo?.roomClass,
          roomName: room.roomBasicInfo?.roomName,
          planId: room.roomBasicInfo?.planId,
          planName: room.roomBasicInfo?.planName,
          pointRate: room.roomBasicInfo?.pointRate,
          withDinnerFlag: room.roomBasicInfo?.withDinnerFlag,
          dinnerSelectFlag: room.roomBasicInfo?.dinnerSelectFlag,
          withBreakfastFlag: room.roomBasicInfo?.withBreakfastFlag,
          breakfastSelectFlag: room.roomBasicInfo?.breakfastSelectFlag,
          payment: room.roomBasicInfo?.payment,
          
          // Real-time pricing
          total: room.dailyCharge?.total,
          chargeFlag: room.dailyCharge?.chargeFlag,
          
          // Availability status
          availableRoomNum: room.roomBasicInfo?.availableRoomNum || 0,
          isAvailable: (room.roomBasicInfo?.availableRoomNum || 0) > 0
        })),
        
        // Calculated fields
        hasAvailability: roomInfo.some(room => 
          (room.roomBasicInfo?.availableRoomNum || 0) > 0
        ),
        lowestPrice: Math.min(...roomInfo
          .filter(room => room.dailyCharge?.total)
          .map(room => room.dailyCharge.total)
        ),
        
        lastUpdated: new Date().toISOString()
      };
    });

    return {
      hotels,
      total: data.pagingInfo?.recordCount || hotels.length,
      page: data.pagingInfo?.page || 1,
      pageCount: data.pagingInfo?.pageCount || 1,
      first: data.pagingInfo?.first || 1,
      last: data.pagingInfo?.last || hotels.length
    };
  }

  // Process hotel detail response
  processHotelDetailResponse(data) {
    if (!data.hotels || !data.hotels[0]) {
      throw new Error('Hotel not found');
    }

    const hotel = data.hotels[0].hotel[0];
    const hotelBasicInfo = hotel.hotelBasicInfo;
    const hotelRatingInfo = hotel.hotelRatingInfo || {};
    const hotelDetailInfo = hotel.hotelDetailInfo || {};
    const hotelFacilitiesInfo = hotel.hotelFacilitiesInfo || {};
    const hotelPolicyInfo = hotel.hotelPolicyInfo || {};
    const roomInfo = data.hotels[0].roomInfo || [];

    return {
      // Basic information
      hotelNo: hotelBasicInfo.hotelNo,
      hotelName: hotelBasicInfo.hotelName,
      hotelKanaName: hotelBasicInfo.hotelKanaName,
      hotelSpecial: hotelBasicInfo.hotelSpecial,
      
      // URLs
      hotelInformationUrl: hotelBasicInfo.hotelInformationUrl,
      planListUrl: hotelBasicInfo.planListUrl,
      dpPlanListUrl: hotelBasicInfo.dpPlanListUrl,
      reviewUrl: hotelBasicInfo.reviewUrl,
      
      // Location details
      postalCode: hotelBasicInfo.postalCode,
      address1: hotelBasicInfo.address1,
      address2: hotelBasicInfo.address2,
      telephoneNo: hotelBasicInfo.telephoneNo,
      faxNo: hotelBasicInfo.faxNo,
      access: hotelBasicInfo.access,
      nearestStation: hotelBasicInfo.nearestStation,
      parkingInformation: hotelBasicInfo.parkingInformation,
      latitude: parseFloat(hotelBasicInfo.latitude),
      longitude: parseFloat(hotelBasicInfo.longitude),
      
      // Images
      hotelImageUrl: hotelBasicInfo.hotelImageUrl,
      hotelThumbnailUrl: hotelBasicInfo.hotelThumbnailUrl,
      roomImageUrl: hotelBasicInfo.roomImageUrl,
      hotelMapImageUrl: hotelBasicInfo.hotelMapImageUrl,
      
      // Ratings
      reviewCount: hotelBasicInfo.reviewCount,
      reviewAverage: hotelBasicInfo.reviewAverage,
      userReview: hotelBasicInfo.userReview,
      serviceAverage: hotelRatingInfo.serviceAverage,
      locationAverage: hotelRatingInfo.locationAverage,
      roomAverage: hotelRatingInfo.roomAverage,
      equipmentAverage: hotelRatingInfo.equipmentAverage,
      bathAverage: hotelRatingInfo.bathAverage,
      mealAverage: hotelRatingInfo.mealAverage,
      
      // Detailed information
      reserveTelephoneNo: hotelDetailInfo.reserveTelephoneNo,
      middleClassCode: hotelDetailInfo.middleClassCode,
      smallClassCode: hotelDetailInfo.smallClassCode,
      areaName: hotelDetailInfo.areaName,
      hotelClassCode: hotelDetailInfo.hotelClassCode,
      hotelClassName: hotelDetailInfo.hotelClassName,
      checkinTime: hotelDetailInfo.checkinTime,
      checkoutTime: hotelDetailInfo.checkoutTime,
      lastCheckinTime: hotelDetailInfo.lastCheckinTime,
      
      // Facilities
      hotelRoomNum: hotelFacilitiesInfo.hotelRoomNum,
      roomFacilities: hotelFacilitiesInfo.roomFacilities,
      hotelFacilities: hotelFacilitiesInfo.hotelFacilities,
      aboutMealPlace: hotelFacilitiesInfo.aboutMealPlace,
      breakfastPlace: hotelFacilitiesInfo.breakfastPlace,
      dinnerPlace: hotelFacilitiesInfo.dinnerPlace,
      aboutBath: hotelFacilitiesInfo.aboutBath,
      bathType: hotelFacilitiesInfo.bathType,
      
      // Policies
      note: hotelPolicyInfo.note,
      cancelPolicy: hotelPolicyInfo.cancelPolicy,
      paymentPolicy: hotelPolicyInfo.paymentPolicy,
      aboutCreditCardUse: hotelPolicyInfo.aboutCreditCardUse,
      creditCard: hotelPolicyInfo.creditCard,
      aboutPointAdd: hotelPolicyInfo.aboutPointAdd,
      
      // Room plans with real-time pricing
      roomPlans: roomInfo.map(room => ({
        roomClass: room.roomBasicInfo?.roomClass,
        roomName: room.roomBasicInfo?.roomName,
        planId: room.roomBasicInfo?.planId,
        planName: room.roomBasicInfo?.planName,
        planContents: room.roomBasicInfo?.planContents,
        pointRate: room.roomBasicInfo?.pointRate,
        withDinnerFlag: room.roomBasicInfo?.withDinnerFlag,
        dinnerSelectFlag: room.roomBasicInfo?.dinnerSelectFlag,
        withBreakfastFlag: room.roomBasicInfo?.withBreakfastFlag,
        breakfastSelectFlag: room.roomBasicInfo?.breakfastSelectFlag,
        payment: room.roomBasicInfo?.payment,
        reserveUrl: room.roomBasicInfo?.reserveUrl,
        
        // Pricing details
        total: room.dailyCharge?.total,
        chargeFlag: room.dailyCharge?.chargeFlag,
        
        // Availability
        availableRoomNum: room.roomBasicInfo?.availableRoomNum || 0,
        maxRoomNum: room.roomBasicInfo?.maxRoomNum,
        
        // Room details
        roomSize: room.roomBasicInfo?.roomSize,
        bedSize: room.roomBasicInfo?.bedSize,
        bedType: room.roomBasicInfo?.bedType,
        smokingFlag: room.roomBasicInfo?.smokingFlag,
        
        lastUpdated: new Date().toISOString()
      })),
      
      lastUpdated: new Date().toISOString()
    };
  }

  // Track price history for monitoring
  async trackPriceHistory(hotelNo, roomPlans) {
    try {
      const priceRecords = roomPlans.map(plan => ({
        hotel_no: hotelNo,
        room_type: plan.roomClass,
        plan_name: plan.planName,
        price: plan.total,
        availability_status: plan.availableRoomNum > 0 ? 'available' : 'unavailable',
        available_rooms: plan.availableRoomNum,
        checked_at: new Date().toISOString()
      }));

      // Save to database
      const { error } = await supabase
        .from('price_history_15min')
        .insert(priceRecords);

      if (error) {
        console.error('Failed to save price history:', error);
      }

      // Update in-memory price history
      if (!this.priceHistory.has(hotelNo)) {
        this.priceHistory.set(hotelNo, []);
      }
      
      const history = this.priceHistory.get(hotelNo);
      history.push(...priceRecords);
      
      // Keep only last 96 records (24 hours at 15-min intervals)
      if (history.length > 96) {
        history.splice(0, history.length - 96);
      }

    } catch (error) {
      console.error('Price tracking error:', error);
    }
  }

  // Save hotels to database for offline access
  async saveHotelsToDatabase(hotels) {
    try {
      const hotelRecords = hotels.map(hotel => ({
        hotel_no: hotel.hotelNo,
        hotel_name: hotel.hotelName,
        area_name: `${hotel.address1} ${hotel.address2}`,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        min_charge: hotel.hotelMinCharge,
        review_average: hotel.reviewAverage,
        review_count: hotel.reviewCount,
        hotel_thumbnail_url: hotel.hotelThumbnailUrl,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('hotels_realtime')
        .upsert(hotelRecords, { onConflict: 'hotel_no' });

      if (error) {
        console.error('Failed to save hotels:', error);
      }
    } catch (error) {
      console.error('Database save error:', error);
    }
  }

  // Get fallback hotels from database
  async getFallbackHotels(params) {
    try {
      console.log('📋 Using fallback hotel data from database');
      
      let query = supabase
        .from('hotels_realtime')
        .select('*')
        .order('review_average', { ascending: false })
        .limit(30);

      // Apply filters if available
      if (params.minCharge) {
        query = query.gte('min_charge', params.minCharge);
      }
      if (params.maxCharge) {
        query = query.lte('min_charge', params.maxCharge);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        hotels: data.map(hotel => ({
          hotelNo: hotel.hotel_no,
          hotelName: hotel.hotel_name,
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          hotelMinCharge: hotel.min_charge,
          reviewAverage: hotel.review_average,
          reviewCount: hotel.review_count,
          hotelThumbnailUrl: hotel.hotel_thumbnail_url,
          availableRooms: [],
          hasAvailability: false,
          lastUpdated: hotel.updated_at
        })),
        total: data.length,
        page: 1,
        isFallback: true
      };

    } catch (error) {
      console.error('Fallback error:', error);
      return { hotels: [], total: 0, page: 1, error: true };
    }
  }

  // Cache management
  getFromCache(key, type) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const maxAge = this.cacheConfig[type] || this.cacheConfig.search;
    if (Date.now() - cached.timestamp > maxAge) {
      this.cache.delete(key);
      return null;
    }

    this.metrics.cacheHits++;
    console.log('📋 Cache hit for:', key.substring(0, 50) + '...');
    return cached.data;
  }

  setCache(key, data, type) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      type
    });

    // Clean old cache entries
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, 50).forEach(([key]) => this.cache.delete(key));
    }
  }

  // Utility methods
  formatDate(date) {
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  getSortParameter(sortType) {
    const sortMap = {
      'standard': 'standard',
      'price': '+roomCharge',
      'price_desc': '-roomCharge',
      'rating': '-reviewAverage'
    };
    return sortMap[sortType] || 'standard';
  }

  // Get API metrics
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.apiCalls + this.metrics.cacheHits) || 0,
      uptime: Date.now() - this.metrics.lastUpdate.getTime()
    };
  }

  // Clear all caches
  clearCache() {
    this.cache.clear();
    this.priceHistory.clear();
    console.log('🧹 All caches cleared');
  }
}

module.exports = new RakutenRealTimeService();