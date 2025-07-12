import { Router } from 'express';
import { HotelController } from '../controllers/hotel.controller';
import { query, body } from 'express-validator';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const hotelController = new HotelController();

// バリデーションルール
const searchValidation = [
  query('checkIn').isISO8601().withMessage('Invalid check-in date'),
  query('checkOut').isISO8601().withMessage('Invalid check-out date'),
  query('guests').optional().isInt({ min: 1, max: 10 }).withMessage('Guests must be between 1 and 10'),
  query('rooms').optional().isInt({ min: 1, max: 5 }).withMessage('Rooms must be between 1 and 5'),
  query('priceMin').optional().isInt({ min: 0 }).withMessage('Price min must be positive'),
  query('priceMax').optional().isInt({ min: 0 }).withMessage('Price max must be positive'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const bookingUrlValidation = [
  body('provider').isIn(['agoda', 'booking', 'expedia']).withMessage('Invalid provider'),
  body('checkIn').isISO8601().withMessage('Invalid check-in date'),
  body('checkOut').isISO8601().withMessage('Invalid check-out date'),
  body('guests').optional().isInt({ min: 1, max: 10 }).withMessage('Guests must be between 1 and 10')
];

// ルート定義
router.get(
  '/search',
  rateLimiter({ windowMs: 60000, max: 30 }), // 1分間に30リクエスト
  searchValidation,
  asyncHandler(hotelController.searchHotels)
);

router.get(
  '/popular',
  rateLimiter({ windowMs: 60000, max: 60 }),
  asyncHandler(hotelController.getPopularHotels)
);

router.get(
  '/weekend-availability',
  rateLimiter({ windowMs: 60000, max: 30 }),
  asyncHandler(hotelController.getWeekendAvailability)
);

router.get(
  '/:hotelId',
  rateLimiter({ windowMs: 60000, max: 60 }),
  asyncHandler(hotelController.getHotelDetails)
);

router.post(
  '/:hotelId/booking-url',
  rateLimiter({ windowMs: 60000, max: 20 }),
  bookingUrlValidation,
  asyncHandler(hotelController.generateBookingUrl)
);

export default router;