import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from '../src/utils/errorFactory';
import { ErrorCode } from '../src/types/errors';

export interface ValidationOptions {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

export const validate = (schema: ValidationOptions) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body validation: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate query
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query validation: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params validation: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate headers
    if (schema.headers) {
      const { error } = schema.headers.validate(req.headers);
      if (error) {
        errors.push(`Headers validation: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      return next(createError(ErrorCode.VALIDATION_ERROR, errors.join('; ')));
    }

    next();
  };
};

// Common validation schemas
export const schemas = {
  // AI route schemas
  aiChat: {
    body: Joi.object({
      message: Joi.string().required().min(1).max(1000),
      context: Joi.object().optional(),
      sessionId: Joi.string().optional()
    })
  },

  aiRecommendation: {
    body: Joi.object({
      preferences: Joi.object({
        location: Joi.string().optional(),
        priceRange: Joi.object({
          min: Joi.number().min(0).optional(),
          max: Joi.number().min(0).optional()
        }).optional(),
        amenities: Joi.array().items(Joi.string()).optional(),
        dates: Joi.object({
          checkIn: Joi.date().iso().optional(),
          checkOut: Joi.date().iso().optional()
        }).optional()
      }).required()
    })
  },

  // Hotel route schemas
  hotelSearch: {
    query: Joi.object({
      location: Joi.string().optional(),
      checkIn: Joi.date().iso().optional(),
      checkOut: Joi.date().iso().optional(),
      guests: Joi.number().integer().min(1).max(10).optional(),
      priceMin: Joi.number().min(0).optional(),
      priceMax: Joi.number().min(0).optional(),
      amenities: Joi.string().optional(), // comma-separated
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional()
    })
  },

  hotelById: {
    params: Joi.object({
      id: Joi.string().required()
    })
  },

  // Booking route schemas
  createBooking: {
    body: Joi.object({
      hotelId: Joi.string().required(),
      roomId: Joi.string().required(),
      checkIn: Joi.date().iso().required(),
      checkOut: Joi.date().iso().required(),
      guests: Joi.object({
        adults: Joi.number().integer().min(1).max(10).required(),
        children: Joi.number().integer().min(0).max(10).optional()
      }).required(),
      guestInfo: Joi.object({
        firstName: Joi.string().required().min(1).max(50),
        lastName: Joi.string().required().min(1).max(50),
        email: Joi.string().email().required(),
        phone: Joi.string().required().min(10).max(20),
        requests: Joi.string().max(500).optional()
      }).required(),
      paymentInfo: Joi.object({
        method: Joi.string().valid('credit_card', 'paypal', 'bank_transfer').required(),
        token: Joi.string().required()
      }).required()
    })
  },

  bookingById: {
    params: Joi.object({
      id: Joi.string().required()
    })
  },

  // User route schemas
  userRegistration: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      firstName: Joi.string().required().min(1).max(50),
      lastName: Joi.string().required().min(1).max(50),
      phone: Joi.string().optional().min(10).max(20)
    })
  },

  userLogin: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })
  },

  // General pagination
  pagination: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sort: Joi.string().valid('created_at', 'updated_at', 'name', 'price').optional(),
      order: Joi.string().valid('asc', 'desc').default('desc')
    })
  }
};

export default validate;