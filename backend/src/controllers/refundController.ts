import { Request, Response } from 'express';
import { RefundService } from '../services/refundService';
import { sendEmail } from '../services/emailService';
import { prisma } from '../lib/prisma';

const refundService = new RefundService();

export const calculateRefund = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    const calculation = await refundService.calculateRefund(bookingId);

    res.json({
      bookingId,
      ...calculation,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Calculate refund error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to calculate refund' 
    });
  }
};

export const processRefund = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const { refundAmount, reason, notifyCustomer = true } = req.body;

    // Validate refund amount
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        hotel: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (refundAmount > booking.totalPrice) {
      return res.status(400).json({ 
        error: 'Refund amount cannot exceed booking total' 
      });
    }

    // Process the refund
    const refundResult = await refundService.processRefund(
      bookingId,
      refundAmount,
      reason
    );

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

    // Send refund confirmation email
    if (notifyCustomer) {
      await sendEmail({
        to: booking.user.email,
        subject: `Refund Processed - ${booking.hotel.name}`,
        template: 'refundProcessed',
        data: {
          userName: booking.user.name,
          hotelName: booking.hotel.name,
          bookingId: booking.id,
          refundAmount,
          refundId: refundResult.refundId,
          processedAt: refundResult.processedAt,
        },
      });
    }

    res.json({
      message: 'Refund processed successfully',
      ...refundResult,
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process refund' 
    });
  }
};

export const getRefundStatus = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    const status = await refundService.getRefundStatus(bookingId);

    res.json({
      bookingId,
      ...status,
    });
  } catch (error) {
    console.error('Get refund status error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get refund status' 
    });
  }
};

export const getRefundHistory = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const history = await refundService.getRefundHistory(
      hotelId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(history);
  } catch (error) {
    console.error('Get refund history error:', error);
    res.status(500).json({ 
      error: 'Failed to get refund history' 
    });
  }
};

export const retryFailedRefund = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        hotel: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.refundStatus !== 'FAILED') {
      return res.status(400).json({ 
        error: 'Only failed refunds can be retried' 
      });
    }

    // Retry the refund
    const refundResult = await refundService.processRefund(
      bookingId,
      booking.refundAmount || 0,
      booking.cancellationReason || 'Retry failed refund'
    );

    res.json({
      message: 'Refund retry successful',
      ...refundResult,
    });
  } catch (error) {
    console.error('Retry refund error:', error);
    res.status(500).json({ 
      error: 'Failed to retry refund' 
    });
  }
};

export const updateRefundPolicy = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { policies } = req.body;

    if (!Array.isArray(policies)) {
      return res.status(400).json({ 
        error: 'Policies must be an array' 
      });
    }

    // Delete existing policies
    await prisma.$executeRaw`
      DELETE FROM hotel_refund_policies WHERE hotel_id = ${hotelId}
    `;

    // Insert new policies
    if (policies.length > 0) {
      await prisma.$executeRaw`
        INSERT INTO hotel_refund_policies (hotel_id, days_before_check_in, refund_percentage)
        VALUES ${policies.map(p => `(${hotelId}, ${p.daysBeforeCheckIn}, ${p.refundPercentage})`).join(', ')}
      `;
    }

    res.json({
      message: 'Refund policies updated successfully',
      hotelId,
      policiesCount: policies.length,
    });
  } catch (error) {
    console.error('Update refund policy error:', error);
    res.status(500).json({ 
      error: 'Failed to update refund policies' 
    });
  }
};