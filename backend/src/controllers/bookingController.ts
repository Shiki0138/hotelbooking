import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/bookingService';
import { AppError } from '../middleware/errorHandler';
import Joi from 'joi';

const createBookingSchema = Joi.object({
  roomId: Joi.string().required(),
  checkIn: Joi.date().required(),
  checkOut: Joi.date().greater(Joi.ref('checkIn')).required(),
  guests: Joi.number().integer().min(1).required()
});

export class BookingController {
  private bookingService = new BookingService();
  
  createBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = createBookingSchema.validate(req.body);
      
      if (error) {
        throw new AppError(400, error.details?.[0]?.message || 'Validation error');
      }
      
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      
      const booking = await this.bookingService.createBooking({
        ...value,
        userId: req.user.userId,
        checkIn: new Date(value.checkIn),
        checkOut: new Date(value.checkOut)
      });
      
      res.status(201).json(booking);
    } catch (error) {
      next(error);
    }
  };
  
  confirmBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { paymentId } = req.body;
      
      if (!id) {
        throw new AppError(400, 'Booking ID is required');
      }
      
      if (!paymentId) {
        throw new AppError(400, 'Payment ID is required');
      }
      
      const booking = await this.bookingService.confirmBooking(id, paymentId);
      
      res.json(booking);
    } catch (error) {
      next(error);
    }
  };
  
  cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      
      if (!id) {
        throw new AppError(400, 'Booking ID is required');
      }
      
      const booking = await this.bookingService.cancelBooking(id, req.user.userId);
      
      res.json(booking);
    } catch (error) {
      next(error);
    }
  };
  
  getUserBookings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      
      const bookings = await this.bookingService.getUserBookings(req.user.userId);
      
      res.json(bookings);
    } catch (error) {
      next(error);
    }
  };
  
  getBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }
      
      if (!id) {
        throw new AppError(400, 'Booking ID is required');
      }
      
      const booking = await this.bookingService.getBookingById(id, req.user.userId);
      
      res.json(booking);
    } catch (error) {
      next(error);
    }
  };
}