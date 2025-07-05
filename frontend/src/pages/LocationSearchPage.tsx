import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LocationSearchForm } from '../components/Location/LocationSearchForm';
import { RecommendationCard } from '../components/PersonalizedRecommendations/RecommendationCard';
import { useFavorites } from '../hooks/useFavorites';
import axios from '../config/axios';

interface Hotel {
  hotel_id: string;
  latitude: number;
  longitude: number;
  address: string;
  prefectures: { name: string };
  cities: { name: string };
  hotel_price_analysis: {
    current_avg_price: number;
    price_categories: { name: string; category_code: string };
  };
  distance_km?: number;
  price_range_label: string;
  access_scores: {
    tourist: number;
    business: number;
    transport: number;
    overall: number;
  };
}

export const LocationSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'distance' | 'access_score'>('access_score');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [popularAreas, setPopularAreas] = useState<any[]>([]);
  const { favorites, toggleFavorite, loading: favoritesLoading } = useFavorites();

  // URLパラメータから初期フィルターを設定
  const getInitialFilters = () => {
    return {
      prefectureId: searchParams.get('prefecture') ? parseInt(searchParams.get('prefecture')!) : undefined,
      cityId: searchParams.get('city') ? parseInt(searchParams.get('city')!) : undefined,
      priceRange: searchParams.get('priceRange') || undefined,
      coordinates: searchParams.get('lat') && searchParams.get('lng') ? {
        lat: parseFloat(searchParams.get('lat')!),
        lng: parseFloat(searchParams.get('lng')!)
      } : undefined
    };
  };

  // 人気エリア取得
  useEffect(() => {
    const fetchPopularAreas = async () => {
      try {
        const response = await axios.get('/api/locations/popular-areas', {
          params: { limit: 8 }
        });
        if (response.data.success) {
          setPopularAreas(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching popular areas:', error);
      }
    };

    fetchPopularAreas();
  }, []);

  // 検索結果ハンドラー
  const handleSearchResults = (searchResults: Hotel[]) => {
    setHotels(searchResults);
  };

  // ソート処理
  const sortedHotels = React.useMemo(() => {
    return [...hotels].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (a.hotel_price_analysis?.current_avg_price || 0) - (b.hotel_price_analysis?.current_avg_price || 0);
        case 'distance':
          return (a.distance_km || 999) - (b.distance_km || 999);
        case 'access_score':
          return b.access_scores.overall - a.access_scores.overall;
        default:
          return 0;
      }
    });
  }, [hotels, sortBy]);

  // URLパラメータ更新
  const updateSearchParams = (filters: any) => {
    const newParams = new URLSearchParams();
    
    if (filters.prefectureId) newParams.set('prefecture', filters.prefectureId.toString());
    if (filters.cityId) newParams.set('city', filters.cityId.toString());
    if (filters.priceRange) newParams.set('priceRange', filters.priceRange);
    if (filters.coordinates) {
      newParams.set('lat', filters.coordinates.lat.toString());
      newParams.set('lng', filters.coordinates.lng.toString());
    }
    
    setSearchParams(newParams);
  };

  // ホテル詳細へ遷移
  const handleHotelClick = (hotelId: string) => {
    navigate(`/hotels/${hotelId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ページヘッダー */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">地域別ホテル検索</h1>
              <p className="mt-2 text-gray-600">
                都道府県・市町村、駅、観光地からお好みのホテルを見つけよう
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {hotels.length > 0 && `${hotels.length}件のホテルが見つかりました`}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 検索フォーム */}
          <div className="lg:col-span-1">
            <LocationSearchForm
              onResults={handleSearchResults}
              onLoading={setLoading}
              initialFilters={getInitialFilters()}
              showMap={false}
              className="sticky top-4"
            />

            {/* 人気エリア */}
            {popularAreas.length > 0 && hotels.length === 0 && (
              <div className="mt-6 bg-white p-4 rounded-lg shadow-md">
                <h3 className="font-semibold mb-3">人気エリア</h3>
                <div className="space-y-2">
                  {popularAreas.map((area) => (
                    <button
                      key={area.city_id}
                      onClick={() => {
                        const filters = { cityId: area.city_id };
                        updateSearchParams(filters);
                        // 検索実行
                        axios.get('/api/locations/hotels', {
                          params: { cityId: area.city_id }
                        }).then(response => {
                          if (response.data.success) {
                            setHotels(response.data.data);
                          }
                        });
                      }}
                      className="w-full text-left p-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{area.city_name}</span>
                          {area.is_major_city && <span className="ml-1 text-yellow-500">⭐</span>}
                        </div>
                        <div className="text-sm text-gray-500">
                          {area.hotel_count}件
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        平均 ¥{area.avg_price.toLocaleString()}/泊
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 検索結果 */}
          <div className="lg:col-span-3">
            {/* 結果ヘッダー */}
            {hotels.length > 0 && (
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  {/* ソート選択 */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="access_score">アクセススコア順</option>
                    <option value="price">料金安い順</option>
                    <option value="distance">距離近い順</option>
                  </select>

                  {/* 表示形式切り替え */}
                  <div className="flex border border-gray-300 rounded-md overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 text-sm ${
                        viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                      }`}
                    >
                      グリッド
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-2 text-sm ${
                        viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                      }`}
                    >
                      リスト
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  {sortedHotels.length}件中 1-{Math.min(20, sortedHotels.length)}件を表示
                </div>
              </div>
            )}

            {/* ローディング状態 */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">検索中...</span>
              </div>
            )}

            {/* 検索結果表示 */}
            {!loading && hotels.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">ホテルが見つかりませんでした</h3>
                <p className="text-gray-600 mb-4">
                  検索条件を変更して再度お試しください
                </p>
                <button
                  onClick={() => setHotels([])}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  検索条件をリセット
                </button>
              </div>
            )}

            {/* ホテル一覧 */}
            {!loading && sortedHotels.length > 0 && (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-4'
              }>
                {sortedHotels.slice(0, 20).map((hotel) => (
                  <div
                    key={hotel.hotel_id}
                    className={viewMode === 'list' ? 'bg-white rounded-lg shadow-md p-4' : ''}
                  >
                    <RecommendationCard
                      hotel={{
                        id: hotel.hotel_id,
                        name: `${hotel.cities.name}のホテル`,
                        city: hotel.cities.name,
                        country: hotel.prefectures.name,
                        star_rating: 4,
                        user_rating: 4.0,
                        image_url: '/images/hotel-placeholder.jpg',
                        amenities: [],
                        rooms: [{
                          id: '1',
                          name: 'スタンダードルーム',
                          capacity: 2,
                          base_price: hotel.hotel_price_analysis?.current_avg_price || 0
                        }],
                        reason_tags: [],
                        personalization_score: hotel.access_scores.overall,
                        is_personalized: hotel.access_scores.overall > 80
                      }}
                      onFavoriteToggle={() => toggleFavorite(hotel.hotel_id)}
                      isFavorite={favorites.has(hotel.hotel_id)}
                    />
                    
                    {/* 追加情報表示 */}
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      {hotel.distance_km && (
                        <div className="flex items-center">
                          <span className="w-16">距離:</span>
                          <span>{hotel.distance_km}km</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="w-16">アクセス:</span>
                        <div className="flex space-x-1">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            観光 {hotel.access_scores.tourist}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            交通 {hotel.access_scores.transport}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* もっと見るボタン */}
            {sortedHotels.length > 20 && (
              <div className="text-center mt-8">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  さらに表示 ({sortedHotels.length - 20}件)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};