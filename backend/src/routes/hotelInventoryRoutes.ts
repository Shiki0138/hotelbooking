import { Router } from 'express';
import { hotelManagerAuth } from '../middleware/hotelManagerAuth';
import * as inventoryController from '../controllers/hotelInventoryController';

const router = Router();

// All routes require hotel manager authentication
router.use(hotelManagerAuth);

// Inventory overview
router.get('/hotels/:hotelId/inventory', inventoryController.getInventoryOverview);

// Room availability management
router.put(
  '/hotels/:hotelId/rooms/:roomId/availability',
  inventoryController.updateRoomAvailability
);
router.post('/hotels/:hotelId/availability/bulk', inventoryController.bulkUpdateAvailability);

// Pricing management
router.get('/hotels/:hotelId/rooms/:roomId/pricing', inventoryController.getRoomPricing);
router.put('/hotels/:hotelId/rooms/:roomId/pricing', inventoryController.updateRoomPricing);

// Revenue reports
router.get('/hotels/:hotelId/revenue', inventoryController.getRevenueReport);

export default router;