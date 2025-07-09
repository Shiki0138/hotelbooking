import request from 'supertest';
import { app } from '../src';
import { prisma } from '../src/lib/prisma';
import { addDays } from 'date-fns';

describe('Booking System Tests', () => {
  let authToken: string;
  let testUser: any;
  let testHotel: any;
  let testRoom: any;

  beforeAll(async () => {
    // Create test data
    testUser = await prisma.user.create({
      data: {
        email: 'bookingtest@example.com',
        password: 'hashedpassword',
        name: 'Booking Test User',
      },
    });

    testHotel = await prisma.hotel.create({
      data: {
        name: 'Test Hotel',
        address: '123 Test St',
        city: 'Tokyo',
        country: 'Japan',
        category: 'LUXURY',
        rating: 5,
      },
    });

    testRoom = await prisma.room.create({
      data: {
        hotelId: testHotel.id,
        name: 'Test Room',
        type: 'DELUXE',
        price: 20000,
        quantity: 5,
        maxOccupancy: 2,
      },
    });

    // Create availability
    const dates = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i));
    await Promise.all(
      dates.map((date) =>
        prisma.roomAvailability.create({
          data: {
            roomId: testRoom.id,
            date,
            availableRooms: 5,
            price: 20000,
          },
        })
      )
    );

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bookingtest@example.com',
        password: 'password123',
      });
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { userId: testUser.id } });
    await prisma.roomAvailability.deleteMany({ where: { roomId: testRoom.id } });
    await prisma.room.delete({ where: { id: testRoom.id } });
    await prisma.hotel.delete({ where: { id: testHotel.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.$disconnect();
  });

  describe('POST /api/bookings', () => {
    it('should create a booking', async () => {
      const checkInDate = addDays(new Date(), 7);
      const checkOutDate = addDays(new Date(), 9);

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hotelId: testHotel.id,
          roomId: testRoom.id,
          checkInDate: checkInDate.toISOString(),
          checkOutDate: checkOutDate.toISOString(),
          guestCount: 2,
          totalPrice: 40000,
          paymentMethod: 'STRIPE',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'PENDING');
      expect(response.body.hotelId).toBe(testHotel.id);
      expect(response.body.roomId).toBe(testRoom.id);

      // Clean up
      await prisma.booking.delete({ where: { id: response.body.id } });
    });

    it('should not create booking for unavailable dates', async () => {
      // First create a booking
      const checkInDate = addDays(new Date(), 10);
      const checkOutDate = addDays(new Date(), 12);

      const firstBooking = await prisma.booking.create({
        data: {
          userId: testUser.id,
          hotelId: testHotel.id,
          roomId: testRoom.id,
          checkInDate,
          checkOutDate,
          guestCount: 2,
          totalPrice: 40000,
          status: 'CONFIRMED',
        },
      });

      // Update availability
      await prisma.roomAvailability.update({
        where: {
          roomId_date: {
            roomId: testRoom.id,
            date: checkInDate,
          },
        },
        data: { availableRooms: 0 },
      });

      // Try to book same dates
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hotelId: testHotel.id,
          roomId: testRoom.id,
          checkInDate: checkInDate.toISOString(),
          checkOutDate: checkOutDate.toISOString(),
          guestCount: 2,
          totalPrice: 40000,
          paymentMethod: 'STRIPE',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');

      // Clean up
      await prisma.booking.delete({ where: { id: firstBooking.id } });
    });

    it('should validate booking data', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hotelId: testHotel.id,
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/bookings', () => {
    let testBooking: any;

    beforeAll(async () => {
      testBooking = await prisma.booking.create({
        data: {
          userId: testUser.id,
          hotelId: testHotel.id,
          roomId: testRoom.id,
          checkInDate: addDays(new Date(), 14),
          checkOutDate: addDays(new Date(), 16),
          guestCount: 2,
          totalPrice: 40000,
          status: 'CONFIRMED',
        },
      });
    });

    afterAll(async () => {
      await prisma.booking.delete({ where: { id: testBooking.id } });
    });

    it('should get user bookings', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id', testBooking.id);
    });

    it('should get booking by id', async () => {
      const response = await request(app)
        .get(`/api/bookings/${testBooking.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testBooking.id);
      expect(response.body).toHaveProperty('hotel');
      expect(response.body).toHaveProperty('room');
    });

    it('should not get other user booking', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'hashedpassword',
          name: 'Other User',
        },
      });

      const otherBooking = await prisma.booking.create({
        data: {
          userId: otherUser.id,
          hotelId: testHotel.id,
          roomId: testRoom.id,
          checkInDate: addDays(new Date(), 20),
          checkOutDate: addDays(new Date(), 22),
          guestCount: 2,
          totalPrice: 40000,
          status: 'CONFIRMED',
        },
      });

      const response = await request(app)
        .get(`/api/bookings/${otherBooking.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);

      // Clean up
      await prisma.booking.delete({ where: { id: otherBooking.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('Booking Cancellation', () => {
    it('should cancel booking and calculate refund', async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUser.id,
          hotelId: testHotel.id,
          roomId: testRoom.id,
          checkInDate: addDays(new Date(), 35),
          checkOutDate: addDays(new Date(), 37),
          guestCount: 2,
          totalPrice: 40000,
          status: 'CONFIRMED',
        },
      });

      // Calculate refund
      const refundResponse = await request(app)
        .get(`/api/refunds/bookings/${booking.id}/refund-calculation`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(refundResponse.status).toBe(200);
      expect(refundResponse.body).toHaveProperty('refundAmount');
      expect(refundResponse.body).toHaveProperty('refundPercentage');
      expect(refundResponse.body.refundPercentage).toBe(100); // Full refund for 35 days out

      // Clean up
      await prisma.booking.delete({ where: { id: booking.id } });
    });
  });
});