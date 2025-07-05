import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';

// Import simplified components
import { SimpleWatchlistModal } from './components/SimpleWatchlistModal';
import { SimplePersonalizedSection } from './components/SimplePersonalizedSection';
import { SimplePricePrediction } from './components/SimplePricePrediction';

// Mock data
const mockHotel = {
  id: '1',
  name: 'ザ・リッツ・カールトン東京',
  price: 42000,
  image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
  location: '東京都港区'
};

const mockPersonalizedHotels = [
  {
    ...mockHotel,
    reason_tags: ['room_capacity_match', 'price_range_match', 'spa'],
    personalization_score: 85,
    is_personalized: true
  },
  {
    id: '2',
    name: 'パーク ハイアット 東京',
    price: 29750,
    location: '東京都新宿区',
    reason_tags: ['business_center', 'family_rooms'],
    personalization_score: 78,
    is_personalized: true
  }
];

const mockPredictions = [
  { date: '2025-07-05', price: 42000, confidence: 85 },
  { date: '2025-07-06', price: 45000, confidence: 78 },
  { date: '2025-07-07', price: 48000, confidence: 72 },
  { date: '2025-07-08', price: 44000, confidence: 80 },
  { date: '2025-07-09', price: 41000, confidence: 88 },
  { date: '2025-07-10', price: 39000, confidence: 92 },
  { date: '2025-07-11', price: 43000, confidence: 75 }
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
                React版・新機能実装完了
              </span>
            </div>
            <nav className="flex space-x-6">
              <Link to="/" className="text-gray-700 hover:text-gray-900">ホーム</Link>
              <Link to="/features" className="text-gray-700 hover:text-gray-900">新機能デモ</Link>
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
            ✅ ウォッチリスト・パーソナライゼーション・価格予測AI実装完了
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowWatchlist(true)}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              ウォッチリスト機能
            </button>
            <Link
              to="/features"
              className="bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-900 transition-colors"
            >
              新機能デモ
            </Link>
          </div>
        </div>
      </div>

      {/* Implementation Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">🎯 実装完了機能</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">ウォッチリスト機能</h4>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>✅ 価格閾値・曜日指定通知</li>
                <li>✅ 残室数アラート</li>
                <li>✅ iCalカレンダー連携</li>
                <li>✅ 15分間隔監視Cron</li>
              </ul>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-gray-900">パーソナライゼーション</h4>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>✅ 7セグメント自動判定</li>
                <li>✅ 「あなた向け」バッジ</li>
                <li>✅ レコメンドスコア計算</li>
                <li>✅ 理由タグ生成</li>
              </ul>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold text-gray-900">価格予測AI</h4>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>✅ 統計的価格予測</li>
                <li>✅ 7日間推移予測</li>
                <li>✅ 「今買うべき」インジケーター</li>
                <li>✅ ML用データ収集</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Watchlist Modal */}
      {showWatchlist && (
        <SimpleWatchlistModal
          isOpen={showWatchlist}
          onClose={() => setShowWatchlist(false)}
          hotel={mockHotel}
          onSave={(item) => {
            console.log('Watchlist item saved:', item);
            alert('ウォッチリストに追加されました！\n（デモモードのため実際の通知は送信されません）');
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">新機能デモ</h1>
          <p className="text-gray-600">実装されたすべての新機能をご確認いただけます</p>
        </div>

        {/* Personalized Recommendations */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">1. パーソナライズドレコメンデーション</h2>
          <SimplePersonalizedSection
            hotels={mockPersonalizedHotels}
            userSegment="couple"
          />
        </div>

        {/* Price Prediction */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">2. 価格予測・購買インジケーター</h2>
          <SimplePricePrediction
            currentPrice={42000}
            predictions={mockPredictions}
          />
        </div>

        {/* Watchlist Demo */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">3. ウォッチリスト機能</h2>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 mb-4">
              ホテルの価格を監視し、条件に合致した際に通知を送信する機能です。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">設定可能な条件</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 目標価格（◯円以下になったら通知）</li>
                  <li>• 監視する曜日の指定</li>
                  <li>• 残室数アラート</li>
                  <li>• 通知チャネル選択</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">追加機能</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• iCalカレンダー連携</li>
                  <li>• 15分間隔の自動監視</li>
                  <li>• マルチチャネル通知</li>
                  <li>• 価格履歴記録</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
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
    </Routes>
  );
};

export default App;