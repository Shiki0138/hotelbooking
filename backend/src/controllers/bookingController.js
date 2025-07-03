const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create a new booking
const createBooking = async (req, res) => {
  const transaction = await supabase.rpc('begin_transaction');
  
  try {
    const userId = req.user.id;
    const {
      hotelId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      guestCount,
      guestDetails,
      specialRequests,
      paymentMethodId
    } = req.body;

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today || checkOut <= checkIn) {
      await supabase.rpc('rollback_transaction');
      return res.status(400).json({
        success: false,
        error: 'Invalid check-in or check-out dates'
      });
    }

    // Check room availability
    const { data: availability, error: availError } = await supabase
      .from('room_inventory')
      .select('date, available_rooms, price')
      .eq('room_type_id', roomTypeId)
      .gte('date', checkInDate)
      .lt('date', checkOutDate)
      .order('date');

    if (availError || !availability || availability.length === 0) {
      await supabase.rpc('rollback_transaction');
      return res.status(400).json({
        success: false,
        error: 'Room availability check failed'
      });
    }

    // Check if rooms are available for all dates
    const nights = availability.length;
    const unavailableDates = availability.filter(inv => inv.available_rooms < 1);
    
    if (unavailableDates.length > 0) {
      await supabase.rpc('rollback_transaction');
      return res.status(400).json({
        success: false,
        error: 'Rooms not available for selected dates',
        unavailableDates: unavailableDates.map(d => d.date)
      });
    }

    // Calculate total amount
    const totalAmount = availability.reduce((sum, inv) => sum + Number(inv.price), 0);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'jpy',
      payment_method: paymentMethodId,
      confirm: false, // Will confirm after booking is created
      metadata: {
        hotelId,
        roomTypeId,
        checkInDate,
        checkOutDate
      }
    });

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        hotel_id: hotelId,
        room_type_id: roomTypeId,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        guest_count: guestCount,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'pending',
        payment_intent_id: paymentIntent.id,
        special_requests: specialRequests
      })
      .select()
      .single();

    if (bookingError) {
      await stripe.paymentIntents.cancel(paymentIntent.id);
      await supabase.rpc('rollback_transaction');
      return res.status(400).json({
        success: false,
        error: 'Failed to create booking'
      });
    }

    // Insert guest details
    const guestInserts = guestDetails.map((guest, index) => ({
      booking_id: booking.id,
      first_name: guest.firstName,
      last_name: guest.lastName,
      email: guest.email,
      phone_number: guest.phoneNumber,
      is_primary_guest: index === 0
    }));

    const { error: guestError } = await supabase
      .from('guest_details')
      .insert(guestInserts);

    if (guestError) {
      await stripe.paymentIntents.cancel(paymentIntent.id);
      await supabase.rpc('rollback_transaction');
      return res.status(400).json({
        success: false,
        error: 'Failed to save guest details'
      });
    }

    // Create payment transaction record
    const { error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        booking_id: booking.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: totalAmount,
        currency: 'JPY',
        status: 'pending'
      });

    if (paymentError) {
      await stripe.paymentIntents.cancel(paymentIntent.id);
      await supabase.rpc('rollback_transaction');
      return res.status(400).json({
        success: false,
        error: 'Failed to create payment record'
      });
    }

    await supabase.rpc('commit_transaction');

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        bookingReference: booking.booking_reference,
        status: booking.status,
        totalAmount: booking.total_amount,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date
      },
      payment: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }
    });

  } catch (error) {
    await supabase.rpc('rollback_transaction');
    console.error('Booking creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Confirm booking payment
const confirmBookingPayment = async (req, res) => {
  try {
    const { bookingId, paymentIntentId } = req.body;
    const userId = req.user.id;

    // Verify booking belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    if (booking.payment_intent_id !== paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent mismatch'
      });
    }

    // Confirm payment with Stripe
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'succeeded'
        })
        .eq('id', bookingId);

      // Update payment transaction
      await supabase
        .from('payment_transactions')
        .update({
          status: 'succeeded',
          payment_method: paymentIntent.payment_method_types[0]
        })
        .eq('stripe_payment_intent_id', paymentIntentId);

      // Send confirmation email (implement email service)
      // await emailService.sendBookingConfirmation(booking);

      return res.json({
        success: true,
        message: 'Booking confirmed successfully',
        booking: {
          id: booking.id,
          bookingReference: booking.booking_reference,
          status: 'confirmed'
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Payment failed',
        paymentStatus: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        hotels (name, address, city, prefecture),
        room_types (name, description),
        guest_details (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data: bookings, error, count } = await query
      .range(from, to);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Get booking details
const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        hotels (
          name, description, address, city, prefecture,
          amenities, images, latitude, longitude
        ),
        room_types (name, description, capacity, amenities, images),
        guest_details (*),
        payment_transactions (*)
      `)
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.json({
      success: true,
      booking
    });

  } catch (error) {
    console.error('Get booking details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Booking is already cancelled'
      });
    }

    // Check cancellation policy (24 hours before check-in)
    const checkInDate = new Date(booking.check_in_date);
    const now = new Date();
    const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);

    if (hoursUntilCheckIn < 24) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel booking within 24 hours of check-in'
      });
    }

    // Process refund if payment was made
    if (booking.payment_status === 'succeeded' && booking.payment_intent_id) {
      const refund = await stripe.refunds.create({
        payment_intent: booking.payment_intent_id,
        reason: 'requested_by_customer'
      });

      // Update payment transaction
      await supabase
        .from('payment_transactions')
        .update({
          status: 'refunded'
        })
        .eq('booking_id', bookingId);
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: booking.payment_status === 'succeeded' ? 'refunded' : 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: 'Failed to cancel booking'
      });
    }

    // Send cancellation email
    // await emailService.sendBookingCancellation(booking);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      refundStatus: booking.payment_status === 'succeeded' ? 'Refund initiated' : 'No refund needed'
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Check room availability
const checkAvailability = async (req, res) => {
  try {
    const { roomTypeId, checkInDate, checkOutDate } = req.query;

    if (!roomTypeId || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    const { data: availability, error } = await supabase
      .from('room_inventory')
      .select('date, available_rooms, price')
      .eq('room_type_id', roomTypeId)
      .gte('date', checkInDate)
      .lt('date', checkOutDate)
      .order('date');

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const isAvailable = availability.every(inv => inv.available_rooms > 0);
    const totalPrice = availability.reduce((sum, inv) => sum + Number(inv.price), 0);

    res.json({
      success: true,
      isAvailable,
      totalPrice,
      nights: availability.length,
      availability: availability.map(inv => ({
        date: inv.date,
        available: inv.available_rooms,
        price: inv.price
      }))
    });

  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  createBooking,
  confirmBookingPayment,
  getUserBookings,
  getBookingDetails,
  cancelBooking,
  checkAvailability
};