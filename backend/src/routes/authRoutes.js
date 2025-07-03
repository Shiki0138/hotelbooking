const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, userRateLimit } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validation');

// Validation schemas
const registerSchema = {
  body: {
    email: { type: 'email', required: true },
    password: { type: 'string', min: 8, required: true },
    fullName: { type: 'string', min: 2, required: true },
    phoneNumber: { type: 'string', optional: true }
  }
};

const loginSchema = {
  body: {
    email: { type: 'email', required: true },
    password: { type: 'string', required: true }
  }
};

// Public routes
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.use(verifyToken); // Apply auth middleware to all routes below

router.get('/me', authController.getCurrentUser);
router.put('/profile', userRateLimit(20), authController.updateProfile);
router.post('/change-password', authController.updatePassword);

module.exports = router;