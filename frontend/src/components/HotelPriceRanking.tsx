import React from 'react';
import { BookingSystem, HotelPriceComparison, getPriceDifference } from '../services/hotelPriceComparisonService';

interface HotelPriceRankingProps {
  comparison: HotelPriceComparison;
  onSelectBookingSystem?: (system: BookingSystem) => void;
}

export const HotelPriceRanking: React.FC<HotelPriceRankingProps> = ({ 
  comparison, 
  onSelectBookingSystem 
}) => {
  const priceDiff = getPriceDifference(comparison);
  const topThreeSystems = comparison.bookingSystems.slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{comparison.hotelName}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>📅 {comparison.checkIn} → {comparison.checkOut}</span>
          <span>👥 {comparison.adults}名</span>
          {comparison.children > 0 && <span>👶 子供{comparison.children}名</span>}
        </div>
      </div>

      {priceDiff && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800">
            💡 最大<span className="font-bold text-lg mx-1">¥{priceDiff.amount.toLocaleString()}</span>
            （<span className="font-bold">{priceDiff.percentage}%</span>）の価格差があります！
          </p>
        </div>
      )}

      <div className="space-y-3">
        {topThreeSystems.map((system, index) => (
          <div 
            key={system.name}
            className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
              index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelectBookingSystem?.(system)}
          >
            {index === 0 && (
              <div className="absolute -top-3 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                🏆 最安値
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{system.logo}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{system.name}</h4>
                  <div className="flex gap-2 mt-1">
                    {system.features.map((feature, idx) => (
                      <span key={idx} className="text-xs text-gray-500">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ¥{system.price.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">税込・1泊</div>
                {!system.availability && (
                  <div className="text-xs text-red-500 mt-1">満室</div>
                )}
              </div>
            </div>

            {index === 0 && system.availability && (
              <div className="mt-3 text-center">
                <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold">
                  このサイトで予約する →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {comparison.bookingSystems.length > 3 && (
        <div className="mt-4 text-center">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            他{comparison.bookingSystems.length - 3}件の予約サイトを見る ↓
          </button>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 text-center">
        最終更新: {new Date(comparison.lastUpdated).toLocaleString('ja-JP')}
      </div>
    </div>
  );
};