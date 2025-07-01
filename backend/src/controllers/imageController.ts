import { Request, Response } from 'express';
import { imageService } from '../services/external/imageService';
import { logger } from '../utils/logger';

export const imageController = {
  async searchHotelImages(req: Request, res: Response) {
    try {
      const { query = 'luxury hotel', count = '5' } = req.query;

      const images = await imageService.searchHotelImages(
        query as string,
        parseInt(count as string)
      );

      return res.json({
        success: true,
        data: images,
        count: images.length
      });
    } catch (error) {
      logger.error('Error searching hotel images:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to search hotel images'
      });
    }
  },

  async getLocationImages(req: Request, res: Response) {
    try {
      const { location, count = '3' } = req.query;

      if (!location) {
        return res.status(400).json({
          success: false,
          error: 'Location parameter is required'
        });
      }

      const images = await imageService.getLocationImages(
        location as string,
        parseInt(count as string)
      );

      return res.json({
        success: true,
        data: images,
        count: images.length
      });
    } catch (error) {
      logger.error('Error fetching location images:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch location images'
      });
    }
  },

  async getRandomHotelImage(_req: Request, res: Response) {
    try {
      const image = await imageService.getRandomHotelImage();

      if (!image) {
        return res.status(503).json({
          success: false,
          error: 'Image service temporarily unavailable'
        });
      }

      return res.json({
        success: true,
        data: image
      });
    } catch (error) {
      logger.error('Error fetching random hotel image:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch random hotel image'
      });
    }
  }
};