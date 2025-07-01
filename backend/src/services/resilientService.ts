import { createHttpClient, HttpClient } from '../utils/httpClient';
import { createCircuitBreaker, ServiceCircuitBreaker, circuitBreakerRegistry } from '../utils/circuitBreaker';
import { cache } from './cacheService';
import { logger } from '../utils/logger';

// Example: Resilient external hotel data service
export class ResilientHotelDataService {
  private httpClient: HttpClient;
  private circuitBreaker: ServiceCircuitBreaker<typeof this.fetchHotelData>;
  
  constructor() {
    // Initialize HTTP client with retry
    this.httpClient = createHttpClient({
      name: 'HotelDataAPI',
      baseURL: process.env.HOTEL_DATA_API_URL || 'https://api.hoteldata.com',
      timeout: 5000,
      retry: {
        retries: 3,
        retryDelay: (retryCount) => Math.min(1000 * retryCount, 5000)
      }
    });
    
    // Wrap API calls with circuit breaker
    this.circuitBreaker = createCircuitBreaker(
      this.fetchHotelData.bind(this),
      {
        name: 'HotelDataAPI',
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
      }
    );
    
    // Register for monitoring
    circuitBreakerRegistry.register(this.circuitBreaker, 'HotelDataAPI');
  }
  
  private async fetchHotelData(hotelId: string): Promise<any> {
    return await this.httpClient.get(`/hotels/${hotelId}`);
  }
  
  async getHotelData(hotelId: string): Promise<any> {
    const cacheKey = `external:hotel:${hotelId}`;
    
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for external hotel data: ${hotelId}`);
      return cached;
    }
    
    try {
      // Use circuit breaker for external call
      const data = await this.circuitBreaker.execute(hotelId);
      
      // Cache successful response
      await cache.set(cacheKey, data, 3600); // 1 hour cache
      
      return data;
    } catch (error) {
      logger.error(`Failed to fetch external hotel data: ${hotelId}`, error);
      
      // Return degraded response or cached stale data if available
      const staleData = await cache.get(`${cacheKey}:stale`);
      if (staleData) {
        logger.warn(`Returning stale data for hotel: ${hotelId}`);
        return staleData;
      }
      
      throw error;
    }
  }
}

// Example: Resilient payment service
export class ResilientPaymentService {
  private httpClient: HttpClient;
  private processPaymentBreaker: ServiceCircuitBreaker<typeof this.processPaymentInternal>;
  private refundPaymentBreaker: ServiceCircuitBreaker<typeof this.refundPaymentInternal>;
  
  constructor() {
    this.httpClient = createHttpClient({
      name: 'PaymentGateway',
      baseURL: process.env.PAYMENT_API_URL || 'https://api.payment.com',
      timeout: 10000,
      retry: {
        retries: 2,
        shouldRetry: (error) => {
          // Only retry on network errors, not payment failures
          return !error.response || error.response.status >= 500;
        }
      }
    });
    
    // Separate circuit breakers for different operations
    this.processPaymentBreaker = createCircuitBreaker(
      this.processPaymentInternal.bind(this),
      {
        name: 'PaymentProcess',
        timeout: 10000,
        errorThresholdPercentage: 30, // More sensitive for payments
        resetTimeout: 60000 // Longer reset time
      }
    );
    
    this.refundPaymentBreaker = createCircuitBreaker(
      this.refundPaymentInternal.bind(this),
      {
        name: 'PaymentRefund',
        timeout: 10000,
        errorThresholdPercentage: 40,
        resetTimeout: 45000
      }
    );
    
    circuitBreakerRegistry.register(this.processPaymentBreaker, 'PaymentProcess');
    circuitBreakerRegistry.register(this.refundPaymentBreaker, 'PaymentRefund');
  }
  
  private async processPaymentInternal(paymentData: any): Promise<any> {
    return await this.httpClient.post('/payments', paymentData);
  }
  
  private async refundPaymentInternal(paymentId: string, amount: number): Promise<any> {
    return await this.httpClient.post(`/payments/${paymentId}/refund`, { amount });
  }
  
  async processPayment(paymentData: any): Promise<any> {
    try {
      const result = await this.processPaymentBreaker.execute(paymentData);
      
      logger.info('Payment processed successfully', {
        paymentId: result.paymentId,
        amount: paymentData.amount
      });
      
      return result;
    } catch (error: any) {
      logger.error('Payment processing failed', {
        error: error.message,
        paymentData
      });
      
      // Could implement fallback payment processor here
      throw error;
    }
  }
  
  async refundPayment(paymentId: string, amount: number): Promise<any> {
    try {
      const result = await this.refundPaymentBreaker.execute(paymentId, amount);
      
      logger.info('Payment refunded successfully', {
        paymentId,
        amount
      });
      
      return result;
    } catch (error: any) {
      logger.error('Payment refund failed', {
        error: error.message,
        paymentId,
        amount
      });
      
      throw error;
    }
  }
}