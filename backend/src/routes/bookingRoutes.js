const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, userRateLimit } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validation');

// Validation schemas
const createBookingSchema = {
  body: {
    hotelId: { type: 'uuid', required: true },
    roomTypeId: { type: 'uuid', required: true },
    checkInDate: { type: 'date', required: true },
    checkOutDate: { type: 'date', required: true },
    guestCount: { type: 'number', min: 1, max: 10, required: true },
    guestDetails: { 
      type: 'array', 
      required: true,
      items: {
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
        email: { type: 'email', required: true },
        phoneNumber: { type: 'string', optional: true }
      }
    },
    specialRequests: { type: 'string', optional: true },
    paymentMethodId: { type: 'string', required: true }
  }
};

const confirmPaymentSchema = {
  body: {
    bookingId: { type: 'uuid', required: true },
    paymentIntentId: { type: 'string', required: true }
  }
};

// Public route for checking availability
router.get('/availability', bookingController.checkAvailability);

// All routes below require authentication
router.use(verifyToken);

// Booking routes
router.post('/', userRateLimit(10, 60000), validateRequest(createBookingSchema), bookingController.createBooking);
router.post('/confirm-payment', validateRequest(confirmPaymentSchema), bookingController.confirmBookingPayment);
router.get('/', bookingController.getUserBookings);
router.get('/:bookingId', bookingController.getBookingDetails);
router.post('/:bookingId/cancel', userRateLimit(5, 60000), bookingController.cancelBooking);

module.exports = router;