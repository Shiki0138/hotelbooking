import axios from 'axios';
import { cache } from '../cacheService';
import { logger } from '../../utils/logger';

interface Coordinates {
  lat: number;
  lon: number;
}

interface Address {
  display_name: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  road?: string;
  house_number?: string;
}

interface GeocodingResult {
  coordinates: Coordinates;
  address: Address;
  type: string;
  importance: number;
}

interface ReverseGeocodingResult {
  coordinates: Coordinates;
  address: Address;
  type: string;
  importance: number;
}

interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  coordinates: Coordinates;
  distance?: number;
}

export class GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private cacheTTL: number;
  private userAgent = 'LastMinuteStay/1.0 (https://lastminutestay.com)';

  constructor() {
    this.cacheTTL = parseInt(process.env.API_CACHE_TTL_GEOCODING || '86400');
  }

  async geocode(query: string, countryCode?: string): Promise<GeocodingResult[]> {
    const cacheKey = `geocoding:forward:${query}:${countryCode || 'any'}`;
    
    try {
      // Check cache first
      const cached = await cache.get<GeocodingResult[]>(cacheKey);
      if (cached) {
        logger.info('Geocoding data retrieved from cache');
        return cached;
      }

      // Build query params
      const params: any = {
        q: query,
        format: 'json',
        limit: 5,
        'accept-language': 'en'
      };

      if (countryCode) {
        params.countrycodes = countryCode.toLowerCase();
      }

      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/search`, {
        headers: {
          'User-Agent': this.userAgent
        },
        params,
        timeout: 5000
      });

      const results: GeocodingResult[] = response.data.map((item: any) => ({
        coordinates: {
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon)
        },
        address: {
          display_name: item.display_name,
          city: item.address?.city || item.address?.town || item.address?.village,
          state: item.address?.state,
          country: item.address?.country,
          postcode: item.address?.postcode,
          road: item.address?.road,
          house_number: item.address?.house_number
        },
        type: item.type,
        importance: item.importance
      }));

      // Cache the result
      await cache.set(cacheKey, results, this.cacheTTL);
      
      return results;
    } catch (error) {
      logger.error('Error geocoding address:', error);
      return [];
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
    const cacheKey = `geocoding:reverse:${lat}:${lon}`;
    
    try {
      // Check cache first
      const cached = await cache.get<ReverseGeocodingResult>(cacheKey);
      if (cached) {
        logger.info('Reverse geocoding data retrieved from cache');
        return cached;
      }

      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/reverse`, {
        headers: {
          'User-Agent': this.userAgent
        },
        params: {
          lat,
          lon,
          format: 'json',
          'accept-language': 'en'
        },
        timeout: 5000
      });

      const data = response.data;
      const result: GeocodingResult = {
        coordinates: { lat, lon },
        address: {
          display_name: data.display_name,
          city: data.address?.city || data.address?.town || data.address?.village,
          state: data.address?.state,
          country: data.address?.country,
          postcode: data.address?.postcode,
          road: data.address?.road,
          house_number: data.address?.house_number
        },
        type: data.type,
        importance: data.importance || 0
      };

      // Cache the result
      await cache.set(cacheKey, result, this.cacheTTL);
      
      return result;
    } catch (error) {
      logger.error('Error reverse geocoding:', error);
      return null;
    }
  }

  async searchNearby(lat: number, lon: number, type: string, radius: number = 5000): Promise<NearbyPlace[]> {
    const cacheKey = `geocoding:nearby:${lat}:${lon}:${type}:${radius}`;
    
    try {
      // Check cache first
      const cached = await cache.get<NearbyPlace[]>(cacheKey);
      if (cached) {
        logger.info('Nearby search data retrieved from cache');
        return cached;
      }

      // Use Overpass API for nearby POI search
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      const query = `
        [out:json][timeout:10];
        (
          node["amenity"="${type}"](around:${radius},${lat},${lon});
          way["amenity"="${type}"](around:${radius},${lat},${lon});
        );
        out body;
      `;

      const response = await axios.post(overpassUrl, query, {
        headers: {
          'Content-Type': 'text/plain'
        },
        timeout: 10000
      });

      const results: NearbyPlace[] = response.data.elements.map((item: any) => ({
        id: item.id?.toString() || Math.random().toString(),
        name: item.tags?.name || `${type} nearby`,
        type: type,
        coordinates: {
          lat: item.lat || item.center?.lat,
          lon: item.lon || item.center?.lon
        }
      })).filter((r: NearbyPlace) => r.coordinates.lat && r.coordinates.lon);

      // Cache the result for shorter time
      await cache.set(cacheKey, results, 3600);
      
      return results;
    } catch (error) {
      logger.error('Error searching nearby:', error);
      return [];
    }
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const geocodingService = new GeocodingService();