const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://demo-project.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key'
);

/**
 * Track email link clicks
 */
router.get('/click', async (req, res) => {
  try {
    const { id, url } = req.query;

    if (!id || !url) {
      return res.status(400).send('Invalid tracking parameters');
    }

    // Decode tracking ID
    try {
      const decoded = Buffer.from(id, 'base64').toString('utf-8');
      const [watchlistId, type, timestamp] = decoded.split('-');

      // Log the click
      await supabase
        .from('watchlist_notifications')
        .insert({
          watchlist_id: watchlistId,
          notification_type: `${type}_click`,
          sent_at: new Date().toISOString()
        });

      console.log(`[Tracking] Click tracked for watchlist ${watchlistId}, type: ${type}`);
    } catch (error) {
      console.error('[Tracking] Error decoding tracking ID:', error);
    }

    // Redirect to the actual URL
    res.redirect(decodeURIComponent(url));
  } catch (error) {
    console.error('[Tracking] Error:', error);
    // Still redirect even if tracking fails
    const url = req.query.url;
    if (url) {
      res.redirect(decodeURIComponent(url));
    } else {
      res.status(500).send('Tracking error');
    }
  }
});

module.exports = router;