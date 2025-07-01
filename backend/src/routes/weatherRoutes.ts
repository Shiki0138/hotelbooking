import { Router } from 'express';
import { weatherController } from '../controllers/weatherController';

const router = Router();

// Get current weather
// GET /api/weather/current?lat=35.6812&lon=139.7671
// GET /api/weather/current?city=Tokyo
router.get('/current', weatherController.getCurrentWeather);

// Get weather forecast
// GET /api/weather/forecast?lat=35.6812&lon=139.7671&days=5
// GET /api/weather/forecast?city=Tokyo&days=3
router.get('/forecast', weatherController.getWeatherForecast);

export default router;