const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const watchlistController = require('../controllers/watchlistController');

// All routes require authentication
router.use(require('../middleware/authMiddleware').verifyToken);

// Get user's watchlist
router.get('/', watchlistController.getWatchlist);

// Add hotel to watchlist
router.post('/', watchlistController.addToWatchlist);

// Update watchlist item
router.put('/:id', watchlistController.updateWatchlistItem);

// Remove from watchlist
router.delete('/:id', watchlistController.removeFromWatchlist);

// Get notification preferences
router.get('/preferences', watchlistController.getNotificationPreferences);

// Update notification preferences
router.put('/preferences', watchlistController.updateNotificationPreferences);

// Get notification history
router.get('/notifications', watchlistController.getNotificationHistory);

module.exports = router;