import React from 'react';
import { motion } from 'framer-motion';

interface PredictionData {
  predictedPrice: number;
  confidence: number;
  reasoning: string;
  recommendation: string;
  priceRangeMin: number;
  priceRangeMax: number;
  savings?: number;
}

interface PricePredictionCardProps {
  hotel: {
    id: string;
    name: string;
    image: string;
    location: string;
    rating: number;
  };
  prediction: PredictionData;
  currentPrice?: number;
  onViewDetails: () => void;
}

export const PricePredictionCard: React.FC<PricePredictionCardProps> = ({
  hotel,
  prediction,
  currentPrice,
  onViewDetails
}) => {
  const savings = currentPrice ? Math.round(((currentPrice - prediction.predictedPrice) / currentPrice) * 100) : 0;
  const isGoodDeal = savings > 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      {/* ホテル画像 */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={hotel.image} 
          alt={hotel.name}
          className="w-full h-full object-cover"
        />
        
        {/* お得バッジ */}
        {isGoodDeal && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            {savings}%お得！
          </div>
        )}
        
        {/* 評価バッジ */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
          <span className="text-yellow-500">★</span>
          <span className="text-sm font-semibold">{hotel.rating}</span>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-5">
        {/* ホテル情報 */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-1">{hotel.name}</h3>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {hotel.location}
          </p>
        </div>

        {/* 価格予測 */}
        <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-xl p-4 mb-4">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-xs text-gray-600 mb-1">AI予測価格</p>
              <p className="text-2xl font-bold text-gray-800">
                ¥{prediction.predictedPrice.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">信頼度</p>
              <p className="text-lg font-semibold text-green-600">{prediction.confidence}%</p>
            </div>
          </div>
          
          {/* 価格レンジ */}
          <div className="mt-3 pt-3 border-t border-pink-200">
            <p className="text-xs text-gray-600 mb-1">予測価格帯</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-700">¥{prediction.priceRangeMin.toLocaleString()}</span>
              <div className="flex-1 h-1 bg-gradient-to-r from-pink-300 to-red-300 rounded-full"></div>
              <span className="text-gray-700">¥{prediction.priceRangeMax.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* AI分析 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg">🤖</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 mb-1">AIの分析</p>
              <p className="text-xs text-gray-600 leading-relaxed">{prediction.reasoning}</p>
            </div>
          </div>
          
          {/* レコメンデーション */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-1">おすすめ度</p>
            <p className="text-sm text-gray-600">{prediction.recommendation}</p>
          </div>
        </div>

        {/* アクションボタン */}
        <button
          onClick={onViewDetails}
          className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
        >
          詳細を見る
        </button>
      </div>
    </motion.div>
  );
};