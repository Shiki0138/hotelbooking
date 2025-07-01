// POI (Points of Interest) Service for fetching nearby facilities
import axios from 'axios';
import { POI_CATEGORIES } from './mapbox-config';

const FOURSQUARE_API_KEY = process.env.REACT_APP_FOURSQUARE_KEY || 'your-foursquare-key';
const GOOGLE_PLACES_KEY = process.env.REACT_APP_GOOGLE_PLACES_KEY || 'your-google-places-key';

// POI Service class
export class POIService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  // Get POIs around a location
  async getPOIsNearLocation(lat, lng, radius = 1000, categories = []) {
    const cacheKey = `${lat},${lng},${radius},${categories.join(',')}`;
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Fetch POIs from multiple sources
      const [foursquarePOIs, googlePOIs, customPOIs] = await Promise.all([
        this.fetchFoursquarePOIs(lat, lng, radius, categories),
        this.fetchGooglePlacesPOIs(lat, lng, radius, categories),
        this.fetchCustomPOIs(lat, lng, radius, categories)
      ]);

      // Merge and deduplicate POIs
      const allPOIs = this.mergePOIs([
        ...foursquarePOIs,
        ...googlePOIs,
        ...customPOIs
      ]);

      // Categorize POIs
      const categorizedPOIs = this.categorizePOIs(allPOIs);

      // Cache results
      this.setCache(cacheKey, categorizedPOIs);

      return categorizedPOIs;
    } catch (error) {
      console.error('Error fetching POIs:', error);
      return {};
    }
  }

  // Fetch from Foursquare API
  async fetchFoursquarePOIs(lat, lng, radius, categories) {
    const categoryMap = {
      STATION: '4bf58dd8d48988d129951735', // Train Station
      TOURIST: '4deefb944765f83613cdba6e', // Historic Site
      RESTAURANT: '4d4b7105d754a06374d81259', // Food
      SHOPPING: '4d4b7105d754a06378d81259', // Shop & Service
      CONVENIENCE: '4d4b7105d754a06378d81259' // Shop
    };

    const promises = categories.map(async (category) => {
      const categoryId = categoryMap[category];
      if (!categoryId) return [];

      try {
        const response = await axios.get('https://api.foursquare.com/v3/places/search', {
          headers: {
            'Authorization': FOURSQUARE_API_KEY
          },
          params: {
            ll: `${lat},${lng}`,
            radius: radius,
            categories: categoryId,
            limit: 20,
            fields: 'fsq_id,name,location,categories,distance'
          }
        });

        return response.data.results.map(place => ({
          id: place.fsq_id,
          name: place.name,
          category: category,
          lat: place.location.lat,
          lng: place.location.lng,
          address: place.location.formatted_address,
          distance: place.distance,
          source: 'foursquare'
        }));
      } catch (error) {
        console.error(`Foursquare error for ${category}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  // Fetch from Google Places API
  async fetchGooglePlacesPOIs(lat, lng, radius, categories) {
    const typeMap = {
      STATION: 'train_station|subway_station',
      TOURIST: 'tourist_attraction|museum|park',
      RESTAURANT: 'restaurant|cafe',
      SHOPPING: 'shopping_mall|department_store',
      CONVENIENCE: 'convenience_store'
    };

    const promises = categories.map(async (category) => {
      const types = typeMap[category];
      if (!types) return [];

      try {
        const response = await axios.get('/api/places/nearby', {
          params: {
            location: `${lat},${lng}`,
            radius: radius,
            type: types,
            key: GOOGLE_PLACES_KEY
          }
        });

        return response.data.results.map(place => ({
          id: place.place_id,
          name: place.name,
          category: category,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          address: place.vicinity,
          rating: place.rating,
          source: 'google'
        }));
      } catch (error) {
        console.error(`Google Places error for ${category}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  // Fetch custom POIs from our database
  async fetchCustomPOIs(lat, lng, radius, categories) {
    try {
      const response = await axios.get('/api/pois/nearby', {
        params: {
          lat,
          lng,
          radius,
          categories: categories.join(',')
        }
      });

      return response.data.pois.map(poi => ({
        ...poi,
        source: 'custom'
      }));
    } catch (error) {
      console.error('Custom POI error:', error);
      return [];
    }
  }

  // Merge and deduplicate POIs
  mergePOIs(pois) {
    const uniquePOIs = new Map();

    pois.forEach(poi => {
      // Create a unique key based on name and approximate location
      const key = `${poi.name.toLowerCase()}_${Math.round(poi.lat * 1000)}_${Math.round(poi.lng * 1000)}`;
      
      if (!uniquePOIs.has(key) || poi.source === 'custom') {
        uniquePOIs.set(key, poi);
      }
    });

    return Array.from(uniquePOIs.values());
  }

  // Categorize POIs by type
  categorizePOIs(pois) {
    const categorized = {};

    Object.keys(POI_CATEGORIES).forEach(category => {
      categorized[category] = [];
    });

    pois.forEach(poi => {
      if (categorized[poi.category]) {
        categorized[poi.category].push(poi);
      }
    });

    // Sort by distance
    Object.keys(categorized).forEach(category => {
      categorized[category].sort((a, b) => (a.distance || 0) - (b.distance || 0));
    });

    return categorized;
  }

  // Get train stations with route info
  async getTrainStationsWithRoutes(lat, lng, radius = 2000) {
    const stations = await this.getPOIsNearLocation(lat, lng, radius, ['STATION']);
    
    // Enhance with route information
    const enhancedStations = await Promise.all(
      stations.STATION.map(async (station) => {
        try {
          const routes = await this.getTrainRoutes(station.id);
          return {
            ...station,
            routes: routes,
            walkingTime: Math.round(station.distance / 80) // 80m/min walking speed
          };
        } catch (error) {
          return station;
        }
      })
    );

    return enhancedStations;
  }

  // Get train routes for a station
  async getTrainRoutes(stationId) {
    // This would connect to a train route API
    // For now, return mock data
    return [
      { line: 'JR山手線', direction: '渋谷・新宿方面' },
      { line: '東京メトロ銀座線', direction: '銀座・浅草方面' }
    ];
  }

  // Get tourist attractions with details
  async getTouristAttractions(lat, lng, radius = 3000) {
    const attractions = await this.getPOIsNearLocation(lat, lng, radius, ['TOURIST']);
    
    // Enhance with additional details
    const enhanced = await Promise.all(
      attractions.TOURIST.map(async (attraction) => {
        try {
          const details = await this.getAttractionDetails(attraction.id);
          return {
            ...attraction,
            ...details
          };
        } catch (error) {
          return attraction;
        }
      })
    );

    return enhanced;
  }

  // Get attraction details
  async getAttractionDetails(attractionId) {
    // Mock implementation - would connect to real API
    return {
      openingHours: '9:00 - 17:00',
      admissionFee: '¥500',
      description: '人気の観光スポット',
      photos: ['/images/attraction-placeholder.jpg']
    };
  }

  // Get restaurants with cuisine types
  async getRestaurants(lat, lng, radius = 1000, cuisineType = null) {
    const restaurants = await this.getPOIsNearLocation(lat, lng, radius, ['RESTAURANT']);
    
    let filtered = restaurants.RESTAURANT;
    
    if (cuisineType) {
      filtered = filtered.filter(restaurant => 
        restaurant.cuisineTypes && restaurant.cuisineTypes.includes(cuisineType)
      );
    }

    return filtered;
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
export const poiService = new POIService();

// React hook for using POI service
export const usePOIs = (lat, lng, radius, categories) => {
  const [pois, setPOIs] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!lat || !lng) return;

    const fetchPOIs = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await poiService.getPOIsNearLocation(
          lat, 
          lng, 
          radius, 
          categories
        );
        setPOIs(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPOIs();
  }, [lat, lng, radius, categories.join(',')]);

  return { pois, loading, error };
};