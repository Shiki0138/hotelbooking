import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../components/Demo/UserAuth';
import AuthForm from '../components/Demo/UserAuth';
import Dashboard from '../components/Demo/Dashboard';
import WatchlistManager from '../components/Demo/Watchlist';

const DemoContent: React.FC = () => {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'dashboard' | 'watchlist'>('home');

  const sampleHotels = [
    {
      id: '1',
      name: '東京グランドホテル',
      address: '東京都千代田区丸の内1-1-1',
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
      minPrice: 15000,
      rating: 4.5,
    },
    {
      id: '2', 
      name: '大阪ビジネスホテル',
      address: '大阪府大阪市北区梅田2-2-2',
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80',
      minPrice: 8000,
      rating: 4.2,
    },
    {
      id: '3',
      name: '京都伝統旅館',
      address: '京都府京都市東山区清水3-3-3',
      imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80',
      minPrice: 25000,
      rating: 4.8,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-bold text-blue-600">LastMinuteStay Demo</h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveView('home')}
                  className={`px-3 py-2 rounded ${activeView === 'home' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  ホーム
                </button>
                {user && (
                  <>
                    <button
                      onClick={() => setActiveView('watchlist')}
                      className={`px-3 py-2 rounded ${activeView === 'watchlist' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      ウォッチリスト
                    </button>
                    <button
                      onClick={() => setActiveView('dashboard')}
                      className={`px-3 py-2 rounded ${activeView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      マイページ
                    </button>
                  </>
                )}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">ようこそ、{user.name}さん</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  ログイン / 登録
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeView === 'home' && (
          <div>
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                最高のホテルを最安値で
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                価格アラート機能で、お気に入りのホテルが安くなったときに即座に通知
              </p>
              {!user && (
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700"
                >
                  無料で始める
                </button>
              )}
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="text-center p-6 bg-white rounded-lg shadow">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold mb-2">簡単検索</h3>
                <p className="text-gray-600">エリア、価格帯、日程で簡単にホテルを検索</p>
              </div>
              <div className="text-center p-6 bg-white rounded-lg shadow">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-lg font-semibold mb-2">ウォッチリスト</h3>
                <p className="text-gray-600">気になるホテルをお気に入りに追加して価格をチェック</p>
              </div>
              <div className="text-center p-6 bg-white rounded-lg shadow">
                <div className="text-4xl mb-4">📧</div>
                <h3 className="text-lg font-semibold mb-2">価格アラート</h3>
                <p className="text-gray-600">希望価格になったときに自動でメール通知</p>
              </div>
            </div>

            {/* Sample Hotels */}
            <div>
              <h3 className="text-2xl font-bold mb-6">人気のホテル</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sampleHotels.map((hotel) => (
                  <div key={hotel.id} className="bg-white rounded-lg shadow overflow-hidden">
                    <img
                      src={hotel.imageUrl}
                      alt={hotel.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h4 className="font-semibold text-lg mb-2">{hotel.name}</h4>
                      <p className="text-gray-600 text-sm mb-2">{hotel.address}</p>
                      
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                          <span className="text-yellow-400">
                            {'★'.repeat(Math.floor(hotel.rating))}
                          </span>
                          <span className="ml-1 text-sm text-gray-600">{hotel.rating}</span>
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                          ¥{hotel.minPrice.toLocaleString()}〜
                        </div>
                      </div>

                      {user ? (
                        <WatchlistManager hotel={hotel} />
                      ) : (
                        <button
                          onClick={() => setShowAuth(true)}
                          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                        >
                          価格アラートを設定
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'watchlist' && user && (
          <div>
            <h2 className="text-2xl font-bold mb-6">ウォッチリスト管理</h2>
            <WatchlistManager />
          </div>
        )}

        {activeView === 'dashboard' && user && <Dashboard />}
      </main>

      {/* Auth Modal */}
      {showAuth && !user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative">
            <AuthForm onClose={() => setShowAuth(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

const DemoPage: React.FC = () => {
  return (
    <AuthProvider>
      <DemoContent />
    </AuthProvider>
  );
};

export default DemoPage;