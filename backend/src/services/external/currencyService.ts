import axios from 'axios';
import { cache } from '../cacheService';
import { logger } from '../../utils/logger';

interface ExchangeRates {
  [currency: string]: number;
}

interface CurrencyData {
  base: string;
  rates: ExchangeRates;
  lastUpdated: Date;
}

export class CurrencyService {
  private baseUrl = 'https://api.exchangerate-api.com/v4/latest';
  private cacheTTL: number;
  private supportedCurrencies = ['USD', 'EUR', 'GBP', 'CNY', 'KRW', 'THB', 'SGD', 'AUD'];

  constructor() {
    this.cacheTTL = parseInt(process.env.API_CACHE_TTL_CURRENCY || '1800');
  }

  async getExchangeRates(baseCurrency: string = 'JPY'): Promise<CurrencyData | null> {
    const cacheKey = `currency:rates:${baseCurrency}`;
    
    try {
      // Check cache first
      const cached = await cache.get<CurrencyData>(cacheKey);
      if (cached) {
        logger.info('Exchange rates retrieved from cache');
        return cached;
      }

      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/${baseCurrency}`, {
        timeout: 5000
      });

      const data = response.data;
      
      // Filter to only include supported currencies
      const filteredRates: ExchangeRates = {};
      this.supportedCurrencies.forEach(currency => {
        if (data.rates[currency]) {
          filteredRates[currency] = data.rates[currency];
        }
      });

      const currencyData: CurrencyData = {
        base: baseCurrency,
        rates: filteredRates,
        lastUpdated: new Date(data.date)
      };

      // Cache the result
      await cache.set(cacheKey, currencyData, this.cacheTTL);
      
      return currencyData;
    } catch (error) {
      logger.error('Error fetching exchange rates:', error);
      return this.getFallbackRates(baseCurrency);
    }
  }

  async convertPrice(amount: number, fromCurrency: string, toCurrency: string): Promise<number | null> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const cacheKey = `currency:convert:${fromCurrency}:${toCurrency}`;
    
    try {
      // Check cache for conversion rate
      const cached = await cache.get<number>(cacheKey);
      if (cached !== null) {
        return Math.round(amount * cached * 100) / 100;
      }

      // Get rates for the base currency
      const rates = await this.getExchangeRates(fromCurrency);
      if (!rates || !rates.rates[toCurrency]) {
        return null;
      }

      const conversionRate = rates.rates[toCurrency];
      
      // Cache the conversion rate
      await cache.set(cacheKey, conversionRate, this.cacheTTL);
      
      return Math.round(amount * conversionRate * 100) / 100;
    } catch (error) {
      logger.error('Error converting currency:', error);
      return null;
    }
  }

  async convertPrices(prices: { [currency: string]: number }, targetCurrency: string): Promise<{ [currency: string]: number }> {
    const converted: { [currency: string]: number } = {};
    
    for (const [currency, amount] of Object.entries(prices)) {
      const convertedAmount = await this.convertPrice(amount, currency, targetCurrency);
      if (convertedAmount !== null) {
        converted[currency] = convertedAmount;
      }
    }
    
    return converted;
  }

  formatCurrency(amount: number, currency: string, locale: string = 'en-US'): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${currency} ${amount.toLocaleString()}`;
    }
  }

  private getFallbackRates(baseCurrency: string): CurrencyData {
    // Fallback rates (approximate values relative to JPY)
    const fallbackRates: { [key: string]: ExchangeRates } = {
      JPY: {
        USD: 0.0067,
        EUR: 0.0062,
        GBP: 0.0053,
        CNY: 0.047,
        KRW: 8.89,
        THB: 0.23,
        SGD: 0.009,
        AUD: 0.010
      },
      USD: {
        JPY: 150,
        EUR: 0.93,
        GBP: 0.79,
        CNY: 7.08,
        KRW: 1335,
        THB: 34.5,
        SGD: 1.35,
        AUD: 1.52
      }
    };

    const rates = fallbackRates[baseCurrency] || fallbackRates.JPY || {};
    
    return {
      base: baseCurrency,
      rates,
      lastUpdated: new Date()
    };
  }
}

export const currencyService = new CurrencyService();