import { apiClient } from '../utils/apiClient';

export interface PricePrediction {
  hotel_id: string;
  room_id: string;
  prediction_date: string;
  target_date: string;
  days_ahead: number;
  predicted_price: number;
  confidence_score: number;
  price_range_low: number;
  price_range_high: number;
  recommendation: 'book_now' | 'wait' | 'monitor';
  recommendation_reason: string;
  model_version: string;
  features_used: any;
}

export interface PriceTrend {
  date: string;
  price: number;
  priceLow?: number;
  priceHigh?: number;
  confidence?: number;
  type: 'actual' | 'predicted';
}

export interface UserAnalysis {
  preferredLocations: Array<{ value: string; count: number }>;
  preferredPriceRange: {
    average: number;
    min: number;
    max: number;
  };
  preferredDates: {
    preferredType: 'weekday' | 'weekend';
    averageAdvanceBooking: number;
  };
  searchFrequency: 'low' | 'medium' | 'high';
  bookingProbability: number;
}

class PricePredictionService {
  async getPredictions(hotelId: string, roomId: string, checkIn?: string): Promise<PricePrediction[]> {
    try {
      const params = checkIn ? `?checkIn=${checkIn}` : '';
      const response = await apiClient.get(`/price-predictions/${hotelId}/${roomId}${params}`);
      return response.data.predictions || [];
    } catch (error) {
      console.error('Error fetching price predictions:', error);
      return [];
    }
  }

  async getBatchPredictions(hotels: Array<{ hotelId: string; roomId?: string }>): Promise<any> {
    try {
      const response = await apiClient.post('/price-predictions/batch', { hotels });
      return response.data.predictions;
    } catch (error) {
      console.error('Error fetching batch predictions:', error);
      return [];
    }
  }

  async getPriceTrends(hotelId: string, roomId: string, days: number = 30): Promise<{
    historical: PriceTrend[];
    predicted: PriceTrend[];
  }> {
    try {
      const response = await apiClient.get(`/price-predictions/trends/${hotelId}/${roomId}?days=${days}`);
      return response.data.trendData;
    } catch (error) {
      console.error('Error fetching price trends:', error);
      return { historical: [], predicted: [] };
    }
  }

  async getUserAnalysis(): Promise<UserAnalysis | null> {
    try {
      const response = await apiClient.get('/price-predictions/user-analysis');
      return response.data.analysis;
    } catch (error) {
      console.error('Error fetching user analysis:', error);
      return null;
    }
  }

  async recordPriceHistory(hotelId: string, roomId: string, priceData: any): Promise<void> {
    try {
      await apiClient.post('/price-predictions/history', {
        hotelId,
        roomId,
        priceData
      });
    } catch (error) {
      console.error('Error recording price history:', error);
    }
  }

  // Helper methods for UI
  getRecommendationIcon(recommendation: string): string {
    switch (recommendation) {
      case 'book_now':
        return '🔥';
      case 'wait':
        return '⏳';
      case 'monitor':
        return '👀';
      default:
        return '📊';
    }
  }

  getRecommendationColor(recommendation: string): string {
    switch (recommendation) {
      case 'book_now':
        return '#22c55e';
      case 'wait':
        return '#f59e0b';
      case 'monitor':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  }

  getRecommendationText(recommendation: string): string {
    switch (recommendation) {
      case 'book_now':
        return '今すぐ予約';
      case 'wait':
        return '様子を見る';
      case 'monitor':
        return '価格を監視';
      default:
        return recommendation;
    }
  }

  calculateSavings(currentPrice: number, predictedPrice: number): {
    amount: number;
    percentage: number;
  } {
    const difference = predictedPrice - currentPrice;
    const percentage = (difference / predictedPrice) * 100;
    return {
      amount: Math.abs(difference),
      percentage: Math.abs(percentage)
    };
  }

  getBestDealFromPredictions(predictions: PricePrediction[]): PricePrediction | null {
    if (!predictions || predictions.length === 0) return null;
    
    // Find the prediction with the lowest price and high confidence
    return predictions.reduce((best, current) => {
      if (!best) return current;
      
      // Prioritize book_now recommendations
      if (current.recommendation === 'book_now' && best.recommendation !== 'book_now') {
        return current;
      }
      
      // Otherwise, choose based on price and confidence
      const currentScore = (100 - current.predicted_price / 1000) + current.confidence_score;
      const bestScore = (100 - best.predicted_price / 1000) + best.confidence_score;
      
      return currentScore > bestScore ? current : best;
    }, null as PricePrediction | null);
  }

  formatPriceChange(change: number): string {
    if (change > 0) {
      return `+¥${Math.abs(change).toLocaleString()}`;
    } else if (change < 0) {
      return `-¥${Math.abs(change).toLocaleString()}`;
    }
    return '変化なし';
  }

  getDaysUntilDate(targetDate: string): number {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isGoodDeal(prediction: PricePrediction, averagePrice: number): boolean {
    // Consider it a good deal if:
    // 1. Recommendation is book_now
    // 2. Price is 10% below average with high confidence
    // 3. Price is predicted to increase soon
    return (
      prediction.recommendation === 'book_now' ||
      (prediction.predicted_price < averagePrice * 0.9 && prediction.confidence_score > 70)
    );
  }
}

export const pricePredictionService = new PricePredictionService();