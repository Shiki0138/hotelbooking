import React, { useState } from 'react';
import HotelCard, { Hotel } from './HotelCard';

interface HotelResultsProps {
  hotels: Hotel[];
  loading: boolean;
  onViewDetails: (hotel: Hotel) => void;
  onAddToWatchlist?: (hotel: Hotel) => void;
  searchParams?: any;
}

type SortOption = 'relevance' | 'price_low' | 'price_high' | 'rating' | 'review_count';
type ViewMode = 'grid' | 'list';

const HotelResults: React.FC<HotelResultsProps> = ({ 
  hotels, 
  loading, 
  onViewDetails, 
  onAddToWatchlist,
  searchParams 
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [displayCount, setDisplayCount] = useState(20);

  const sortedHotels = [...hotels].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return a.hotelMinCharge - b.hotelMinCharge;
      case 'price_high':
        return b.hotelMinCharge - a.hotelMinCharge;
      case 'rating':
        return b.reviewAverage - a.reviewAverage;
      case 'review_count':
        return b.reviewCount - a.reviewCount;
      default:
        return 0; // relevance (API順序を維持)
    }
  });

  const displayedHotels = sortedHotels.slice(0, displayCount);

  const loadMore = () => {
    setDisplayCount(prev => Math.min(prev + 20, hotels.length));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-lg text-gray-600">ホテルを検索しています...</p>
          <p className="text-sm text-gray-500 mt-2">楽天トラベルから最新情報を取得中</p>
        </div>
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏨</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          該当するホテルが見つかりませんでした
        </h3>
        <p className="text-gray-600 mb-4">
          検索条件を変更して再度お試しください
        </p>
        <div className="text-sm text-gray-500">
          <p>• 日程を変更してみる</p>
          <p>• エリアを広げてみる</p>
          <p>• 価格帯を調整してみる</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 検索結果ヘッダー */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              検索結果 ({hotels.length}件)
            </h2>
            {searchParams && (
              <div className="text-sm text-gray-600">
                {searchParams.area && <span>{searchParams.area} • </span>}
                {searchParams.checkinDate && searchParams.checkoutDate && (
                  <span>
                    {searchParams.checkinDate.toLocaleDateString('ja-JP')} - {searchParams.checkoutDate.toLocaleDateString('ja-JP')} • 
                  </span>
                )}
                <span>{searchParams.adultNum}名 {searchParams.roomNum}部屋</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* 表示切替 */}
            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* ソート */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="relevance">関連度順</option>
              <option value="price_low">価格の安い順</option>
              <option value="price_high">価格の高い順</option>
              <option value="rating">評価の高い順</option>
              <option value="review_count">レビュー数順</option>
            </select>
          </div>
        </div>
      </div>

      {/* ホテル一覧 */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
      }>
        {displayedHotels.map((hotel) => (
          <div key={hotel.hotelNo} className={viewMode === 'list' ? 'max-w-none' : ''}>
            <HotelCard
              hotel={hotel}
              onViewDetails={onViewDetails}
              onAddToWatchlist={onAddToWatchlist}
            />
          </div>
        ))}
      </div>

      {/* もっと見るボタン */}
      {displayCount < hotels.length && (
        <div className="text-center pt-8">
          <button
            onClick={loadMore}
            className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            さらに{Math.min(20, hotels.length - displayCount)}件表示
          </button>
          <p className="text-sm text-gray-500 mt-2">
            {displayCount} / {hotels.length}件表示中
          </p>
        </div>
      )}

      {/* 検索のヒント */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">💡 検索のコツ</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• 平日や閑散期は料金が安くなる傾向があります</p>
          <p>• 直前予約では特別料金が適用される場合があります</p>
          <p>• ウォッチリストに追加すると価格変動をお知らせします</p>
        </div>
      </div>
    </div>
  );
};

export default HotelResults;