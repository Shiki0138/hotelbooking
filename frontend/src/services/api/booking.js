// Booking.com API Integration (Affiliate Partner API)
class BookingAPI {
  constructor() {
    this.baseURL = 'https://distribution-xml.booking.com/json/bookings';
    this.affiliateId = import.meta.env.VITE_BOOKING_AFFILIATE_ID;
    this.apiKey = import.meta.env.VITE_BOOKING_API_KEY;
    this.username = import.meta.env.VITE_BOOKING_USERNAME;
    this.password = import.meta.env.VITE_BOOKING_PASSWORD;
  }

  // Get authentication headers
  getAuthHeaders() {
    return {
      'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Search hotels by location
  async searchHotels(params) {
    try {
      const searchParams = {
        city_ids: params.cityId,
        checkin: params.checkIn,
        checkout: params.checkOut,
        adults: params.guests || 1,
        rooms: params.rooms || 1,
        language: 'ja',
        currency: 'JPY',
        extras: 'hotel_details,hotel_photos,hotel_description,hotel_facilities'
      };

      // Add optional filters
      if (params.minPrice) searchParams.min_price = params.minPrice;
      if (params.maxPrice) searchParams.max_price = params.maxPrice;
      if (params.rating) searchParams.min_review_score = params.rating;
      if (params.sortBy) searchParams.order_by = params.sortBy;

      const response = await fetch(`${this.baseURL}?${new URLSearchParams(searchParams)}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Booking.com search failed: ${response.status}`);
      }

      const data = await response.json();
      return this.formatBookingResults(data.result || []);
    } catch (error) {
      console.error('Booking.com search failed:', error);
      // Return fallback data for demo
      return this.getFallbackData(params);
    }
  }

  // Get hotel details
  async getHotelDetails(hotelId) {
    try {
      const response = await fetch(`${this.baseURL}/hotel?hotel_id=${hotelId}&extras=hotel_details,hotel_photos,hotel_description,hotel_facilities,hotel_policies`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Hotel details failed: ${response.status}`);
      }

      const data = await response.json();
      return this.formatHotelDetails(data);
    } catch (error) {
      console.error('Hotel details failed:', error);
      return null;
    }
  }

  // Search by coordinates
  async searchByCoordinates(latitude, longitude, params) {
    try {
      const searchParams = {
        latitude: latitude,
        longitude: longitude,
        radius: params.radius || 5,
        checkin: params.checkIn,
        checkout: params.checkOut,
        adults: params.guests || 1,
        rooms: params.rooms || 1,
        language: 'ja',
        currency: 'JPY',
        extras: 'hotel_details,hotel_photos'
      };

      const response = await fetch(`${this.baseURL}/geo?${new URLSearchParams(searchParams)}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Geo search failed: ${response.status}`);
      }

      const data = await response.json();
      return this.formatBookingResults(data.result || []);
    } catch (error) {
      console.error('Geo search failed:', error);
      return this.getFallbackData(params);
    }
  }

  // Get city ID from city name
  async getCityId(cityName) {
    const cityIds = {
      '東京': '-246227',
      'tokyo': '-246227',
      '大阪': '-240905',
      'osaka': '-240905',
      '京都': '-246218',
      'kyoto': '-246218',
      '名古屋': '-240906',
      'nagoya': '-240906',
      '福岡': '-245910',
      'fukuoka': '-245910',
      '札幌': '-245989',
      'sapporo': '-245989',
      '沖縄': '-245991',
      'okinawa': '-245991',
      'paris': '-1456928',
      'london': '-2601889',
      'new york': '-2158971'
    };

    return cityIds[cityName.toLowerCase()] || null;
  }

  // Format booking results
  formatBookingResults(hotels) {
    return hotels.map(hotel => ({
      id: hotel.hotel_id,
      name: hotel.hotel_name,
      location: {
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        address: hotel.address,
        city: hotel.city,
        country: hotel.country_trans,
        district: hotel.district
      },
      rating: {
        stars: hotel.class,
        review: {
          score: hotel.review_score,
          count: hotel.review_nr,
          description: hotel.review_score_word
        }
      },
      price: {
        currency: hotel.currency_code,
        total: parseFloat(hotel.min_total_price || 0),
        perNight: parseFloat(hotel.price || 0),
        taxesIncluded: hotel.is_no_prepayment_block
      },
      images: hotel.main_photo_url ? [
        {
          url: hotel.main_photo_url,
          description: 'メイン画像'
        },
        ...(hotel.photos || []).map(photo => ({
          url: photo.url_max300,
          description: photo.description || 'ホテル画像'
        }))
      ] : [],
      amenities: hotel.hotel_facilities || [],
      policies: {
        checkin: hotel.checkin,
        checkout: hotel.checkout,
        cancellation: hotel.is_free_cancellable
      },
      description: hotel.hotel_description,
      url: hotel.url,
      source: 'booking.com',
      available: hotel.is_available,
      lastRenovated: hotel.last_renovated,
      openedYear: hotel.opened
    }));
  }

  // Format hotel details
  formatHotelDetails(hotel) {
    return {
      id: hotel.hotel_id,
      name: hotel.hotel_name,
      description: hotel.description,
      facilities: hotel.facilities || [],
      photos: hotel.photos || [],
      policies: hotel.policies || {},
      rooms: hotel.rooms || [],
      location: {
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        address: hotel.address
      }
    };
  }

  // Fallback data for demo purposes when API is not available
  getFallbackData(params) {
    const fallbackHotels = [
      {
        id: 'booking_001',
        name: '東京ステーションホテル',
        location: {
          latitude: 35.6812,
          longitude: 139.7671,
          address: '東京都千代田区丸の内1-9-1',
          city: '東京',
          country: '日本'
        },
        rating: {
          stars: 5,
          review: {
            score: 9.1,
            count: 2847,
            description: '最高'
          }
        },
        price: {
          currency: 'JPY',
          total: 45000,
          perNight: 45000,
          taxesIncluded: true
        },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
            description: 'メイン画像'
          }
        ],
        amenities: ['WiFi無料', 'スパ', 'レストラン', 'コンシェルジュ', 'フィットネス'],
        policies: {
          checkin: '15:00',
          checkout: '11:00',
          cancellation: true
        },
        description: '東京駅に直結する歴史あるラグジュアリーホテル',
        source: 'booking.com',
        available: true
      },
      {
        id: 'booking_002',
        name: 'ハイアット リージェンシー 東京',
        location: {
          latitude: 35.6762,
          longitude: 139.7272,
          address: '東京都新宿区西新宿2-7-2',
          city: '東京',
          country: '日本'
        },
        rating: {
          stars: 5,
          review: {
            score: 8.8,
            count: 1923,
            description: '優秀'
          }
        },
        price: {
          currency: 'JPY',
          total: 32000,
          perNight: 32000,
          taxesIncluded: true
        },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
            description: 'メイン画像'
          }
        ],
        amenities: ['WiFi無料', 'プール', 'レストラン', 'バー', 'スパ'],
        policies: {
          checkin: '15:00',
          checkout: '12:00',
          cancellation: true
        },
        description: '新宿の中心部に位置する国際的なラグジュアリーホテル',
        source: 'booking.com',
        available: true
      },
      {
        id: 'booking_003',
        name: '京都ホテルオークラ',
        location: {
          latitude: 35.0116,
          longitude: 135.7681,
          address: '京都府京都市中京区河原町御池',
          city: '京都',
          country: '日本'
        },
        rating: {
          stars: 4,
          review: {
            score: 8.5,
            count: 1654,
            description: '優秀'
          }
        },
        price: {
          currency: 'JPY',
          total: 28000,
          perNight: 28000,
          taxesIncluded: true
        },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
            description: 'メイン画像'
          }
        ],
        amenities: ['WiFi無料', '温泉', '日本料理', '茶室', '庭園'],
        policies: {
          checkin: '15:00',
          checkout: '11:00',
          cancellation: true
        },
        description: '京都の伝統と現代の快適さを融合したホテル',
        source: 'booking.com',
        available: true
      }
    ];

    // Filter by location if specified
    if (params.cityName) {
      return fallbackHotels.filter(hotel => 
        hotel.location.city.includes(params.cityName) || 
        hotel.name.includes(params.cityName)
      );
    }

    return fallbackHotels;
  }

  // Combined search using multiple parameters
  async comprehensiveSearch(params) {
    try {
      let results = [];

      // Try coordinate-based search first
      if (params.latitude && params.longitude) {
        results = await this.searchByCoordinates(params.latitude, params.longitude, params);
      }
      // Fallback to city-based search
      else if (params.cityName) {
        const cityId = await this.getCityId(params.cityName);
        if (cityId) {
          results = await this.searchHotels({ ...params, cityId });
        } else {
          results = this.getFallbackData({ cityName: params.cityName });
        }
      }
      // Use fallback data
      else {
        results = this.getFallbackData(params);
      }

      return results;
    } catch (error) {
      console.error('Comprehensive search failed:', error);
      return this.getFallbackData(params);
    }
  }
}

export default new BookingAPI();