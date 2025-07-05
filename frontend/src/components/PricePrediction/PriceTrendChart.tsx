import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import './PriceTrendChart.css';

interface PriceTrendProps {
  hotelId: string;
  roomId: string;
  checkIn?: string;
}

interface TrendData {
  date: string;
  price: number;
  priceLow?: number;
  priceHigh?: number;
  confidence?: number;
  type: 'actual' | 'predicted';
}

interface PredictionData {
  predicted_price: number;
  confidence_score: number;
  recommendation: 'book_now' | 'wait' | 'monitor';
  recommendation_reason: string;
  target_date: string;
  price_range_low: number;
  price_range_high: number;
}

const PriceTrendChart: React.FC<PriceTrendProps> = ({ hotelId, roomId, checkIn }) => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<TrendData | null>(null);

  useEffect(() => {
    fetchTrendData();
    fetchPredictions();
  }, [hotelId, roomId, checkIn]);

  const fetchTrendData = async () => {
    try {
      const response = await fetch(`/api/price-predictions/trends/${hotelId}/${roomId}`);
      if (!response.ok) throw new Error('Failed to fetch trend data');
      
      const data = await response.json();
      const combined = [
        ...data.trendData.historical,
        ...data.trendData.predicted
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setTrendData(combined);
    } catch (err) {
      console.error('Error fetching trend data:', err);
      setError('価格トレンドの取得に失敗しました');
    }
  };

  const fetchPredictions = async () => {
    try {
      const queryParams = checkIn ? `?checkIn=${checkIn}` : '';
      const response = await fetch(`/api/price-predictions/${hotelId}/${roomId}${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch predictions');
      
      const data = await response.json();
      setPredictions(data.predictions || []);
    } catch (err) {
      console.error('Error fetching predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getRecommendationColor = (recommendation: string) => {
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
  };

  const getRecommendationText = (recommendation: string) => {
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
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="price-chart-tooltip">
          <p className="tooltip-date">{formatDate(label)}</p>
          <p className="tooltip-price">
            {formatCurrency(data.price)}
            {data.type === 'predicted' && data.confidence && (
              <span className="confidence"> (信頼度: {data.confidence}%)</span>
            )}
          </p>
          {data.priceLow && data.priceHigh && (
            <p className="tooltip-range">
              予測範囲: {formatCurrency(data.priceLow)} - {formatCurrency(data.priceHigh)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const currentRecommendation = predictions.find(p => 
    new Date(p.target_date).toDateString() === new Date().toDateString()
  ) || predictions[0];

  if (loading) {
    return (
      <div className="price-trend-loading">
        <div className="loading-spinner"></div>
        <p>価格トレンドを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="price-trend-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="price-trend-container">
      <div className="price-trend-header">
        <h3>価格トレンド予測</h3>
        {currentRecommendation && (
          <div className="current-recommendation">
            <span 
              className="recommendation-badge"
              style={{ backgroundColor: getRecommendationColor(currentRecommendation.recommendation) }}
            >
              {getRecommendationText(currentRecommendation.recommendation)}
            </span>
            <span className="recommendation-reason">
              {currentRecommendation.recommendation_reason}
            </span>
          </div>
        )}
      </div>

      <div className="price-chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#6b7280"
            />
            <YAxis 
              tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
              stroke="#6b7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Price range area for predictions */}
            <Area
              dataKey="priceHigh"
              stackId="1"
              stroke="none"
              fill="#3b82f620"
              name="予測範囲上限"
            />
            <Area
              dataKey="priceLow"
              stackId="2"
              stroke="none"
              fill="#ffffff"
              name="予測範囲下限"
            />
            
            {/* Actual price line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.type === 'actual') {
                  return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" />;
                }
                return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" stroke="#fff" strokeWidth={2} />;
              }}
              name="価格"
            />
            
            {/* Today marker */}
            <ReferenceLine 
              x={new Date().toISOString().split('T')[0]} 
              stroke="#ef4444" 
              strokeDasharray="5 5"
              label="今日"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="price-predictions-grid">
        {predictions.slice(0, 7).map((prediction, index) => (
          <div 
            key={index} 
            className={`prediction-card ${prediction.recommendation}`}
          >
            <div className="prediction-date">
              {formatDate(prediction.target_date)}
              {index === 0 && <span className="today-badge">今日</span>}
            </div>
            <div className="prediction-price">
              {formatCurrency(prediction.predicted_price)}
            </div>
            <div className="prediction-confidence">
              信頼度: {prediction.confidence_score}%
            </div>
            <div 
              className="prediction-recommendation"
              style={{ color: getRecommendationColor(prediction.recommendation) }}
            >
              {getRecommendationText(prediction.recommendation)}
            </div>
          </div>
        ))}
      </div>

      <div className="price-trend-insights">
        <h4>価格分析インサイト</h4>
        <ul>
          <li>過去30日間の平均価格: {formatCurrency(
            trendData
              .filter(d => d.type === 'actual')
              .reduce((sum, d) => sum + d.price, 0) / 
              Math.max(trendData.filter(d => d.type === 'actual').length, 1)
          )}</li>
          <li>週末は平日より平均15-20%高い傾向があります</li>
          <li>7日前までの予約で最大10%の割引が期待できます</li>
        </ul>
      </div>
    </div>
  );
};

export default PriceTrendChart;