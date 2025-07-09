import { Request, Response, NextFunction } from 'express';
import { HotelService } from '../services/hotelService';
import { SearchFilters } from '../types';
import { AppError } from '../middleware/errorHandler';
import Joi from 'joi';

const searchSchema = Joi.object({
  city: Joi.string().optional(),
  country: Joi.string().optional(),
  checkIn: Joi.date().required(),
  checkOut: Joi.date().greater(Joi.ref('checkIn')).required(),
  guests: Joi.number().integer().min(1).required(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().greater(Joi.ref('minPrice')).optional(),
  rating: Joi.number().min(0).max(5).optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  radius: Joi.number().min(0).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  sortBy: Joi.string().valid('price', 'rating', 'distance').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

export class HotelController {
  private hotelService: HotelService;
  
  constructor() {
    this.hotelService = new HotelService();
  }
  
  searchHotels = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = searchSchema.validate(req.query);
      
      if (error) {
        throw new AppError(400, error.details?.[0]?.message || 'Validation error');
      }
      
      const filters: SearchFilters = {
        ...value,
        checkIn: new Date(value.checkIn),
        checkOut: new Date(value.checkOut)
      };
      
      const results = await this.hotelService.searchHotels(filters);
      
      res.json(results);
    } catch (error) {
      next(error);
    }
  };
  
  getHotel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new AppError(400, 'Hotel ID is required');
      }
      
      const hotel = await this.hotelService.getHotel(id);
      
      res.json(hotel);
    } catch (error) {
      next(error);
    }
  };
}