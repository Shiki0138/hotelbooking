import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errorFactory';
import { ErrorCode } from '../types/errors';

// Helper to safely get JWT secret
const verifyJWT = (token: string, secret: string | undefined): any => {
  if (!secret) {
    throw new AppError(ErrorCode.INTERNAL_ERROR, undefined, 'サーバー設定エラー');
  }
  // Type assertion is safe here because we've checked for undefined above
  return jwt.verify(token, secret as jwt.Secret);
};


// NextAuthのJWTトークンペイロード型定義
interface NextAuthToken {
  id: string;
  email: string;
  name?: string;
  role: string;
  provider?: string;
  iat: number;
  exp: number;
  jti?: string;
}

// Note: Express.Request.user interface is declared in middleware/auth.ts

/**
 * NextAuthのJWTトークンを検証するミドルウェア
 * フロントエンドからのリクエストに含まれるNextAuthトークンを検証し、
 * ユーザー情報をreq.userに追加します
 */
export const authenticateNextAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(ErrorCode.UNAUTHORIZED, undefined, '認証トークンが必要です');
    }

    const token = authHeader.split(' ')[1];

    // トークンを検証
    const secret = process.env.NEXTAUTH_SECRET;
    const decoded = verifyJWT(token, secret) as unknown as NextAuthToken;

    // トークンの有効期限を確認
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      throw new AppError(ErrorCode.TOKEN_EXPIRED, undefined, 'トークンの有効期限が切れています');
    }

    // ユーザー情報をリクエストに追加
    req.user = {
      id: decoded.id,
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user'
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(ErrorCode.INVALID_CREDENTIALS, undefined, '無効な認証トークンです'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(ErrorCode.TOKEN_EXPIRED, undefined, '認証トークンの有効期限が切れています'));
    }
    next(error);
  }
};

/**
 * 管理者権限を要求するミドルウェア
 * authenticateNextAuthの後に使用してください
 */
export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError(ErrorCode.UNAUTHORIZED, undefined, '認証が必要です'));
  }

  if (req.user.role !== 'admin') {
    return next(new AppError(ErrorCode.UNAUTHORIZED, undefined, '管理者権限が必要です'));
  }

  next();
};

/**
 * 特定のロールを要求するミドルウェア
 * @param roles 許可するロールの配列
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(ErrorCode.UNAUTHORIZED, undefined, '認証が必要です'));
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return next(new AppError(ErrorCode.UNAUTHORIZED, undefined, '権限が不足しています'));
    }

    next();
  };
};

/**
 * オプショナル認証ミドルウェア
 * トークンがあれば検証し、なくても続行します
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // トークンがない場合は続行
      return next();
    }

    const token = authHeader.split(' ')[1];

    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (!nextAuthSecret) {
      console.error('NEXTAUTH_SECRET is not defined');
      return next();
    }

    try {
      const decoded = verifyJWT(token, nextAuthSecret) as unknown as NextAuthToken;
      
      req.user = {
        id: decoded.id,
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role || 'user'
      };
    } catch (error) {
      // トークンが無効でも続行
      console.warn('Invalid optional auth token:', error);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 互換性のための旧認証システムサポート
 * 移行期間中は両方の認証方式をサポート
 */
export const dualAuthSupport = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    // まずNextAuth認証を試みる
    await authenticateNextAuth(req, _res, (error) => {
      if (!error) {
        return next();
      }

      // NextAuth認証が失敗した場合、旧JWT認証を試みる
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError(ErrorCode.UNAUTHORIZED, undefined, '認証トークンが必要です'));
      }

      const token = authHeader.split(' ')[1];

      // 旧JWT_SECRETで検証
      if (!process.env.JWT_SECRET) {
        return next(new AppError(ErrorCode.INTERNAL_ERROR, undefined, 'サーバー設定エラー'));
      }

      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          return next(new AppError(ErrorCode.INTERNAL_ERROR, undefined, 'サーバー設定エラー'));
        }
        try {
          const decoded = verifyJWT(token, jwtSecret) as any;
          
          req.user = {
            id: decoded.userId,
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role || 'user'
          };

          console.log('Legacy JWT authentication used for user:', decoded.email);
          next();
        } catch (err) {
          return next(new AppError(ErrorCode.INVALID_CREDENTIALS, undefined, '無効な認証トークンです'));
        }
      } catch (error) {
        return next(new AppError(ErrorCode.INTERNAL_ERROR, undefined, 'サーバー設定エラー'));
      }
    });
  } catch (error) {
    next(error);
  }
};