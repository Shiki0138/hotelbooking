import express from 'express';
import { authenticate } from '../middleware/auth';
const PricePredictionService = require('../../services/PricePredictionService');
const UserBehaviorAnalysisService = require('../../services/UserBehaviorAnalysisService');
const PricePredictionCacheService = require('../../services/PricePredictionCacheService');

const router = express.Router();

/**
 * Get price predictions for a specific room
 * GET /api/price-predictions/:hotelId/:roomId
 */
router.get('/:hotelId/:roomId', async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const { checkIn } = req.query;
    
    if (!checkIn) {
      return res.status(400).json({
        error: 'Check-in date is required'
      });
    }
    
    // Get or generate predictions
    let predictions = await PricePredictionService.getLatestPredictions(hotelId, roomId);
    
    if (!predictions || predictions.length === 0) {
      // Generate new predictions
      predictions = await PricePredictionService.generatePredictions(
        hotelId,
        roomId,
        checkIn as string
      );
    }
    
    res.json({
      hotelId,
      roomId,
      checkIn,
      predictions,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting price predictions:', error);
    res.status(500).json({
      error: 'Failed to get price predictions'
    });
  }
});

/**
 * Get price prediction summary for multiple hotels
 * POST /api/price-predictions/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { hotels } = req.body;
    
    if (!hotels || !Array.isArray(hotels)) {
      return res.status(400).json({
        error: 'Hotels array is required'
      });
    }
    
    const predictions = await Promise.all(
      hotels.map(async (hotel: any) => {
        try {
          const hotelPredictions = await PricePredictionService.getLatestPredictions(
            hotel.hotelId,
            hotel.roomId || 'default'
          );
          
          // Get the best recommendation
          const bestDeal = hotelPredictions?.reduce((best: any, current: any) => {
            if (!best || current.predicted_price < best.predicted_price) {
              return current;
            }
            return best;
          }, null);
          
          return {
            hotelId: hotel.hotelId,
            roomId: hotel.roomId,
            hasPredictions: !!hotelPredictions && hotelPredictions.length > 0,
            bestDeal,
            recommendation: bestDeal?.recommendation || 'monitor'
          };
        } catch (error) {
          console.error(`Error getting predictions for hotel ${hotel.hotelId}:`, error);
          return {
            hotelId: hotel.hotelId,
            roomId: hotel.roomId,
            hasPredictions: false,
            error: true
          };
        }
      })
    );
    
    res.json({
      predictions,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting batch predictions:', error);
    res.status(500).json({
      error: 'Failed to get batch predictions'
    });
  }
});

/**
 * Get user's search pattern analysis
 * GET /api/price-predictions/user-analysis
 */
router.get('/user-analysis', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'User authentication required'
      });
    }
    
    const analysis = await PricePredictionService.analyzeSearchHistory(userId);
    
    res.json({
      userId,
      analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing user patterns:', error);
    res.status(500).json({
      error: 'Failed to analyze user patterns'
    });
  }
});

/**
 * Record price history (called by monitoring service)
 * POST /api/price-predictions/history
 */
router.post('/history', async (req, res) => {
  try {
    const { hotelId, roomId, priceData } = req.body;
    
    if (!hotelId || !roomId || !priceData) {
      return res.status(400).json({
        error: 'Hotel ID, room ID, and price data are required'
      });
    }
    
    await PricePredictionService.collectPriceHistory(hotelId, roomId, priceData);
    
    res.json({
      success: true,
      message: 'Price history recorded'
    });
  } catch (error) {
    console.error('Error recording price history:', error);
    res.status(500).json({
      error: 'Failed to record price history'
    });
  }
});

/**
 * Get price trend data for charting
 * GET /api/price-predictions/trends/:hotelId/:roomId
 */
router.get('/trends/:hotelId/:roomId', async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    const { days = 30 } = req.query;
    
    // Get historical data
    const historicalData = await PricePredictionService.getHistoricalData(hotelId, roomId);
    
    // Get predictions
    const predictions = await PricePredictionService.getLatestPredictions(hotelId, roomId);
    
    // Format for charting
    const trendData = {
      historical: historicalData?.map((d: any) => ({
        date: d.date,
        price: d.price,
        type: 'actual'
      })) || [],
      predicted: predictions?.map((p: any) => ({
        date: p.target_date,
        price: p.predicted_price,
        priceLow: p.price_range_low,
        priceHigh: p.price_range_high,
        confidence: p.confidence_score,
        type: 'predicted'
      })) || []
    };
    
    res.json({
      hotelId,
      roomId,
      trendData,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting price trends:', error);
    res.status(500).json({
      error: 'Failed to get price trends'
    });
  }
});

/**
 * Get user behavior analysis
 * GET /api/price-predictions/behavior-analysis
 */
router.get('/behavior-analysis', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        error: 'User authentication required'
      });
    }
    
    const analysis = await UserBehaviorAnalysisService.analyzeUserBehavior(userId);
    
    res.json({
      userId,
      analysis,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing user behavior:', error);
    res.status(500).json({
      error: 'Failed to analyze user behavior'
    });
  }
});

/**
 * Get cache statistics
 * GET /api/price-predictions/cache-stats
 */
router.get('/cache-stats', async (req, res) => {
  try {
    const stats = await PricePredictionCacheService.getCacheStats();
    
    res.json({
      cacheEnabled: PricePredictionCacheService.isAvailable(),
      stats,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      error: 'Failed to get cache statistics'
    });
  }
});

/**
 * Clear prediction cache (admin only)
 * POST /api/price-predictions/cache/clear
 */
router.post('/cache/clear', authenticate, async (req: any, res) => {
  try {
    // In production, check for admin role
    // if (!req.user?.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }
    
    const cleared = await PricePredictionCacheService.clearPredictionCache();
    
    res.json({
      success: true,
      clearedEntries: cleared,
      message: 'Prediction cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache'
    });
  }
});

export default router;