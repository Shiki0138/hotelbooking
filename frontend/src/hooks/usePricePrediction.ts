import { useState, useEffect, useCallback } from 'react';
import { pricePredictionService, PricePrediction, PriceTrend, UserAnalysis } from '../services/pricePredictionService';

interface UsePricePredictionOptions {
  hotelId: string;
  roomId: string;
  checkIn?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const usePricePrediction = ({
  hotelId,
  roomId,
  checkIn,
  autoRefresh = false,
  refreshInterval = 300000 // 5 minutes
}: UsePricePredictionOptions) => {
  const [predictions, setPredictions] = useState<PricePrediction[]>([]);
  const [trends, setTrends] = useState<{ historical: PriceTrend[]; predicted: PriceTrend[] }>({
    historical: [],
    predicted: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPredictions = useCallback(async () => {
    if (!hotelId || !roomId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [predictionsData, trendsData] = await Promise.all([
        pricePredictionService.getPredictions(hotelId, roomId, checkIn),
        pricePredictionService.getPriceTrends(hotelId, roomId)
      ]);
      
      setPredictions(predictionsData);
      setTrends(trendsData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching price data:', err);
      setError('価格データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [hotelId, roomId, checkIn]);

  useEffect(() => {
    fetchPredictions();
    
    if (autoRefresh) {
      const interval = setInterval(fetchPredictions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPredictions, autoRefresh, refreshInterval]);

  const refresh = () => {
    fetchPredictions();
  };

  const getBestDeal = () => {
    return pricePredictionService.getBestDealFromPredictions(predictions);
  };

  const getCurrentRecommendation = () => {
    const today = new Date().toISOString().split('T')[0];
    return predictions.find(p => p.target_date === today) || predictions[0];
  };

  const getPriceRange = () => {
    if (predictions.length === 0) return { min: 0, max: 0 };
    
    const prices = predictions.map(p => p.predicted_price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  };

  const getAverageConfidence = () => {
    if (predictions.length === 0) return 0;
    
    const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence_score, 0);
    return Math.round(totalConfidence / predictions.length);
  };

  return {
    predictions,
    trends,
    loading,
    error,
    lastUpdated,
    refresh,
    getBestDeal,
    getCurrentRecommendation,
    getPriceRange,
    getAverageConfidence
  };
};

export const useUserAnalysis = () => {
  const [analysis, setAnalysis] = useState<UserAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await pricePredictionService.getUserAnalysis();
        setAnalysis(data);
      } catch (err) {
        console.error('Error fetching user analysis:', err);
        setError('ユーザー分析の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  return {
    analysis,
    loading,
    error
  };
};

export const useBatchPredictions = (hotels: Array<{ hotelId: string; roomId?: string }>) => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hotels.length === 0) return;

    const fetchBatchPredictions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await pricePredictionService.getBatchPredictions(hotels);
        setPredictions(data);
      } catch (err) {
        console.error('Error fetching batch predictions:', err);
        setError('価格予測の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchPredictions();
  }, [JSON.stringify(hotels)]);

  return {
    predictions,
    loading,
    error
  };
};