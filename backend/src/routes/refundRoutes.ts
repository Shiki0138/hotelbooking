import { Router } from 'express';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { hotelManagerAuth } from '../middleware/hotelManagerAuth';
import * as refundController from '../controllers/refundController';

const router = Router();

// Calculate refund (authenticated users)
router.get('/bookings/:bookingId/refund-calculation', auth, refundController.calculateRefund);

// Get refund status (authenticated users)
router.get('/bookings/:bookingId/refund-status', auth, refundController.getRefundStatus);

// Admin and hotel manager routes
router.post('/bookings/:bookingId/refund', adminAuth, refundController.processRefund);
router.post('/bookings/:bookingId/refund/retry', adminAuth, refundController.retryFailedRefund);

// Hotel manager routes
router.get('/hotels/:hotelId/refund-history', hotelManagerAuth, refundController.getRefundHistory);
router.put('/hotels/:hotelId/refund-policies', hotelManagerAuth, refundController.updateRefundPolicy);

export default router;