import { Router } from 'express';
import { Request, Response } from 'express';
import { otaIntegrationService } from '../services/otaIntegrationService';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

// Provider Management (Admin only)
router.post('/providers', auth, adminAuth, async (req: Request, res: Response) => {
  try {
    const provider = await otaIntegrationService.registerProvider(req.body);
    res.json({ success: true, data: provider });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/providers', auth, async (req: Request, res: Response) => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const providers = await otaIntegrationService.getProviders(activeOnly);
    res.json({ success: true, data: providers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Hotel Mapping
router.post('/mappings/hotel', auth, adminAuth, async (req: Request, res: Response) => {
  try {
    const mapping = await otaIntegrationService.mapHotel(req.body);
    res.json({ success: true, data: mapping });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/mappings/hotel/:hotelId', auth, async (req: Request, res: Response) => {
  try {
    const mappings = await otaIntegrationService.getHotelMappings(req.params.hotelId);
    res.json({ success: true, data: mappings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync Operations
router.post('/sync/inventory', auth, adminAuth, async (req: Request, res: Response) => {
  try {
    const { providerId, hotelId, dateRange } = req.body;
    const inventory = await otaIntegrationService.syncInventory(providerId, hotelId, dateRange);
    res.json({ success: true, data: inventory });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sync/bookings', auth, adminAuth, async (req: Request, res: Response) => {
  try {
    const { providerId, since } = req.body;
    const bookings = await otaIntegrationService.syncBookings(
      providerId, 
      since ? new Date(since) : undefined
    );
    res.json({ success: true, data: bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;