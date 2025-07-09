import { createClient } from '@supabase/supabase-js';
import { cache, cacheKeys } from './cacheService';
import { SearchFilters, PaginatedResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const CACHE_TTL = 3600; // 1 hour

// Initialize Supabase client (only if credentials are available)
let supabase: any = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export class HotelService {
  
  async searchHotels(filters: SearchFilters): Promise<PaginatedResponse<any>> {
    const {
      city,
      country,
      checkIn: _checkIn,
      checkOut: _checkOut,
      guests,
      minPrice = 0,
      maxPrice = 10000,
      rating,
      amenities = [],
      radius,
      latitude,
      longitude,
      sortBy = 'price',
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = filters;
    
    const cacheKey = `hotels:search:${JSON.stringify(filters)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.info('Returning cached hotel search results');
      return cached as PaginatedResponse<any>;
    }
    
    try {
      // Check if Supabase is available
      if (!supabase) {
        logger.warn('Supabase not configured, returning mock data');
        return this.getMockSearchResults(filters);
      }
      
      // Start building the query
      let query = supabase
        .from('hotels')
        .select('*, rooms(*)', { count: 'exact' });
      
      // Apply filters
      if (city) {
        query = query.ilike('city', `%${city}%`);
      }
      if (country) {
        query = query.ilike('country', `%${country}%`);
      }
      if (rating) {
        query = query.gte('rating', rating);
      }
      
      // Price filter through rooms
      query = query.gte('min_price', minPrice);
      query = query.lte('max_price', maxPrice);
      
      // Amenities filter
      if (amenities.length > 0) {
        query = query.contains('amenities', amenities);
      }
      
      // Location-based search
      if (latitude && longitude && radius) {
        // Supabase doesn't have built-in geospatial functions like PostGIS
        // You would need to enable PostGIS extension and use raw SQL
        // For now, we'll skip this filter
        logger.warn('Location-based filtering not fully implemented in Supabase version');
      }
      
      // Sorting
      const sortColumn = sortBy === 'price' ? 'min_price' : sortBy;
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
      
      // Pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
      
      const { data: hotels, error, count } = await query;
      
      if (error) {
        throw new AppError(500, `Database error: ${error.message}`);
      }
      
      // Filter rooms based on availability and guest count
      const availableHotels = hotels?.map((hotel: any) => {
        const availableRooms = hotel.rooms?.filter((room: any) => 
          room.capacity >= guests
        );
        
        return {
          ...hotel,
          rooms: availableRooms,
          availableRooms: availableRooms?.length || 0,
          lowestPrice: availableRooms?.reduce((min: number, room: any) => 
            Math.min(min, room.price), Infinity
          ) || hotel.min_price
        };
      }).filter((hotel: any) => hotel.availableRooms > 0) || [];
      
      const result = {
        data: availableHotels,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
      
      await cache.set(cacheKey, result, CACHE_TTL);
      
      return result;
    } catch (error) {
      logger.error('Error searching hotels:', error);
      
      // Return mock data in case of error
      return this.getMockSearchResults(filters);
    }
  }
  
  async getHotel(id: string): Promise<any> {
    const cacheKey = `${cacheKeys.hotel(id)}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      logger.info(`Returning cached hotel ${id}`);
      return cached;
    }
    
    try {
      if (!supabase) {
        logger.warn('Supabase not configured, returning mock data');
        const mockHotel = this.getMockHotels().find(h => h.id === id);
        if (!mockHotel) {
          throw new AppError(404, 'Hotel not found');
        }
        return mockHotel;
      }
      
      const { data: hotel, error } = await supabase
        .from('hotels')
        .select('*, rooms(*)')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError(404, 'Hotel not found');
        }
        throw new AppError(500, `Database error: ${error.message}`);
      }
      
      await cache.set(cacheKey, hotel, CACHE_TTL);
      
      return hotel;
    } catch (error) {
      logger.error(`Error getting hotel ${id}:`, error);
      
      // Return mock data
      const mockHotel = this.getMockHotels().find(h => h.id === id);
      if (!mockHotel) {
        throw new AppError(404, 'Hotel not found');
      }
      return mockHotel;
    }
  }
  
  async createHotel(data: any): Promise<any> {
    try {
      const { data: hotel, error } = await supabase
        .from('hotels')
        .insert(data)
        .select()
        .single();
      
      if (error) {
        throw new AppError(500, `Database error: ${error.message}`);
      }
      
      // Clear cache
      await cache.del('hotels:*');
      
      return hotel;
    } catch (error) {
      logger.error('Error creating hotel:', error);
      throw error;
    }
  }
  
  async updateHotel(id: string, data: any): Promise<any> {
    try {
      const { data: hotel, error } = await supabase
        .from('hotels')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError(404, 'Hotel not found');
        }
        throw new AppError(500, `Database error: ${error.message}`);
      }
      
      // Clear cache
      await cache.del(cacheKeys.hotel(id));
      await cache.del('hotels:*');
      
      return hotel;
    } catch (error) {
      logger.error(`Error updating hotel ${id}:`, error);
      throw error;
    }
  }
  
  async deleteHotel(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('hotels')
        .delete()
        .eq('id', id);
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError(404, 'Hotel not found');
        }
        throw new AppError(500, `Database error: ${error.message}`);
      }
      
      // Clear cache
      await cache.del(cacheKeys.hotel(id));
      await cache.del('hotels:*');
    } catch (error) {
      logger.error(`Error deleting hotel ${id}:`, error);
      throw error;
    }
  }
  
  async getHotelsByLocation(latitude: number, longitude: number, radius: number): Promise<any[]> {
    const cacheKey = `hotels:location:${latitude}:${longitude}:${radius}`;
    const cached = await cache.get(cacheKey);
    
    if (cached) {
      return cached as any[];
    }
    
    try {
      // For a proper implementation, you would need PostGIS extension in Supabase
      // This is a simplified version
      const { data: hotels, error } = await supabase
        .from('hotels')
        .select('*')
        .gte('latitude', latitude - (radius / 111)) // Rough conversion
        .lte('latitude', latitude + (radius / 111))
        .gte('longitude', longitude - (radius / 111))
        .lte('longitude', longitude + (radius / 111));
      
      if (error) {
        throw new AppError(500, `Database error: ${error.message}`);
      }
      
      await cache.set(cacheKey, hotels, CACHE_TTL);
      
      return hotels || [];
    } catch (error) {
      logger.error('Error getting hotels by location:', error);
      return this.getMockHotels();
    }
  }
  
  // Mock data methods
  private getMockHotels(): any[] {
    return [
      {
        id: '1',
        name: 'Tokyo Grand Hotel',
        description: 'Luxury hotel in Tokyo',
        address: 'Tokyo, Japan',
        city: 'Tokyo',
        country: 'Japan',
        latitude: 35.6762,
        longitude: 139.6503,
        rating: 4.5,
        min_price: 100,
        max_price: 500,
        amenities: ['wifi', 'parking', 'pool', 'gym'],
        images: ['https://images.unsplash.com/photo-1564501049412-61c2a3083791'],
        rooms: [
          {
            id: '1',
            hotel_id: '1',
            name: 'Standard Room',
            description: 'Comfortable standard room',
            capacity: 2,
            price: 100,
            amenities: ['wifi', 'tv', 'minibar']
          }
        ]
      },
      {
        id: '2',
        name: 'Osaka Business Hotel',
        description: 'Modern business hotel',
        address: 'Osaka, Japan',
        city: 'Osaka',
        country: 'Japan',
        latitude: 34.6937,
        longitude: 135.5023,
        rating: 4.0,
        min_price: 80,
        max_price: 200,
        amenities: ['wifi', 'parking', 'restaurant'],
        images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa'],
        rooms: [
          {
            id: '2',
            hotel_id: '2',
            name: 'Business Room',
            description: 'Perfect for business travelers',
            capacity: 1,
            price: 80,
            amenities: ['wifi', 'desk', 'coffee maker']
          }
        ]
      }
    ];
  }
  
  private getMockSearchResults(filters: SearchFilters): PaginatedResponse<any> {
    const mockHotels = this.getMockHotels();
    
    // Simple filtering
    let filtered = mockHotels;
    if (filters.city) {
      filtered = filtered.filter(h => 
        h.city.toLowerCase().includes(filters.city!.toLowerCase())
      );
    }
    if (filters.minPrice) {
      filtered = filtered.filter(h => h.min_price >= filters.minPrice!);
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(h => h.max_price <= filters.maxPrice!);
    }
    
    return {
      data: filtered,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / (filters.limit || 20))
      }
    };
  }
}