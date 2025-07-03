import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface SearchParams {
  checkinDate: Date | null;
  checkoutDate: Date | null;
  area: string;
  latitude?: number;
  longitude?: number;
  adultNum: number;
  roomNum: number;
  minPrice?: number;
  maxPrice?: number;
  hotelType?: string;
  rating?: number;
}

interface HotelSearchProps {
  onSearch: (params: SearchParams) => void;
  loading?: boolean;
}

const HotelSearch: React.FC<HotelSearchProps> = ({ onSearch, loading = false }) => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    checkinDate: null,
    checkoutDate: null,
    area: '',
    adultNum: 2,
    roomNum: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  // 人気エリア
  const popularAreas = [
    { name: '東京', value: 'tokyo', lat: 35.6762, lng: 139.6503 },
    { name: '大阪', value: 'osaka', lat: 34.6937, lng: 135.5023 },
    { name: '京都', value: 'kyoto', lat: 35.0116, lng: 135.7681 },
    { name: '札幌', value: 'sapporo', lat: 43.0642, lng: 141.3469 },
    { name: '福岡', value: 'fukuoka', lat: 33.5904, lng: 130.4017 },
    { name: '沖縄', value: 'okinawa', lat: 26.2124, lng: 127.6792 },
  ];

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
        (error) => {
          console.error('位置情報取得エラー:', error);
        }
      );
    }
  }, []);

  const handleAreaSelect = (area: any) => {
    setSearchParams({
      ...searchParams,
      area: area.name,
      latitude: area.lat,
      longitude: area.lng,
    });
  };

  const handleCurrentLocationSearch = () => {
    if (currentLocation) {
      setSearchParams({
        ...searchParams,
        area: '現在地周辺',
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      });
    }
  };

  const handleSearch = () => {
    if (!searchParams.checkinDate || !searchParams.checkoutDate) {
      alert('チェックイン・チェックアウト日を選択してください');
      return;
    }
    if (!searchParams.area && !searchParams.latitude) {
      alert('エリアを選択してください');
      return;
    }
    onSearch(searchParams);
  };

  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">ホテル検索</h2>

      {/* 日付選択 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            チェックイン日
          </label>
          <DatePicker
            selected={searchParams.checkinDate}
            onChange={(date) => setSearchParams({ ...searchParams, checkinDate: date })}
            selectsStart
            startDate={searchParams.checkinDate}
            endDate={searchParams.checkoutDate}
            minDate={minDate}
            maxDate={maxDate}
            dateFormat="yyyy/MM/dd"
            placeholderText="日付を選択"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            チェックアウト日
          </label>
          <DatePicker
            selected={searchParams.checkoutDate}
            onChange={(date) => setSearchParams({ ...searchParams, checkoutDate: date })}
            selectsEnd
            startDate={searchParams.checkinDate}
            endDate={searchParams.checkoutDate}
            minDate={searchParams.checkinDate || minDate}
            maxDate={maxDate}
            dateFormat="yyyy/MM/dd"
            placeholderText="日付を選択"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* エリア選択 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          エリア
        </label>
        
        {/* 人気エリアボタン */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {popularAreas.map((area) => (
            <button
              key={area.value}
              onClick={() => handleAreaSelect(area)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                searchParams.area === area.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {area.name}
            </button>
          ))}
        </div>

        {/* 現在地検索 */}
        {currentLocation && (
          <button
            onClick={handleCurrentLocationSearch}
            className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            現在地周辺を検索
          </button>
        )}

        {/* 選択中のエリア表示 */}
        {searchParams.area && (
          <div className="mt-3 p-3 bg-blue-50 rounded-md">
            <span className="text-sm text-blue-700">
              選択中: {searchParams.area}
            </span>
          </div>
        )}
      </div>

      {/* 人数・部屋数 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            宿泊人数（大人）
          </label>
          <select
            value={searchParams.adultNum}
            onChange={(e) => setSearchParams({ ...searchParams, adultNum: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
              <option key={num} value={num}>{num}名</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            部屋数
          </label>
          <select
            value={searchParams.roomNum}
            onChange={(e) => setSearchParams({ ...searchParams, roomNum: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num}部屋</option>
            ))}
          </select>
        </div>
      </div>

      {/* 詳細フィルター */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
        >
          <svg className={`w-5 h-5 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          詳細条件
        </button>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md space-y-4">
            {/* 価格帯 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最低価格
                </label>
                <input
                  type="number"
                  value={searchParams.minPrice || ''}
                  onChange={(e) => setSearchParams({ ...searchParams, minPrice: parseInt(e.target.value) || undefined })}
                  placeholder="¥0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最高価格
                </label>
                <input
                  type="number"
                  value={searchParams.maxPrice || ''}
                  onChange={(e) => setSearchParams({ ...searchParams, maxPrice: parseInt(e.target.value) || undefined })}
                  placeholder="¥50,000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* ホテルタイプ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ホテルタイプ
              </label>
              <select
                value={searchParams.hotelType || ''}
                onChange={(e) => setSearchParams({ ...searchParams, hotelType: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                <option value="business">ビジネスホテル</option>
                <option value="resort">リゾートホテル</option>
                <option value="city">シティホテル</option>
                <option value="luxury">高級ホテル</option>
                <option value="ryokan">旅館</option>
              </select>
            </div>

            {/* 評価 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最低評価
              </label>
              <select
                value={searchParams.rating || ''}
                onChange={(e) => setSearchParams({ ...searchParams, rating: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">指定なし</option>
                <option value="4.5">4.5以上</option>
                <option value="4.0">4.0以上</option>
                <option value="3.5">3.5以上</option>
                <option value="3.0">3.0以上</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 検索ボタン */}
      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            検索中...
          </span>
        ) : (
          'ホテルを検索'
        )}
      </button>
    </div>
  );
};

export default HotelSearch;