import { Request, Response } from 'express';
import { weatherService } from '../services/external/weatherService';
import { geocodingService } from '../services/external/geocodingService';
import { logger } from '../utils/logger';

export const weatherController = {
  async getCurrentWeather(req: Request, res: Response) {
    try {
      const { lat, lon, city, lang = 'en' } = req.query;

      let latitude: number;
      let longitude: number;

      if (lat && lon) {
        latitude = parseFloat(lat as string);
        longitude = parseFloat(lon as string);
      } else if (city) {
        // Geocode the city name to get coordinates
        const geocodeResults = await geocodingService.geocode(city as string);
        if (geocodeResults.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'City not found'
          });
        }
        const coords = geocodeResults[0]?.coordinates;
        if (!coords?.lat || !coords?.lon) {
          return res.status(404).json({
            success: false,
            error: 'Unable to get coordinates for the city'
          });
        }
        
        latitude = coords.lat;
        longitude = coords.lon;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either coordinates (lat, lon) or city name is required'
        });
      }

      const weather = await weatherService.getCurrentWeather(latitude, longitude, lang as string);
      
      if (!weather) {
        return res.status(503).json({
          success: false,
          error: 'Weather service temporarily unavailable'
        });
      }

      return res.json({
        success: true,
        data: {
          ...weather,
          location: {
            lat: latitude,
            lon: longitude
          }
        }
      });
    } catch (error) {
      logger.error('Error in getCurrentWeather:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch weather data'
      });
    }
  },

  async getWeatherForecast(req: Request, res: Response) {
    try {
      const { lat, lon, city, days = '5', lang = 'en' } = req.query;

      let latitude: number;
      let longitude: number;

      if (lat && lon) {
        latitude = parseFloat(lat as string);
        longitude = parseFloat(lon as string);
      } else if (city) {
        // Geocode the city name to get coordinates
        const geocodeResults = await geocodingService.geocode(city as string);
        if (geocodeResults.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'City not found'
          });
        }
        const coords = geocodeResults[0]?.coordinates;
        if (!coords?.lat || !coords?.lon) {
          return res.status(404).json({
            success: false,
            error: 'Unable to get coordinates for the city'
          });
        }
        
        latitude = coords.lat;
        longitude = coords.lon;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either coordinates (lat, lon) or city name is required'
        });
      }

      const forecast = await weatherService.getWeatherForecast(
        latitude, 
        longitude, 
        parseInt(days as string),
        lang as string
      );

      return res.json({
        success: true,
        data: {
          forecast,
          location: {
            lat: latitude,
            lon: longitude
          }
        }
      });
    } catch (error) {
      logger.error('Error in getWeatherForecast:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch weather forecast'
      });
    }
  }
};