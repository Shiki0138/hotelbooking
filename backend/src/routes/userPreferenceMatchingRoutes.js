const express = require('express');
const router = express.Router();
const PreferenceMatchingService = require('../../services/PreferenceMatchingService');
const { authenticateToken } = require('../middleware/authMiddleware');

const preferenceService = new PreferenceMatchingService();

/**
 * Get user preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await preferenceService.getUserPreferences(userId);
    
    if (!preferences) {
      // Return default preferences if none exist
      return res.json({
        user_id: userId,
        preferred_locations: [],
        preferred_prefectures: [],
        budget_min: null,
        budget_max: null,
        date_flexibility: {
          flexible: true,
          preferred_days: ["friday", "saturday"],
          avoid_days: [],
          advance_days: 7
        },
        room_preferences: {
          types: ["single", "double", "twin"],
          amenities: [],
          min_size: null
        },
        notification_settings: {
          channels: ["email"],
          frequency: "immediate",
          quiet_hours: { start: "22:00", end: "08:00" },
          match_threshold: 80
        },
        auto_match_enabled: true,
        match_priority: "balanced"
      });
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * Update user preferences
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;
    
    // Validate preferences
    if (preferences.budget_min && preferences.budget_max && 
        preferences.budget_min > preferences.budget_max) {
      return res.status(400).json({ error: 'Minimum budget cannot exceed maximum budget' });
    }
    
    const validPriorities = ['price', 'location', 'availability', 'balanced'];
    if (preferences.match_priority && !validPriorities.includes(preferences.match_priority)) {
      return res.status(400).json({ error: 'Invalid match priority' });
    }
    
    const result = await preferenceService.updateUserPreferences(userId, preferences);
    
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to update preferences' });
    }
    
    res.json({ 
      message: 'Preferences updated successfully', 
      preferences: result.data 
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * Get user's match history
 */
router.get('/matches', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const matches = await preferenceService.getUserMatches(userId, limit);
    
    res.json({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

/**
 * Mark match as viewed
 */
router.post('/matches/:matchId/view', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;
    
    const success = await preferenceService.markMatchAsViewed(matchId, userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to mark match as viewed' });
    }
    
    res.json({ message: 'Match marked as viewed' });
  } catch (error) {
    console.error('Error marking match as viewed:', error);
    res.status(500).json({ error: 'Failed to mark match as viewed' });
  }
});

/**
 * Update match action (saved, booked, dismissed)
 */
router.put('/matches/:matchId/action', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;
    const { action } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }
    
    const success = await preferenceService.updateMatchAction(matchId, userId, action);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update match action' });
    }
    
    res.json({ message: `Match ${action} successfully` });
  } catch (error) {
    console.error('Error updating match action:', error);
    res.status(500).json({ error: 'Failed to update match action' });
  }
});

/**
 * Test endpoint to manually trigger matching for a hotel
 */
router.post('/test-match', authenticateToken, async (req, res) => {
  try {
    const { hotelData } = req.body;
    
    if (!hotelData) {
      return res.status(400).json({ error: 'Hotel data is required' });
    }
    
    const matches = await preferenceService.matchHotelWithPreferences(hotelData);
    
    res.json({ 
      message: 'Matching completed',
      matchCount: matches.length,
      matches: matches.filter(m => m.userId === req.user.id)
    });
  } catch (error) {
    console.error('Error in test match:', error);
    res.status(500).json({ error: 'Failed to perform matching' });
  }
});

/**
 * Get preference statistics
 */
router.get('/preferences/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's matches
    const matches = await preferenceService.getUserMatches(userId, 100);
    
    // Calculate statistics
    const stats = {
      totalMatches: matches.length,
      averageMatchScore: matches.reduce((sum, m) => sum + m.match_score, 0) / (matches.length || 1),
      matchesByAction: {
        viewed: matches.filter(m => m.user_action === 'viewed').length,
        saved: matches.filter(m => m.user_action === 'saved').length,
        booked: matches.filter(m => m.user_action === 'booked').length,
        dismissed: matches.filter(m => m.user_action === 'dismissed').length
      },
      recentMatches: matches.slice(0, 5).map(m => ({
        id: m.id,
        hotelName: m.hotel_name,
        matchScore: m.match_score,
        createdAt: m.created_at
      }))
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching preference stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;