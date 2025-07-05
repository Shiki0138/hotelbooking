import React from 'react';
import { pricePredictionService } from '../../services/pricePredictionService';
import './PricePredictionBadge.css';

interface PricePredictionBadgeProps {
  recommendation: 'book_now' | 'wait' | 'monitor';
  confidence: number;
  predictedPrice?: number;
  currentPrice?: number;
  compact?: boolean;
}

const PricePredictionBadge: React.FC<PricePredictionBadgeProps> = ({
  recommendation,
  confidence,
  predictedPrice,
  currentPrice,
  compact = false
}) => {
  const icon = pricePredictionService.getRecommendationIcon(recommendation);
  const color = pricePredictionService.getRecommendationColor(recommendation);
  const text = pricePredictionService.getRecommendationText(recommendation);
  
  const savings = predictedPrice && currentPrice 
    ? pricePredictionService.calculateSavings(currentPrice, predictedPrice)
    : null;

  if (compact) {
    return (
      <div 
        className="price-prediction-badge compact"
        style={{ backgroundColor: `${color}20`, borderColor: color }}
      >
        <span className="badge-icon">{icon}</span>
        <span className="badge-text" style={{ color }}>{text}</span>
      </div>
    );
  }

  return (
    <div 
      className="price-prediction-badge"
      style={{ backgroundColor: `${color}10`, borderColor: color }}
    >
      <div className="badge-header">
        <span className="badge-icon">{icon}</span>
        <span className="badge-text" style={{ color }}>{text}</span>
        <span className="badge-confidence">{confidence}%</span>
      </div>
      
      {savings && recommendation === 'book_now' && savings.amount > 0 && (
        <div className="badge-savings">
          <span>¥{savings.amount.toLocaleString()}</span>
          <span className="savings-percentage">({savings.percentage.toFixed(0)}%お得)</span>
        </div>
      )}
    </div>
  );
};

export default PricePredictionBadge;