import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { HotelListing } from '../components/HotelListing';

interface Region {
  id: string;
  name: string;
  description: string;
  image: string;
  popularCities: string[];
}

const regions: Region[] = [
  {
    id: 'kanto',
    name: '関東地方',
    description: '東京・横浜など、日本の中心地域',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=400&fit=crop',
    popularCities: ['東京', '横浜', '鎌倉', '箱根', '日光']
  },
  {
    id: 'kansai',
    name: '関西地方',
    description: '大阪・京都・奈良など、歴史と文化の地域',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=400&fit=crop',
    popularCities: ['大阪', '京都', '神戸', '奈良', '和歌山']
  },
  {
    id: 'okinawa',
    name: '沖縄地方',
    description: '美しいビーチリゾートと独自の文化',
    image: 'https://images.unsplash.com/photo-1574482567655-d8b12b5c925e?w=800&h=400&fit=crop',
    popularCities: ['那覇', '恩納村', '石垣島', '宮古島', '北谷']
  },
  {
    id: 'hokkaido',
    name: '北海道地方',
    description: '雄大な自然と美食の宝庫',
    image: 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=800&h=400&fit=crop',
    popularCities: ['札幌', '函館', '小樽', '富良野', '旭川']
  },
  {
    id: 'tohoku',
    name: '東北地方',
    description: '温泉と自然、東北の魅力',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop',
    popularCities: ['仙台', '青森', '秋田', '盛岡', '山形']
  },
  {
    id: 'kyushu',
    name: '九州地方',
    description: '温泉と歴史、南国の魅力',
    image: 'https://images.unsplash.com/photo-1624306388687-c5c7d0a2b3c6?w=800&h=400&fit=crop',
    popularCities: ['福岡', '長崎', '熊本', '鹿児島', '別府']
  }
];

export const RegionalSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRegion = searchParams.get('region');
  const selectedCity = searchParams.get('city');
  
  const [selectedDate, setSelectedDate] = useState({
    checkin: searchParams.get('checkin') || new Date().toISOString().split('T')[0],
    checkout: searchParams.get('checkout') || new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  const handleRegionSelect = (regionId: string) => {
    setSearchParams({ region: regionId });
  };

  const handleCitySelect = (city: string) => {
    setSearchParams({ 
      region: selectedRegion || '',
      city: city,
      checkin: selectedDate.checkin,
      checkout: selectedDate.checkout
    });
  };

  const handleDateChange = (type: 'checkin' | 'checkout', value: string) => {
    const newDates = { ...selectedDate, [type]: value };
    setSelectedDate(newDates);
    
    if (selectedCity) {
      setSearchParams({
        region: selectedRegion || '',
        city: selectedCity,
        checkin: newDates.checkin,
        checkout: newDates.checkout
      });
    }
  };

  const currentRegion = regions.find(r => r.id === selectedRegion);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-blue-600">LastMinuteStay</Link>
              <span className="ml-3 text-sm text-gray-500">地域別ホテル検索</span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900">ホーム</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">地域から選ぶ高級ホテル</h1>
          <p className="text-lg text-blue-100">日本全国の人気エリアから、お好みの地域をお選びください</p>
        </div>
      </div>

      {/* Date Selection */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">チェックイン</label>
                <input
                  type="date"
                  value={selectedDate.checkin}
                  onChange={(e) => handleDateChange('checkin', e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">チェックアウト</label>
                <input
                  type="date"
                  value={selectedDate.checkout}
                  onChange={(e) => handleDateChange('checkout', e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {selectedRegion && currentRegion && (
                <span>選択中: <strong>{currentRegion.name}</strong></span>
              )}
              {selectedCity && (
                <span> - <strong>{selectedCity}</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Region Selection */}
        {!selectedRegion && (
          <div>
            <h2 className="text-2xl font-bold mb-6">地域を選択</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regions.map((region) => (
                <div
                  key={region.id}
                  onClick={() => handleRegionSelect(region.id)}
                  className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                >
                  <div className="relative h-48">
                    <img
                      src={region.image}
                      alt={region.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-4 text-white">
                      <h3 className="text-xl font-bold">{region.name}</h3>
                      <p className="text-sm text-gray-200">{region.description}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600">人気エリア:</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {region.popularCities.slice(0, 3).map((city) => (
                        <span
                          key={city}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {city}
                        </span>
                      ))}
                      {region.popularCities.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{region.popularCities.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* City Selection */}
        {selectedRegion && currentRegion && !selectedCity && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setSearchParams({})}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                地域選択に戻る
              </button>
            </div>
            
            <h2 className="text-2xl font-bold mb-6">{currentRegion.name}の都市を選択</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {currentRegion.popularCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="text-lg font-semibold">{city}</div>
                  <div className="text-sm text-gray-600 mt-1">ホテルを検索</div>
                </button>
              ))}
            </div>

            {/* Show all hotels in region */}
            <div className="mt-8">
              <button
                onClick={() => handleCitySelect('all')}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                {currentRegion.name}全体のホテルを表示
              </button>
            </div>
          </div>
        )}

        {/* Hotel Results */}
        {selectedCity && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <button
                  onClick={() => {
                    const params: any = { region: selectedRegion };
                    setSearchParams(params);
                  }}
                  className="text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  都市選択に戻る
                </button>
              </div>
              <h2 className="text-2xl font-bold">
                {selectedCity === 'all' ? `${currentRegion?.name}` : selectedCity}のホテル
              </h2>
            </div>

            <HotelListing
              type="luxury"
              city={selectedCity === 'all' ? undefined : selectedCity.toLowerCase()}
              checkinDate={selectedDate.checkin}
              checkoutDate={selectedDate.checkout}
            />
          </div>
        )}
      </div>
    </div>
  );
};