import { Hotel, Prisma } from '@prisma/client';
import { getPrisma } from './databaseService';
import { cache, cacheKeys } from './cacheService';
import { SearchFilters, PaginatedResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const CACHE_TTL = 3600; // 1 hour

export class HotelService {
  private prisma: ReturnType<typeof getPrisma> | null;
  
  constructor() {
    try {
      this.prisma = getPrisma();
    } catch (error) {
      logger.warn('Prisma not initialized, running in mock mode');
      this.prisma = null;
    }
  }
  
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
        amenities: ['WiFi', 'Pool', 'Gym'],
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        minPrice: 15000
      },
      {
        id: '2',
        name: 'Osaka Bay Hotel',
        description: 'Modern hotel near Osaka Bay',
        address: 'Osaka, Japan',
        city: 'Osaka',
        country: 'Japan',
        latitude: 34.6937,
        longitude: 135.5023,
        rating: 4.2,
        amenities: ['WiFi', 'Restaurant'],
        images: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        minPrice: 12000
      }
    ];
  }
  
  async searchHotels(filters: SearchFilters): Promise<PaginatedResponse<Hotel & { minPrice: number }>> {
    const cacheKey = cacheKeys.hotelSearch(JSON.stringify(filters));
    const cached = await cache.get<PaginatedResponse<Hotel & { minPrice: number }>>(cacheKey);
    
    if (cached) {
      logger.debug('Returning cached hotel search results');
      return cached;
    }
    
    // Mock mode if no database
    if (!this.prisma) {
      const mockHotels = this.getMockHotels();
      const result = {
        data: mockHotels,
        pagination: {
          total: mockHotels.length,
          page: filters.page || 1,
          limit: filters.limit || 10,
          totalPages: 1
        }
      };
      await cache.set(cacheKey, result, CACHE_TTL);
      return result;
    }
    
    const {
      city,
      country,
      checkIn,
      checkOut,
      guests,
      minPrice,
      maxPrice,
      rating,
      amenities,
      radius,
      latitude,
      longitude,
      sortBy = 'price',
      sortOrder = 'asc',
      page = 1,
      limit = 20
    } = filters;
    
    const where: Prisma.HotelWhereInput = {};
    
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (country) where.country = { contains: country, mode: 'insensitive' };
    if (rating) where.rating = { gte: rating };
    if (amenities?.length) {
      where.amenities = {
        hasEvery: amenities
      };
    }
    
    // Geographic search
    if (latitude && longitude && radius) {
      const radiusInDegrees = radius / 111; // Approximate conversion
      where.AND = [
        { latitude: { gte: latitude - radiusInDegrees, lte: latitude + radiusInDegrees } },
        { longitude: { gte: longitude - radiusInDegrees, lte: longitude + radiusInDegrees } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    // Get hotels with available rooms and min price
    const hotels = await this.prisma.$queryRaw<(Hotel & { minPrice: number })[]>`
      SELECT DISTINCT h.*, MIN(a.price) as "minPrice"
      FROM "Hotel" h
      INNER JOIN "Room" r ON r."hotelId" = h.id
      INNER JOIN "Availability" a ON a."roomId" = r.id
      WHERE a.date >= ${checkIn}::date
        AND a.date < ${checkOut}::date
        AND a.available >= 1
        AND r.capacity >= ${guests}
        ${city ? Prisma.sql`AND h.city ILIKE ${`%${city}%`}` : Prisma.empty}
        ${country ? Prisma.sql`AND h.country ILIKE ${`%${country}%`}` : Prisma.empty}
        ${rating ? Prisma.sql`AND h.rating >= ${rating}` : Prisma.empty}
        ${minPrice ? Prisma.sql`AND a.price >= ${minPrice}` : Prisma.empty}
        ${maxPrice ? Prisma.sql`AND a.price <= ${maxPrice}` : Prisma.empty}
      GROUP BY h.id
      HAVING COUNT(DISTINCT a.date) = ${Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))}
      ORDER BY ${sortBy === 'price' ? '"minPrice"' : sortBy === 'rating' ? 'h.rating' : '"minPrice"'} ${sortOrder}
      LIMIT ${limit} OFFSET ${skip}
    `;
    
    const total = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT h.id) as count
      FROM "Hotel" h
      INNER JOIN "Room" r ON r."hotelId" = h.id
      INNER JOIN "Availability" a ON a."roomId" = r.id
      WHERE a.date >= ${checkIn}::date
        AND a.date < ${checkOut}::date
        AND a.available >= 1
        AND r.capacity >= ${guests}
        ${city ? Prisma.sql`AND h.city ILIKE ${`%${city}%`}` : Prisma.empty}
        ${country ? Prisma.sql`AND h.country ILIKE ${`%${country}%`}` : Prisma.empty}
        ${rating ? Prisma.sql`AND h.rating >= ${rating}` : Prisma.empty}
        ${minPrice ? Prisma.sql`AND a.price >= ${minPrice}` : Prisma.empty}
        ${maxPrice ? Prisma.sql`AND a.price <= ${maxPrice}` : Prisma.empty}
    `;
    
    const result = {
      data: hotels,
      pagination: {
        page,
        limit,
        total: Number(total[0].count),
        totalPages: Math.ceil(Number(total[0].count) / limit)
      }
    };
    
    await cache.set(cacheKey, result, CACHE_TTL);
    
    return result;
  }
  
  async getHotelById(id: string): Promise<Hotel> {
    const cacheKey = cacheKeys.hotel(id);
    const cached = await cache.get<Hotel>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: {
        rooms: true,
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!hotel) {
      throw new AppError(404, 'Hotel not found');
    }
    
    await cache.set(cacheKey, hotel, CACHE_TTL);
    
    return hotel;
  }
}