const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripe.service');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/payment/create-intent
 * Create a payment intent for booking
 */
router.post('/create-intent', async (req, res) => {
  try {
    const { bookingId, amount, customerEmail } = req.body;

    // Validate input
    if (!bookingId || !amount || !customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bookingId, amount, customerEmail',
      });
    }

    // Create payment intent
    const result = await stripeService.createPaymentIntent({
      amount,
      bookingId,
      customerEmail,
    });

    if (result.success) {
      // Update booking with payment intent ID
      const { error } = await supabase
        .from('bookings')
        .update({
          stripe_payment_intent_id: result.paymentIntentId,
          payment_status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Database update error:', error);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/payment/confirm
 * Confirm payment completion
 */
router.post('/confirm', async (req, res) => {
  try {
    const { paymentIntentId, bookingId } = req.body;

    if (!paymentIntentId || !bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: paymentIntentId, bookingId',
      });
    }

    // Confirm payment with Stripe
    const result = await stripeService.confirmPayment(paymentIntentId);

    if (result.success) {
      // Update booking status
      const { error } = await supabase
        .from('bookings')
        .update({
          payment_status: 'completed',
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Database update error:', error);
      }

      // Log payment transaction
      await supabase.from('payment_transactions').insert({
        booking_id: bookingId,
        stripe_payment_intent_id: paymentIntentId,
        amount: result.amount,
        status: 'completed',
        payment_method: result.paymentMethod,
        stripe_response: result,
      });

      // TODO: Trigger email notification
    }

    res.json(result);
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/payment/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    const result = await stripeService.handleWebhook(req.body, signature);
    
    if (result.success) {
      res.json({ received: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/payment/refund
 * Create a refund for a booking
 */
router.post('/refund', async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: bookingId',
      });
    }

    // Get booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('stripe_payment_intent_id, total_price, status')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    if (!booking.stripe_payment_intent_id) {
      return res.status(400).json({
        success: false,
        error: 'No payment found for this booking',
      });
    }

    // Create refund
    const refundAmount = amount || booking.total_price;
    const result = await stripeService.createRefund(
      booking.stripe_payment_intent_id,
      refundAmount
    );

    if (result.success) {
      // Update booking status
      await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      // Log refund transaction
      await supabase.from('payment_transactions').insert({
        booking_id: bookingId,
        stripe_payment_intent_id: booking.stripe_payment_intent_id,
        amount: -refundAmount,
        status: 'refunded',
        stripe_response: result,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;