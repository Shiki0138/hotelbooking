import { Router } from 'express';
import { imageController } from '../controllers/imageController';

const router = Router();

// Search hotel images
// GET /api/images/hotels?query=luxury+hotel&count=5
router.get('/hotels', imageController.searchHotelImages);

// Get location images
// GET /api/images/location?location=Tokyo&count=3
router.get('/location', imageController.getLocationImages);

// Get random hotel image
// GET /api/images/random
router.get('/random', imageController.getRandomHotelImage);

export default router;