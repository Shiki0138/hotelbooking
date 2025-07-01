// Unified Hotel Search Service combining multiple APIs
import AmadeusAPI from './api/amadeus.js';
import BookingAPI from './api/booking.js';
import RakutenTravelAPI from './api/rakutenTravel.js';

class HotelSearchService {
  constructor() {
    this.searchCache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
  }

  // Main search function combining multiple sources
  async searchHotels(searchParams) {
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
      sortBy = 'price'
    } = searchParams;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(searchParams);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Start searches in parallel
      const searchPromises = [];

      // Rakuten Travel search (Priority for Japan)
      if (this.isJapanLocation(location)) {
        searchPromises.push(
          this.searchRakuten(searchParams)
            .catch(error => {
              console.warn('Rakuten Travel search failed:', error);
              return [];
            })
        );
      }

      // Amadeus search
      searchPromises.push(
        this.searchAmadeus(searchParams)
          .catch(error => {
            console.warn('Amadeus search failed:', error);
            return [];
          })
      );

      // Booking.com search
      searchPromises.push(
        this.searchBooking(searchParams)
          .catch(error => {
            console.warn('Booking.com search failed:', error);
            return [];
          })
      );

      // Wait for all searches to complete
      const searchResults = await Promise.all(searchPromises);

      // Combine and deduplicate results
      const combinedResults = this.combineAllResults(searchResults);

      // Apply filters and sorting
      const filteredResults = this.applyFilters(combinedResults, {
        minPrice,
        maxPrice,
        rating,
        amenities
      });

      const sortedResults = this.sortResults(filteredResults, sortBy);

      // Cache results
      this.saveToCache(cacheKey, sortedResults);

      return sortedResults;
    } catch (error) {
      console.error('Hotel search failed:', error);
      return [];
    }
  }

  // Search using Amadeus API
  async searchAmadeus(params) {
    try {
      return await AmadeusAPI.advancedHotelSearch({
        location: params.location,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        guests: params.guests,
        rooms: params.rooms,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        rating: params.rating,
        amenities: params.amenities
      });
    } catch (error) {
      console.error('Amadeus search error:', error);
      return [];
    }
  }

  // Search using Booking.com API
  async searchBooking(params) {
    try {
      return await BookingAPI.comprehensiveSearch({
        latitude: params.location.latitude,
        longitude: params.location.longitude,
        cityName: params.location.city || params.location.name,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        guests: params.guests,
        rooms: params.rooms,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        rating: params.rating
      });
    } catch (error) {
      console.error('Booking.com search error:', error);
      return [];
    }
  }

  // Search using Rakuten Travel API (for Japan)
  async searchRakuten(params) {
    try {
      // Determine area from location
      const area = this.getJapanArea(params.location);
      
      if (params.checkIn && params.checkOut) {
        // Search with dates (vacant rooms)
        return await RakutenTravelAPI.searchVacantRooms({
          area: area.area,
          subArea: area.subArea,
          checkinDate: params.checkIn,
          checkoutDate: params.checkOut,
          adults: params.guests || 2,
          rooms: params.rooms || 1,
          keyword: params.location.name,
          limit: 50
        });
      } else {
        // General area search
        return await RakutenTravelAPI.searchByArea({
          area: area.area,
          subArea: area.subArea,
          limit: 50
        });
      }
    } catch (error) {
      console.error('Rakuten Travel search error:', error);
      return [];
    }
  }

  // Check if location is in Japan
  isJapanLocation(location) {
    if (!location) return false;
    
    const japanCities = ['東京', '大阪', '京都', '名古屋', '福岡', '横浜', '神戸', '札幌', '仙台', '広島'];
    const locationName = (location.name || location.city || '').toLowerCase();
    
    return japanCities.some(city => locationName.includes(city)) ||
           location.country === '日本' ||
           location.country === 'Japan' ||
           location.country === 'JP' ||
           (location.latitude >= 24 && location.latitude <= 46 && 
            location.longitude >= 122 && location.longitude <= 146);
  }

  // Get Japan area code from location
  getJapanArea(location) {
    const locationName = (location.name || location.city || '').toLowerCase();
    
    if (locationName.includes('東京') || locationName.includes('tokyo')) {
      if (locationName.includes('新宿')) return { area: 'tokyo', subArea: 'shinjuku' };
      if (locationName.includes('渋谷')) return { area: 'tokyo', subArea: 'shibuya' };
      if (locationName.includes('銀座')) return { area: 'tokyo', subArea: 'ginza' };
      if (locationName.includes('浅草')) return { area: 'tokyo', subArea: 'asakusa' };
      return { area: 'tokyo', subArea: null };
    }
    
    if (locationName.includes('大阪') || locationName.includes('osaka')) {
      if (locationName.includes('梅田')) return { area: 'osaka', subArea: 'umeda' };
      if (locationName.includes('難波') || locationName.includes('なんば')) return { area: 'osaka', subArea: 'namba' };
      return { area: 'osaka', subArea: null };
    }
    
    if (locationName.includes('京都') || locationName.includes('kyoto')) {
      if (locationName.includes('祇園')) return { area: 'kyoto', subArea: 'gion' };
      if (locationName.includes('嵐山')) return { area: 'kyoto', subArea: 'arashiyama' };
      return { area: 'kyoto', subArea: null };
    }
    
    // Default to Tokyo for other Japan locations
    return { area: 'tokyo', subArea: null };
  }

  // Combine results from all sources
  combineAllResults(allResults) {
    const combined = [];
    const seenHotels = new Set();

    // Process each result set
    allResults.forEach(results => {
      results.forEach(hotel => {
        const key = this.generateHotelKey(hotel);
        if (!seenHotels.has(key)) {
          combined.push(this.normalizeHotelData(hotel));
          seenHotels.add(key);
        } else {
          // If hotel exists, merge pricing information
          const existingIndex = combined.findIndex(h => this.generateHotelKey(h) === key);
          if (existingIndex !== -1) {
            combined[existingIndex] = this.mergeHotelData(combined[existingIndex], hotel);
          }
        }
      });
    });

    return combined;
  }

  // Combine results from different sources (legacy method)
  combineResults(amadeusResults, bookingResults) {
    return this.combineAllResults([amadeusResults, bookingResults]);
  }

  // Generate unique key for hotel deduplication
  generateHotelKey(hotel) {
    // Use name and approximate location for matching
    const name = hotel.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const lat = hotel.location?.latitude ? Math.round(hotel.location.latitude * 1000) : 0;
    const lng = hotel.location?.longitude ? Math.round(hotel.location.longitude * 1000) : 0;
    return `${name}_${lat}_${lng}`;
  }

  // Normalize hotel data from different sources
  normalizeHotelData(hotel) {
    // Handle Rakuten Travel format
    if (hotel.address && hotel.pricing) {
      return {
        id: hotel.id,
        name: hotel.name,
        nameKana: hotel.nameKana,
        location: {
          latitude: hotel.location?.latitude,
          longitude: hotel.location?.longitude,
          address: hotel.address?.fullAddress || hotel.address?.street,
          city: hotel.address?.city,
          country: '日本'
        },
        rating: {
          stars: Math.ceil(hotel.reviewAverage || hotel.rating?.overall || 0),
          review: {
            score: hotel.reviewAverage || hotel.rating?.overall || 0,
            count: hotel.reviewCount || 0,
            description: hotel.hotelType || ''
          }
        },
        price: {
          currency: hotel.pricing?.currency || 'JPY',
          total: hotel.currentPrice || hotel.pricing?.minPrice || 0,
          perNight: hotel.currentPrice || hotel.pricing?.minPrice || 0,
          original: hotel.pricing?.maxPrice,
          discount: null
        },
        images: hotel.imageUrl ? [
          {
            url: hotel.imageUrl,
            description: hotel.name
          },
          {
            url: hotel.thumbnailUrl,
            description: `${hotel.name} サムネイル`
          }
        ] : [],
        amenities: hotel.amenities || [],
        description: hotel.description || '',
        policies: {
          checkIn: hotel.checkIn,
          checkOut: hotel.checkOut
        },
        offers: [],
        source: 'rakuten',
        available: hotel.availableRooms > 0 || true,
        access: hotel.access,
        nearestStation: hotel.nearestStation,
        telephone: hotel.telephone,
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Handle other formats (Amadeus, Booking.com)
    return {
      id: hotel.id,
      name: hotel.name,
      location: {
        latitude: hotel.location?.latitude,
        longitude: hotel.location?.longitude,
        address: hotel.location?.address,
        city: hotel.location?.city,
        country: hotel.location?.country
      },
      rating: {
        stars: hotel.rating?.stars || hotel.rating || 0,
        review: hotel.rating?.review || {
          score: 0,
          count: 0,
          description: ''
        }
      },
      price: {
        currency: hotel.currency || hotel.price?.currency || 'JPY',
        total: hotel.bestPrice || hotel.price?.total || 0,
        perNight: hotel.price?.perNight || hotel.bestPrice || hotel.price?.total || 0,
        original: hotel.price?.original,
        discount: hotel.price?.discount
      },
      images: hotel.images || [
        {
          url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
          description: 'Hotel image'
        }
      ],
      amenities: hotel.amenities || [],
      description: hotel.description || '',
      policies: hotel.policies || {},
      offers: hotel.offers || [],
      source: hotel.source || 'unknown',
      available: hotel.available !== false,
      lastUpdated: new Date().toISOString()
    };
  }

  // Merge hotel data from multiple sources
  mergeHotelData(existing, additional) {
    return {
      ...existing,
      // Keep the best price
      price: {
        ...existing.price,
        total: Math.min(existing.price.total || Infinity, additional.price?.total || Infinity),
        sources: [
          ...(existing.price.sources || []),
          {
            source: additional.source,
            price: additional.price?.total || additional.bestPrice
          }
        ]
      },
      // Combine amenities
      amenities: [...new Set([...existing.amenities, ...(additional.amenities || [])])],
      // Combine images
      images: [
        ...existing.images,
        ...(additional.images || []).filter(img => 
          !existing.images.some(existingImg => existingImg.url === img.url)
        )
      ],
      // Add source information
      sources: [
        ...(existing.sources || [existing.source]),
        additional.source
      ].filter((source, index, arr) => arr.indexOf(source) === index)
    };
  }

  // Apply filters to search results
  applyFilters(hotels, filters) {
    return hotels.filter(hotel => {
      // Price filters
      if (filters.minPrice && hotel.price.total < filters.minPrice) return false;
      if (filters.maxPrice && hotel.price.total > filters.maxPrice) return false;

      // Rating filter
      if (filters.rating && hotel.rating.stars < filters.rating) return false;

      // Amenities filter
      if (filters.amenities && filters.amenities.length > 0) {
        const hotelAmenities = hotel.amenities.map(a => a.toLowerCase());
        const hasRequiredAmenities = filters.amenities.every(amenity =>
          hotelAmenities.some(ha => ha.includes(amenity.toLowerCase()))
        );
        if (!hasRequiredAmenities) return false;
      }

      return true;
    });
  }

  // Sort search results
  sortResults(hotels, sortBy) {
    const sortedHotels = [...hotels];

    switch (sortBy) {
      case 'price_low':
        return sortedHotels.sort((a, b) => a.price.total - b.price.total);
      
      case 'price_high':
        return sortedHotels.sort((a, b) => b.price.total - a.price.total);
      
      case 'rating':
        return sortedHotels.sort((a, b) => {
          const aRating = a.rating.review.score || a.rating.stars;
          const bRating = b.rating.review.score || b.rating.stars;
          return bRating - aRating;
        });
      
      case 'distance':
        // Sort by distance if available
        return sortedHotels.sort((a, b) => {
          const aDist = a.distance || 0;
          const bDist = b.distance || 0;
          return aDist - bDist;
        });
      
      case 'popularity':
        return sortedHotels.sort((a, b) => {
          const aPopularity = a.rating.review.count || 0;
          const bPopularity = b.rating.review.count || 0;
          return bPopularity - aPopularity;
        });
      
      default:
        return sortedHotels.sort((a, b) => a.price.total - b.price.total);
    }
  }

  // Cache management
  generateCacheKey(params) {
    return JSON.stringify({
      location: params.location,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      guests: params.guests,
      rooms: params.rooms
    });
  }

  getFromCache(key) {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  saveToCache(key, data) {
    this.searchCache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (this.searchCache.size > 50) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  // Quick search for autocomplete
  async quickSearch(query) {
    try {
      // Simple search for popular destinations
      const popularDestinations = [
        { name: '東京', city: '東京', country: '日本', latitude: 35.6762, longitude: 139.6503 },
        { name: '東京・新宿', city: '新宿', country: '日本', latitude: 35.6896, longitude: 139.6995 },
        { name: '東京・渋谷', city: '渋谷', country: '日本', latitude: 35.6580, longitude: 139.7016 },
        { name: '大阪', city: '大阪', country: '日本', latitude: 34.6937, longitude: 135.5023 },
        { name: '大阪・梅田', city: '梅田', country: '日本', latitude: 34.7055, longitude: 135.4983 },
        { name: '京都', city: '京都', country: '日本', latitude: 35.0116, longitude: 135.7681 },
        { name: '京都・祇園', city: '祇園', country: '日本', latitude: 35.0031, longitude: 135.7766 },
        { name: '名古屋', city: '名古屋', country: '日本', latitude: 35.1815, longitude: 136.9066 },
        { name: '福岡', city: '福岡', country: '日本', latitude: 33.5904, longitude: 130.4017 },
        { name: 'パリ', city: 'パリ', country: 'フランス', latitude: 48.8566, longitude: 2.3522 },
        { name: 'ロンドン', city: 'ロンドン', country: 'イギリス', latitude: 51.5074, longitude: -0.1278 },
        { name: 'ニューヨーク', city: 'ニューヨーク', country: 'アメリカ', latitude: 40.7128, longitude: -74.0060 }
      ];

      return popularDestinations.filter(dest =>
        dest.name.toLowerCase().includes(query.toLowerCase()) ||
        dest.city.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Quick search failed:', error);
      return [];
    }
  }

  // Get hotel comparison data
  async compareHotels(hotelIds) {
    try {
      const promises = hotelIds.map(async (id) => {
        // Try to get hotel details from different sources
        const amadeusDetails = await AmadeusAPI.getHotelOffers([id], 
          new Date().toISOString().split('T')[0], 
          new Date(Date.now() + 86400000).toISOString().split('T')[0]
        ).catch(() => null);

        const bookingDetails = await BookingAPI.getHotelDetails(id)
          .catch(() => null);

        return {
          amadeus: amadeusDetails?.[0],
          booking: bookingDetails
        };
      });

      const results = await Promise.all(promises);
      return results.map(result => this.mergeHotelData(
        result.amadeus || {},
        result.booking || {}
      ));
    } catch (error) {
      console.error('Hotel comparison failed:', error);
      return [];
    }
  }

  // Clear cache
  clearCache() {
    this.searchCache.clear();
  }
}

export default new HotelSearchService();