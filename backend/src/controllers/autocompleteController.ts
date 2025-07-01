import { Request, Response, NextFunction } from 'express';
import { AutocompleteService } from '../services/autocompleteService';
import { createError } from '../utils/errorFactory';
import { ErrorCode } from '../types/errors';
import { loggers } from '../utils/logger';
import Joi from 'joi';

// Validation schema
const autocompleteSchema = Joi.object({
  q: Joi.string().min(1).max(100).required(),
  limit: Joi.number().integer().min(1).max(20).default(10),
  userId: Joi.string().optional()
});

const historyUpdateSchema = Joi.object({
  searchTerm: Joi.string().min(1).max(100).required()
});

export class AutocompleteController {
  private autocompleteService = new AutocompleteService();
  
  // Main autocomplete endpoint with debouncing support
  getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    try {
      const { error, value } = autocompleteSchema.validate(req.query);
      
      if (error) {
        throw createError(ErrorCode.VALIDATION_ERROR, {
          details: error.details?.[0]?.message || 'Validation error'
        });
      }
      
      const { q: query, limit, userId } = value;
      const actualUserId = userId || (req as any).user?.userId;
      
      // Get suggestions
      const suggestions = await this.autocompleteService.getAutocompleteSuggestions(
        query,
        actualUserId,
        limit
      );
      
      const duration = Date.now() - startTime;
      
      // Log performance metrics
      loggers.logPerformance('autocomplete_request', duration, {
        query: query.substring(0, 20), // Limit logged query for privacy
        resultCount: suggestions.length,
        userId: actualUserId ? 'authenticated' : 'anonymous'
      });
      
      // Set optimized headers for performance
      res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'X-Response-Time': `${duration}ms`,
        'Content-Type': 'application/json; charset=utf-8'
      });
      
      res.json({
        suggestions,
        meta: {
          query,
          count: suggestions.length,
          responseTime: duration
        }
      });
      
    } catch (error) {
      next(error);
    }
  };
  
  // Update user search history
  updateHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = historyUpdateSchema.validate(req.body);
      
      if (error) {
        throw createError(ErrorCode.VALIDATION_ERROR, {
          details: error.details?.[0]?.message || 'Validation error'
        });
      }
      
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw createError(ErrorCode.UNAUTHORIZED, {}, 'Authentication required');
      }
      
      await this.autocompleteService.updateSearchHistory(userId, value.searchTerm);
      
      loggers.logBusinessEvent('search_history_updated', {
        userId,
        searchTerm: value.searchTerm.substring(0, 20) // Limit for privacy
      });
      
      res.json({ success: true });
      
    } catch (error) {
      next(error);
    }
  };
  
  // Get popular suggestions (for pre-loading)
  getPopularSuggestions = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Get popular destinations and searches
      const popularTerms = [
        { text: '東京', type: 'city', subtitle: '日本の首都' },
        { text: '大阪', type: 'city', subtitle: '関西の中心都市' },
        { text: '京都', type: 'city', subtitle: '古都' },
        { text: '沖縄', type: 'city', subtitle: 'リゾート地' },
        { text: '北海道', type: 'city', subtitle: '雄大な自然' }
      ];
      
      res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
      res.json({ suggestions: popularTerms });
      
    } catch (error) {
      next(error);
    }
  };
  
  // Health check for autocomplete service
  healthCheck = async (_req: Request, res: Response, _next: NextFunction) => {
    try {
      const startTime = Date.now();
      
      // Test with a simple query
      const testResults = await this.autocompleteService.getAutocompleteSuggestions('東京');
      const responseTime = Date.now() - startTime;
      
      res.json({
        status: 'healthy',
        responseTime,
        testResultCount: testResults.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Autocomplete service error',
        timestamp: new Date().toISOString()
      });
    }
  };
}