import { Router } from 'express';
import { SearchController } from '../controllers/searchController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Defer controller instantiation
let searchController: SearchController;

const initController = () => {
  if (!searchController) {
    searchController = new SearchController();
  }
  return searchController;
};

// Public search endpoints
router.get('/hotels', (req, res, next) => {
  const controller = initController();
  return controller.advancedSearch(req, res, next);
});

router.get('/aggregations', (req, res, next) => {
  const controller = initController();
  return controller.getSearchAggregations(req, res, next);
});

router.get('/suggestions', (req, res, next) => {
  const controller = initController();
  return controller.getSuggestions(req, res, next);
});

router.get('/price-range', (req, res, next) => {
  const controller = initController();
  return controller.getPriceRange(req, res, next);
});

// Protected endpoints (for user-specific features)
router.use(authenticate);

export default router;