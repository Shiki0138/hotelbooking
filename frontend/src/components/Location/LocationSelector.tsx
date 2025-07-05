import React, { useState, useEffect } from 'react';
import axios from '../../config/axios';

interface Prefecture {
  id: number;
  name: string;
  name_en: string;
  region: string;
}

interface City {
  id: number;
  name: string;
  name_en: string;
  latitude: number;
  longitude: number;
  is_major_city: boolean;
}

interface LocationSelectorProps {
  onLocationSelect: (location: {
    prefectureId?: number;
    cityId?: number;
    prefectureName?: string;
    cityName?: string;
    coordinates?: { lat: number; lng: number };
  }) => void;
  selectedPrefectureId?: number;
  selectedCityId?: number;
  className?: string;
  placeholder?: {
    prefecture?: string;
    city?: string;
  };
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationSelect,
  selectedPrefectureId,
  selectedCityId,
  className = '',
  placeholder = {
    prefecture: '都道府県を選択',
    city: '市町村を選択'
  }
}) => {
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedPrefecture, setSelectedPrefecture] = useState<number | undefined>(selectedPrefectureId);
  const [selectedCity, setSelectedCity] = useState<number | undefined>(selectedCityId);
  const [loadingPrefectures, setLoadingPrefectures] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // 都道府県一覧取得
  useEffect(() => {
    const fetchPrefectures = async () => {
      setLoadingPrefectures(true);
      try {
        const response = await axios.get('/api/locations/prefectures');
        if (response.data.success) {
          setPrefectures(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching prefectures:', error);
      } finally {
        setLoadingPrefectures(false);
      }
    };

    fetchPrefectures();
  }, []);

  // 都道府県選択時の市町村取得
  useEffect(() => {
    if (selectedPrefecture) {
      const fetchCities = async () => {
        setLoadingCities(true);
        try {
          const response = await axios.get(`/api/locations/prefectures/${selectedPrefecture}/cities`);
          if (response.data.success) {
            setCities(response.data.data);
          }
        } catch (error) {
          console.error('Error fetching cities:', error);
          setCities([]);
        } finally {
          setLoadingCities(false);
        }
      };

      fetchCities();
    } else {
      setCities([]);
      setSelectedCity(undefined);
    }
  }, [selectedPrefecture]);

  // 都道府県選択ハンドラー
  const handlePrefectureChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const prefectureId = event.target.value ? parseInt(event.target.value) : undefined;
    const prefecture = prefectures.find(p => p.id === prefectureId);
    
    setSelectedPrefecture(prefectureId);
    setSelectedCity(undefined);

    onLocationSelect({
      prefectureId,
      cityId: undefined,
      prefectureName: prefecture?.name,
      cityName: undefined,
      coordinates: undefined
    });
  };

  // 市町村選択ハンドラー
  const handleCityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = event.target.value ? parseInt(event.target.value) : undefined;
    const city = cities.find(c => c.id === cityId);
    const prefecture = prefectures.find(p => p.id === selectedPrefecture);
    
    setSelectedCity(cityId);

    onLocationSelect({
      prefectureId: selectedPrefecture,
      cityId,
      prefectureName: prefecture?.name,
      cityName: city?.name,
      coordinates: city ? { lat: city.latitude, lng: city.longitude } : undefined
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 都道府県選択 */}
      <div>
        <label htmlFor="prefecture-select" className="block text-sm font-medium text-gray-700 mb-1">
          都道府県
        </label>
        <div className="relative">
          <select
            id="prefecture-select"
            value={selectedPrefecture || ''}
            onChange={handlePrefectureChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
            disabled={loadingPrefectures}
          >
            <option value="">
              {loadingPrefectures ? '読み込み中...' : placeholder.prefecture}
            </option>
            {prefectures.map((prefecture) => (
              <option key={prefecture.id} value={prefecture.id}>
                {prefecture.name}
              </option>
            ))}
          </select>
          {loadingPrefectures && (
            <div className="absolute inset-y-0 right-8 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* 市町村選択 */}
      <div>
        <label htmlFor="city-select" className="block text-sm font-medium text-gray-700 mb-1">
          市町村
        </label>
        <div className="relative">
          <select
            id="city-select"
            value={selectedCity || ''}
            onChange={handleCityChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
            disabled={!selectedPrefecture || loadingCities}
          >
            <option value="">
              {!selectedPrefecture 
                ? '都道府県を選択してください'
                : loadingCities 
                  ? '読み込み中...' 
                  : placeholder.city
              }
            </option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
                {city.is_major_city && ' ⭐'}
              </option>
            ))}
          </select>
          {loadingCities && (
            <div className="absolute inset-y-0 right-8 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* 選択状況表示 */}
      {selectedPrefecture && (
        <div className="text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <span>選択中:</span>
            <div className="flex items-center space-x-1">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                {prefectures.find(p => p.id === selectedPrefecture)?.name}
              </span>
              {selectedCity && (
                <>
                  <span>→</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    {cities.find(c => c.id === selectedCity)?.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 人気エリア候補 */}
      {!selectedPrefecture && prefectures.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">人気エリア</div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 1, name: '東京都' },
              { id: 2, name: '神奈川県' },
              { id: 3, name: '大阪府' },
              { id: 4, name: '京都府' },
              { id: 7, name: '福岡県' }
            ].map((area) => {
              const prefecture = prefectures.find(p => p.name === area.name);
              if (!prefecture) return null;
              
              return (
                <button
                  key={prefecture.id}
                  onClick={() => {
                    setSelectedPrefecture(prefecture.id);
                    onLocationSelect({
                      prefectureId: prefecture.id,
                      prefectureName: prefecture.name
                    });
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  {prefecture.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};