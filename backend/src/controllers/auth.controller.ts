import { Request, Response, NextFunction } from 'express';
import { UserModel, CreateUserRequest, UpdateUserRequest } from '../models/User';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class AuthController {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel();
  }

  // ユーザー登録（簡易版 - 認証なし）
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData: CreateUserRequest = req.body;

      // 基本的なバリデーション
      if (userData.email && !this.isValidEmail(userData.email)) {
        throw new AppError(400, 'Invalid email format', 'INVALID_EMAIL');
      }

      const user = await this.userModel.createUser(userData);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url,
            created_at: user.created_at
          }
        },
        message: 'User registered successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // ユーザー情報取得
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.query.userId as string;

      if (!userId) {
        throw new AppError(400, 'User ID is required', 'MISSING_USER_ID');
      }

      const user = await this.userModel.getUserById(userId);

      if (!user) {
        throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            avatar_url: user.avatar_url,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // ユーザー情報更新
  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.body.userId;
      const updateData: UpdateUserRequest = req.body;

      if (!userId) {
        throw new AppError(400, 'User ID is required', 'MISSING_USER_ID');
      }

      const updatedUser = await this.userModel.updateUser(userId, updateData);

      if (!updatedUser) {
        throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
      }

      res.json({
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            phone: updatedUser.phone,
            avatar_url: updatedUser.avatar_url,
            is_active: updatedUser.is_active,
            updated_at: updatedUser.updated_at
          }
        },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // ユーザー設定取得
  getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.query.userId as string;

      if (!userId) {
        throw new AppError(400, 'User ID is required', 'MISSING_USER_ID');
      }

      const preferences = await this.userModel.getUserPreferences(userId);

      res.json({
        success: true,
        data: { preferences }
      });
    } catch (error) {
      next(error);
    }
  };

  // ユーザー設定更新
  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.body.userId;
      const preferencesData = req.body;

      if (!userId) {
        throw new AppError(400, 'User ID is required', 'MISSING_USER_ID');
      }

      const updatedPreferences = await this.userModel.updateUserPreferences(userId, preferencesData);

      res.json({
        success: true,
        data: { preferences: updatedPreferences },
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // お気に入りホテル取得
  getFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.query.userId as string;

      if (!userId) {
        throw new AppError(400, 'User ID is required', 'MISSING_USER_ID');
      }

      const favorites = await this.userModel.getFavoriteHotels(userId);

      res.json({
        success: true,
        data: { favorites }
      });
    } catch (error) {
      next(error);
    }
  };

  // お気に入りホテル追加
  addFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId || req.body.userId;
      const { hotelId, hotelData } = req.body;

      if (!userId || !hotelId) {
        throw new AppError(400, 'User ID and Hotel ID are required', 'MISSING_REQUIRED_FIELDS');
      }

      await this.userModel.addFavoriteHotel(userId, hotelId, hotelData);

      res.status(201).json({
        success: true,
        message: 'Hotel added to favorites successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // お気に入りホテル削除
  removeFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.params.userId;
      const hotelId = req.params.hotelId;

      if (!userId || !hotelId) {
        throw new AppError(400, 'User ID and Hotel ID are required', 'MISSING_REQUIRED_FIELDS');
      }

      await this.userModel.removeFavoriteHotel(userId, hotelId);

      res.json({
        success: true,
        message: 'Hotel removed from favorites successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // ログイン（簡易版）
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError(400, 'Email is required', 'MISSING_EMAIL');
      }

      // 簡易認証 - 実際の本番環境では適切な認証を実装
      const user = await this.userModel.createUser({ email });

      // 簡易トークン生成
      const token = Buffer.from(JSON.stringify({ userId: user.id, email })).toString('base64');

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
          },
          token
        },
        message: 'Login successful'
      });
    } catch (error) {
      next(error);
    }
  };

  // ログアウト
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  };

  // 簡易認証ミドルウェア
  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        // 認証なしでも続行可能
        return next();
      }

      const token = authHeader.replace('Bearer ', '');
      
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        (req as any).user = decoded;
      } catch (error) {
        logger.warn('Invalid token format', { token });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}