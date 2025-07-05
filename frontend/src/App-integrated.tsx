import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';

// Import new feature components
import { WatchlistModal } from './components/Watchlist/WatchlistModal';
import { PersonalizedSection } from './components/PersonalizedRecommendations/PersonalizedSection';
import { PriceTrendChart } from './components/PricePrediction/PriceTrendChart';
import { BuyNowIndicator } from './components/PricePrediction/BuyNowIndicator';
import { LocationSearchPage } from './pages/LocationSearchPage';

// Mock hotel data for demo
const mockHotel = {
  id: '1',
  name: 'ザ・リッツ・カールトン東京',
  price: 42000,
  image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
  location: '東京都港区',
  amenities: ['スパ', 'フィットネス', 'レストラン', 'バー'],
  rooms: [{ id: '1', name: 'デラックスルーム', base_price: 42000, capacity: 2 }]
};

const mockHotels = [
  {
    ...mockHotel,
    reason_tags: ['room_capacity_match', 'price_range_match', 'spa'],
    personalization_score: 85,
    is_personalized: true
  }
];

const HomePage: React.FC = () => {
  const [showWatchlist, setShowWatchlist] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">🏨 LastMinuteStay</h1>
              <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                新機能実装完了
              </span>
            </div>
            <nav className="flex space-x-6">
              <Link to="/" className="text-gray-700 hover:text-gray-900">ホーム</Link>
              <Link to="/features" className="text-gray-700 hover:text-gray-900">新機能</Link>
              <Link to="/location-search" className="text-gray-700 hover:text-gray-900">地域検索</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">
            高級ホテルの直前予約システム
          </h2>
          <p className="text-xl mb-8">
            新機能：ウォッチリスト・パーソナライゼーション・価格予測AI
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowWatchlist(true)}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
            >
              ウォッチリスト機能
            </button>
            <Link
              to="/features"
              className="bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-900"
            >
              新機能を見る
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Watchlist Feature */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              🔔 ウォッチリスト
            </h3>
            <ul className="text-gray-600 space-y-2">
              <li>✅ 価格閾値・曜日指定通知</li>
              <li>✅ 残室数アラート</li>
              <li>✅ iCalカレンダー連携</li>
              <li>✅ 15分間隔監視</li>
            </ul>
            <button
              onClick={() => setShowWatchlist(true)}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              設定する
            </button>
          </div>

          {/* Personalization Feature */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              👤 パーソナライゼーション
            </h3>
            <ul className="text-gray-600 space-y-2">
              <li>✅ 7セグメント自動判定</li>
              <li>✅ 「あなた向け」バッジ</li>
              <li>✅ レコメンドスコア計算</li>
              <li>✅ 理由タグ生成</li>
            </ul>
          </div>

          {/* Price Prediction Feature */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              📊 価格予測AI
            </h3>
            <ul className="text-gray-600 space-y-2">
              <li>✅ 統計的価格予測</li>
              <li>✅ 7日間推移予測</li>
              <li>✅ 「今買うべき」指標</li>
              <li>✅ ML用データ収集</li>
            </ul>
          </div>

          {/* Location Search Feature */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-900">
              🗺️ 地域別検索
            </h3>
            <ul className="text-gray-600 space-y-2">
              <li>✅ 都道府県→市町村検索</li>
              <li>✅ 価格帯別フィルター</li>
              <li>✅ GoogleMaps統合</li>
              <li>✅ 駅・観光地から検索</li>
            </ul>
            <Link
              to="/location-search"
              className="mt-4 block w-full bg-green-600 text-white py-2 text-center rounded-lg hover:bg-green-700"
            >
              地域検索する
            </Link>
          </div>
        </div>
      </div>

      {/* Watchlist Modal */}
      {showWatchlist && (
        <WatchlistModal
          isOpen={showWatchlist}
          onClose={() => setShowWatchlist(false)}
          hotel={mockHotel}
          onSave={(item) => {
            console.log('Watchlist item saved:', item);
            setShowWatchlist(false);
          }}
        />
      )}
    </div>
  );
};

const FeaturesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">新機能デモ</h1>

        {/* Personalized Recommendations */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">パーソナライズドレコメンデーション</h2>
          <PersonalizedSection
            hotels={mockHotels}
            userSegment="couple"
            currentPurpose="leisure"
          />
        </div>

        {/* Price Prediction */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">価格予測・購買インジケーター</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">価格推移チャート</h3>
              <PriceTrendChart
                hotelId="1"
                predictions={[
                  { date: '2025-07-05', price: 42000, confidence: 85 },
                  { date: '2025-07-06', price: 45000, confidence: 78 },
                  { date: '2025-07-07', price: 48000, confidence: 72 },
                  { date: '2025-07-08', price: 44000, confidence: 80 },
                  { date: '2025-07-09', price: 41000, confidence: 88 },
                  { date: '2025-07-10', price: 39000, confidence: 92 },
                  { date: '2025-07-11', price: 43000, confidence: 75 }
                ]}
              />
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">購買判定インジケーター</h3>
              <BuyNowIndicator
                currentPrice={42000}
                predictedPrice={39000}
                confidence={92}
                recommendation="wait"
                reason="3日後に約3,000円安くなる予測"
              />
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/location-search" element={<LocationSearchPage />} />
    </Routes>
  );
};

export default App;