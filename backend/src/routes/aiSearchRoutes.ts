import { Router } from 'express';
import multer from 'multer';
import { aiSearchService } from '../services/aiSearchService';
import { voiceSearchService } from '../services/voiceSearchService';
import { imageSearchService } from '../services/imageSearchService';
import { logger } from '../utils/logger';
import { auth } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for voice files
    fieldSize: 5 * 1024 * 1024   // 5MB for image files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/webm',
      'audio/mp3',
      'audio/wav',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

/**
 * @route POST /api/ai-search/nlp
 * @desc Process natural language search query
 * @access Public
 */
router.post('/nlp', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    const result = await aiSearchService.processNaturalLanguageQuery(query);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error in NLP search endpoint', { error, query: req.body.query });
    res.status(500).json({
      success: false,
      error: 'Failed to process natural language query'
    });
  }
});

/**
 * @route GET /api/ai-search/suggestions
 * @desc Get intelligent autocomplete suggestions
 * @access Public
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q: partialQuery, userId } = req.query;
    
    if (!partialQuery || typeof partialQuery !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const suggestions = await aiSearchService.getIntelligentSuggestions(
      partialQuery,
      userId as string
    );
    
    res.json({
      success: true,
      data: {
        query: partialQuery,
        suggestions
      }
    });

  } catch (error) {
    logger.error('Error in suggestions endpoint', { error, query: req.query.q });
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

/**
 * @route POST /api/ai-search/personalized
 * @desc Get personalized search results
 * @access Protected
 */
router.post('/personalized', auth, async (req, res) => {
  try {
    const { query, baseResults } = req.body;
    const userId = req.user?.id;
    
    if (!query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Query and user authentication required'
      });
    }

    const personalizedResults = await aiSearchService.getPersonalizedSearchResults(
      query,
      userId,
      baseResults || []
    );
    
    res.json({
      success: true,
      data: {
        query,
        results: personalizedResults
      }
    });

  } catch (error) {
    logger.error('Error in personalized search endpoint', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get personalized results'
    });
  }
});

/**
 * @route GET /api/ai-search/predictions
 * @desc Get predictive search suggestions
 * @access Public
 */
router.get('/predictions', async (req, res) => {
  try {
    const { q: currentQuery, userId, context } = req.query;
    
    if (!currentQuery || typeof currentQuery !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const contextData = context ? JSON.parse(context as string) : undefined;
    
    const predictions = await aiSearchService.getPredictiveSearchSuggestions(
      currentQuery,
      userId as string,
      contextData
    );
    
    res.json({
      success: true,
      data: {
        query: currentQuery,
        predictions
      }
    });

  } catch (error) {
    logger.error('Error in predictions endpoint', { error, query: req.query.q });
    res.status(500).json({
      success: false,
      error: 'Failed to get predictions'
    });
  }
});

/**
 * @route POST /api/ai-search/voice
 * @desc Process voice search
 * @access Public
 */
router.post('/voice', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    const { language = 'ja-JP', userId } = req.body;
    
    // Validate audio file
    const validation = voiceSearchService.validateAudioInput(
      req.file.buffer,
      req.file.mimetype.split('/')[1]
    );
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const voiceSearchRequest = {
      audioBlob: req.file.buffer,
      userId,
      language,
      format: req.file.mimetype.split('/')[1] as 'webm' | 'mp3' | 'wav'
    };

    const result = await voiceSearchService.processVoiceSearch(voiceSearchRequest);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error in voice search endpoint', { error, userId: req.body.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to process voice search'
    });
  }
});

/**
 * @route GET /api/ai-search/voice/languages
 * @desc Get supported languages for voice search
 * @access Public
 */
router.get('/voice/languages', (req, res) => {
  try {
    const languages = voiceSearchService.getSupportedLanguages();
    
    res.json({
      success: true,
      data: languages
    });

  } catch (error) {
    logger.error('Error getting voice search languages', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get supported languages'
    });
  }
});

/**
 * @route GET /api/ai-search/voice/analytics
 * @desc Get voice search analytics
 * @access Protected (Optional)
 */
router.get('/voice/analytics', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const analytics = await voiceSearchService.getVoiceSearchAnalytics(userId as string);
    
    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Error getting voice search analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

/**
 * @route POST /api/ai-search/image
 * @desc Process image search
 * @access Public
 */
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Image file is required'
      });
    }

    const { searchType = 'general', userId } = req.body;
    
    // Validate image file
    const validation = imageSearchService['validateImage'](
      req.file.buffer,
      req.file.mimetype
    );
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const imageSearchRequest = {
      imageData: req.file.buffer,
      searchType,
      userId,
      mimeType: req.file.mimetype
    };

    const result = await imageSearchService.processImageSearch(imageSearchRequest);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error in image search endpoint', { error, userId: req.body.userId });
    res.status(500).json({
      success: false,
      error: 'Failed to process image search'
    });
  }
});

/**
 * @route GET /api/ai-search/image/types
 * @desc Get supported image search types
 * @access Public
 */
router.get('/image/types', (req, res) => {
  try {
    const types = imageSearchService.getSupportedSearchTypes();
    
    res.json({
      success: true,
      data: types
    });

  } catch (error) {
    logger.error('Error getting image search types', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get supported types'
    });
  }
});

/**
 * @route GET /api/ai-search/image/analytics
 * @desc Get image search analytics
 * @access Protected (Optional)
 */
router.get('/image/analytics', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const analytics = await imageSearchService.getImageSearchAnalytics(userId as string);
    
    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Error getting image search analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

/**
 * @route GET /api/ai-search/health
 * @desc Health check for AI search services
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        nlp: 'operational',
        voice: 'operational',
        image: 'operational'
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
    
    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Error in AI search health check', { error });
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export default router;