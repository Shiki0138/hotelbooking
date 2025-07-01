import { Request, Response } from 'express';
import { geocodingService } from '../services/external/geocodingService';
import { logger } from '../utils/logger';

export const geocodingController = {
  async geocode(req: Request, res: Response) {
    try {
      const { q, country } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter "q" is required'
        });
      }

      const results = await geocodingService.geocode(
        q as string,
        country as string
      );

      return res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      logger.error('Error in geocoding:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to geocode address'
      });
    }
  },

  async reverseGeocode(req: Request, res: Response) {
    try {
      const { lat, lon } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({
          success: false,
          error: 'Both lat and lon parameters are required'
        });
      }

      const result = await geocodingService.reverseGeocode(
        parseFloat(lat as string),
        parseFloat(lon as string)
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'No address found for the given coordinates'
        });
      }

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in reverse geocoding:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reverse geocode'
      });
    }
  },

  async searchNearby(req: Request, res: Response) {
    try {
      const { lat, lon, type = 'restaurant', radius = '5000' } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({
          success: false,
          error: 'Both lat and lon parameters are required'
        });
      }

      const results = await geocodingService.searchNearby(
        parseFloat(lat as string),
        parseFloat(lon as string),
        type as string,
        parseInt(radius as string)
      );

      return res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      logger.error('Error searching nearby:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to search nearby places'
      });
    }
  },

  async calculateDistance(req: Request, res: Response) {
    try {
      const { lat1, lon1, lat2, lon2 } = req.query;

      if (!lat1 || !lon1 || !lat2 || !lon2) {
        return res.status(400).json({
          success: false,
          error: 'All parameters (lat1, lon1, lat2, lon2) are required'
        });
      }

      const distance = geocodingService.calculateDistance(
        parseFloat(lat1 as string),
        parseFloat(lon1 as string),
        parseFloat(lat2 as string),
        parseFloat(lon2 as string)
      );

      return res.json({
        success: true,
        data: {
          distance: Math.round(distance * 100) / 100,
          unit: 'km'
        }
      });
    } catch (error) {
      logger.error('Error calculating distance:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to calculate distance'
      });
    }
  }
};