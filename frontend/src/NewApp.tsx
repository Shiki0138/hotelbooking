import React, { useState, useEffect } from 'react';
import { UserTypeSelector } from './components/UserTypeSelector';
import { DateFixedSearch } from './components/DateFixedSearch';
import { DealSeekerSearch } from './components/DealSeekerSearch';
import { WeekendDeals } from './components/WeekendDeals';
import { HotelPriceComparison } from './components/HotelPriceComparison';
import { authService, favoritesService } from './services/supabase';
import { hotelData } from './data/hotelData';
import { luxuryHotelsData } from './data/hotelDataLuxury';
import AuthModal from './components/AuthModal';
import MyPage from './components/MyPage';

const NewApp: React.FC = () => {
  const [userType, setUserType] = useState<'date-fixed' | 'deal-seeker' | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(true);
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  const [selectedHotelForComparison, setSelectedHotelForComparison] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [showMyPage, setShowMyPage] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{checkin: string, checkout: string} | null>({
    checkin: new Date().toISOString().split('T')[0],
    checkout: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        loadUserFavorites();
      }
    } catch (error) {
      console.error('Failed to check user:', error);
    }
  };

  const loadUserFavorites = async () => {
    try {
      const favorites = await favoritesService.getUserFavorites();
      setUserFavorites(favorites.map((fav: any) => fav.hotel_id));
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const handleUserTypeSelect = (type: 'date-fixed' | 'deal-seeker') => {
    setUserType(type);
    setShowTypeSelector(false);
  };

  const handleBackToTypeSelector = () => {
    setShowTypeSelector(true);
    setUserType(null);
    setSearchResults([]);
  };

  const handleSearch = async (searchParams: any) => {
    setSearchLoading(true);
    try {
      setTimeout(() => {
        const mockResults = searchParams.searchType === 'date-fixed' 
          ? hotelData.slice(0, 15) 
          : luxuryHotelsData.slice(0, 15);
        setSearchResults(mockResults);
        setSearchLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchLoading(false);
    }
  };

  const handleHotelSelect = (hotel: any) => {
    setSelectedHotelForComparison(hotel);
    setShowPriceComparison(true);
  };

  const handleClosePriceComparison = () => {
    setShowPriceComparison(false);
    setSelectedHotelForComparison(null);
  };

  const handleBooking = (provider: string, url: string) => {
    console.log(`Booking with ${provider}: ${url}`);
    window.open(url, '_blank');
  };

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleMyPage = () => {
    setShowMyPage(true);
  };

  const handleCloseMyPage = () => {
    setShowMyPage(false);
  };

  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    loadUserFavorites();
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setCurrentUser(null);
      setUserFavorites([]);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const Header = () => (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
      padding: '12px 20px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer'
        }} onClick={handleBackToTypeSelector}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#E8B4B8',
            margin: 0
          }}>
            🏨 HotelSearch
          </h1>
        </div>
        
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {currentUser ? (
            <>
              <button
                onClick={handleMyPage}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
                  border: 'none',
                  borderRadius: '20px',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                マイページ
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: '1px solid #E8B4B8',
                  borderRadius: '20px',
                  color: '#E8B4B8',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSignIn}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: '1px solid #E8B4B8',
                  borderRadius: '20px',
                  color: '#E8B4B8',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                ログイン
              </button>
              <button
                onClick={handleSignUp}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
                  border: 'none',
                  borderRadius: '20px',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                新規登録
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );

  const SearchResultsPage = () => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)',
      padding: '20px'
    }}>
      <Header />
      
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        paddingTop: '40px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '30px'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '500',
            color: '#4A4A4A',
            margin: 0
          }}>
            検索結果
          </h2>
          <button
            onClick={handleBackToTypeSelector}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '20px',
              color: '#4A4A4A',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
          >
            新しい検索
          </button>
        </div>

        <WeekendDeals onHotelSelect={handleHotelSelect} />

        {searchLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px'
          }}>
            <div style={{
              fontSize: '1.2rem',
              color: '#666'
            }}>
              検索中...
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginTop: '40px'
          }}>
            {searchResults.map((hotel, index) => (
              <div
                key={hotel.id}
                onClick={() => handleHotelSelect(hotel)}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s',
                  ':hover': {
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '500',
                  color: '#4A4A4A',
                  marginBottom: '8px'
                }}>
                  {hotel.name}
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#666',
                  marginBottom: '12px'
                }}>
                  📍 {hotel.location}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#E8B4B8'
                  }}>
                    ¥{hotel.price?.toLocaleString() || '要確認'}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#666'
                  }}>
                    価格比較 →
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (showTypeSelector) {
    return <UserTypeSelector onUserTypeSelect={handleUserTypeSelect} />;
  }

  if (userType === 'date-fixed' && searchResults.length === 0) {
    return <DateFixedSearch onSearch={handleSearch} onBack={handleBackToTypeSelector} />;
  }

  if (userType === 'deal-seeker' && searchResults.length === 0) {
    return <DealSeekerSearch onSearch={handleSearch} onBack={handleBackToTypeSelector} />;
  }

  return (
    <>
      <SearchResultsPage />
      
      {showPriceComparison && selectedHotelForComparison && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={handleClosePriceComparison}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              borderBottom: '1px solid #E0E0E0'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '500',
                color: '#4A4A4A',
                margin: 0
              }}>
                価格比較・予約
              </h3>
              <button
                onClick={handleClosePriceComparison}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '0' }}>
              <HotelPriceComparison
                hotelName={selectedHotelForComparison.name}
                checkIn={selectedDates?.checkin || ''}
                checkOut={selectedDates?.checkout || ''}
                onSelectOTA={handleBooking}
              />
            </div>
          </div>
        </div>
      )}

      {showMyPage && (
        <MyPage
          currentUser={currentUser}
          onClose={handleCloseMyPage}
          onSignOut={handleSignOut}
        />
      )}

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
};

export default NewApp;