import { Booking, BookingStatus, PaymentStatus } from '@prisma/client';
import { getPrisma } from './databaseService';
import { AvailabilityService } from './availabilityService';
import { cache, cacheKeys } from './cacheService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

interface CreateBookingData {
  userId: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
}

export class BookingService {
  private prisma = getPrisma();
  private availabilityService = new AvailabilityService();
  
  async createBooking(data: CreateBookingData): Promise<Booking> {
    const { userId, roomId, checkIn, checkOut, guests } = data;
    
    // Validate room exists and has capacity
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const room = await this.prisma.room.findUnique({
      where: { id: roomId }
    });
    
    if (!room) {
      throw new AppError(404, 'Room not found');
    }
    
    if (room.capacity < guests) {
      throw new AppError(400, 'Room capacity exceeded');
    }
    
    // Check availability
    const isAvailable = await this.availabilityService.checkAvailability(
      roomId,
      checkIn,
      checkOut
    );
    
    if (!isAvailable) {
      throw new AppError(400, 'Room not available for selected dates');
    }
    
    // Calculate total price
    const totalPrice = await this.availabilityService.calculateTotalPrice(
      roomId,
      checkIn,
      checkOut
    );
    
    // Create booking in transaction
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const booking = await this.prisma.$transaction(async (tx) => {
      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          roomId,
          checkIn,
          checkOut,
          guests,
          totalPrice,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING
        }
      });
      
      // Decrement availability
      await this.availabilityService.decrementAvailability(
        roomId,
        checkIn,
        checkOut
      );
      
      return newBooking;
    });
    
    // Clear cache
    await cache.del(cacheKeys.userBookings(userId));
    
    logger.info(`Booking created: ${booking.id}`);
    
    return booking;
  }
  
  async confirmBooking(bookingId: string, _paymentId?: string): Promise<Booking> {
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId }
    });
    
    if (!booking) {
      throw new AppError(404, 'Booking not found');
    }
    
    if (booking.status !== BookingStatus.PENDING) {
      throw new AppError(400, 'Booking cannot be confirmed');
    }
    
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID
      }
    });
    
    // Clear cache
    await cache.del(cacheKeys.userBookings(booking.userId));
    
    logger.info(`Booking confirmed: ${bookingId}`);
    
    return updatedBooking;
  }
  
  async cancelBooking(bookingId: string, userId: string): Promise<Booking> {
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId }
    });
    
    if (!booking) {
      throw new AppError(404, 'Booking not found');
    }
    
    if (booking.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }
    
    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError(400, 'Booking already cancelled');
    }
    
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          paymentStatus: booking.paymentStatus === PaymentStatus.PAID 
            ? PaymentStatus.REFUNDED 
            : PaymentStatus.PENDING
        }
      });
      
      // Restore availability
      await this.availabilityService.incrementAvailability(
        booking.roomId,
        booking.checkIn,
        booking.checkOut
      );
      
      return updated;
    });
    
    // Clear cache
    await cache.del(cacheKeys.userBookings(userId));
    
    logger.info(`Booking cancelled: ${bookingId}`);
    
    return updatedBooking;
  }
  
  async getUserBookings(userId: string): Promise<Booking[]> {
    const cacheKey = cacheKeys.userBookings(userId);
    const cached = await cache.get<Booking[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            hotel: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    await cache.set(cacheKey, bookings, 300); // 5 minutes cache
    
    return bookings;
  }
  
  async getBookingById(bookingId: string, userId: string): Promise<Booking> {
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: {
          include: {
            hotel: true
          }
        }
      }
    });
    
    if (!booking) {
      throw new AppError(404, 'Booking not found');
    }
    
    if (booking.userId !== userId) {
      throw new AppError(403, 'Unauthorized');
    }
    
    return booking;
  }
}