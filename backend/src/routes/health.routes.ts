import { Router } from 'express';
import { CacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * ヘルスチェックエンドポイント
 * GET /api/health
 */
router.get('/', async (req, res) => {
  try {
    const cache = new CacheService();
    const cacheHealth = await cache.get('health-check');
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          cache: cacheHealth !== null ? 'connected' : 'disconnected',
          database: 'not_implemented'
        }
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Service is unhealthy'
      }
    });
  }
});

/**
 * 詳細ヘルスチェック
 * GET /api/health/detailed
 */
router.get('/detailed', async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        cpu: {
          user: `${Math.round(cpuUsage.user / 1000000)}ms`,
          system: `${Math.round(cpuUsage.system / 1000000)}ms`
        }
      }
    });
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Service is unhealthy'
      }
    });
  }
});

export default router;