import { Router } from 'express';
import { hotelManagerAuth } from '../middleware/hotelManagerAuth';
import * as revenueController from '../controllers/revenueManagementController';

const router = Router();

// All routes require hotel manager authentication
router.use(hotelManagerAuth);

// Revenue forecasting
router.get('/hotels/:hotelId/forecast', revenueController.getRevenueForecast);

// Competitor analysis
router.get('/hotels/:hotelId/competitors', revenueController.getCompetitorAnalysis);

// Dynamic pricing
router.post(
  '/hotels/:hotelId/rooms/:roomId/dynamic-pricing',
  revenueController.applyDynamicPricing
);

// Yield management recommendations
router.get('/hotels/:hotelId/recommendations', revenueController.getYieldRecommendations);

// Price optimization calculator
router.post('/calculate-optimal-price', revenueController.calculateOptimalPrice);

export default router;