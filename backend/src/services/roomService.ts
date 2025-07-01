import { Room } from '@prisma/client';
import { getPrisma } from './databaseService';
import { AvailabilityService } from './availabilityService';
import { AppError } from '../middleware/errorHandler';

interface RoomSearchFilters {
  hotelId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  minPrice?: number;
  maxPrice?: number;
}

export class RoomService {
  private prisma = getPrisma();
  private availabilityService = new AvailabilityService();
  
  async searchRooms(filters: RoomSearchFilters): Promise<(Room & { totalPrice: number })[]> {
    const { hotelId, checkIn, checkOut, guests, minPrice, maxPrice } = filters;
    
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const rooms = await this.prisma.room.findMany({
      where: {
        hotelId,
        capacity: { gte: guests }
      }
    });
    
    const availableRooms = await Promise.all(
      rooms.map(async (room) => {
        const isAvailable = await this.availabilityService.checkAvailability(
          room.id,
          checkIn,
          checkOut
        );
        
        if (!isAvailable) return null;
        
        const totalPrice = await this.availabilityService.calculateTotalPrice(
          room.id,
          checkIn,
          checkOut
        );
        
        if (minPrice && totalPrice < minPrice) return null;
        if (maxPrice && totalPrice > maxPrice) return null;
        
        return { ...room, totalPrice };
      })
    );
    
    return availableRooms.filter((room): room is (Room & { totalPrice: number }) => room !== null)
      .sort((a, b) => a.totalPrice - b.totalPrice);
  }
  
  async getRoomById(id: string): Promise<Room> {
    if (!this.prisma) {
      throw new AppError(500, 'Database connection not available');
    }
    
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        hotel: true
      }
    });
    
    if (!room) {
      throw new AppError(404, 'Room not found');
    }
    
    return room;
  }
  
  async getRoomPriceBreakdown(
    roomId: string,
    checkIn: Date,
    checkOut: Date
  ): Promise<{ date: Date; price: number }[]> {
    const availability = await this.availabilityService.getRoomAvailability(
      roomId,
      checkIn,
      checkOut
    );
    
    return availability.map(day => ({
      date: day.date,
      price: day.price
    }));
  }
}