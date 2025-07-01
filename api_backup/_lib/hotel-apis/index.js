// Multi-API Hotel Search Integration
// Comprehensive coverage with fallback strategy

import { retryWithBackoff } from '../../_middleware.js';

// API Client Factory
class HotelAPIClient {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.cache = new Map();
  }
  
  async search(params) {
    const cacheKey = this.getCacheKey(params);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return { ...cached, source: 'cache' };
    }
    
    try {
      await this.rateLimiter.acquire();
      const result = await this.makeRequest(params);
      this.setCache(cacheKey, result);
      return { ...result, source: 'api' };
    } catch (error) {
      console.error(`${this.name} API error:`, error);
      throw error;
    } finally {
      this.rateLimiter.release();
    }
  }
  
  getCacheKey(params) {
    return `${this.name}:${JSON.stringify(params)}`;
  }
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  setCache(key, data, ttl = 300000) { // 5 minutes default
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }
}

// Rate Limiter Implementation
class RateLimiter {
  constructor(config) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.queue = [];
    this.activeRequests = 0;
    this.windowStart = Date.now();
    this.requestCount = 0;
  }
  
  async acquire() {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.process();
    });
  }
  
  release() {
    this.activeRequests--;
    this.process();
  }
  
  process() {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart > this.windowMs) {
      this.windowStart = now;
      this.requestCount = 0;
    }
    
    // Process queue
    while (this.queue.length > 0 && this.requestCount < this.maxRequests) {
      const resolve = this.queue.shift();
      this.requestCount++;
      this.activeRequests++;
      resolve();
    }
  }
}

// Rakuten Travel API Client
export class RakutenTravelClient extends HotelAPIClient {
  constructor(apiKey) {
    super('Rakuten', {
      rateLimit: { maxRequests: 100, windowMs: 60000 }, // 100/min
      baseUrl: 'https://app.rakuten.co.jp/services/api/Travel',
      apiKey
    });
  }
  
  async makeRequest(params) {
    const url = new URL(`${this.config.baseUrl}/VacantHotelSearch/20170426`);
    url.searchParams.append('applicationId', this.config.apiKey);
    url.searchParams.append('format', 'json');
    url.searchParams.append('checkinDate', params.checkIn);
    url.searchParams.append('checkoutDate', params.checkOut);
    
    if (params.latitude && params.longitude) {
      url.searchParams.append('latitude', params.latitude);
      url.searchParams.append('longitude', params.longitude);
      url.searchParams.append('searchRadius', params.radius || 5);
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Rakuten API error: ${response.status}`);
    }
    
    const data = await response.json();
    return this.normalizeResults(data);
  }
  
  normalizeResults(data) {
    return {
      hotels: (data.hotels || []).map(item => ({
        id: `rakuten_${item.hotel[0].hotelBasicInfo.hotelNo}`,
        name: item.hotel[0].hotelBasicInfo.hotelName,
        nameEn: item.hotel[0].hotelBasicInfo.hotelNameEn,
        address: item.hotel[0].hotelBasicInfo.address1 + item.hotel[0].hotelBasicInfo.address2,
        latitude: item.hotel[0].hotelBasicInfo.latitude,
        longitude: item.hotel[0].hotelBasicInfo.longitude,
        rating: item.hotel[0].hotelBasicInfo.reviewAverage,
        price: item.hotel[0].hotelRoomInfo?.[0]?.roomCharge || 0,
        availability: item.hotel[0].hotelRoomInfo?.length || 0,
        source: 'rakuten',
        originalData: item
      }))
    };
  }
}

// Jalan API Client (Recruit Web Service)
export class JalanClient extends HotelAPIClient {
  constructor(apiKey) {
    super('Jalan', {
      rateLimit: { maxRequests: 50, windowMs: 60000 }, // 50/min
      baseUrl: 'https://jws.jalan.net/APIAdvance',
      apiKey
    });
  }
  
  async makeRequest(params) {
    const url = new URL(`${this.config.baseUrl}/HotelSearch/V1/`);
    url.searchParams.append('key', this.config.apiKey);
    url.searchParams.append('count', '30');
    url.searchParams.append('xml_ptn', '2'); // JSON response
    
    // Date range support
    url.searchParams.append('stay_date', params.checkIn.replace(/-/g, ''));
    url.searchParams.append('stay_count', '1');
    
    if (params.prefecture) {
      url.searchParams.append('pref', params.prefecture);
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Jalan API error: ${response.status}`);
    }
    
    const data = await response.json();
    return this.normalizeResults(data);
  }
  
  normalizeResults(data) {
    const results = data.Results || {};
    const hotels = results.Hotel || [];
    
    return {
      hotels: hotels.map(hotel => ({
        id: `jalan_${hotel.HotelID}`,
        name: hotel.HotelName,
        address: hotel.HotelAddress,
        latitude: parseFloat(hotel.Y),
        longitude: parseFloat(hotel.X),
        rating: parseFloat(hotel.Rating || 0),
        price: parseInt(hotel.LowestRate || 0),
        availability: hotel.NumberOfRooms || 0,
        source: 'jalan',
        originalData: hotel
      }))
    };
  }
}

// Booking.com API Client (via RapidAPI)
export class BookingComClient extends HotelAPIClient {
  constructor(apiKey) {
    super('BookingCom', {
      rateLimit: { maxRequests: 30, windowMs: 60000 }, // 30/min
      baseUrl: 'https://booking-com.p.rapidapi.com/v1',
      apiKey
    });
  }
  
  async makeRequest(params) {
    const headers = {
      'X-RapidAPI-Key': this.config.apiKey,
      'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
    };
    
    // First, search for location
    const locationUrl = new URL(`${this.config.baseUrl}/hotels/locations`);
    locationUrl.searchParams.append('name', params.city || 'Tokyo');
    locationUrl.searchParams.append('locale', 'ja');
    
    const locationResponse = await fetch(locationUrl.toString(), { headers });
    const locations = await locationResponse.json();
    
    if (!locations || locations.length === 0) {
      return { hotels: [] };
    }
    
    // Then search hotels
    const searchUrl = new URL(`${this.config.baseUrl}/hotels/search`);
    searchUrl.searchParams.append('dest_id', locations[0].dest_id);
    searchUrl.searchParams.append('dest_type', locations[0].dest_type);
    searchUrl.searchParams.append('checkin_date', params.checkIn);
    searchUrl.searchParams.append('checkout_date', params.checkOut);
    searchUrl.searchParams.append('adults_number', '2');
    searchUrl.searchParams.append('locale', 'ja');
    searchUrl.searchParams.append('currency', 'JPY');
    searchUrl.searchParams.append('filter_by_currency', 'JPY');
    searchUrl.searchParams.append('room_number', '1');
    
    const response = await fetch(searchUrl.toString(), { headers });
    if (!response.ok) {
      throw new Error(`Booking.com API error: ${response.status}`);
    }
    
    const data = await response.json();
    return this.normalizeResults(data);
  }
  
  normalizeResults(data) {
    const results = data.result || [];
    
    return {
      hotels: results.map(hotel => ({
        id: `booking_${hotel.hotel_id}`,
        name: hotel.hotel_name,
        address: hotel.address,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        rating: hotel.review_score || 0,
        price: hotel.min_total_price || 0,
        availability: hotel.available_rooms || 0,
        photoUrl: hotel.main_photo_url,
        source: 'booking',
        originalData: hotel
      }))
    };
  }
}

// Amadeus API Client
export class AmadeusClient extends HotelAPIClient {
  constructor(clientId, clientSecret) {
    super('Amadeus', {
      rateLimit: { maxRequests: 40, windowMs: 60000 }, // 40/min
      baseUrl: 'https://api.amadeus.com/v2',
      clientId,
      clientSecret
    });
    this.accessToken = null;
    this.tokenExpiry = 0;
  }
  
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }
    
    const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })
    });
    
    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
    
    return this.accessToken;
  }
  
  async makeRequest(params) {
    const token = await this.getAccessToken();
    const url = new URL(`${this.config.baseUrl}/shopping/hotel-offers`);
    
    url.searchParams.append('cityCode', params.cityCode || 'TYO');
    url.searchParams.append('checkInDate', params.checkIn);
    url.searchParams.append('checkOutDate', params.checkOut);
    url.searchParams.append('roomQuantity', '1');
    url.searchParams.append('adults', '2');
    url.searchParams.append('radius', params.radius || '5');
    url.searchParams.append('radiusUnit', 'KM');
    url.searchParams.append('paymentPolicy', 'NONE');
    url.searchParams.append('includeClosed', 'false');
    url.searchParams.append('bestRateOnly', 'true');
    url.searchParams.append('view', 'FULL');
    url.searchParams.append('sort', 'PRICE');
    
    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Amadeus API error: ${response.status}`);
    }
    
    const data = await response.json();
    return this.normalizeResults(data);
  }
  
  normalizeResults(data) {
    const results = data.data || [];
    
    return {
      hotels: results.map(item => ({
        id: `amadeus_${item.hotel.hotelId}`,
        name: item.hotel.name,
        address: `${item.hotel.address.lines.join(' ')}, ${item.hotel.address.cityName}`,
        latitude: item.hotel.latitude,
        longitude: item.hotel.longitude,
        rating: item.hotel.rating || 0,
        price: item.offers[0]?.price?.total || 0,
        currency: item.offers[0]?.price?.currency || 'JPY',
        availability: item.available ? 1 : 0,
        source: 'amadeus',
        originalData: item
      }))
    };
  }
}

// Multi-Source Aggregator
export class HotelSearchAggregator {
  constructor(apiConfigs) {
    this.clients = [];
    
    if (apiConfigs.rakuten) {
      this.clients.push(new RakutenTravelClient(apiConfigs.rakuten));
    }
    if (apiConfigs.jalan) {
      this.clients.push(new JalanClient(apiConfigs.jalan));
    }
    if (apiConfigs.booking) {
      this.clients.push(new BookingComClient(apiConfigs.booking));
    }
    if (apiConfigs.amadeus) {
      this.clients.push(new AmadeusClient(
        apiConfigs.amadeus.clientId,
        apiConfigs.amadeus.clientSecret
      ));
    }
  }
  
  async searchMultipleDates(baseParams, daysAheadArray = [2, 3, 7]) {
    const results = [];
    
    for (const days of daysAheadArray) {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + days);
      
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 1);
      
      const params = {
        ...baseParams,
        checkIn: checkIn.toISOString().split('T')[0],
        checkOut: checkOut.toISOString().split('T')[0],
        daysAhead: days
      };
      
      const searchResult = await this.searchAllSources(params);
      results.push({
        daysAhead: days,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        ...searchResult
      });
    }
    
    return results;
  }
  
  async searchAllSources(params) {
    const results = await Promise.allSettled(
      this.clients.map(client => 
        retryWithBackoff(() => client.search(params), 3, 1000)
      )
    );
    
    const successfulResults = [];
    const failedSources = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push({
          source: this.clients[index].name,
          ...result.value
        });
      } else {
        failedSources.push({
          source: this.clients[index].name,
          error: result.reason.message
        });
      }
    });
    
    // Merge and deduplicate results
    const mergedHotels = this.mergeResults(successfulResults);
    
    return {
      hotels: mergedHotels,
      sources: {
        successful: successfulResults.length,
        failed: failedSources.length,
        details: failedSources
      },
      timestamp: new Date().toISOString()
    };
  }
  
  mergeResults(results) {
    const hotelMap = new Map();
    
    for (const result of results) {
      for (const hotel of result.hotels || []) {
        // Try to match by name and location
        const key = this.getHotelKey(hotel);
        
        if (hotelMap.has(key)) {
          // Merge data from multiple sources
          const existing = hotelMap.get(key);
          hotelMap.set(key, {
            ...existing,
            prices: [...(existing.prices || []), { source: hotel.source, price: hotel.price }],
            sources: [...(existing.sources || []), hotel.source],
            availability: Math.max(existing.availability, hotel.availability),
            lowestPrice: Math.min(existing.lowestPrice || Infinity, hotel.price)
          });
        } else {
          hotelMap.set(key, {
            ...hotel,
            prices: [{ source: hotel.source, price: hotel.price }],
            sources: [hotel.source],
            lowestPrice: hotel.price
          });
        }
      }
    }
    
    return Array.from(hotelMap.values())
      .sort((a, b) => a.lowestPrice - b.lowestPrice);
  }
  
  getHotelKey(hotel) {
    // Create a key based on normalized name and location
    const normalizedName = hotel.name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const lat = Math.round(hotel.latitude * 1000) / 1000;
    const lng = Math.round(hotel.longitude * 1000) / 1000;
    
    return `${normalizedName}_${lat}_${lng}`;
  }
}