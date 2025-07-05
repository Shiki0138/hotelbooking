import React from 'react';

interface PricePrediction {
  date: string;
  price: number;
  confidence: number;
}

interface SimplePricePredictionProps {
  currentPrice: number;
  predictions: PricePrediction[];
}

export const SimplePricePrediction: React.FC<SimplePricePredictionProps> = ({
  currentPrice,
  predictions
}) => {
  const getRecommendation = () => {
    if (predictions.length === 0) return { action: 'buy', reason: '予測データなし' };
    
    const futurePrices = predictions.slice(1, 4);
    const avgFuturePrice = futurePrices.reduce((sum, p) => sum + p.price, 0) / futurePrices.length;
    
    if (avgFuturePrice < currentPrice * 0.95) {
      return { action: 'wait', reason: '近日中に価格下落の可能性' };
    } else if (avgFuturePrice > currentPrice * 1.05) {
      return { action: 'buy', reason: '価格上昇の傾向' };
    } else {
      return { action: 'neutral', reason: '価格は安定' };
    }
  };

  const recommendation = getRecommendation();

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return 'bg-red-100 text-red-800 border-red-200';
      case 'wait': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return '🔥';
      case 'wait': return '⏳';
      default: return '📊';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'buy': return '今すぐ予約';
      case 'wait': return '少し待つ';
      default: return '様子見';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        📊 価格予測・購買アドバイス
      </h3>

      {/* Current Price */}
      <div className="mb-6">
        <div className="text-sm text-gray-600">現在の価格</div>
        <div className="text-2xl font-bold text-gray-900">
          ¥{currentPrice.toLocaleString()}
        </div>
      </div>

      {/* Recommendation */}
      <div className={`border rounded-lg p-4 mb-6 ${getActionColor(recommendation.action)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{getActionIcon(recommendation.action)}</span>
            <div>
              <div className="font-semibold">
                {getActionText(recommendation.action)}
              </div>
              <div className="text-sm">
                {recommendation.reason}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Chart (Simple) */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-3">7日間価格予測</h4>
        <div className="space-y-2">
          {predictions.slice(0, 7).map((prediction, index) => {
            const isToday = index === 0;
            const change = index > 0 ? prediction.price - predictions[index - 1].price : 0;
            
            return (
              <div key={prediction.date} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center">
                  <div className={`text-sm ${isToday ? 'font-bold' : ''}`}>
                    {new Date(prediction.date).toLocaleDateString('ja-JP', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                    {isToday && <span className="ml-1 text-blue-600">(今日)</span>}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`text-sm ${isToday ? 'font-bold' : ''}`}>
                    ¥{prediction.price.toLocaleString()}
                  </div>
                  {index > 0 && (
                    <div className={`text-xs px-2 py-1 rounded ${
                      change > 0 ? 'bg-red-100 text-red-600' : 
                      change < 0 ? 'bg-green-100 text-green-600' : 
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {change > 0 ? '+' : ''}{change.toLocaleString()}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    信頼度: {prediction.confidence}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        ※ 予測は統計的分析に基づく参考値です
      </div>
    </div>
  );
};