import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

/**
 * 認証関連ルート
 */

// ユーザー登録
router.post('/register', authController.register);

// ログイン（簡易版）
router.post('/login', authController.login);

// ログアウト
router.post('/logout', authController.logout);

// プロファイル取得
router.get('/profile/:userId?', authController.getProfile);

// プロファイル更新
router.put('/profile/:userId?', authController.updateProfile);

// ユーザー設定取得
router.get('/preferences/:userId?', authController.getPreferences);

// ユーザー設定更新
router.put('/preferences/:userId?', authController.updatePreferences);

// お気に入りホテル関連
router.get('/favorites/:userId?', authController.getFavorites);
router.post('/favorites/:userId?', authController.addFavorite);
router.delete('/favorites/:userId/:hotelId', authController.removeFavorite);

export default router;