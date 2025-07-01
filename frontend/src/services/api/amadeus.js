// Amadeus Hotel Search API Integration
class AmadeusAPI {
  constructor() {
    this.baseURL = 'https://test.api.amadeus.com/v3';
    this.authURL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
    this.clientId = import.meta.env.VITE_AMADEUS_CLIENT_ID;
    this.clientSecret = import.meta.env.VITE_AMADEUS_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get OAuth2 access token
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    try {
      const response = await fetch(this.authURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });

      if (!response.ok) {
        throw new Error(`Auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Amadeus authentication failed:', error);
      throw error;
    }
  }

  // Search hotels by location
  async searchHotels(params) {
    try {
      const token = await this.getAccessToken();
      
      const searchParams = new URLSearchParams({
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius || 5,
        radiusUnit: 'KM',
        chainCodes: params.chainCodes || '',
        amenities: params.amenities || '',
        ratings: params.ratings || '',
        hotelSource: 'ALL'
      });

      const response = await fetch(`${this.baseURL}/reference-data/locations/hotels/by-geocode?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Hotel search failed: ${response.status}`);
      }

      const data = await response.json();
      return this.formatHotelResults(data.data || []);
    } catch (error) {
      console.error('Hotel search failed:', error);
      return [];
    }
  }

  // Get hotel offers (pricing and availability)
  async getHotelOffers(hotelIds, checkIn, checkOut, guests = 1, rooms = 1) {
    try {
      const token = await this.getAccessToken();
      
      const searchParams = new URLSearchParams({
        hotelIds: Array.isArray(hotelIds) ? hotelIds.join(',') : hotelIds,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: guests,
        rooms: rooms,
        currency: 'JPY',
        lang: 'JA'
      });

      const response = await fetch(`${this.baseURL}/shopping/hotel-offers?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Hotel offers failed: ${response.status}`);
      }

      const data = await response.json();
      return this.formatOfferResults(data.data || []);
    } catch (error) {
      console.error('Hotel offers failed:', error);
      return [];
    }
  }

  // Search hotels by city
  async searchHotelsByCity(cityCode, checkIn, checkOut, guests = 1, rooms = 1) {
    try {
      const token = await this.getAccessToken();
      
      const searchParams = new URLSearchParams({
        cityCode: cityCode,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: guests,
        rooms: rooms,
        currency: 'JPY',
        lang: 'JA',
        sortBy: 'PRICE'
      });

      const response = await fetch(`${this.baseURL}/shopping/hotel-offers?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json'
        }
      });

      if (!response.ok) {
        throw new Error(`City hotel search failed: ${response.status}`);
      }

      const data = await response.json();
      return this.formatOfferResults(data.data || []);
    } catch (error) {
      console.error('City hotel search failed:', error);
      return [];
    }
  }

  // Get city codes for popular destinations
  getCityCode(cityName) {
    const cityCodes = {
      '東京': 'TYO',
      'tokyo': 'TYO',
      '大阪': 'OSA', 
      'osaka': 'OSA',
      '京都': 'KIX',
      'kyoto': 'KIX',
      '名古屋': 'NGO',
      'nagoya': 'NGO',
      '福岡': 'FUK',
      'fukuoka': 'FUK',
      '札幌': 'CTS',
      'sapporo': 'CTS',
      '沖縄': 'OKA',
      'okinawa': 'OKA',
      'paris': 'PAR',
      'london': 'LON',
      'new york': 'NYC',
      'los angeles': 'LAX'
    };
    
    return cityCodes[cityName.toLowerCase()] || cityName.toUpperCase();
  }

  // Format hotel search results
  formatHotelResults(hotels) {
    return hotels.map(hotel => ({
      id: hotel.hotelId,
      name: hotel.name,
      location: {
        latitude: hotel.geoCode?.latitude,
        longitude: hotel.geoCode?.longitude,
        address: hotel.address
      },
      distance: hotel.distance?.value,
      distanceUnit: hotel.distance?.unit,
      chainCode: hotel.chainCode,
      iataCode: hotel.iataCode,
      source: 'amadeus'
    }));
  }

  // Format hotel offer results
  formatOfferResults(offers) {
    return offers.map(offer => {
      const hotel = offer.hotel;
      const bestOffer = offer.offers?.[0];
      
      return {
        id: hotel.hotelId,
        name: hotel.name,
        location: {
          latitude: hotel.latitude,
          longitude: hotel.longitude
        },
        rating: hotel.rating,
        amenities: hotel.amenities || [],
        offers: offer.offers?.map(o => ({
          id: o.id,
          checkInDate: o.checkInDate,
          checkOutDate: o.checkOutDate,
          roomType: o.room?.type,
          roomDescription: o.room?.description?.text,
          bedType: o.room?.bedType,
          guests: o.guests?.adults,
          price: {
            currency: o.price?.currency,
            total: parseFloat(o.price?.total),
            base: parseFloat(o.price?.base),
            taxes: o.price?.taxes?.map(tax => ({
              code: tax.code,
              amount: parseFloat(tax.amount),
              currency: tax.currency
            }))
          },
          policies: {
            paymentType: o.policies?.paymentType,
            cancellation: o.policies?.cancellation
          },
          rateCode: o.rateCode,
          rateFamilyEstimated: o.rateFamilyEstimated
        })) || [],
        bestPrice: bestOffer ? parseFloat(bestOffer.price?.total) : null,
        currency: bestOffer?.price?.currency || 'JPY',
        source: 'amadeus'
      };
    });
  }

  // Advanced search with filters
  async advancedHotelSearch(params) {
    const {
      location,
      checkIn,
      checkOut,
      guests = 1,
      rooms = 1,
      minPrice,
      maxPrice,
      rating,
      amenities,
      chainCodes,
      radius = 5
    } = params;

    try {
      let results = [];

      // If location has coordinates, search by geocode
      if (location.latitude && location.longitude) {
        const hotels = await this.searchHotels({
          latitude: location.latitude,
          longitude: location.longitude,
          radius,
          amenities,
          chainCodes,
          ratings: rating
        });

        if (hotels.length > 0) {
          const hotelIds = hotels.map(h => h.id).slice(0, 20); // Limit to 20 hotels
          results = await this.getHotelOffers(hotelIds, checkIn, checkOut, guests, rooms);
        }
      } 
      // Otherwise search by city
      else if (location.city) {
        const cityCode = this.getCityCode(location.city);
        results = await this.searchHotelsByCity(cityCode, checkIn, checkOut, guests, rooms);
      }

      // Apply filters
      if (minPrice || maxPrice) {
        results = results.filter(hotel => {
          if (!hotel.bestPrice) return false;
          if (minPrice && hotel.bestPrice < minPrice) return false;
          if (maxPrice && hotel.bestPrice > maxPrice) return false;
          return true;
        });
      }

      return results;
    } catch (error) {
      console.error('Advanced hotel search failed:', error);
      return [];
    }
  }
}

export default new AmadeusAPI();