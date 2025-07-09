import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { sendEmail } from '../../services/emailService';

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      hotelId = '',
      userId = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (hotelId) {
      where.hotelId = hotelId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (dateFrom || dateTo) {
      where.checkInDate = {};
      if (dateFrom) {
        where.checkInDate.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.checkInDate.lte = new Date(dateTo as string);
      }
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          hotel: {
            select: { id: true, name: true, city: true },
          },
          room: {
            select: { id: true, name: true, type: true },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

export const getBookingDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        hotel: true,
        room: true,
        payments: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Get booking details error:', error);
    res.status(500).json({ error: 'Failed to fetch booking details' });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        hotel: true,
        room: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const previousStatus = booking.status;

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status,
        notes: notes || booking.notes,
      },
    });

    // Send email notification for status change
    if (previousStatus !== status) {
      await sendEmail({
        to: booking.user.email,
        subject: `Booking Status Updated - ${booking.hotel.name}`,
        template: 'bookingStatusUpdate',
        data: {
          userName: booking.user.name,
          hotelName: booking.hotel.name,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          previousStatus,
          newStatus: status,
          notes,
        },
      });
    }

    res.json(updatedBooking);
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
};

export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, refundAmount, refundMethod } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        hotel: true,
        room: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
        refundAmount: refundAmount || null,
        refundMethod: refundMethod || null,
        refundStatus: refundAmount ? 'PENDING' : null,
      },
    });

    // Update room availability
    await prisma.roomAvailability.updateMany({
      where: {
        roomId: booking.roomId,
        date: {
          gte: booking.checkInDate,
          lt: booking.checkOutDate,
        },
      },
      data: {
        availableRooms: {
          increment: 1,
        },
      },
    });

    // Send cancellation email
    await sendEmail({
      to: booking.user.email,
      subject: `Booking Cancelled - ${booking.hotel.name}`,
      template: 'bookingCancellation',
      data: {
        userName: booking.user.name,
        hotelName: booking.hotel.name,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        reason,
        refundAmount,
        refundMethod,
      },
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

export const processRefund = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { refundAmount, refundMethod, transactionId } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        hotel: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'CANCELLED') {
      return res.status(400).json({
        error: 'Booking must be cancelled before processing refund',
      });
    }

    // Update booking with refund information
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        refundAmount,
        refundMethod,
        refundStatus: 'COMPLETED',
        refundTransactionId: transactionId,
        refundedAt: new Date(),
      },
    });

    // Create payment record for refund
    await prisma.payment.create({
      data: {
        bookingId: id,
        amount: -refundAmount, // Negative amount for refund
        currency: booking.currency,
        method: refundMethod,
        status: 'COMPLETED',
        transactionId,
        type: 'REFUND',
      },
    });

    // Send refund confirmation email
    await sendEmail({
      to: booking.user.email,
      subject: `Refund Processed - ${booking.hotel.name}`,
      template: 'refundConfirmation',
      data: {
        userName: booking.user.name,
        hotelName: booking.hotel.name,
        refundAmount,
        refundMethod,
        transactionId,
      },
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
};

export const getBookingStatistics = async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    const startDate = new Date();

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

    const stats = await prisma.booking.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
      _sum: { totalPrice: true },
    });

    const dailyBookings = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(total_price) as revenue
      FROM bookings
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json({
      statusDistribution: stats,
      dailyBookings,
    });
  } catch (error) {
    console.error('Get booking statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch booking statistics' });
  }
};