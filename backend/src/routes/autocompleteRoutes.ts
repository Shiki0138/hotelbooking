import { Router } from 'express';
import { AutocompleteController } from '../controllers/autocompleteController';
import { authenticate } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Defer controller instantiation
let autocompleteController: AutocompleteController;

const initController = () => {
  if (!autocompleteController) {
    autocompleteController = new AutocompleteController();
  }
  return autocompleteController;
};

// Rate limiting specifically for autocomplete (more permissive)
const autocompleteRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: 'Too many autocomplete requests',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authenticated users with higher limits
    return !!(req as any).user?.userId;
  }
});

// Public endpoints
router.get('/suggestions', autocompleteRateLimit, (req, res, next) => {
  const controller = initController();
  return controller.getSuggestions(req, res, next);
});

router.get('/popular', (req, res, next) => {
  const controller = initController();
  return controller.getPopularSuggestions(req, res, next);
});

router.get('/health', (req, res, next) => {
  const controller = initController();
  return controller.healthCheck(req, res, next);
});

// Protected endpoints
router.post('/history', authenticate, (req, res, next) => {
  const controller = initController();
  return controller.updateHistory(req, res, next);
});

export default router;