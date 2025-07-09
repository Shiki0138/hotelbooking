import { Router } from 'express';
import { Request, Response } from 'express';
import { businessIntelligenceService } from '../services/businessIntelligenceService';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

// All BI routes require authentication
router.use(auth);

// Metrics Collection (Admin/System only)
router.post('/metrics/collect', adminAuth, async (req: Request, res: Response) => {
  try {
    const { date, hotelId } = req.body;
    await businessIntelligenceService.collectDailyMetrics(date, hotelId);
    res.json({ success: true, message: 'Metrics collected successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Revenue Analytics
router.post('/analytics/revenue', async (req: Request, res: Response) => {
  try {
    const { periodStart, periodEnd, periodType, hotelId } = req.body;
    const analytics = await businessIntelligenceService.generateRevenueAnalytics(
      periodStart,
      periodEnd,
      periodType,
      hotelId
    );
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dashboard
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { hotelId, startDate, endDate } = req.query;
    const dashboard = await businessIntelligenceService.generateDashboard(
      hotelId as string,
      startDate && endDate ? { start: startDate as string, end: endDate as string } : undefined
    );
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// KPI Tracking
router.post('/kpi/track', adminAuth, async (req: Request, res: Response) => {
  try {
    const { kpiId, hotelId } = req.body;
    await businessIntelligenceService.trackKPI(kpiId, hotelId);
    res.json({ success: true, message: 'KPI tracked successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Forecasting
router.post('/forecast', async (req: Request, res: Response) => {
  try {
    const { hotelId, forecastPeriod } = req.body;
    const forecast = await businessIntelligenceService.generateForecast(
      hotelId,
      forecastPeriod || 30
    );
    res.json({ success: true, data: forecast });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Custom Reports
router.post('/reports/custom', async (req: Request, res: Response) => {
  try {
    // This would integrate with the custom report builder
    // For now, just return a placeholder
    res.json({ 
      success: true, 
      message: 'Custom report functionality to be implemented',
      data: req.body 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export Data
router.get('/export/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { format = 'json', ...filters } = req.query;
    
    // This would generate exports in various formats (CSV, Excel, PDF)
    // For now, return JSON data
    res.json({ 
      success: true, 
      message: `Export ${type} data in ${format} format`,
      filters 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;