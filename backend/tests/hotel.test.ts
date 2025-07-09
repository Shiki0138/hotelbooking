import request from 'supertest';
import { app } from '../src';
import { prisma } from '../src/lib/prisma';

describe('Hotel Search Tests', () => {
  let testHotels: any[] = [];

  beforeAll(async () => {
    // Create test hotels
    testHotels = await Promise.all([
      prisma.hotel.create({
        data: {
          name: 'Tokyo Luxury Hotel',
          address: '1-1-1 Shibuya',
          city: 'Tokyo',
          country: 'Japan',
          category: 'LUXURY',
          rating: 5,
          price: 50000,
          latitude: 35.6595,
          longitude: 139.6917,
        },
      }),
      prisma.hotel.create({
        data: {
          name: 'Budget Tokyo Inn',
          address: '2-2-2 Shinjuku',
          city: 'Tokyo',
          country: 'Japan',
          category: 'BUDGET',
          rating: 3,
          price: 8000,
          latitude: 35.6896,
          longitude: 139.6895,
        },
      }),
      prisma.hotel.create({
        data: {
          name: 'Osaka Business Hotel',
          address: '3-3-3 Umeda',
          city: 'Osaka',
          country: 'Japan',
          category: 'BUSINESS',
          rating: 4,
          price: 15000,
          latitude: 34.7055,
          longitude: 135.4983,
        },
      }),
    ]);

    // Create rooms for each hotel
    for (const hotel of testHotels) {
      await prisma.room.create({
        data: {
          hotelId: hotel.id,
          name: 'Standard Room',
          type: 'STANDARD',
          price: hotel.price,
          quantity: 10,
          maxOccupancy: 2,
        },
      });
    }
  });

  afterAll(async () => {
    // Clean up
    for (const hotel of testHotels) {
      await prisma.room.deleteMany({ where: { hotelId: hotel.id } });
      await prisma.hotel.delete({ where: { id: hotel.id } });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/hotels/search', () => {
    it('should search hotels by location', async () => {
      const response = await request(app)
        .get('/api/hotels/search')
        .query({
          location: 'Tokyo',
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.hotels)).toBe(true);
      expect(response.body.hotels.length).toBe(2);
      expect(response.body.hotels.every((h: any) => h.city === 'Tokyo')).toBe(true);
    });

    it('should filter hotels by price range', async () => {
      const response = await request(app)
        .get('/api/hotels/search')
        .query({
          location: 'Tokyo',
          minPrice: 10000,
          maxPrice: 30000,
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.hotels.length).toBe(0); // Budget hotel is under 10000
    });

    it('should filter hotels by category', async () => {
      const response = await request(app)
        .get('/api/hotels/search')
        .query({
          category: 'LUXURY',
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.hotels.length).toBe(1);
      expect(response.body.hotels[0].category).toBe('LUXURY');
    });

    it('should sort hotels by price', async () => {
      const response = await request(app)
        .get('/api/hotels/search')
        .query({
          location: 'Tokyo',
          sortBy: 'price',
          sortOrder: 'asc',
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.hotels[0].price).toBeLessThan(
        response.body.hotels[1].price
      );
    });

    it('should search hotels by coordinates', async () => {
      const response = await request(app)
        .get('/api/hotels/search')
        .query({
          latitude: 35.6595,
          longitude: 139.6917,
          radius: 10, // 10km
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.hotels.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/hotels/:id', () => {
    it('should get hotel details', async () => {
      const response = await request(app).get(`/api/hotels/${testHotels[0].id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testHotels[0].id);
      expect(response.body).toHaveProperty('name', testHotels[0].name);
      expect(response.body).toHaveProperty('rooms');
    });

    it('should return 404 for non-existent hotel', async () => {
      const response = await request(app).get('/api/hotels/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Availability Check', () => {
    it('should check room availability', async () => {
      const hotel = testHotels[0];
      const room = await prisma.room.findFirst({
        where: { hotelId: hotel.id },
      });

      // Create availability
      await prisma.roomAvailability.create({
        data: {
          roomId: room!.id,
          date: new Date(),
          availableRooms: 5,
          price: room!.price,
        },
      });

      const response = await request(app)
        .get(`/api/rooms/${room!.id}/availability`)
        .query({
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('available', true);
      expect(response.body).toHaveProperty('totalPrice');

      // Clean up
      await prisma.roomAvailability.deleteMany({
        where: { roomId: room!.id },
      });
    });
  });
});