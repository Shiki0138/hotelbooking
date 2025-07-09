import { Router } from 'express';
import { adminAuth, superAdminAuth } from '../../middleware/adminAuth';
import * as dashboardController from '../../controllers/admin/dashboardController';
import * as hotelController from '../../controllers/admin/hotelManagementController';
import * as bookingController from '../../controllers/admin/bookingManagementController';
import * as userController from '../../controllers/admin/userManagementController';

const router = Router();

// All admin routes require authentication
router.use(adminAuth);

// Dashboard routes
router.get('/dashboard/stats', dashboardController.getDashboardStats);
router.get('/dashboard/revenue', dashboardController.getRevenueAnalytics);

// Hotel management routes
router.get('/hotels', hotelController.getAllHotels);
router.get('/hotels/:id', hotelController.getHotelDetails);
router.put('/hotels/:id', hotelController.updateHotel);
router.patch('/hotels/:id/status', hotelController.updateHotelStatus);
router.post('/hotels', superAdminAuth, hotelController.createHotel);
router.delete('/hotels/:id', superAdminAuth, hotelController.deleteHotel);

// Booking management routes
router.get('/bookings', bookingController.getAllBookings);
router.get('/bookings/statistics', bookingController.getBookingStatistics);
router.get('/bookings/:id', bookingController.getBookingDetails);
router.patch('/bookings/:id/status', bookingController.updateBookingStatus);
router.post('/bookings/:id/cancel', bookingController.cancelBooking);
router.post('/bookings/:id/refund', bookingController.processRefund);

// User management routes (super admin only)
router.get('/users', superAdminAuth, userController.getAllUsers);
router.get('/users/statistics', superAdminAuth, userController.getUserStatistics);
router.get('/users/:id', superAdminAuth, userController.getUserDetails);
router.put('/users/:id', superAdminAuth, userController.updateUser);
router.patch('/users/:id/status', superAdminAuth, userController.updateUserStatus);
router.patch('/users/:id/role', superAdminAuth, userController.updateUserRole);
router.post('/users/:id/reset-password', superAdminAuth, userController.resetUserPassword);
router.delete('/users/:id', superAdminAuth, userController.deleteUser);

export default router;