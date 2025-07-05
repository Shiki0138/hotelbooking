import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as watchlistController from '../controllers/watchlistController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Watchlist items management
router.get('/', watchlistController.getWatchlistItems);
router.post('/', watchlistController.createWatchlistItem);
router.put('/:id', watchlistController.updateWatchlistItem);
router.delete('/:id', watchlistController.deleteWatchlistItem);

// Batch operations
router.post('/batch', watchlistController.createBatchWatchlistItems);
router.delete('/batch', watchlistController.deleteBatchWatchlistItems);

// Price history
router.get('/:id/price-history', watchlistController.getPriceHistory);

// Notifications
router.get('/notifications', watchlistController.getWatchlistNotifications);
router.put('/notifications/:id/read', watchlistController.markNotificationAsRead);

// Analytics
router.get('/analytics', watchlistController.getWatchlistAnalytics);

// Test endpoints (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test/trigger-check', watchlistController.triggerPriceCheck);
}

export default router;