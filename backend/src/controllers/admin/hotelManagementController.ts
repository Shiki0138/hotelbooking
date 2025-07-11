import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export const getAllHotels = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      category = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } },
        { city: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          _count: {
            select: {
              rooms: true,
              bookings: true,
              reviews: true,
            },
          },
        },
      }),
      prisma.hotel.count({ where }),
    ]);

    res.json({
      hotels,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get hotels error:', error);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
};

export const getHotelDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        rooms: true,
        amenities: true,
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    });

    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    // Get booking stats
    const bookingStats = await prisma.booking.groupBy({
      by: ['status'],
      where: { hotelId: id },
      _count: true,
      _sum: { totalPrice: true },
    });

    // Get monthly revenue
    const monthlyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(total_price) as revenue,
        COUNT(*) as booking_count
      FROM bookings
      WHERE hotel_id = ${id}
        AND status = 'CONFIRMED'
        AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `;

    res.json({
      hotel,
      bookingStats,
      monthlyRevenue,
    });
  } catch (error) {
    console.error('Get hotel details error:', error);
    res.status(500).json({ error: 'Failed to fetch hotel details' });
  }
};

export const updateHotel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const hotel = await prisma.hotel.update({
      where: { id },
      data: updateData,
    });

    res.json(hotel);
  } catch (error) {
    console.error('Update hotel error:', error);
    res.status(500).json({ error: 'Failed to update hotel' });
  }
};

export const updateHotelStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const hotel = await prisma.hotel.update({
      where: { id },
      data: { status },
    });

    res.json(hotel);
  } catch (error) {
    console.error('Update hotel status error:', error);
    res.status(500).json({ error: 'Failed to update hotel status' });
  }
};

export const createHotel = async (req: Request, res: Response) => {
  try {
    const hotelData = req.body;

    const hotel = await prisma.hotel.create({
      data: {
        ...hotelData,
        amenities: hotelData.amenities
          ? {
              connect: hotelData.amenities.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        amenities: true,
      },
    });

    res.status(201).json(hotel);
  } catch (error) {
    console.error('Create hotel error:', error);
    res.status(500).json({ error: 'Failed to create hotel' });
  }
};

export const deleteHotel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if hotel has active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        hotelId: id,
        status: 'CONFIRMED',
        checkOutDate: { gte: new Date() },
      },
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        error: 'Cannot delete hotel with active bookings',
      });
    }

    await prisma.hotel.delete({
      where: { id },
    });

    res.json({ message: 'Hotel deleted successfully' });
  } catch (error) {
    console.error('Delete hotel error:', error);
    res.status(500).json({ error: 'Failed to delete hotel' });
  }
};