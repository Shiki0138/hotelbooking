import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';

interface HotelManagerRequest extends Request {
  hotelManager?: {
    id: string;
    email: string;
    hotelIds: string[];
  };
}

export const getInventoryOverview = async (req: HotelManagerRequest, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify hotel access
    if (!req.hotelManager?.hotelIds.includes(hotelId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const start = startDate ? new Date(startDate as string) : new Date();
    const end = endDate ? new Date(endDate as string) : new Date();
    end.setDate(end.getDate() + 30); // Default 30 days

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        rooms: {
          include: {
            availability: {
              where: {
                date: {
                  gte: start,
                  lte: end,
                },
              },
              orderBy: { date: 'asc' },
            },
          },
        },
      },
    });

    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    // Get bookings for the period
    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        checkInDate: { lte: end },
        checkOutDate: { gte: start },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      include: {
        room: true,
        user: {
          select: { name: true, email: true },
        },
      },
    });

    // Calculate occupancy rate
    const totalRooms = hotel.rooms.reduce((sum, room) => sum + room.quantity, 0);
    const daysInPeriod = eachDayOfInterval({ start, end });
    
    const occupancyByDate = daysInPeriod.map((date) => {
      const dateBookings = bookings.filter(
        (booking) =>
          new Date(booking.checkInDate) <= date &&
          new Date(booking.checkOutDate) > date
      );
      
      const occupiedRooms = dateBookings.length;
      const occupancyRate = (occupiedRooms / totalRooms) * 100;
      
      return {
        date: format(date, 'yyyy-MM-dd'),
        occupiedRooms,
        availableRooms: totalRooms - occupiedRooms,
        occupancyRate,
      };
    });

    res.json({
      hotel: {
        id: hotel.id,
        name: hotel.name,
        totalRooms,
      },
      inventory: hotel.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        type: room.type,
        totalQuantity: room.quantity,
        basePrice: room.price,
        availability: room.availability,
      })),
      bookings: bookings.map((booking) => ({
        id: booking.id,
        roomName: booking.room.name,
        guestName: booking.user.name,
        checkIn: booking.checkInDate,
        checkOut: booking.checkOutDate,
        status: booking.status,
        totalPrice: booking.totalPrice,
      })),
      occupancyByDate,
      summary: {
        averageOccupancy:
          occupancyByDate.reduce((sum, day) => sum + day.occupancyRate, 0) /
          occupancyByDate.length,
        totalBookings: bookings.length,
        totalRevenue: bookings.reduce((sum, b) => sum + b.totalPrice, 0),
      },
    });
  } catch (error) {
    console.error('Get inventory overview error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory overview' });
  }
};

export const updateRoomAvailability = async (req: HotelManagerRequest, res: Response) => {
  try {
    const { hotelId, roomId } = req.params;
    const { date, availableRooms, price, restrictions } = req.body;

    // Verify hotel access
    if (!req.hotelManager?.hotelIds.includes(hotelId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify room belongs to hotel
    const room = await prisma.room.findFirst({
      where: { id: roomId, hotelId },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const availability = await prisma.roomAvailability.upsert({
      where: {
        roomId_date: {
          roomId,
          date: new Date(date),
        },
      },
      update: {
        availableRooms,
        price: price || room.price,
        restrictions,
      },
      create: {
        roomId,
        date: new Date(date),
        availableRooms,
        price: price || room.price,
        restrictions,
      },
    });

    res.json(availability);
  } catch (error) {
    console.error('Update room availability error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
};

export const bulkUpdateAvailability = async (req: HotelManagerRequest, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { updates } = req.body;

    // Verify hotel access
    if (!req.hotelManager?.hotelIds.includes(hotelId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify all rooms belong to hotel
    const roomIds = [...new Set(updates.map((u: any) => u.roomId))];
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds }, hotelId },
    });

    if (rooms.length !== roomIds.length) {
      return res.status(400).json({ error: 'Invalid room IDs' });
    }

    // Perform bulk update
    const operations = updates.map((update: any) => {
      const room = rooms.find((r) => r.id === update.roomId);
      return prisma.roomAvailability.upsert({
        where: {
          roomId_date: {
            roomId: update.roomId,
            date: new Date(update.date),
          },
        },
        update: {
          availableRooms: update.availableRooms,
          price: update.price || room?.price,
          restrictions: update.restrictions,
        },
        create: {
          roomId: update.roomId,
          date: new Date(update.date),
          availableRooms: update.availableRooms,
          price: update.price || room?.price,
          restrictions: update.restrictions,
        },
      });
    });

    const results = await prisma.$transaction(operations);

    res.json({
      message: 'Bulk update completed',
      updated: results.length,
    });
  } catch (error) {
    console.error('Bulk update availability error:', error);
    res.status(500).json({ error: 'Failed to perform bulk update' });
  }
};

export const getRoomPricing = async (req: HotelManagerRequest, res: Response) => {
  try {
    const { hotelId, roomId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify hotel access
    if (!req.hotelManager?.hotelIds.includes(hotelId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, hotelId },
      include: {
        availability: {
          where: {
            date: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string),
            },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get competitor pricing (mock data for demo)
    const competitorPricing = {
      averagePrice: room.price * 1.1,
      minPrice: room.price * 0.9,
      maxPrice: room.price * 1.3,
    };

    res.json({
      room: {
        id: room.id,
        name: room.name,
        basePrice: room.price,
      },
      pricing: room.availability.map((avail) => ({
        date: avail.date,
        price: avail.price,
        availableRooms: avail.availableRooms,
        restrictions: avail.restrictions,
      })),
      competitorPricing,
      recommendations: {
        suggestedPrice: Math.round(competitorPricing.averagePrice),
        priceAdjustment: Math.round(
          ((competitorPricing.averagePrice - room.price) / room.price) * 100
        ),
      },
    });
  } catch (error) {
    console.error('Get room pricing error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing data' });
  }
};

export const updateRoomPricing = async (req: HotelManagerRequest, res: Response) => {
  try {
    const { hotelId, roomId } = req.params;
    const { pricing } = req.body; // Array of { date, price }

    // Verify hotel access
    if (!req.hotelManager?.hotelIds.includes(hotelId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify room belongs to hotel
    const room = await prisma.room.findFirst({
      where: { id: roomId, hotelId },
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Update pricing for each date
    const operations = pricing.map((item: any) =>
      prisma.roomAvailability.update({
        where: {
          roomId_date: {
            roomId,
            date: new Date(item.date),
          },
        },
        data: {
          price: item.price,
        },
      })
    );

    await prisma.$transaction(operations);

    res.json({
      message: 'Pricing updated successfully',
      updated: pricing.length,
    });
  } catch (error) {
    console.error('Update room pricing error:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
};

export const getRevenueReport = async (req: HotelManagerRequest, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { period = '30d' } = req.query;

    // Verify hotel access
    if (!req.hotelManager?.hotelIds.includes(hotelId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const bookings = await prisma.booking.findMany({
      where: {
        hotelId,
        createdAt: { gte: startDate },
        status: 'CONFIRMED',
      },
      include: {
        room: true,
      },
    });

    // Calculate revenue by room type
    const revenueByRoomType = bookings.reduce((acc, booking) => {
      const roomType = booking.room.type;
      if (!acc[roomType]) {
        acc[roomType] = { revenue: 0, bookings: 0 };
      }
      acc[roomType].revenue += booking.totalPrice;
      acc[roomType].bookings += 1;
      return acc;
    }, {} as Record<string, { revenue: number; bookings: number }>);

    // Calculate daily revenue
    const dailyRevenue = bookings.reduce((acc, booking) => {
      const date = format(booking.createdAt, 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += booking.totalPrice;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      summary: {
        totalRevenue: bookings.reduce((sum, b) => sum + b.totalPrice, 0),
        totalBookings: bookings.length,
        averageBookingValue:
          bookings.length > 0
            ? bookings.reduce((sum, b) => sum + b.totalPrice, 0) / bookings.length
            : 0,
      },
      revenueByRoomType,
      dailyRevenue: Object.entries(dailyRevenue).map(([date, revenue]) => ({
        date,
        revenue,
      })),
    });
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue report' });
  }
};