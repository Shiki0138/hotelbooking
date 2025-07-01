import { Request, Response } from 'express';
import { currencyService } from '../services/external/currencyService';
import { logger } from '../utils/logger';

export const currencyController = {
  async getExchangeRates(req: Request, res: Response) {
    try {
      const { base = 'JPY' } = req.query;

      const rates = await currencyService.getExchangeRates(base as string);

      if (!rates) {
        return res.status(503).json({
          success: false,
          error: 'Currency service temporarily unavailable'
        });
      }

      return res.json({
        success: true,
        data: rates
      });
    } catch (error) {
      logger.error('Error fetching exchange rates:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch exchange rates'
      });
    }
  },

  async convertCurrency(req: Request, res: Response) {
    try {
      const { amount, from, to } = req.query;

      if (!amount || !from || !to) {
        return res.status(400).json({
          success: false,
          error: 'Parameters amount, from, and to are required'
        });
      }

      const convertedAmount = await currencyService.convertPrice(
        parseFloat(amount as string),
        (from as string).toUpperCase(),
        (to as string).toUpperCase()
      );

      if (convertedAmount === null) {
        return res.status(400).json({
          success: false,
          error: 'Invalid currency or conversion not available'
        });
      }

      return res.json({
        success: true,
        data: {
          original: {
            amount: parseFloat(amount as string),
            currency: (from as string).toUpperCase()
          },
          converted: {
            amount: convertedAmount,
            currency: (to as string).toUpperCase()
          },
          formatted: currencyService.formatCurrency(
            convertedAmount,
            (to as string).toUpperCase()
          )
        }
      });
    } catch (error) {
      logger.error('Error converting currency:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to convert currency'
      });
    }
  },

  async convertMultiple(req: Request, res: Response) {
    try {
      const { prices, target } = req.body;

      if (!prices || !target) {
        return res.status(400).json({
          success: false,
          error: 'Body must include prices object and target currency'
        });
      }

      const convertedPrices = await currencyService.convertPrices(
        prices,
        target.toUpperCase()
      );

      const formattedPrices: { [key: string]: string } = {};
      Object.entries(convertedPrices).forEach(([currency, amount]) => {
        formattedPrices[currency] = currencyService.formatCurrency(
          amount,
          target.toUpperCase()
        );
      });

      return res.json({
        success: true,
        data: {
          converted: convertedPrices,
          formatted: formattedPrices,
          targetCurrency: target.toUpperCase()
        }
      });
    } catch (error) {
      logger.error('Error converting multiple prices:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to convert prices'
      });
    }
  }
};