// ExchangeRate API Integration for Multi-Currency Support
class ExchangeRateAPI {
  constructor() {
    this.apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
    this.baseURL = 'https://v6.exchangerate-api.com/v6';
    this.fallbackURL = 'https://api.exchangerate-api.com/v4/latest';
    this.cache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour
    this.baseCurrency = 'JPY';
  }

  // Get latest exchange rates
  async getExchangeRates(baseCurrency = this.baseCurrency) {
    try {
      const cacheKey = `rates_${baseCurrency}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      let response;
      let data;

      // Try primary API with key
      if (this.apiKey) {
        response = await fetch(`${this.baseURL}/${this.apiKey}/latest/${baseCurrency}`);
        if (response.ok) {
          data = await response.json();
          if (data.result === 'success') {
            const formattedData = this.formatExchangeRates(data);
            this.saveToCache(cacheKey, formattedData);
            return formattedData;
          }
        }
      }

      // Fallback to free API
      response = await fetch(`${this.fallbackURL}/${baseCurrency}`);
      if (!response.ok) {
        throw new Error(`Exchange rate API failed: ${response.status}`);
      }

      data = await response.json();
      const formattedData = this.formatFallbackRates(data, baseCurrency);
      this.saveToCache(cacheKey, formattedData);
      return formattedData;

    } catch (error) {
      console.error('Exchange rate fetch failed:', error);
      return this.getFallbackRates(baseCurrency);
    }
  }

  // Convert amount between currencies
  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) {
        return {
          amount: amount,
          convertedAmount: amount,
          rate: 1,
          fromCurrency,
          toCurrency,
          timestamp: new Date()
        };
      }

      const rates = await this.getExchangeRates(fromCurrency);
      const rate = rates.rates[toCurrency];

      if (!rate) {
        throw new Error(`Exchange rate not found for ${toCurrency}`);
      }

      const convertedAmount = amount * rate;

      return {
        amount: amount,
        convertedAmount: Math.round(convertedAmount * 100) / 100,
        rate: rate,
        fromCurrency,
        toCurrency,
        timestamp: rates.timestamp
      };
    } catch (error) {
      console.error('Currency conversion failed:', error);
      return this.getFallbackConversion(amount, fromCurrency, toCurrency);
    }
  }

  // Get multiple currency conversions for price comparison
  async getMultiCurrencyPrices(amount, baseCurrency = 'JPY', targetCurrencies = ['USD', 'EUR', 'GBP', 'KRW', 'CNY']) {
    try {
      const conversions = await Promise.all(
        targetCurrencies.map(currency => 
          this.convertCurrency(amount, baseCurrency, currency)
        )
      );

      return {
        baseCurrency,
        baseAmount: amount,
        conversions: conversions.reduce((acc, conversion) => {
          acc[conversion.toCurrency] = conversion;
          return acc;
        }, {}),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Multi-currency conversion failed:', error);
      return this.getFallbackMultiCurrency(amount, baseCurrency, targetCurrencies);
    }
  }

  // Get supported currencies
  getSupportedCurrencies() {
    return {
      JPY: { name: '日本円', symbol: '¥', flag: '🇯🇵' },
      USD: { name: 'アメリカドル', symbol: '$', flag: '🇺🇸' },
      EUR: { name: 'ユーロ', symbol: '€', flag: '🇪🇺' },
      GBP: { name: 'イギリスポンド', symbol: '£', flag: '🇬🇧' },
      CNY: { name: '中国元', symbol: '¥', flag: '🇨🇳' },
      KRW: { name: '韓国ウォン', symbol: '₩', flag: '🇰🇷' },
      AUD: { name: 'オーストラリアドル', symbol: 'A$', flag: '🇦🇺' },
      CAD: { name: 'カナダドル', symbol: 'C$', flag: '🇨🇦' },
      CHF: { name: 'スイスフラン', symbol: 'CHF', flag: '🇨🇭' },
      SGD: { name: 'シンガポールドル', symbol: 'S$', flag: '🇸🇬' },
      HKD: { name: '香港ドル', symbol: 'HK$', flag: '🇭🇰' },
      THB: { name: 'タイバーツ', symbol: '฿', flag: '🇹🇭' },
      MYR: { name: 'マレーシアリンギット', symbol: 'RM', flag: '🇲🇾' },
      INR: { name: 'インドルピー', symbol: '₹', flag: '🇮🇳' }
    };
  }

  // Format currency display
  formatCurrency(amount, currency) {
    const currencies = this.getSupportedCurrencies();
    const currencyInfo = currencies[currency];
    
    if (!currencyInfo) {
      return `${amount} ${currency}`;
    }

    // Format with appropriate decimal places
    const decimals = this.getDecimalPlaces(currency);
    const formattedAmount = new Intl.NumberFormat('ja-JP', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);

    return `${currencyInfo.symbol}${formattedAmount}`;
  }

  // Get appropriate decimal places for currency
  getDecimalPlaces(currency) {
    const noDecimalCurrencies = ['JPY', 'KRW'];
    return noDecimalCurrencies.includes(currency) ? 0 : 2;
  }

  // Get historical rates (if available)
  async getHistoricalRates(date, baseCurrency = 'JPY') {
    try {
      if (!this.apiKey) {
        throw new Error('Historical rates require API key');
      }

      const formattedDate = date.toISOString().split('T')[0];
      const response = await fetch(
        `${this.baseURL}/${this.apiKey}/history/${baseCurrency}/${formattedDate}`
      );

      if (!response.ok) {
        throw new Error(`Historical rates failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.result !== 'success') {
        throw new Error(`Historical rates failed: ${data.error_type}`);
      }

      return this.formatExchangeRates(data);
    } catch (error) {
      console.error('Historical rates failed:', error);
      return null;
    }
  }

  // Price comparison analysis
  async analyzePriceComparison(hotels) {
    try {
      const priceAnalysis = {
        currencies: ['USD', 'EUR', 'GBP', 'KRW'],
        hotels: [],
        comparison: {
          cheapest: null,
          mostExpensive: null,
          averagePrice: {}
        }
      };

      // Convert all hotel prices to multiple currencies
      for (const hotel of hotels) {
        if (!hotel.price?.total) continue;

        const multiCurrencyPrices = await this.getMultiCurrencyPrices(
          hotel.price.total,
          hotel.price.currency || 'JPY',
          priceAnalysis.currencies
        );

        priceAnalysis.hotels.push({
          id: hotel.id,
          name: hotel.name,
          originalPrice: {
            amount: hotel.price.total,
            currency: hotel.price.currency || 'JPY'
          },
          convertedPrices: multiCurrencyPrices.conversions
        });
      }

      // Calculate comparison metrics
      if (priceAnalysis.hotels.length > 0) {
        const baseCurrencyPrices = priceAnalysis.hotels.map(h => h.originalPrice.amount);
        const minPrice = Math.min(...baseCurrencyPrices);
        const maxPrice = Math.max(...baseCurrencyPrices);
        const avgPrice = baseCurrencyPrices.reduce((a, b) => a + b, 0) / baseCurrencyPrices.length;

        priceAnalysis.comparison.cheapest = priceAnalysis.hotels.find(h => h.originalPrice.amount === minPrice);
        priceAnalysis.comparison.mostExpensive = priceAnalysis.hotels.find(h => h.originalPrice.amount === maxPrice);

        // Calculate average price in all currencies
        const avgMultiCurrency = await this.getMultiCurrencyPrices(avgPrice, 'JPY', priceAnalysis.currencies);
        priceAnalysis.comparison.averagePrice = avgMultiCurrency.conversions;
      }

      return priceAnalysis;
    } catch (error) {
      console.error('Price comparison analysis failed:', error);
      return null;
    }
  }

  // Format exchange rate response
  formatExchangeRates(data) {
    return {
      baseCurrency: data.base_code,
      rates: data.conversion_rates,
      timestamp: new Date(data.time_last_update_unix * 1000),
      nextUpdate: new Date(data.time_next_update_unix * 1000),
      source: 'ExchangeRate-API'
    };
  }

  // Format fallback API response
  formatFallbackRates(data, baseCurrency) {
    return {
      baseCurrency: baseCurrency,
      rates: data.rates,
      timestamp: new Date(data.date),
      nextUpdate: new Date(Date.now() + this.cacheExpiry),
      source: 'Fallback-API'
    };
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (this.cache.size > 50) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  // Fallback rates for offline/error scenarios
  getFallbackRates(baseCurrency) {
    const fallbackRates = {
      JPY: {
        USD: 0.0067,
        EUR: 0.0061,
        GBP: 0.0053,
        CNY: 0.048,
        KRW: 9.1,
        AUD: 0.0102,
        CAD: 0.0091,
        CHF: 0.0058,
        SGD: 0.0090,
        HKD: 0.052,
        THB: 0.24,
        MYR: 0.031,
        INR: 0.56
      }
    };

    const rates = fallbackRates[baseCurrency] || fallbackRates.JPY;
    
    return {
      baseCurrency,
      rates,
      timestamp: new Date(),
      nextUpdate: new Date(Date.now() + this.cacheExpiry),
      source: 'Fallback'
    };
  }

  // Fallback conversion
  getFallbackConversion(amount, fromCurrency, toCurrency) {
    const fallbackRate = fromCurrency === 'JPY' && toCurrency === 'USD' ? 0.0067 : 1;
    
    return {
      amount,
      convertedAmount: Math.round(amount * fallbackRate * 100) / 100,
      rate: fallbackRate,
      fromCurrency,
      toCurrency,
      timestamp: new Date(),
      source: 'Fallback'
    };
  }

  // Fallback multi-currency
  getFallbackMultiCurrency(amount, baseCurrency, targetCurrencies) {
    const conversions = {};
    targetCurrencies.forEach(currency => {
      conversions[currency] = this.getFallbackConversion(amount, baseCurrency, currency);
    });

    return {
      baseCurrency,
      baseAmount: amount,
      conversions,
      timestamp: new Date(),
      source: 'Fallback'
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get popular currency pairs for region
  getPopularCurrenciesForRegion(countryCode) {
    const regionCurrencies = {
      JP: ['JPY', 'USD', 'EUR', 'CNY', 'KRW'],
      US: ['USD', 'EUR', 'GBP', 'CAD', 'MXN'],
      EU: ['EUR', 'USD', 'GBP', 'CHF', 'SEK'],
      CN: ['CNY', 'USD', 'HKD', 'JPY', 'EUR'],
      KR: ['KRW', 'USD', 'JPY', 'EUR', 'CNY'],
      GB: ['GBP', 'EUR', 'USD', 'CHF', 'CAD']
    };

    return regionCurrencies[countryCode] || ['USD', 'EUR', 'JPY', 'GBP', 'CNY'];
  }
}

export default new ExchangeRateAPI();