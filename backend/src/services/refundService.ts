import { prisma } from '../lib/prisma';
import { differenceInDays } from 'date-fns';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface RefundPolicy {
  daysBeforeCheckIn: number;
  refundPercentage: number;
}

interface RefundCalculation {
  refundAmount: number;
  refundPercentage: number;
  cancellationFee: number;
  reason: string;
}

export class RefundService {
  private defaultPolicies: RefundPolicy[] = [
    { daysBeforeCheckIn: 30, refundPercentage: 100 },
    { daysBeforeCheckIn: 14, refundPercentage: 80 },
    { daysBeforeCheckIn: 7, refundPercentage: 50 },
    { daysBeforeCheckIn: 3, refundPercentage: 20 },
    { daysBeforeCheckIn: 0, refundPercentage: 0 },
  ];

  // Calculate refund amount based on cancellation policy
  async calculateRefund(
    bookingId: string,
    cancellationDate: Date = new Date()
  ): Promise<RefundCalculation> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotel: true,
        room: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'CANCELLED') {
      throw new Error('Booking already cancelled');
    }

    const daysUntilCheckIn = differenceInDays(
      new Date(booking.checkInDate),
      cancellationDate
    );

    // Get hotel-specific cancellation policy if exists
    const hotelPolicies = await this.getHotelRefundPolicies(booking.hotelId);
    const policies = hotelPolicies.length > 0 ? hotelPolicies : this.defaultPolicies;

    // Find applicable policy
    const applicablePolicy = policies
      .sort((a, b) => b.daysBeforeCheckIn - a.daysBeforeCheckIn)
      .find((policy) => daysUntilCheckIn >= policy.daysBeforeCheckIn);

    const refundPercentage = applicablePolicy?.refundPercentage || 0;
    const refundAmount = (booking.totalPrice * refundPercentage) / 100;
    const cancellationFee = booking.totalPrice - refundAmount;

    let reason = '';
    if (refundPercentage === 100) {
      reason = 'Full refund - Cancelled within free cancellation period';
    } else if (refundPercentage === 0) {
      reason = 'No refund - Cancelled too close to check-in date';
    } else {
      reason = `${refundPercentage}% refund - ${daysUntilCheckIn} days before check-in`;
    }

    return {
      refundAmount,
      refundPercentage,
      cancellationFee,
      reason,
    };
  }

  // Get hotel-specific refund policies
  private async getHotelRefundPolicies(hotelId: string): Promise<RefundPolicy[]> {
    const policies = await prisma.$queryRaw<RefundPolicy[]>`
      SELECT days_before_check_in as "daysBeforeCheckIn", 
             refund_percentage as "refundPercentage"
      FROM hotel_refund_policies
      WHERE hotel_id = ${hotelId}
      ORDER BY days_before_check_in DESC
    `;

    return policies;
  }

  // Process refund through payment gateway
  async processRefund(
    bookingId: string,
    refundAmount: number,
    reason: string
  ): Promise<{
    refundId: string;
    status: string;
    amount: number;
    processedAt: Date;
  }> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          where: { status: 'COMPLETED', type: 'PAYMENT' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking || booking.payments.length === 0) {
      throw new Error('No payment found for this booking');
    }

    const originalPayment = booking.payments[0];

    try {
      // Process refund through Stripe
      let refundResult;
      if (originalPayment.method === 'STRIPE' && originalPayment.transactionId) {
        refundResult = await this.processStripeRefund(
          originalPayment.transactionId,
          refundAmount,
          reason
        );
      } else {
        // For other payment methods, create a manual refund record
        refundResult = {
          id: `refund_${Date.now()}`,
          status: 'pending',
          amount: refundAmount,
        };
      }

      // Record refund in database
      const refundRecord = await prisma.payment.create({
        data: {
          bookingId,
          amount: -refundAmount, // Negative amount for refund
          currency: originalPayment.currency,
          method: originalPayment.method,
          status: refundResult.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
          transactionId: refundResult.id,
          type: 'REFUND',
          metadata: {
            originalPaymentId: originalPayment.id,
            reason,
          },
        },
      });

      // Update booking status
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason,
          refundAmount,
          refundStatus: refundResult.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
          refundedAt: refundResult.status === 'succeeded' ? new Date() : null,
        },
      });

      return {
        refundId: refundRecord.id,
        status: refundRecord.status,
        amount: refundAmount,
        processedAt: refundRecord.createdAt,
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      throw new Error('Failed to process refund');
    }
  }

  // Process refund through Stripe
  private async processStripeRefund(
    chargeId: string,
    amount: number,
    reason: string
  ): Promise<any> {
    try {
      const refund = await stripe.refunds.create({
        charge: chargeId,
        amount: Math.round(amount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          cancellation_reason: reason,
        },
      });

      return refund;
    } catch (error) {
      console.error('Stripe refund error:', error);
      throw error;
    }
  }

  // Get refund status
  async getRefundStatus(bookingId: string): Promise<{
    status: string;
    refundAmount: number;
    refundedAt: Date | null;
    transactionId: string | null;
  }> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        refundStatus: true,
        refundAmount: true,
        refundedAt: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    const refundPayment = await prisma.payment.findFirst({
      where: {
        bookingId,
        type: 'REFUND',
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: booking.refundStatus || 'NOT_REFUNDED',
      refundAmount: booking.refundAmount || 0,
      refundedAt: booking.refundedAt,
      transactionId: refundPayment?.transactionId || null,
    };
  }

  // Handle failed refunds
  async handleFailedRefund(
    bookingId: string,
    error: string
  ): Promise<void> {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        refundStatus: 'FAILED',
        notes: `Refund failed: ${error}`,
      },
    });

    // Create a failed payment record
    await prisma.payment.create({
      data: {
        bookingId,
        amount: 0,
        currency: 'JPY',
        method: 'MANUAL',
        status: 'FAILED',
        type: 'REFUND',
        metadata: {
          error,
        },
      },
    });
  }

  // Get refund history for a hotel
  async getRefundHistory(
    hotelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    refunds: Array<{
      bookingId: string;
      refundAmount: number;
      refundDate: Date;
      reason: string;
      status: string;
    }>;
    totalRefunded: number;
    refundCount: number;
  }> {
    const refunds = await prisma.$queryRaw<
      Array<{
        booking_id: string;
        refund_amount: number;
        refunded_at: Date;
        cancellation_reason: string;
        refund_status: string;
      }>
    >`
      SELECT 
        b.id as booking_id,
        b.refund_amount,
        b.refunded_at,
        b.cancellation_reason,
        b.refund_status
      FROM bookings b
      WHERE b.hotel_id = ${hotelId}
        AND b.status = 'CANCELLED'
        AND b.refund_amount > 0
        AND b.cancelled_at >= ${startDate}
        AND b.cancelled_at <= ${endDate}
      ORDER BY b.cancelled_at DESC
    `;

    const formattedRefunds = refunds.map((r) => ({
      bookingId: r.booking_id,
      refundAmount: r.refund_amount,
      refundDate: r.refunded_at,
      reason: r.cancellation_reason,
      status: r.refund_status,
    }));

    const totalRefunded = formattedRefunds.reduce(
      (sum, r) => sum + r.refundAmount,
      0
    );

    return {
      refunds: formattedRefunds,
      totalRefunded,
      refundCount: formattedRefunds.length,
    };
  }
}