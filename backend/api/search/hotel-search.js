// Ultra-fast hotel search API endpoints
const express = require('express');
const router = express.Router();
const SearchOptimizer = require('../../models/search-optimizer');
const AvailabilityIndexer = require('../../models/availability-indexer');
const PriceOptimizer = require('../../models/price-optimizer');

// Initialize services
const searchOptimizer = new SearchOptimizer();
const availabilityIndexer = new AvailabilityIndexer();
const priceOptimizer = new PriceOptimizer();

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
    
    // Alert if response time exceeds 500ms
    if (duration > 500) {
      console.warn(`Slow response detected: ${req.path} took ${duration}ms`);
    }
  });
  next();
};

router.use(performanceMonitor);

// Main search endpoint - Ultra-fast location-based search
router.post('/search', async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      radius = 5,
      checkIn,
      checkOut,
      guests = 1,
      minRating = 0,
      maxPrice = 999999,
      sortBy = 'distance'
    } = req.body;
    
    // Validate inputs
    if (!latitude || !longitude || !checkIn || !checkOut) {
      return res.status(400).json({
        error: 'Missing required parameters: latitude, longitude, checkIn, checkOut'
      });
    }
    
    // Performance optimization: Start all queries in parallel
    const [
      nearbyHotels,
      popularLocations,
      bestDeals
    ] = await Promise.all([
      // Main search
      searchOptimizer.searchNearbyHotels(
        latitude,
        longitude,
        radius,
        checkIn,
        checkOut,
        { minRating, sortBy }
      ),
      
      // Popular locations for UI hints
      searchOptimizer.getPopularLocations(),
      
      // Best deals in the area
      priceOptimizer.getBestDeals(5)
    ]);
    
    // Filter by price and guest capacity
    const filteredHotels = nearbyHotels.filter(hotel => 
      hotel.availability.minPrice <= maxPrice
    );
    
    // Enrich with urgency indicators
    const enrichedHotels = filteredHotels.map(hotel => {
      const hoursUntilCheckIn = (new Date(checkIn) - new Date()) / (1000 * 60 * 60);
      
      return {
        ...hotel,
        urgencyIndicators: {
          lastMinuteDiscount: hotel.availability.minPrice < hotel.availability.originalPrice,
          lowAvailability: hotel.availability.totalAvailable <= 3,
          bookingSoon: hoursUntilCheckIn <= 24,
          message: getUrgencyMessage(hoursUntilCheckIn, hotel.availability.totalAvailable)
        }
      };
    });
    
    res.json({
      success: true,
      searchTime: Date.now() - req.startTime || 0,
      results: {
        hotels: enrichedHotels,
        totalCount: enrichedHotels.length,
        searchCenter: { latitude, longitude },
        searchRadius: radius,
        popularNearby: popularLocations.slice(0, 3),
        topDeals: bestDeals.filter(deal => 
          calculateDistance(latitude, longitude, deal.location.lat, deal.location.lng) <= radius
        )
      }
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

// Text-based search (city/hotel name)
router.get('/search/text', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters'
      });
    }
    
    const results = await searchOptimizer.searchByText(q, limit);
    
    res.json({
      success: true,
      results: results,
      query: q
    });
    
  } catch (error) {
    console.error('Text search error:', error);
    res.status(500).json({
      error: 'Text search failed',
      message: error.message
    });
  }
});

// Get hotel details with real-time availability
router.get('/hotels/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { checkIn, checkOut } = req.query;
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({
        error: 'checkIn and checkOut dates are required'
      });
    }
    
    // Get optimized prices for all rooms
    const prices = await priceOptimizer.getOptimizedPrices(
      hotelId,
      checkIn,
      checkOut
    );
    
    // Get price trends
    const trends = await priceOptimizer.getPriceTrends(hotelId, 7);
    
    res.json({
      success: true,
      hotelId: parseInt(hotelId),
      availability: {
        checkIn,
        checkOut,
        rooms: prices,
        lowestPrice: prices.length > 0 
          ? Math.min(...prices.map(p => p.totalPrice))
          : null
      },
      priceTrends: trends.summary,
      bookingAdvice: getBookingAdvice(prices, checkIn)
    });
    
  } catch (error) {
    console.error('Hotel details error:', error);
    res.status(500).json({
      error: 'Failed to get hotel details',
      message: error.message
    });
  }
});

// Real-time availability check
router.post('/availability/check', async (req, res) => {
  try {
    const { hotelIds, checkIn, checkOut } = req.body;
    
    if (!hotelIds || !Array.isArray(hotelIds) || hotelIds.length === 0) {
      return res.status(400).json({
        error: 'hotelIds array is required'
      });
    }
    
    // Parallel availability checks
    const availabilityPromises = hotelIds.map(hotelId =>
      availabilityIndexer.checkAvailabilityFast(hotelId, checkIn, checkOut)
    );
    
    const results = await Promise.all(availabilityPromises);
    
    const availability = hotelIds.reduce((acc, hotelId, index) => {
      acc[hotelId] = results[index];
      return acc;
    }, {});
    
    res.json({
      success: true,
      availability,
      checkIn,
      checkOut
    });
    
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({
      error: 'Availability check failed',
      message: error.message
    });
  }
});

// Get best deals
router.get('/deals/best', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const deals = await priceOptimizer.getBestDeals(parseInt(limit));
    
    res.json({
      success: true,
      deals,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Best deals error:', error);
    res.status(500).json({
      error: 'Failed to get best deals',
      message: error.message
    });
  }
});

// Get trending hotels
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const trending = await availabilityIndexer.getTrendingHotels(parseInt(limit));
    
    res.json({
      success: true,
      trending,
      period: '24h'
    });
    
  } catch (error) {
    console.error('Trending hotels error:', error);
    res.status(500).json({
      error: 'Failed to get trending hotels',
      message: error.message
    });
  }
});

// Helper functions
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getUrgencyMessage(hoursUntilCheckIn, availableRooms) {
  if (availableRooms === 1) {
    return 'Last room available!';
  } else if (availableRooms <= 3) {
    return `Only ${availableRooms} rooms left!`;
  } else if (hoursUntilCheckIn <= 6) {
    return 'Book now for best last-minute rate!';
  } else if (hoursUntilCheckIn <= 24) {
    return 'Special last-minute discount!';
  }
  return null;
}

function getBookingAdvice(rooms, checkIn) {
  const hoursUntilCheckIn = (new Date(checkIn) - new Date()) / (1000 * 60 * 60);
  
  if (hoursUntilCheckIn <= 6) {
    return {
      urgency: 'high',
      message: 'Book immediately to secure your room',
      tip: 'Prices are at their lowest for last-minute bookings'
    };
  } else if (hoursUntilCheckIn <= 24) {
    return {
      urgency: 'medium',
      message: 'Great last-minute deals available',
      tip: 'Prices drop significantly within 24 hours of check-in'
    };
  } else {
    return {
      urgency: 'low',
      message: 'Good availability',
      tip: 'Consider waiting for last-minute discounts if flexible'
    };
  }
}

module.exports = router;