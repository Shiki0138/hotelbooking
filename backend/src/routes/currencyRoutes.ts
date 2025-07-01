import { Router } from 'express';
import { currencyController } from '../controllers/currencyController';

const router = Router();

// Get exchange rates
// GET /api/currency/rates?base=JPY
router.get('/rates', currencyController.getExchangeRates);

// Convert single currency
// GET /api/currency/convert?amount=10000&from=JPY&to=USD
router.get('/convert', currencyController.convertCurrency);

// Convert multiple prices
// POST /api/currency/convert-multiple
// Body: { prices: { hotel1: 10000, hotel2: 15000 }, target: "USD" }
router.post('/convert-multiple', currencyController.convertMultiple);

export default router;