import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { HotelListing } from './components/HotelListing';
import { RegionalSearch } from './pages/RegionalSearch';
import { SignInModal } from './components/Auth/SignInModal';
import { SignUpModal } from './components/Auth/SignUpModal';
import { UserPreferencesModal } from './components/UserPreferencesModal';
import authService from './services/mockAuth.service';
import apiService from './services/api.service';

// Admin imports - temporarily commented out
// import { AdminLogin } from '../../src/pages/admin/AdminLogin';
// import { AdminDashboard } from '../../src/pages/admin/AdminDashboard';
// import { HotelManagement } from '../../src/pages/admin/HotelManagement';
// import { BookingManagement } from '../../src/pages/admin/BookingManagement';
// import { UserManagement } from '../../src/pages/admin/UserManagement';

interface FilterOptions {
  city: string;
  priceRange: string;
  sortBy: 'discount' | 'price' | 'rating';
}

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deals' | 'luxury'>('luxury');
  const [filters, setFilters] = useState<FilterOptions>({
    city: 'all',
    priceRange: 'all',
    sortBy: 'price'
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState({
    checkin: new Date().toISOString().split('T')[0],
    checkout: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });
  const [showAllSources, setShowAllSources] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    
    // 認証状態の変更を監視
    const { data: authListener } = authService.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkAuthStatus = async () => {
    const user = await authService.getCurrentUser();
    setCurrentUser(user);
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">LastMinuteStay</h1>
              <span className="ml-3 text-sm text-gray-500">高級ホテルの直前予約</span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link 
                to="/regional" 
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                地域から探す
              </Link>
              
              {currentUser ? (
                <>
                  <button 
                    onClick={() => setShowPreferences(true)}
                    className="text-gray-600 hover:text-gray-900"
                    title="お気に入り条件"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </button>
                  <button className="text-gray-600 hover:text-gray-900" title="お気に入り">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  <div className="relative group">
                    <button className="text-gray-600 hover:text-gray-900">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 invisible group-hover:visible">
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        ログアウト
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowSignIn(true)}
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    ログイン
                  </button>
                  <button
                    onClick={() => setShowSignUp(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    新規登録
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section with Search */}
      <div className="relative bg-gradient-to-r from-blue-900 to-purple-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-3">高級ホテルをお得に予約</h2>
          <p className="text-xl mb-8 text-blue-100">リッツ・カールトン、ブセナテラスなど人気の高級ホテルが最大50%OFF</p>
          
          {/* Date Selection */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-1">チェックイン</label>
                <input
                  type="date"
                  value={selectedDate.checkin}
                  onChange={(e) => setSelectedDate({...selectedDate, checkin: e.target.value})}
                  className="w-full px-3 py-2 rounded-md text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">チェックアウト</label>
                <input
                  type="date"
                  value={selectedDate.checkout}
                  onChange={(e) => setSelectedDate({...selectedDate, checkout: e.target.value})}
                  className="w-full px-3 py-2 rounded-md text-gray-900"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="w-full bg-white text-blue-600 px-4 py-2 rounded-md font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  フィルター
                </button>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <div className="bg-white text-gray-900 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">エリア</label>
                  <select
                    value={filters.city}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">すべてのエリア</option>
                    <option value="tokyo">東京</option>
                    <option value="osaka">大阪</option>
                    <option value="kyoto">京都</option>
                    <option value="hokkaido">北海道</option>
                    <option value="okinawa">沖縄</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">価格帯</label>
                  <select
                    value={filters.priceRange}
                    onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">すべての価格</option>
                    <option value="under20000">〜¥20,000</option>
                    <option value="20000-40000">¥20,000〜¥40,000</option>
                    <option value="40000-60000">¥40,000〜¥60,000</option>
                    <option value="over60000">¥60,000〜</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">並び順</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({...filters, sortBy: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="discount">割引率が高い順</option>
                    <option value="price">価格が安い順</option>
                    <option value="rating">評価が高い順</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Featured Hotels Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-2 mb-2 md:mb-0">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <h3 className="text-lg font-bold text-gray-800">今空いている人気の高級ホテル</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('luxury')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'luxury'
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
              >
                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                高級ホテル
              </button>
              <button
                onClick={() => setActiveTab('deals')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'deals'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
              >
                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zM4 4a1 1 0 011-1h10a1 1 0 011 1v12.586l-2.5-1.429-3.5 2-3.5-2L4 16.586V4z" clipRule="evenodd" />
                </svg>
                直前割引
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multiple Sources Banner */}
      <div className="bg-blue-50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-600">提携サイト:</span>
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-red-600">楽天トラベル</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">アゴダ</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">Booking.com</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">Expedia</span>
                {showAllSources && (
                  <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                    全サイト検索中
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAllSources(!showAllSources)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showAllSources ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showAllSources ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {showAllSources ? '全サイト検索ON' : '楽天のみ'}
              </span>
              <span className="text-gray-400">|</span>
              <Link
                to="/regional"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                地域別に探す →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Featured Properties */}
        {activeTab === 'luxury' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">おすすめの高級ホテル</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">人気順</span>
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'ザ・リッツ・カールトン東京', location: '六本木' },
                { name: 'ザ・ブセナテラス', location: '沖縄' },
                { name: 'マンダリン オリエンタル', location: '日本橋' },
                { name: 'フォーシーズンズ京都', location: '京都' }
              ].map((hotel, idx) => (
                <div key={idx} className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="text-sm font-semibold">{hotel.name}</div>
                  <div className="text-xs text-gray-600">{hotel.location}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Minute Deals Banner */}
        {activeTab === 'deals' && (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg p-4 mb-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-8 h-8 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zM4 4a1 1 0 011-1h10a1 1 0 011 1v12.586l-2.5-1.429-3.5 2-3.5-2L4 16.586V4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-bold text-lg">本日のスペシャルオファー</h3>
                  <p className="text-sm">チェックイン3日前までの予約で最大50%割引！</p>
                </div>
              </div>
              <div className="text-2xl font-bold">
                最大 -50%
              </div>
            </div>
          </div>
        )}

        {/* Section Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {activeTab === 'luxury' ? '人気の高級ホテル' : '直前割引ホテル'}
          </h2>
          <p className="text-gray-600">
            {activeTab === 'luxury' 
              ? 'リッツ・カールトン、ブセナテラスなど、今空いている高級ホテル'
              : 'チェックイン3日前までの予約で最大半額に'}
          </p>
        </div>

        {/* Hotel Listings */}
        <HotelListing
          type={activeTab === 'deals' ? 'lastMinute' : 'luxury'}
          city={filters.city !== 'all' ? filters.city : undefined}
          checkinDate={selectedDate.checkin}
          checkoutDate={selectedDate.checkout}
          useAggregator={showAllSources}
        />
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold mb-4">LastMinuteStay</h4>
              <p className="text-sm text-gray-400">
                高級ホテルの直前予約で、特別な体験をお得に。
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">人気エリア</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li><a href="#" className="hover:text-white">東京のホテル</a></li>
                <li><a href="#" className="hover:text-white">大阪のホテル</a></li>
                <li><a href="#" className="hover:text-white">京都のホテル</a></li>
                <li><a href="#" className="hover:text-white">沖縄のホテル</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">サービス</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li><a href="#" className="hover:text-white">会員登録</a></li>
                <li><a href="#" className="hover:text-white">お気に入り</a></li>
                <li><a href="#" className="hover:text-white">価格アラート</a></li>
                <li><a href="#" className="hover:text-white">よくある質問</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">お問い合わせ</h4>
              <p className="text-sm text-gray-400 mb-4">
                24時間365日対応
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2025 LastMinuteStay. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <SignInModal
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSuccess={() => {
          setShowSignIn(false);
          checkAuthStatus();
        }}
        onSignUpClick={() => setShowSignUp(true)}
      />
      
      <SignUpModal
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSuccess={() => {
          setShowSignUp(false);
          checkAuthStatus();
        }}
      />
      
      {currentUser && (
        <UserPreferencesModal
          isOpen={showPreferences}
          onClose={() => setShowPreferences(false)}
          userId={currentUser.id}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/regional" element={<RegionalSearch />} />
      {/* Admin routes temporarily disabled
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/hotels" element={<HotelManagement />} />
      <Route path="/admin/bookings" element={<BookingManagement />} />
      <Route path="/admin/users" element={<UserManagement />} />
      */}
    </Routes>
  );
};

export default App;