import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../config/axios';
import { LocationSelector } from './LocationSelector';
import { LocationSearchMap } from '../Maps/LocationSearchMap';

interface PriceRange {
  key: string;
  label: string;
  min: number;
  max: number | null;
}

interface SearchFilters {
  prefectureId?: number;
  cityId?: number;
  priceRange?: string;
  radius?: number;
  coordinates?: { lat: number; lng: number };
  searchType?: 'location' | 'map' | 'station' | 'tourist_spot';
}

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

interface LocationSearchFormProps {
  onResults: (hotels: Hotel[]) => void;
  onLoading?: (loading: boolean) => void;
  initialFilters?: SearchFilters;
  showMap?: boolean;
  mapHeight?: string;
  className?: string;
}

export const LocationSearchForm: React.FC<LocationSearchFormProps> = ({
  onResults,
  onLoading,
  initialFilters = {},
  showMap = true,
  mapHeight = '400px',
  className = ''
}) => {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapHotels, setMapHotels] = useState<any[]>([]);
  const [priceStatistics, setPriceStatistics] = useState<any[]>([]);

  // 価格帯定義
  const priceRanges: PriceRange[] = [
    { key: 'budget', label: '～1.5万円', min: 0, max: 15000 },
    { key: 'standard', label: '1.5～3万円', min: 15001, max: 30000 },
    { key: 'premium', label: '3～5万円', min: 30001, max: 50000 },
    { key: 'luxury', label: '5～10万円', min: 50001, max: 100000 },
    { key: 'ultra', label: '10万円～', min: 100001, max: null }
  ];

  // 検索半径オプション
  const radiusOptions = [
    { value: 1, label: '1km以内' },
    { value: 3, label: '3km以内' },
    { value: 5, label: '5km以内' },
    { value: 10, label: '10km以内' },
    { value: 25, label: '25km以内' }
  ];

  // ホテル検索実行
  const executeSearch = useCallback(async (searchFilters: SearchFilters) => {
    setLoading(true);
    onLoading?.(true);

    try {
      const params: any = {
        limit: 50,
        offset: 0
      };

      if (searchFilters.prefectureId) params.prefectureId = searchFilters.prefectureId;
      if (searchFilters.cityId) params.cityId = searchFilters.cityId;
      if (searchFilters.priceRange) params.priceRange = searchFilters.priceRange;
      if (searchFilters.radius) params.radius = searchFilters.radius;
      if (searchFilters.coordinates) {
        params.latitude = searchFilters.coordinates.lat;
        params.longitude = searchFilters.coordinates.lng;
      }

      const response = await axios.get('/api/locations/hotels', { params });

      if (response.data.success) {
        onResults(response.data.data);
        
        // マップ用データも設定
        const mapData = response.data.data.map((hotel: Hotel) => ({
          id: hotel.hotel_id,
          lat: hotel.latitude,
          lng: hotel.longitude,
          price: hotel.hotel_price_analysis?.current_avg_price || 0,
          priceRange: hotel.price_range_label
        }));
        setMapHotels(mapData);
      }
    } catch (error) {
      console.error('Error searching hotels:', error);
      onResults([]);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  }, [onResults, onLoading]);

  // 価格統計取得
  const fetchPriceStatistics = useCallback(async (prefectureId?: number, cityId?: number) => {
    try {
      const params: any = {};
      if (prefectureId) params.prefectureId = prefectureId;
      if (cityId) params.cityId = cityId;

      const response = await axios.get('/api/locations/price-statistics', { params });
      if (response.data.success) {
        setPriceStatistics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching price statistics:', error);
    }
  }, []);

  // 地域選択ハンドラー
  const handleLocationSelect = (location: any) => {
    const newFilters = {
      ...filters,
      prefectureId: location.prefectureId,
      cityId: location.cityId,
      coordinates: location.coordinates
    };
    
    setFilters(newFilters);
    
    if (location.prefectureId) {
      executeSearch(newFilters);
      fetchPriceStatistics(location.prefectureId, location.cityId);
    }
  };

  // 価格帯選択ハンドラー
  const handlePriceRangeChange = (priceRange: string) => {
    const newFilters = { ...filters, priceRange: priceRange || undefined };
    setFilters(newFilters);
    
    if (newFilters.prefectureId || newFilters.coordinates) {
      executeSearch(newFilters);
    }
  };

  // 検索半径変更ハンドラー
  const handleRadiusChange = (radius: number) => {
    const newFilters = { ...filters, radius };
    setFilters(newFilters);
    
    if (newFilters.coordinates) {
      executeSearch(newFilters);
    }
  };

  // オートコンプリート検索
  const handleSearchInputChange = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.length >= 2) {
      try {
        const response = await axios.get('/api/locations/suggestions', {
          params: { q: query, limit: 8 }
        });
        
        if (response.data.success) {
          setSuggestions(response.data.data);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // 候補選択ハンドラー
  const handleSuggestionSelect = (suggestion: any) => {
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    
    // 選択されたタイプに応じて検索実行
    switch (suggestion.type) {
      case 'prefecture':
        handleLocationSelect({ prefectureId: suggestion.id, prefectureName: suggestion.name });
        break;
      case 'city':
        // 市町村の詳細情報を取得して検索
        axios.get(`/api/locations/city/${suggestion.id}`)
          .then(response => {
            if (response.data.success) {
              const city = response.data.data;
              handleLocationSelect({
                cityId: city.id,
                cityName: city.name,
                coordinates: { lat: city.latitude, lng: city.longitude }
              });
            }
          })
          .catch(console.error);
        break;
      case 'station':
        // 駅周辺検索
        setFilters({ ...filters, searchType: 'station' });
        axios.get(`/api/locations/stations/${suggestion.id}/hotels`, {
          params: { priceRange: filters.priceRange, maxDistance: filters.radius || 3 }
        }).then(response => {
          if (response.data.success) {
            onResults(response.data.data.hotels);
          }
        }).catch(console.error);
        break;
      case 'tourist_spot':
        // 観光地周辺検索
        setFilters({ ...filters, searchType: 'tourist_spot' });
        axios.get(`/api/locations/tourist-spots/${suggestion.id}/hotels`, {
          params: { priceRange: filters.priceRange, maxDistance: filters.radius || 10 }
        }).then(response => {
          if (response.data.success) {
            onResults(response.data.data.hotels);
          }
        }).catch(console.error);
        break;
    }
  };

  // 初期検索実行
  useEffect(() => {
    if (initialFilters.prefectureId || initialFilters.coordinates) {
      executeSearch(initialFilters);
    }
  }, []);

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* 検索フォーム */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">ホテル検索</h3>
          
          {/* オートコンプリート検索 */}
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="都道府県、市町村、駅名、観光地で検索..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span>{suggestion.display_name}</span>
                      <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                        {suggestion.type === 'prefecture' && '都道府県'}
                        {suggestion.type === 'city' && '市町村'}
                        {suggestion.type === 'station' && '駅'}
                        {suggestion.type === 'tourist_spot' && '観光地'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 地域選択 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LocationSelector
              onLocationSelect={handleLocationSelect}
              selectedPrefectureId={filters.prefectureId}
              selectedCityId={filters.cityId}
            />

            <div className="space-y-4">
              {/* 価格帯選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  価格帯
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePriceRangeChange('')}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      !filters.priceRange
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    すべて
                  </button>
                  {priceRanges.map((range) => (
                    <button
                      key={range.key}
                      onClick={() => handlePriceRangeChange(range.key)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        filters.priceRange === range.key
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 検索半径（座標検索時のみ表示） */}
              {filters.coordinates && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    検索範囲
                  </label>
                  <select
                    value={filters.radius || 10}
                    onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {radiusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 価格統計表示 */}
          {priceStatistics.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">この地域の価格帯別ホテル数</div>
              <div className="flex flex-wrap gap-2">
                {priceStatistics.map((stat) => (
                  <div key={stat.code} className="text-xs text-gray-600">
                    {stat.name}: <span className="font-semibold">{stat.hotel_count}</span>件
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* マップ表示 */}
        {showMap && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <LocationSearchMap
              hotels={mapHotels}
              center={filters.coordinates}
              height={mapHeight}
              priceRange={filters.priceRange}
              onHotelSelect={(hotelId) => {
                // ホテル詳細表示の処理
                console.log('Selected hotel:', hotelId);
              }}
              onBoundsChanged={(bounds) => {
                // 地図範囲変更時の処理
                console.log('Bounds changed:', bounds);
              }}
            />
          </div>
        )}

        {/* ローディング表示 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">検索中...</span>
          </div>
        )}
      </div>
    </div>
  );
};