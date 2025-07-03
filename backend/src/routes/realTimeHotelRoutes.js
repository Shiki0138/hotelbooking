// Real-Time Hotel Routes
// API endpoints for vacant hotel search, details, and price monitoring

const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const router = express.Router();
const realTimeHotelController = require('../controllers/realTimeHotelController');
const { verifyToken, optionalAuth, userRateLimit } = require('../middleware/authMiddleware');

// Validation rules
const vacantSearchValidation = [
  query('checkinDate').isISO8601().toDate().withMessage('Valid check-in date required'),
  query('checkoutDate').isISO8601().toDate().withMessage('Valid check-out date required'),
  query('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  query('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  query('searchRadius').optional().isInt({ min: 1, max: 50 }).withMessage('Search radius must be 1-50km'),
  query('adultNum').optional().isInt({ min: 1, max: 20 }).withMessage('Adult number must be 1-20'),
  query('roomNum').optional().isInt({ min: 1, max: 10 }).withMessage('Room number must be 1-10'),
  query('maxCharge').optional().isInt({ min: 0 }).withMessage('Invalid max charge'),
  query('minCharge').optional().isInt({ min: 0 }).withMessage('Invalid min charge'),
  query('hotelType').optional().isIn(['0', '1', '2', '3', '4']).withMessage('Invalid hotel type'),
  query('onsenFlag').optional().isBoolean().withMessage('Onsen flag must be boolean'),
  query('sortType').optional().isIn(['standard', 'price', 'price_desc', 'rating']).withMessage('Invalid sort type'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('hits').optional().isInt({ min: 1, max: 100 }).withMessage('Hits must be 1-100')
];

const hotelDetailValidation = [
  param('hotelNo').notEmpty().withMessage('Hotel number is required'),
  query('checkinDate').optional().isISO8601().toDate(),
  query('checkoutDate').optional().isISO8601().toDate(),
  query('adultNum').optional().isInt({ min: 1, max: 20 }),
  query('roomNum').optional().isInt({ min: 1, max: 10 })
];

const watchlistValidation = [
  body('hotelNo').notEmpty().withMessage('Hotel number is required'),
  body('targetPrice').optional().isInt({ min: 0 }).withMessage('Invalid target price'),
  body('checkinDate').optional().isISO8601().toDate(),
  body('checkoutDate').optional().isISO8601().toDate(),
  body('adultNum').optional().isInt({ min: 1, max: 20 }),
  body('alertConditions').optional().isObject()
];

// Apply rate limiting to all routes
router.use(userRateLimit(100, 60000)); // 100 requests per minute

// Vacant hotel search endpoint
router.get('/vacant-search',
  optionalAuth,
  vacantSearchValidation,
  realTimeHotelController.searchVacantHotels
);

// Hotel detail endpoint with real-time pricing
router.get('/detail/:hotelNo',
  optionalAuth,
  hotelDetailValidation,
  realTimeHotelController.getHotelDetail
);

// Watchlist management (requires authentication)
router.use('/watchlist', verifyToken);

router.post('/watchlist',
  watchlistValidation,
  realTimeHotelController.addToWatchlist
);

router.delete('/watchlist/:watchlistId',
  param('watchlistId').isUUID().withMessage('Invalid watchlist ID'),
  realTimeHotelController.removeFromWatchlist
);

router.get('/watchlist',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  realTimeHotelController.getUserWatchlist
);

// Price alert check endpoint (for cron jobs)
router.post('/check-alerts',
  // Could add API key validation for cron jobs
  realTimeHotelController.checkPriceAlerts
);

// API metrics endpoint
router.get('/metrics',
  realTimeHotelController.getMetrics
);

// Location-based search helpers
router.get('/search-by-location',
  optionalAuth,
  [
    query('prefecture').notEmpty().withMessage('Prefecture is required'),
    query('checkinDate').isISO8601().toDate(),
    query('checkoutDate').isISO8601().toDate(),
    ...vacantSearchValidation.slice(2) // Skip date validation since it's already included
  ],
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

      const { prefecture } = req.query;
      
      // Prefecture to coordinates mapping (major cities)
      const prefectureCoords = {
        'tokyo': { latitude: 35.6812, longitude: 139.7671 },
        'osaka': { latitude: 34.6937, longitude: 135.5023 },
        'kyoto': { latitude: 35.0116, longitude: 135.7681 },
        'kanagawa': { latitude: 35.4478, longitude: 139.6425 },
        'hokkaido': { latitude: 43.0642, longitude: 141.3469 },
        'okinawa': { latitude: 26.2124, longitude: 127.6792 }
      };

      const coords = prefectureCoords[prefecture.toLowerCase()];
      if (!coords) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported prefecture'
        });
      }

      // Add coordinates to query parameters
      req.query.latitude = coords.latitude;
      req.query.longitude = coords.longitude;
      req.query.searchRadius = req.query.searchRadius || 20; // Larger radius for prefecture search

      // Call the main search function
      await realTimeHotelController.searchVacantHotels(req, res);

    } catch (error) {
      console.error('❌ Location search error:', error);
      res.status(500).json({
        success: false,
        error: 'Location search failed'
      });
    }
  }
);

// Quick availability check for specific hotel
router.get('/quick-availability/:hotelNo',
  optionalAuth,
  [
    param('hotelNo').notEmpty().withMessage('Hotel number is required'),
    query('checkinDate').isISO8601().toDate().withMessage('Valid check-in date required'),
    query('checkoutDate').isISO8601().toDate().withMessage('Valid check-out date required')
  ],
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

      const { hotelNo } = req.params;
      const { checkinDate, checkoutDate, adultNum = 2, roomNum = 1 } = req.query;

      const hotelDetail = await require('../services/rakutenRealTimeService').getHotelDetail(hotelNo, {
        checkinDate,
        checkoutDate,
        adultNum: parseInt(adultNum),
        roomNum: parseInt(roomNum)
      });

      // Extract availability summary
      const availabilityInfo = {
        isAvailable: hotelDetail.roomPlans.some(plan => plan.availableRoomNum > 0),
        lowestPrice: Math.min(...hotelDetail.roomPlans
          .filter(plan => plan.total)
          .map(plan => plan.total)
        ),
        availableRoomCount: hotelDetail.roomPlans.reduce((sum, plan) => 
          sum + (plan.availableRoomNum || 0), 0
        ),
        roomPlans: hotelDetail.roomPlans.map(plan => ({
          planName: plan.planName,
          price: plan.total,
          availableRooms: plan.availableRoomNum,
          reserveUrl: plan.reserveUrl
        })),
        lastUpdated: hotelDetail.lastUpdated
      };

      res.json({
        success: true,
        data: availabilityInfo
      });

    } catch (error) {
      console.error('❌ Quick availability error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check availability'
      });
    }
  }
);

// Get popular destinations for search suggestions
router.get('/popular-destinations',
  async (req, res) => {
    try {
      const destinations = [
        {
          name: '東京',
          code: 'tokyo',
          latitude: 35.6812,
          longitude: 139.7671,
          description: '日本の首都、ビジネス・観光の中心地',
          hotspots: ['新宿', '渋谷', '銀座', '浅草', 'お台場']
        },
        {
          name: '大阪',
          code: 'osaka',
          latitude: 34.6937,
          longitude: 135.5023,
          description: '関西の中心都市、グルメとエンターテイメント',
          hotspots: ['梅田', '難波', '天王寺', 'USJ', '道頓堀']
        },
        {
          name: '京都',
          code: 'kyoto',
          latitude: 35.0116,
          longitude: 135.7681,
          description: '古都の風情と伝統文化',
          hotspots: ['祇園', '嵐山', '清水寺', '金閣寺', '京都駅']
        },
        {
          name: '横浜',
          code: 'kanagawa',
          latitude: 35.4478,
          longitude: 139.6425,
          description: '港町の魅力とモダンな街並み',
          hotspots: ['みなとみらい', '中華街', '赤レンガ', '山下公園']
        },
        {
          name: '札幌',
          code: 'hokkaido',
          latitude: 43.0642,
          longitude: 141.3469,
          description: '北海道の中心都市、グルメと自然',
          hotspots: ['すすきの', '大通公園', '時計台', '新千歳空港']
        },
        {
          name: '那覇',
          code: 'okinawa',
          latitude: 26.2124,
          longitude: 127.6792,
          description: '南国リゾート、美しい海と文化',
          hotspots: ['国際通り', '首里城', '美ら海水族館', 'アメリカンビレッジ']
        }
      ];

      res.json({
        success: true,
        data: destinations
      });

    } catch (error) {
      console.error('❌ Popular destinations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch destinations'
      });
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('🚨 Real-time hotel route error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Real-time hotel service error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;