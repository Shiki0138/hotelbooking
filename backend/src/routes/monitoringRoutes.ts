import { Router, Request, Response } from 'express';
import { monitoringService } from '../services/monitoringService';
import { circuitBreakerRegistry } from '../utils/circuitBreaker';

const router = Router();

// Health check endpoint
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await monitoringService.getSystemHealth();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Failed to check system health'
    });
  }
});

// Detailed health check
router.get('/health/detailed', async (_req: Request, res: Response) => {
  try {
    const health = await monitoringService.getSystemHealth();
    const metrics = monitoringService.getMetrics();
    
    res.json({
      ...health,
      detailedMetrics: metrics
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Failed to get detailed health'
    });
  }
});

// Metrics endpoint for monitoring tools
router.get('/metrics', (_req: Request, res: Response) => {
  const metrics = monitoringService.getMetrics();
  res.json(metrics);
});

// Circuit breaker status
router.get('/circuit-breakers', (_req: Request, res: Response) => {
  const stats = circuitBreakerRegistry.getAllStats();
  res.json(stats);
});

// Reset specific circuit breaker (admin only)
router.post('/circuit-breakers/:name/reset', (req: Request, res: Response) => {
  const { name } = req.params;
  const breaker = circuitBreakerRegistry.getBreaker(name ?? '');
  
  if (!breaker) {
    return res.status(404).json({
      error: `Circuit breaker ${name} not found`
    });
  }
  
  // In production, add authentication/authorization here
  // breaker.reset(); // If we had a reset method
  
  return res.json({
    message: `Circuit breaker ${name} reset request received`,
    status: breaker.getStats()
  });
});

export default router;