import { Router } from 'express';
import { auth } from '../middleware/auth';
import * as twoFactorController from '../controllers/twoFactorAuthController';

const router = Router();

// All routes require authentication
router.use(auth);

// Generate 2FA secret and QR code
router.post('/generate', twoFactorController.generateSecret);

// Enable 2FA
router.post('/enable', twoFactorController.enable2FA);

// Disable 2FA
router.post('/disable', twoFactorController.disable2FA);

// Verify 2FA token
router.post('/verify', twoFactorController.verify2FA);

// Regenerate backup codes
router.post('/backup-codes/regenerate', twoFactorController.regenerateBackupCodes);

// Get 2FA status
router.get('/status', twoFactorController.get2FAStatus);

// Check if 2FA is required for operation
router.get('/check-requirement', twoFactorController.check2FARequirement);

export default router;