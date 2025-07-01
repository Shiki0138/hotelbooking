import { Availability } from '@prisma/client';
import { getPrisma } from './databaseService';
import { cache, cacheKeys } from './cacheService';
import { io } from '../index';
import { logger } from '../utils/logger';
import { AvailabilityUpdate } from '../types';

export class AvailabilityService {
  private prisma = getPrisma();
  
  async getRoomAvailability(
    roomId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Availability[]> {
    if (!this.prisma) {
      return [];
    }
    
    const availability = await this.prisma.availability.findMany({
      where: {
        roomId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
    
    return availability;
  }
  
  async updateAvailability(updates: AvailabilityUpdate[]): Promise<void> {
    const updatePromises = updates.map(async (update) => {
      const { roomId, date, available, price } = update;
      
      if (!this.prisma) {
        throw new Error('Database connection not available');
      }
      
      const availability = await this.prisma.availability.upsert({
        where: {
          roomId_date: {
            roomId,
            date
          }
        },
        update: {
          available,
          price
        },
        create: {
          roomId,
          date,
          available,
          price
        }
      });
      
      // Clear cache
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr) {
        await cache.del(cacheKeys.roomAvailability(roomId, dateStr));
      }
      
      // Emit real-time update
      io.to(`room:${roomId}`).emit('availability:update', {
        roomId,
        date: dateStr,
        available,
        price
      });
      
      return availability;
    });
    
    await Promise.all(updatePromises);
    logger.info(`Updated availability for ${updates.length} entries`);
  }
  
  async checkAvailability(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    requiredRooms: number = 1
  ): Promise<boolean> {
    const availability = await this.getRoomAvailability(roomId, checkIn, checkOut);
    
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (availability.length < nights) {
      return false;
    }
    
    return availability.every(day => day.available >= requiredRooms);
  }
  
  async calculateTotalPrice(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    rooms: number = 1
  ): Promise<number> {
    const availability = await this.getRoomAvailability(roomId, checkIn, checkOut);
    
    const totalPrice = availability.reduce((sum, day) => sum + (day.price * rooms), 0);
    
    return totalPrice;
  }
  
  async decrementAvailability(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    rooms: number = 1
  ): Promise<void> {
    const currentDate = new Date(checkIn);
    const updates: AvailabilityUpdate[] = [];
    
    while (currentDate < checkOut) {
      if (!this.prisma) {
        throw new Error('Database connection not available');
      }
      
      const availability = await this.prisma.availability.findUnique({
        where: {
          roomId_date: {
            roomId,
            date: currentDate
          }
        }
      });
      
      if (availability && availability.available >= rooms) {
        updates.push({
          roomId,
          date: new Date(currentDate),
          available: availability.available - rooms,
          price: availability.price
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    await this.updateAvailability(updates);
  }
  
  async incrementAvailability(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    rooms: number = 1
  ): Promise<void> {
    const currentDate = new Date(checkIn);
    const updates: AvailabilityUpdate[] = [];
    
    while (currentDate < checkOut) {
      if (!this.prisma) {
        throw new Error('Database connection not available');
      }
      
      const availability = await this.prisma.availability.findUnique({
        where: {
          roomId_date: {
            roomId,
            date: currentDate
          }
        }
      });
      
      if (availability) {
        const room = await this.prisma.room.findUnique({
          where: { id: roomId },
          select: { totalRooms: true }
        });
        
        const newAvailable = Math.min(
          availability.available + rooms,
          room?.totalRooms || availability.available + rooms
        );
        
        updates.push({
          roomId,
          date: new Date(currentDate),
          available: newAvailable,
          price: availability.price
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    await this.updateAvailability(updates);
  }
}