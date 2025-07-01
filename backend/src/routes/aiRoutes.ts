import { Router, Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { aiSearchService } from '../services/aiSearchService';
import { RecommendationService } from '../services/recommendationService';
import { authenticate } from '../middleware/auth';
import { validate, schemas } from '../../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();
const recommendationService = new RecommendationService();

/**
 * AI Search endpoint with timeout optimization
 */
router.post('/search',
  validate({
    body: schemas.aiChat.body
  }),
  async (req: Request, res: Response) => {
    try {
      const { query, userId, context } = req.body;
      
      // Process through optimized AI service
      const response = await aiService.processRequest({
        id: `search-${Date.now()}-${Math.random()}`,
        type: 'search',
        data: { query, userId, context },
        priority: 'high'
      });

      res.json({
        success: true,
        data: response.result,
        cached: response.cached,
        processingTime: response.processingTime
      });
    } catch (error: any) {
      logger.error('AI search error', { error });
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'AI search failed',
        fallback: true
      });
    }
  }
);

/**
 * AI Recommendations endpoint with parallel processing
 */
router.get('/recommendations',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { limit = 20, excludeHotels } = req.query;

      // Process through optimized AI service
      const response = await aiService.processRequest({
        id: `recommend-${userId}-${Date.now()}`,
        type: 'recommendation',
        data: {
          userId,
          limit: Number(limit),
          excludeHotels: excludeHotels ? String(excludeHotels).split(',') : []
        },
        priority: 'medium'
      });

      res.json({
        success: true,
        data: response.result,
        cached: response.cached,
        processingTime: response.processingTime
      });
    } catch (error: any) {
      logger.error('AI recommendations error', { error });
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'AI recommendations failed',
        data: [] // Return empty array as fallback
      });
    }
  }
);

/**
 * AI Autocomplete suggestions with caching
 */
router.get('/suggestions',
  validateRequest([
    body('query').optional().isString(),
    body('userId').optional().isString()
  ]),
  async (req: Request, res: Response) => {
    try {
      const { query = '', userId } = req.query;

      // Process through optimized AI service
      const response = await aiService.processRequest({
        id: `nlp-${query}-${Date.now()}`,
        type: 'nlp',
        data: {
          partialQuery: String(query),
          userId: userId ? String(userId) : undefined
        },
        priority: 'high'
      });

      res.json({
        success: true,
        suggestions: response.result,
        cached: response.cached
      });
    } catch (error: any) {
      logger.error('AI suggestions error', { error });
      res.json({
        success: true,
        suggestions: [] // Return empty suggestions as fallback
      });
    }
  }
);

/**
 * AI Predictive search with batch processing
 */
router.post('/predict',
  validateRequest([
    body('currentQuery').isString().trim().notEmpty(),
    body('userId').optional().isString(),
    body('context').optional().isObject()
  ]),
  async (req: Request, res: Response) => {
    try {
      const { currentQuery, userId, context } = req.body;

      // Process through optimized AI service
      const response = await aiService.processRequest({
        id: `predict-${currentQuery}-${Date.now()}`,
        type: 'prediction',
        data: { currentQuery, userId, context },
        priority: 'low'
      });

      res.json({
        success: true,
        predictions: response.result,
        cached: response.cached
      });
    } catch (error: any) {
      logger.error('AI prediction error', { error });
      res.json({
        success: true,
        predictions: [] // Return empty predictions as fallback
      });
    }
  }
);

/**
 * Batch AI processing endpoint
 */
router.post('/batch',
  authenticate,
  validateRequest([
    body('requests').isArray().notEmpty(),
    body('requests.*.type').isIn(['search', 'recommendation', 'nlp', 'prediction']),
    body('requests.*.data').isObject()
  ]),
  async (req: Request, res: Response) => {
    try {
      const { requests } = req.body;
      const userId = req.user!.id;

      // Add IDs and user context to requests
      const aiRequests = requests.map((req: any, index: number) => ({
        id: `batch-${userId}-${Date.now()}-${index}`,
        type: req.type,
        data: { ...req.data, userId },
        priority: req.priority || 'medium'
      }));

      // Process batch
      const responses = await aiService.batchProcess(aiRequests);

      res.json({
        success: true,
        results: responses.map(resp => ({
          id: resp.id,
          data: resp.result,
          cached: resp.cached,
          processingTime: resp.processingTime,
          error: resp.error
        }))
      });
    } catch (error: any) {
      logger.error('AI batch processing error', { error });
      res.status(500).json({
        success: false,
        error: 'Batch processing failed'
      });
    }
  }
);

/**
 * AI service health check
 */
router.get('/health',
  async (req: Request, res: Response) => {
    try {
      const health = aiService.getHealthStatus();
      
      res.json({
        success: true,
        ...health,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error('AI health check error', { error });
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }
);

/**
 * Update AI service configuration
 */
router.put('/config',
  authenticate,
  validateRequest([
    body('timeout').optional().isInt({ min: 1000, max: 30000 }),
    body('maxRetries').optional().isInt({ min: 0, max: 5 }),
    body('cacheEnabled').optional().isBoolean(),
    body('cacheTTL').optional().isInt({ min: 60, max: 86400 }),
    body('maxConcurrentRequests').optional().isInt({ min: 1, max: 50 })
  ]),
  async (req: Request, res: Response) => {
    try {
      // Only allow admins to update config
      if (req.user!.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      aiService.updateConfig(req.body);

      res.json({
        success: true,
        message: 'Configuration updated',
        config: req.body
      });
    } catch (error: any) {
      logger.error('AI config update error', { error });
      res.status(500).json({
        success: false,
        error: 'Configuration update failed'
      });
    }
  }
);

/**
 * Clear AI cache
 */
router.delete('/cache',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      // Only allow admins to clear cache
      if (req.user!.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const { pattern } = req.query;
      
      if (pattern) {
        await aiService.clearCache(String(pattern));
      } else {
        await aiService.clearCache();
      }

      res.json({
        success: true,
        message: 'Cache cleared'
      });
    } catch (error: any) {
      logger.error('AI cache clear error', { error });
      res.status(500).json({
        success: false,
        error: 'Cache clear failed'
      });
    }
  }
);

export default router;