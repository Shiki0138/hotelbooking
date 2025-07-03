// Enhanced Hotel Search Routes for Demo Mode
// Comprehensive search API endpoints with validation

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const router = express.Router();
const hotelSearchController = require('../controllers/hotelSearchController');
const { optionalAuth, userRateLimit } = require('../middleware/authMiddleware');

// Validation middleware
const validateSearchRequest = [
  query('area').optional().isIn(['tokyo', 'osaka', 'kyoto', 'kanagawa', 'chiba', 'saitama', 'hokkaido', 'okinawa']),
  query('keyword').optional().isLength({ min: 1, max: 100 }),
  query('checkInDate').optional().isISO8601().toDate(),
  query('checkOutDate').optional().isISO8601().toDate(),
  query('guests').optional().isInt({ min: 1, max: 20 }),
  query('rooms').optional().isInt({ min: 1, max: 10 }),
  query('minPrice').optional().isInt({ min: 0 }),
  query('maxPrice').optional().isInt({ min: 0 }),
  query('rating').optional().isFloat({ min: 0, max: 5 }),
  query('hotelType').optional().isIn(['business', 'hotel', 'resort', 'ryokan', 'pension', 'other']),
  query('sortBy').optional().isIn(['price', 'price_desc', 'rating', 'name', 'distance']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

const validateHotelId = [
  param('hotelId').notEmpty().withMessage('Hotel ID is required')
];

const validateSuggestionQuery = [
  query('query').optional().isLength({ min: 1, max: 50 })
];

// Apply rate limiting to search endpoints
router.use(userRateLimit(60, 60000)); // 60 requests per minute

// Main hotel search endpoint
router.get('/search', 
  optionalAuth,
  validateSearchRequest,
  hotelSearchController.searchHotels
);

// Hotel detail endpoint
router.get('/detail/:hotelId',
  optionalAuth,
  validateHotelId,
  query('checkInDate').optional().isISO8601().toDate(),
  query('checkOutDate').optional().isISO8601().toDate(),
  query('guests').optional().isInt({ min: 1, max: 20 }),
  query('rooms').optional().isInt({ min: 1, max: 10 }),
  hotelSearchController.getHotelDetail
);

// Search suggestions endpoint
router.get('/suggestions',
  optionalAuth,
  validateSuggestionQuery,
  hotelSearchController.getSearchSuggestions
);

// Available filters endpoint
router.get('/filters',
  hotelSearchController.getSearchFilters
);

// Search metrics and health endpoint
router.get('/metrics',
  hotelSearchController.getSearchMetrics
);

// Availability check endpoint
router.get('/availability/:hotelId',
  optionalAuth,
  validateHotelId,
  query('checkInDate').isISO8601().toDate().withMessage('Valid check-in date required'),
  query('checkOutDate').isISO8601().toDate().withMessage('Valid check-out date required'),
  query('guests').optional().isInt({ min: 1, max: 20 }),
  query('rooms').optional().isInt({ min: 1, max: 10 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { hotelId } = req.params;
      const { checkInDate, checkOutDate, guests = 2, rooms = 1 } = req.query;

      const availability = await hotelSearchController.checkAvailability(
        hotelId, checkInDate, checkOutDate, guests, rooms
      );

      res.json({
        success: true,
        data: availability
      });

    } catch (error) {
      console.error('❌ Availability check error:', error);
      res.status(500).json({
        success: false,
        error: 'Availability check failed'
      });
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('🚨 Hotel search route error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Hotel search service error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;