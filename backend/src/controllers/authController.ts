import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AppError } from '../middleware/errorHandler';
import Joi from 'joi';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().required(),
  phone: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export class AuthController {
  private authService = new AuthService();
  
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = registerSchema.validate(req.body);
      
      if (error) {
        throw new AppError(400, error.details?.[0]?.message || 'Validation error');
      }
      
      const result = await this.authService.register(value);
      
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
  
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = loginSchema.validate(req.body);
      
      if (error) {
        throw new AppError(400, error.details?.[0]?.message || 'Validation error');
      }
      
      const result = await this.authService.login(value);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}