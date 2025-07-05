import React from 'react';
import './BuyNowIndicator.css';

interface BuyNowIndicatorProps {
  recommendation: 'book_now' | 'wait' | 'monitor';
  reason: string;
  confidence: number;
  currentPrice: number;
  predictedPrice?: number;
  onBook?: () => void;
}

const BuyNowIndicator: React.FC<BuyNowIndicatorProps> = ({
  recommendation,
  reason,
  confidence,
  currentPrice,
  predictedPrice,
  onBook
}) => {
  const getIndicatorData = () => {
    switch (recommendation) {
      case 'book_now':
        return {
          icon: '🔥',
          title: '今が予約のチャンス！',
          color: '#22c55e',
          bgColor: '#f0fdf4',
          action: '今すぐ予約',
          urgency: 'high'
        };
      case 'wait':
        return {
          icon: '⏳',
          title: 'もう少し様子を見ましょう',
          color: '#f59e0b',
          bgColor: '#fffbeb',
          action: '価格アラート設定',
          urgency: 'low'
        };
      case 'monitor':
        return {
          icon: '👀',
          title: '価格を監視中',
          color: '#3b82f6',
          bgColor: '#eff6ff',
          action: 'ウォッチリストに追加',
          urgency: 'medium'
        };
      default:
        return {
          icon: '📊',
          title: '価格分析中',
          color: '#6b7280',
          bgColor: '#f9fafb',
          action: '詳細を見る',
          urgency: 'low'
        };
    }
  };

  const indicatorData = getIndicatorData();
  const priceDifference = predictedPrice ? currentPrice - predictedPrice : 0;
  const percentageDiff = predictedPrice ? Math.abs((priceDifference / predictedPrice) * 100) : 0;

  return (
    <div 
      className={`buy-now-indicator ${indicatorData.urgency}`}
      style={{ backgroundColor: indicatorData.bgColor, borderColor: indicatorData.color }}
    >
      <div className="indicator-header">
        <span className="indicator-icon">{indicatorData.icon}</span>
        <div className="indicator-title-section">
          <h4 style={{ color: indicatorData.color }}>{indicatorData.title}</h4>
          <div className="confidence-meter">
            <span className="confidence-label">AI予測信頼度:</span>
            <div className="confidence-bar">
              <div 
                className="confidence-fill"
                style={{ 
                  width: `${confidence}%`,
                  backgroundColor: indicatorData.color 
                }}
              />
            </div>
            <span className="confidence-value">{confidence}%</span>
          </div>
        </div>
      </div>

      <div className="indicator-content">
        <p className="recommendation-reason">{reason}</p>
        
        {predictedPrice && priceDifference !== 0 && (
          <div className="price-comparison">
            {priceDifference > 0 ? (
              <p className="price-savings">
                現在の価格は予測価格より
                <span className="savings-amount">¥{Math.abs(priceDifference).toLocaleString()}</span>
                （{percentageDiff.toFixed(1)}%）お得です！
              </p>
            ) : (
              <p className="price-increase">
                今後
                <span className="increase-amount">¥{Math.abs(priceDifference).toLocaleString()}</span>
                （{percentageDiff.toFixed(1)}%）値上がりする可能性があります
              </p>
            )}
          </div>
        )}

        {recommendation === 'book_now' && (
          <div className="urgency-indicators">
            <div className="urgency-item">
              <span className="urgency-icon">⚡</span>
              <span>残り部屋数が少ない</span>
            </div>
            <div className="urgency-item">
              <span className="urgency-icon">📈</span>
              <span>価格上昇トレンド</span>
            </div>
            <div className="urgency-item">
              <span className="urgency-icon">🎯</span>
              <span>過去最安値圏</span>
            </div>
          </div>
        )}

        <button 
          className="indicator-action-button"
          style={{ 
            backgroundColor: indicatorData.color,
            color: '#fff'
          }}
          onClick={onBook}
        >
          {indicatorData.action}
        </button>
      </div>

      {recommendation === 'book_now' && (
        <div className="indicator-footer">
          <p className="disclaimer">
            ※ AI予測は過去のデータに基づいています。実際の価格は変動する可能性があります。
          </p>
        </div>
      )}
    </div>
  );
};

export default BuyNowIndicator;