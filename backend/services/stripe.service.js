const Stripe = require('stripe');

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

class StripeService {
  /**
   * Create a payment intent for hotel booking
   * @param {Object} params - Payment parameters
   * @param {number} params.amount - Amount in JPY
   * @param {string} params.bookingId - Booking ID
   * @param {string} params.customerEmail - Customer email
   * @returns {Promise<Object>} Payment intent object
   */
  async createPaymentIntent({ amount, bookingId, customerEmail, metadata = {} }) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Stripe expects amount in smallest currency unit
        currency: 'jpy',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          bookingId,
          customerEmail,
          ...metadata
        },
        description: `LastMinuteStay Booking ${bookingId}`,
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Stripe payment intent creation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Confirm payment and update booking status
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise<Object>} Payment confirmation result
   */
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          status: 'completed',
          amount: paymentIntent.amount,
          paymentMethod: paymentIntent.payment_method,
        };
      }

      return {
        success: false,
        status: paymentIntent.status,
        error: 'Payment not yet succeeded',
      };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle Stripe webhook events
   * @param {string} rawBody - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Promise<Object>} Webhook handling result
   */
  async handleWebhook(rawBody, signature) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret
      );

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          return this.handlePaymentSuccess(event.data.object);
          
        case 'payment_intent.payment_failed':
          return this.handlePaymentFailure(event.data.object);
          
        case 'charge.refunded':
          return this.handleRefund(event.data.object);
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
          return { success: true, message: 'Event received' };
      }
    } catch (error) {
      console.error('Webhook error:', error);
      return {
        success: false,
        error: 'Webhook signature verification failed',
      };
    }
  }

  /**
   * Handle successful payment
   * @private
   */
  async handlePaymentSuccess(paymentIntent) {
    const { bookingId } = paymentIntent.metadata;
    
    // TODO: Update booking status in database
    // TODO: Send confirmation email
    
    return {
      success: true,
      bookingId,
      message: 'Payment processed successfully',
    };
  }

  /**
   * Handle failed payment
   * @private
   */
  async handlePaymentFailure(paymentIntent) {
    const { bookingId } = paymentIntent.metadata;
    
    // TODO: Update booking status in database
    // TODO: Send failure notification
    
    return {
      success: true,
      bookingId,
      message: 'Payment failure handled',
    };
  }

  /**
   * Handle refund
   * @private
   */
  async handleRefund(charge) {
    const paymentIntentId = charge.payment_intent;
    
    // TODO: Update booking and payment status
    // TODO: Send refund confirmation
    
    return {
      success: true,
      paymentIntentId,
      message: 'Refund processed',
    };
  }

  /**
   * Create a refund for a payment
   * @param {string} paymentIntentId - Payment intent to refund
   * @param {number} amount - Amount to refund (optional, full refund if not specified)
   * @returns {Promise<Object>} Refund result
   */
  async createRefund(paymentIntentId, amount = null) {
    try {
      const refundParams = {
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
      };

      if (amount) {
        refundParams.amount = Math.round(amount);
      }

      const refund = await stripe.refunds.create(refundParams);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
      };
    } catch (error) {
      console.error('Refund creation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new StripeService();