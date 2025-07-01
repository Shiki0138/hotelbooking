import { Router } from 'express';
import { geocodingController } from '../controllers/geocodingController';

const router = Router();

// Forward geocoding (address to coordinates)
// GET /api/geocoding/search?q=Tokyo+Station&country=jp
router.get('/search', geocodingController.geocode);

// Reverse geocoding (coordinates to address)
// GET /api/geocoding/reverse?lat=35.6812&lon=139.7671
router.get('/reverse', geocodingController.reverseGeocode);

// Search nearby places
// GET /api/geocoding/nearby?lat=35.6812&lon=139.7671&type=restaurant&radius=1000
router.get('/nearby', geocodingController.searchNearby);

// Calculate distance between two points
// GET /api/geocoding/distance?lat1=35.6812&lon1=139.7671&lat2=35.6762&lon2=139.6503
router.get('/distance', geocodingController.calculateDistance);

export default router;