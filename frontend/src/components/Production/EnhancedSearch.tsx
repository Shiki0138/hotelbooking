import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';

interface SearchParams {
  location: string;
  checkin: string;
  checkout: string;
  guests: number;
  rooms: number;
  priceRange: string;
  amenities: string[];
  hotelType: string;
  rating: number;
  latitude?: number;
  longitude?: number;
}

interface EnhancedSearchProps {
  onSearch: (params: SearchParams) => void;
  onLocationSelect?: (location: any) => void;
  loading?: boolean;
  initialParams?: Partial<SearchParams>;
}

interface LocationSuggestion {
  id: string;
  name: string;
  type: 'prefecture' | 'city' | 'area' | 'station';
  latitude: number;
  longitude: number;
  parent?: string;
}

const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  onSearch,
  onLocationSelect,
  loading = false,
  initialParams = {}
}) => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    location: '',
    checkin: '',
    checkout: '',
    guests: 2,
    rooms: 1,
    priceRange: '',
    amenities: [],
    hotelType: '',
    rating: 0,
    ...initialParams
  });

  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [errors, setErrors] = useState<Partial<SearchParams>>({});

  // 都道府県・人気エリアデータ
  const popularLocations = useMemo(() => [
    { id: 'tokyo', name: '東京都', type: 'prefecture' as const, latitude: 35.6762, longitude: 139.6503 },
    { id: 'osaka', name: '大阪府', type: 'prefecture' as const, latitude: 34.6937, longitude: 135.5023 },
    { id: 'kyoto', name: '京都府', type: 'prefecture' as const, latitude: 35.0116, longitude: 135.7681 },
    { id: 'hokkaido', name: '北海道', type: 'prefecture' as const, latitude: 43.0642, longitude: 141.3469 },
    { id: 'okinawa', name: '沖縄県', type: 'prefecture' as const, latitude: 26.2124, longitude: 127.6792 },
    { id: 'shibuya', name: '渋谷', type: 'area' as const, latitude: 35.6580, longitude: 139.7016, parent: '東京都' },
    { id: 'shinjuku', name: '新宿', type: 'area' as const, latitude: 35.6896, longitude: 139.6917, parent: '東京都' },
    { id: 'ginza', name: '銀座', type: 'area' as const, latitude: 35.6718, longitude: 139.7649, parent: '東京都' },
    { id: 'umeda', name: '梅田', type: 'area' as const, latitude: 34.7024, longitude: 135.4959, parent: '大阪府' },
    { id: 'namba', name: '難波', type: 'area' as const, latitude: 34.6659, longitude: 135.5018, parent: '大阪府' },
  ], []);

  const amenityOptions = useMemo(() => [
    { id: 'spa', label: 'スパ・温泉', icon: '♨️' },
    { id: 'pool', label: 'プール', icon: '🏊' },
    { id: 'fitness', label: 'フィットネス', icon: '💪' },
    { id: 'restaurant', label: 'レストラン', icon: '🍽️' },
    { id: 'wifi', label: 'Wi-Fi無料', icon: '📶' },
    { id: 'parking', label: '駐車場', icon: '🚗' },
    { id: 'pets', label: 'ペット可', icon: '🐕' },
    { id: 'smoking', label: '禁煙ルーム', icon: '🚭' },
  ], []);

  // 現在地取得
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.warn('位置情報取得エラー:', error),
        { timeout: 10000 }
      );
    }
  }, []);

  // ロケーション検索のデバウンス
  const debouncedLocationSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setLocationSuggestions([]);
        return;
      }

      // フィルタリング（実際はAPI呼び出し）
      const filtered = popularLocations.filter(location =>
        location.name.toLowerCase().includes(query.toLowerCase())
      );

      setLocationSuggestions(filtered);
    }, 300),
    [popularLocations]
  );

  // ロケーション入力変更
  const handleLocationChange = (value: string) => {
    setSearchParams(prev => ({ ...prev, location: value }));
    debouncedLocationSearch(value);
    setShowSuggestions(true);
  };

  // ロケーション選択
  const handleLocationSelect = (location: LocationSuggestion) => {
    setSearchParams(prev => ({
      ...prev,
      location: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
    setShowSuggestions(false);
    onLocationSelect?.(location);
  };

  // 現在地使用
  const useCurrentLocation = () => {
    if (currentLocation) {
      setSearchParams(prev => ({
        ...prev,
        location: '現在地周辺',
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      }));
    }
  };

  // アメニティ選択
  const toggleAmenity = (amenityId: string) => {
    setSearchParams(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  // バリデーション
  const validateForm = (): boolean => {
    const newErrors: Partial<SearchParams> = {};

    if (!searchParams.location) {
      newErrors.location = 'エリアを選択してください';
    }

    if (!searchParams.checkin) {
      newErrors.checkin = 'チェックイン日を選択してください';
    }

    if (!searchParams.checkout) {
      newErrors.checkout = 'チェックアウト日を選択してください';
    }

    if (searchParams.checkin && searchParams.checkout) {
      const checkinDate = new Date(searchParams.checkin);
      const checkoutDate = new Date(searchParams.checkout);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkinDate < today) {
        newErrors.checkin = 'チェックイン日は今日以降の日付を選択してください';
      }

      if (checkoutDate <= checkinDate) {
        newErrors.checkout = 'チェックアウト日はチェックイン日より後の日付を選択してください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 検索実行
  const handleSearch = () => {
    if (validateForm()) {
      onSearch(searchParams);
    }
  };

  // 今日の日付（最小値用）
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">ホテル検索</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
            📡 リアルタイム
          </span>
          <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            🚀 楽天連携
          </span>
        </div>
      </div>

      {/* メイン検索フィールド */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ロケーション */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            エリア・ホテル名
          </label>
          <input
            type="text"
            value={searchParams.location}
            onChange={(e) => handleLocationChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="東京、大阪、京都..."
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.location ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location}</p>
          )}

          {/* ロケーション候補 */}
          {showSuggestions && (locationSuggestions.length > 0 || currentLocation) && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
              {currentLocation && (
                <button
                  onClick={useCurrentLocation}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 border-b"
                >
                  <span className="text-green-600">📍</span>
                  <span>現在地周辺を検索</span>
                </button>
              )}
              {locationSuggestions.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationSelect(location)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{location.name}</div>
                    {location.parent && (
                      <div className="text-sm text-gray-500">{location.parent}</div>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">
                    {location.type === 'prefecture' ? '都道府県' : 
                     location.type === 'city' ? '市区町村' : 
                     location.type === 'area' ? 'エリア' : '駅'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* チェックイン */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            チェックイン
          </label>
          <input
            type="date"
            value={searchParams.checkin}
            onChange={(e) => setSearchParams(prev => ({ ...prev, checkin: e.target.value }))}
            min={today}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.checkin ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.checkin && (
            <p className="mt-1 text-sm text-red-600">{errors.checkin}</p>
          )}
        </div>

        {/* チェックアウト */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            チェックアウト
          </label>
          <input
            type="date"
            value={searchParams.checkout}
            onChange={(e) => setSearchParams(prev => ({ ...prev, checkout: e.target.value }))}
            min={searchParams.checkin || tomorrow}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.checkout ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.checkout && (
            <p className="mt-1 text-sm text-red-600">{errors.checkout}</p>
          )}
        </div>

        {/* ゲスト・部屋数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            人数・部屋
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={searchParams.guests}
              onChange={(e) => setSearchParams(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                <option key={num} value={num}>{num}名</option>
              ))}
            </select>
            <select
              value={searchParams.rooms}
              onChange={(e) => setSearchParams(prev => ({ ...prev, rooms: parseInt(e.target.value) }))}
              className="px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num}室</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 詳細フィルター */}
      <div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <svg className={`w-5 h-5 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          詳細条件
          {(searchParams.priceRange || searchParams.amenities.length > 0 || searchParams.hotelType || searchParams.rating > 0) && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              設定中
            </span>
          )}
        </button>

        {showFilters && (
          <div className="mt-4 p-6 bg-gray-50 rounded-xl space-y-6">
            {/* 価格帯 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">価格帯（1泊1室）</label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  { value: '', label: '指定なし' },
                  { value: '0-10000', label: '〜1万円' },
                  { value: '10000-20000', label: '1-2万円' },
                  { value: '20000-50000', label: '2-5万円' },
                  { value: '50000-100000', label: '5-10万円' },
                  { value: '100000-', label: '10万円〜' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="radio"
                      name="priceRange"
                      value={option.value}
                      checked={searchParams.priceRange === option.value}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, priceRange: e.target.value }))}
                      className="mr-2"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* アメニティ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">アメニティ・設備</label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {amenityOptions.map((amenity) => (
                  <label
                    key={amenity.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      searchParams.amenities.includes(amenity.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={searchParams.amenities.includes(amenity.id)}
                      onChange={() => toggleAmenity(amenity.id)}
                      className="sr-only"
                    />
                    <span className="mr-2">{amenity.icon}</span>
                    <span className="text-sm">{amenity.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ホテルタイプ・評価 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ホテルタイプ</label>
                <select
                  value={searchParams.hotelType}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, hotelType: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  <option value="business">ビジネスホテル</option>
                  <option value="resort">リゾートホテル</option>
                  <option value="city">シティホテル</option>
                  <option value="luxury">高級ホテル</option>
                  <option value="ryokan">旅館</option>
                  <option value="pension">ペンション</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">最低評価</label>
                <select
                  value={searchParams.rating}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>指定なし</option>
                  <option value={4.5}>4.5以上 ⭐⭐⭐⭐⭐</option>
                  <option value={4.0}>4.0以上 ⭐⭐⭐⭐</option>
                  <option value={3.5}>3.5以上 ⭐⭐⭐</option>
                  <option value={3.0}>3.0以上 ⭐⭐</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 検索ボタン */}
      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            検索中...
          </span>
        ) : (
          '🔍 ホテルを検索'
        )}
      </button>

      {/* クイック検索ヒント */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center p-3">
          <div className="text-2xl mb-2">📅</div>
          <div className="text-sm font-medium">今夜・明日の予約も</div>
          <div className="text-xs text-gray-600">直前予約対応</div>
        </div>
        <div className="text-center p-3">
          <div className="text-2xl mb-2">💰</div>
          <div className="text-sm font-medium">最安値を自動比較</div>
          <div className="text-xs text-gray-600">楽天トラベル連携</div>
        </div>
        <div className="text-center p-3">
          <div className="text-2xl mb-2">⚡</div>
          <div className="text-sm font-medium">リアルタイム空室</div>
          <div className="text-xs text-gray-600">最新情報を取得</div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSearch;