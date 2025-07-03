import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Hotel } from '../RealHotel/HotelCard';

interface RealtimeResultsProps {
  searchParams: any;
  onHotelSelect: (hotel: Hotel) => void;
  onAddToWatchlist?: (hotel: Hotel) => void;
}

interface SortOption {
  key: string;
  label: string;
  icon: string;
}

const RealtimeResults: React.FC<RealtimeResultsProps> = ({
  searchParams,
  onHotelSelect,
  onAddToWatchlist
}) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [displayCount, setDisplayCount] = useState(20);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ソートオプション
  const sortOptions: SortOption[] = useMemo(() => [
    { key: 'relevance', label: '関連度順', icon: '🎯' },
    { key: 'price_low', label: '価格の安い順', icon: '💰' },
    { key: 'price_high', label: '価格の高い順', icon: '💎' },
    { key: 'rating', label: '評価の高い順', icon: '⭐' },
    { key: 'review_count', label: 'レビュー数順', icon: '📝' },
    { key: 'distance', label: '距離の近い順', icon: '📍' },
  ], []);

  // 検索実行
  const searchHotels = useCallback(async (isRefresh = false) => {
    if (!searchParams?.location) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // API呼び出し（実際の実装）
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/hotels/search-realtime`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...searchParams,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`検索エラー: ${response.status}`);
      }

      const data = await response.json();
      setHotels(data.hotels || []);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('検索エラー:', err);
      setError(err instanceof Error ? err.message : '検索に失敗しました');
      
      // エラー時はサンプルデータを使用
      setHotels(generateSampleHotels());
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchParams]);

  // 初回検索
  useEffect(() => {
    if (searchParams) {
      searchHotels();
    }
  }, [searchParams, searchHotels]);

  // 自動リフレッシュ（5分間隔）
  useEffect(() => {
    if (!hotels.length) return;

    const interval = setInterval(() => {
      searchHotels(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [hotels.length, searchHotels]);

  // サンプルデータ生成
  const generateSampleHotels = (): Hotel[] => {
    const sampleData = [
      { base: 'ホテルニューオータニ', price: 25000, rating: 4.5, reviews: 1250 },
      { base: 'パークハイアット', price: 45000, rating: 4.7, reviews: 980 },
      { base: 'ヒルトン', price: 28000, rating: 4.3, reviews: 1680 },
      { base: 'マリオット', price: 32000, rating: 4.4, reviews: 1420 },
      { base: 'シェラトン', price: 22000, rating: 4.2, reviews: 890 },
      { base: 'リーガロイヤル', price: 18000, rating: 4.1, reviews: 760 },
      { base: 'インターコンチネンタル', price: 38000, rating: 4.6, reviews: 1120 },
      { base: 'プリンスホテル', price: 15000, rating: 3.9, reviews: 650 },
    ];

    return sampleData.map((item, index) => ({
      hotelNo: `hotel_${index + 1}`,
      hotelName: `${searchParams.location}${item.base}`,
      hotelInformationUrl: `https://travel.rakuten.co.jp/HOTEL/hotel_${index + 1}/`,
      hotelThumbnailUrl: `https://images.unsplash.com/photo-${1566073771259 + index}?w=400&q=80`,
      hotelMinCharge: item.price + Math.floor(Math.random() * 5000 - 2500),
      latitude: (searchParams.latitude || 35.6762) + (Math.random() - 0.5) * 0.05,
      longitude: (searchParams.longitude || 139.6503) + (Math.random() - 0.5) * 0.05,
      reviewAverage: item.rating + (Math.random() - 0.5) * 0.4,
      reviewCount: item.reviews + Math.floor(Math.random() * 200 - 100),
      address1: `${searchParams.location}`,
      address2: `サンプル${index + 1}-${index + 1}-${index + 1}`,
      telephoneNo: `03-${String(1234 + index).padStart(4, '0')}-${String(5678 + index).padStart(4, '0')}`,
      access: `最寄り駅より徒歩${Math.floor(Math.random() * 10) + 1}分`,
      hotelSpecial: index % 3 === 0 ? '⚡ 限定タイムセール実施中！' : undefined,
      vacancy: ['available', 'few', 'available'][index % 3] as any,
      userReview: index % 4 === 0 ? 'スタッフの対応が素晴らしく、快適に過ごせました。' : undefined,
    }));
  };

  // ソート処理
  const sortedHotels = useMemo(() => {
    const sorted = [...hotels].sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return a.hotelMinCharge - b.hotelMinCharge;
        case 'price_high':
          return b.hotelMinCharge - a.hotelMinCharge;
        case 'rating':
          return b.reviewAverage - a.reviewAverage;
        case 'review_count':
          return b.reviewCount - a.reviewCount;
        case 'distance':
          // 簡易距離計算（実際はより精密な計算が必要）
          const userLat = searchParams.latitude || 35.6762;
          const userLng = searchParams.longitude || 139.6503;
          const distanceA = Math.sqrt(Math.pow(a.latitude - userLat, 2) + Math.pow(a.longitude - userLng, 2));
          const distanceB = Math.sqrt(Math.pow(b.latitude - userLat, 2) + Math.pow(b.longitude - userLng, 2));
          return distanceA - distanceB;
        default:
          return 0; // relevance順を維持
      }
    });
    return sorted;
  }, [hotels, sortBy, searchParams]);

  const displayedHotels = sortedHotels.slice(0, displayCount);

  // エラー表示
  if (error && !hotels.length) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">検索エラー</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => searchHotels()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          再試行
        </button>
      </div>
    );
  }

  // ローディング表示
  if (loading && !hotels.length) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/6"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー・コントロール */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* 検索結果情報 */}
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              検索結果 ({hotels.length}件)
            </h2>
            {lastUpdated && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
              </div>
            )}
            {searchParams && (
              <div className="text-sm text-gray-600">
                {searchParams.location} • {searchParams.checkin} - {searchParams.checkout}
              </div>
            )}
          </div>

          {/* コントロール */}
          <div className="flex items-center gap-4">
            {/* リフレッシュボタン */}
            <button
              onClick={() => searchHotels(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              更新
            </button>

            {/* ビューモード切替 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
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
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-800 text-sm">
                一部のデータ取得に失敗しました。表示中のデータはサンプルです。
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ホテル一覧 */}
      {hotels.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl mb-4">🏨</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            該当するホテルが見つかりませんでした
          </h3>
          <p className="text-gray-600">検索条件を変更して再度お試しください</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {displayedHotels.map((hotel) => (
            <div key={hotel.hotelNo} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
              <div className="relative">
                <img
                  src={hotel.hotelThumbnailUrl}
                  alt={hotel.hotelName}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
                
                <div className="absolute bottom-0 right-0 bg-black bg-opacity-75 text-white px-3 py-2 rounded-tl-lg">
                  <div className="text-xs">1泊</div>
                  <div className="text-lg font-bold">¥{hotel.hotelMinCharge.toLocaleString()}〜</div>
                </div>

                {hotel.vacancy === 'few' && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    残りわずか
                  </div>
                )}

                {hotel.hotelSpecial && (
                  <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                    特典
                  </div>
                )}

                {onAddToWatchlist && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToWatchlist(hotel);
                    }}
                    className="absolute top-2 right-2 bg-white bg-opacity-90 p-2 rounded-full hover:bg-opacity-100 transition-opacity"
                  >
                    <svg className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-2">
                  {hotel.hotelName}
                </h3>

                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center">
                    <span className="text-yellow-400">
                      {'★'.repeat(Math.floor(hotel.reviewAverage))}
                    </span>
                    <span className="ml-1 text-sm font-medium">{hotel.reviewAverage.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-gray-500">({hotel.reviewCount}件)</span>
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <p className="line-clamp-1">{hotel.address1} {hotel.address2}</p>
                  {hotel.access && (
                    <p className="line-clamp-1 mt-1">{hotel.access}</p>
                  )}
                </div>

                {hotel.hotelSpecial && (
                  <div className="mb-3">
                    <p className="text-sm text-orange-600 line-clamp-1">{hotel.hotelSpecial}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onHotelSelect(hotel)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    詳細を見る
                  </button>
                  
                  <a
                    href={hotel.hotelInformationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors text-sm font-medium flex items-center gap-1"
                  >
                    予約
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* もっと見るボタン */}
      {displayCount < sortedHotels.length && (
        <div className="text-center">
          <button
            onClick={() => setDisplayCount(prev => Math.min(prev + 20, sortedHotels.length))}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            さらに{Math.min(20, sortedHotels.length - displayCount)}件表示
          </button>
          <p className="text-sm text-gray-500 mt-2">
            {displayCount} / {sortedHotels.length}件表示中
          </p>
        </div>
      )}
    </div>
  );
};

export default RealtimeResults;