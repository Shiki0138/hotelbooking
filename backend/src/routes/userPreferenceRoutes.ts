import express from 'express';
import { UserPreferenceService } from '../services/userPreferenceService';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';

const router = express.Router();
const userPreferenceService = new UserPreferenceService();

// Get search history for authenticated user
router.get('/search-history', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const searchHistory = await userPreferenceService.getSearchHistory(userId, limit);
  
  res.json({
    success: true,
    data: searchHistory
  });
}));

// Save search history (called internally by search endpoints)
router.post('/search-history', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { filters, resultCount, clickedHotels } = req.body;
  
  await userPreferenceService.saveSearchHistory(
    userId,
    filters,
    resultCount,
    clickedHotels
  );
  
  res.json({
    success: true,
    message: 'Search history saved'
  });
}));

// Get user search preferences
router.get('/preferences', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const preferences = await userPreferenceService.getSearchPreferences(userId);
  
  res.json({
    success: true,
    data: preferences
  });
}));

// Update user search preferences
router.put('/preferences', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const preferences = req.body;
  
  await userPreferenceService.saveSearchPreferences(userId, preferences);
  
  res.json({
    success: true,
    message: 'Preferences updated'
  });
}));

// Get favorite hotels
router.get('/favorites', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const favorites = await userPreferenceService.getFavoriteHotels(userId);
  
  res.json({
    success: true,
    data: favorites
  });
}));

// Add favorite hotel
router.post('/favorites/:hotelId', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { hotelId } = req.params;
  
  await userPreferenceService.addFavoriteHotel(userId, hotelId);
  
  res.json({
    success: true,
    message: 'Hotel added to favorites'
  });
}));

// Remove favorite hotel
router.delete('/favorites/:hotelId', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { hotelId } = req.params;
  
  await userPreferenceService.removeFavoriteHotel(userId, hotelId);
  
  res.json({
    success: true,
    message: 'Hotel removed from favorites'
  });
}));

// Get price alerts
router.get('/price-alerts', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const alerts = await userPreferenceService.getActivePriceAlerts(userId);
  
  res.json({
    success: true,
    data: alerts
  });
}));

// Create price alert
router.post('/price-alerts', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { destination, maxPrice, checkIn, checkOut } = req.body;
  
  await userPreferenceService.setPriceAlert(
    userId,
    destination,
    maxPrice,
    new Date(checkIn),
    new Date(checkOut)
  );
  
  res.json({
    success: true,
    message: 'Price alert created'
  });
}));

export default router;