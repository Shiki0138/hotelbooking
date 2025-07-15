import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

// エラーハンドリング
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  document.body.innerHTML = `
    <div style="padding: 20px; background: #fee2e2; color: #dc2626; border-radius: 8px; margin: 20px;">
      <h1>エラーが発生しました</h1>
      <p>エラー: ${event.error?.message || 'Unknown error'}</p>
      <button onclick="location.reload()" style="padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 16px;">
        ページを再読み込み
      </button>
    </div>
  `;
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('Starting React app...');
import { DealsBanner } from './components/DealsBanner';
import { SwipeableHotelCarousel } from './components/SwipeableHotelCarousel';
import { MobileFilters } from './components/MobileFilters';
import { HotelCardEnhanced } from './components/HotelCardEnhanced';
import { HotelDetailModal } from './components/HotelDetailModal';
import DatePicker from './components/DatePicker';
import AuthModal from './components/AuthModal';
import MyPage from './components/MyPage';
import { authService, favoritesService } from './services/supabase';
import { hotelData } from './data/hotelData';
import { luxuryHotelsData } from './data/hotelDataLuxury';
import { HotelImageService } from './services/hotelImageService';
import { motion, AnimatePresence } from 'framer-motion';
import './styles/enhanced.css';

const { useState, useEffect, useMemo, createElement: e } = React;

const App = () => {
  const [selectedDates, setSelectedDates] = useState({
    checkin: new Date().toISOString().split('T')[0],
    checkout: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [showMyPage, setShowMyPage] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: 'all',
    hotelType: 'all',
    sortBy: 'recommended',
    rating: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [showHotelDetail, setShowHotelDetail] = useState(false);

  // レスポンシブ対応
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ユーザー情報を確認
  useEffect(() => {
    checkUser();
    loadHotelImages();
  }, []);

  const checkUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        const favorites = await favoritesService.getUserFavorites();
        setUserFavorites(favorites);
      }
    } catch (error) {
      console.error('Failed to check user:', error);
    }
  };

  const loadHotelImages = async () => {
    const allHotels = [...luxuryHotelsData, ...hotelData];
    const uniqueHotels = Array.from(new Map(allHotels.map(h => [h.id, h])).values());
    
    // 画像を非同期で読み込み
    HotelImageService.preloadImages(uniqueHotels.slice(0, 20));
  };

  // お気に入りトグル
  const handleToggleFavorite = async (hotelId: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    try {
      if (userFavorites.includes(hotelId)) {
        await favoritesService.removeFavorite(hotelId);
        setUserFavorites(prev => prev.filter(id => id !== hotelId));
      } else {
        await favoritesService.addFavorite(hotelId);
        setUserFavorites(prev => [...prev, hotelId]);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // ホテルのフィルタリング
  const filteredHotels = useMemo(() => {
    let hotels = [...luxuryHotelsData, ...hotelData];
    
    // 重複除去
    const uniqueHotels = Array.from(new Map(hotels.map(h => [h.id, h])).values());
    
    // 検索フィルター
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      hotels = uniqueHotels.filter(h => 
        h.name.toLowerCase().includes(query) ||
        h.location.toLowerCase().includes(query)
      );
    } else {
      hotels = uniqueHotels;
    }
    
    // 価格フィルター
    if (filters.priceRange !== 'all') {
      hotels = hotels.filter(h => {
        switch (filters.priceRange) {
          case 'budget': return h.price < 10000;
          case 'mid': return h.price >= 10000 && h.price < 30000;
          case 'luxury': return h.price >= 30000;
          default: return true;
        }
      });
    }
    
    // ソート
    switch (filters.sortBy) {
      case 'price_low':
        hotels.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        hotels.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        hotels.sort((a, b) => b.rating - a.rating);
        break;
    }
    
    return hotels;
  }, [searchQuery, filters]);

  // おすすめホテル（AI予測で価格が下がると予想されるホテル）
  const recommendedHotels = filteredHotels.slice(0, 10);
  
  // お得なホテル
  const dealHotels = filteredHotels.filter(h => h.discountPercentage && h.discountPercentage > 20);

  const handleHotelClick = (hotel: any) => {
    setSelectedHotel(hotel);
    setShowHotelDetail(true);
  };

  const handleAuthSuccess = async (user: any) => {
    setCurrentUser(user);
    const favorites = await favoritesService.getUserFavorites();
    setUserFavorites(favorites);
    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setCurrentUser(null);
      setUserFavorites([]);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <div className="app-container">
      {/* タイムセールバナー */}
      <DealsBanner />
      
      {/* ヘッダー */}
      <header className="header">
        <div className="header-content">
          <div className="header-logo">
            <h1>LMS</h1>
            <span className="header-tagline">AIで見つける最安値</span>
          </div>
          
          <nav className="header-nav">
            {currentUser ? (
              <>
                <button 
                  onClick={() => setShowMyPage(true)}
                  className="header-user-button"
                >
                  {currentUser.email}
                </button>
                <button 
                  onClick={handleSignOut}
                  className="header-signout-button"
                >
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => {
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                  className="header-signin-button"
                >
                  ログイン
                </button>
                <button 
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="header-signup-button"
                >
                  新規登録
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="hero">
        <div className="hero-content">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hero-title"
          >
            AIが教える、ホテルの底値
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="hero-subtitle"
          >
            価値あるホテルを、最高のタイミングで
          </motion.p>

          {/* 検索ボックス */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="search-box"
          >
            <input
              type="text"
              placeholder="ホテル名・エリアで検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            
            <DatePicker
              selectedDates={selectedDates}
              onDatesChange={setSelectedDates}
              className="date-picker"
            />
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="search-button"
            >
              🔍 検索
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* モバイルフィルター */}
      {isMobile && (
        <MobileFilters 
          onFilterChange={setFilters}
          selectedDates={selectedDates}
        />
      )}

      {/* おすすめホテルカルーセル */}
      <SwipeableHotelCarousel
        title="🤖 AIおすすめ！今が予約チャンス"
        hotels={recommendedHotels}
        selectedDates={selectedDates}
        favorites={userFavorites}
        onToggleFavorite={handleToggleFavorite}
        currentUser={currentUser}
        onHotelClick={handleHotelClick}
      />

      {/* お得なホテルカルーセル */}
      {dealHotels.length > 0 && (
        <SwipeableHotelCarousel
          title="🔥 期間限定！特別割引"
          hotels={dealHotels}
          selectedDates={selectedDates}
          favorites={userFavorites}
          onToggleFavorite={handleToggleFavorite}
          currentUser={currentUser}
          onHotelClick={handleHotelClick}
        />
      )}

      {/* 全ホテル一覧（デスクトップ） */}
      {!isMobile && (
        <section className="hotel-grid-section">
          <div className="container">
            <h2 className="section-title">すべてのホテル</h2>
            <div className="hotel-grid">
              {filteredHotels.map(hotel => (
                <HotelCardEnhanced
                  key={hotel.id}
                  hotel={hotel}
                  selectedDates={selectedDates}
                  isFavorite={userFavorites.includes(hotel.id)}
                  onToggleFavorite={handleToggleFavorite}
                  currentUser={currentUser}
                  onHotelClick={handleHotelClick}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* モーダル */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            mode={authMode}
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
          />
        )}
        
        {showMyPage && (
          <MyPage
            user={currentUser}
            favorites={userFavorites}
            onClose={() => setShowMyPage(false)}
          />
        )}
        
        {showHotelDetail && selectedHotel && (
          <HotelDetailModal
            hotel={selectedHotel}
            selectedDates={selectedDates}
            isOpen={showHotelDetail}
            onClose={() => setShowHotelDetail(false)}
            currentUser={currentUser}
            favorites={userFavorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// アプリケーションのマウント
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(React.createElement(App));