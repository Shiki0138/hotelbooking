import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const last30Days = subDays(today, 30);
    const last7Days = subDays(today, 7);
    const yesterday = subDays(today, 1);

    // Get overall stats
    const [
      totalUsers,
      totalHotels,
      totalBookings,
      totalRevenue,
      activeBookings,
      todayBookings,
      yesterdayBookings,
      last7DaysBookings,
      last30DaysBookings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.hotel.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { totalPrice: true },
        where: { status: 'CONFIRMED' },
      }),
      prisma.booking.count({
        where: {
          status: 'CONFIRMED',
          checkInDate: { gte: today },
        },
      }),
      prisma.booking.count({
        where: {
          createdAt: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
        },
      }),
      prisma.booking.count({
        where: {
          createdAt: {
            gte: startOfDay(yesterday),
            lte: endOfDay(yesterday),
          },
        },
      }),
      prisma.booking.count({
        where: {
          createdAt: { gte: last7Days },
        },
      }),
      prisma.booking.count({
        where: {
          createdAt: { gte: last30Days },
        },
      }),
    ]);

    // Get revenue stats
    const [todayRevenue, yesterdayRevenue, last7DaysRevenue, last30DaysRevenue] =
      await Promise.all([
        prisma.booking.aggregate({
          _sum: { totalPrice: true },
          where: {
            status: 'CONFIRMED',
            createdAt: {
              gte: startOfDay(today),
              lte: endOfDay(today),
            },
          },
        }),
        prisma.booking.aggregate({
          _sum: { totalPrice: true },
          where: {
            status: 'CONFIRMED',
            createdAt: {
              gte: startOfDay(yesterday),
              lte: endOfDay(yesterday),
            },
          },
        }),
        prisma.booking.aggregate({
          _sum: { totalPrice: true },
          where: {
            status: 'CONFIRMED',
            createdAt: { gte: last7Days },
          },
        }),
        prisma.booking.aggregate({
          _sum: { totalPrice: true },
          where: {
            status: 'CONFIRMED',
            createdAt: { gte: last30Days },
          },
        }),
      ]);

    // Get booking status distribution
    const bookingStatusDistribution = await prisma.booking.groupBy({
      by: ['status'],
      _count: true,
    });

    // Get top performing hotels
    const topHotels = await prisma.hotel.findMany({
      take: 10,
      orderBy: {
        bookings: {
          _count: 'desc',
        },
      },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    // Get recent bookings
    const recentBookings = await prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
        hotel: {
          select: { name: true },
        },
        room: {
          select: { name: true },
        },
      },
    });

    // Calculate growth rates
    const bookingGrowthRate =
      yesterdayBookings > 0
        ? ((todayBookings - yesterdayBookings) / yesterdayBookings) * 100
        : 0;

    const revenueGrowthRate =
      yesterdayRevenue._sum.totalPrice && yesterdayRevenue._sum.totalPrice > 0
        ? ((todayRevenue._sum.totalPrice! - yesterdayRevenue._sum.totalPrice) /
            yesterdayRevenue._sum.totalPrice) *
          100
        : 0;

    res.json({
      overview: {
        totalUsers,
        totalHotels,
        totalBookings,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
        activeBookings,
      },
      bookings: {
        today: todayBookings,
        yesterday: yesterdayBookings,
        last7Days: last7DaysBookings,
        last30Days: last30DaysBookings,
        growthRate: bookingGrowthRate,
      },
      revenue: {
        today: todayRevenue._sum.totalPrice || 0,
        yesterday: yesterdayRevenue._sum.totalPrice || 0,
        last7Days: last7DaysRevenue._sum.totalPrice || 0,
        last30Days: last30DaysRevenue._sum.totalPrice || 0,
        growthRate: revenueGrowthRate,
      },
      bookingStatusDistribution,
      topHotels: topHotels.map((hotel) => ({
        id: hotel.id,
        name: hotel.name,
        bookingCount: hotel._count.bookings,
      })),
      recentBookings: recentBookings.map((booking) => ({
        id: booking.id,
        hotelName: booking.hotel.name,
        roomName: booking.room.name,
        guestName: booking.user.name,
        guestEmail: booking.user.email,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        totalPrice: booking.totalPrice,
        status: booking.status,
        createdAt: booking.createdAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = subDays(new Date(), 7);
        break;
      case '30d':
        startDate = subDays(new Date(), 30);
        break;
      case '90d':
        startDate = subDays(new Date(), 90);
        break;
      case '1y':
        startDate = subDays(new Date(), 365);
        break;
      default:
        startDate = subDays(new Date(), 30);
    }

    // Get daily revenue
    const dailyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(total_price) as revenue,
        COUNT(*) as booking_count
      FROM bookings
      WHERE status = 'CONFIRMED'
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Get revenue by hotel category
    const revenueByCategory = await prisma.$queryRaw`
      SELECT 
        h.category,
        SUM(b.total_price) as revenue,
        COUNT(b.id) as booking_count
      FROM bookings b
      JOIN hotels h ON b.hotel_id = h.id
      WHERE b.status = 'CONFIRMED'
        AND b.created_at >= ${startDate}
      GROUP BY h.category
      ORDER BY revenue DESC
    `;

    // Get revenue by payment method
    const revenueByPaymentMethod = await prisma.booking.groupBy({
      by: ['paymentMethod'],
      where: {
        status: 'CONFIRMED',
        createdAt: { gte: startDate },
      },
      _sum: { totalPrice: true },
      _count: true,
    });

    res.json({
      dailyRevenue,
      revenueByCategory,
      revenueByPaymentMethod,
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
};