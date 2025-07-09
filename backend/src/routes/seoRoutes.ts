import { Router } from 'express';
import { Request, Response } from 'express';
import { seoOptimizationService } from '../services/seoOptimizationService';
import { auth } from '../middleware/auth';

const router = Router();

// Public routes (no auth required)
router.get('/meta/:pageType/:pageIdentifier', async (req: Request, res: Response) => {
  try {
    const { pageType, pageIdentifier } = req.params;
    const tags = await seoOptimizationService.generateMetaTags(pageType, pageIdentifier, req.query);
    res.json({ success: true, data: tags });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const sitemap = await seoOptimizationService.generateSitemap();
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/redirect/:path(*)', async (req: Request, res: Response) => {
  try {
    const sourceUrl = `/${req.params.path}`;
    const redirect = await seoOptimizationService.getRedirect(sourceUrl);
    
    if (redirect) {
      res.redirect(redirect.redirect_type || 301, redirect.target_url);
    } else {
      res.status(404).json({ success: false, error: 'Redirect not found' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected routes (require auth)
router.use(auth);

// Metadata Management
router.put('/metadata', async (req: Request, res: Response) => {
  try {
    const metadata = await seoOptimizationService.updatePageMetadata(req.body);
    res.json({ success: true, data: metadata });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Redirect Management
router.post('/redirects', async (req: Request, res: Response) => {
  try {
    const redirect = await seoOptimizationService.createRedirect(req.body);
    res.json({ success: true, data: redirect });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SEO Analysis
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { pageUrl, pageContent } = req.body;
    const analysis = await seoOptimizationService.analyzePage(pageUrl, pageContent);
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Performance Tracking
router.post('/performance', async (req: Request, res: Response) => {
  try {
    const { pageUrl, ...metrics } = req.body;
    await seoOptimizationService.trackPagePerformance(pageUrl, metrics);
    res.json({ success: true, message: 'Performance metrics tracked' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Local SEO
router.put('/local-listings/:hotelId', async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { platform, ...listingData } = req.body;
    const listing = await seoOptimizationService.updateLocalListing(hotelId, platform, listingData);
    res.json({ success: true, data: listing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/local-listings/:hotelId', async (req: Request, res: Response) => {
  try {
    const listings = await seoOptimizationService.getLocalListings(req.params.hotelId);
    res.json({ success: true, data: listings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Schema Templates
router.post('/schema-templates', async (req: Request, res: Response) => {
  try {
    const { name, schemaType, templateData } = req.body;
    const template = await seoOptimizationService.createSchemaTemplate(name, schemaType, templateData);
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/schema-templates/:type', async (req: Request, res: Response) => {
  try {
    const template = await seoOptimizationService.getSchemaTemplate(req.params.type);
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Recommendations
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.query;
    const recommendations = await seoOptimizationService.generateSEORecommendations(hotelId as string);
    res.json({ success: true, data: recommendations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;