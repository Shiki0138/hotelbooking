import { Request, Response, NextFunction } from 'express';
import { RoomService } from '../services/roomService';
import { AppError } from '../middleware/errorHandler';
import Joi from 'joi';

const searchSchema = Joi.object({
  hotelId: Joi.string().required(),
  checkIn: Joi.date().required(),
  checkOut: Joi.date().greater(Joi.ref('checkIn')).required(),
  guests: Joi.number().integer().min(1).required(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().greater(Joi.ref('minPrice')).optional()
});

export class RoomController {
  private roomService = new RoomService();
  
  searchRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = searchSchema.validate(req.query);
      
      if (error) {
        throw new AppError(400, error.details?.[0]?.message || 'Validation error');
      }
      
      const rooms = await this.roomService.searchRooms({
        ...value,
        checkIn: new Date(value.checkIn),
        checkOut: new Date(value.checkOut)
      });
      
      res.json(rooms);
    } catch (error) {
      next(error);
    }
  };
  
  getRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new AppError(400, 'Room ID is required');
      }
      
      const room = await this.roomService.getRoomById(id);
      
      res.json(room);
    } catch (error) {
      next(error);
    }
  };
  
  getPriceBreakdown = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { checkIn, checkOut } = req.query;
      
      if (!id || !checkIn || !checkOut) {
        throw new AppError(400, 'Room ID, check-in and check-out dates are required');
      }
      
      const breakdown = await this.roomService.getRoomPriceBreakdown(
        id,
        new Date(checkIn as string),
        new Date(checkOut as string)
      );
      
      res.json(breakdown);
    } catch (error) {
      next(error);
    }
  };
}