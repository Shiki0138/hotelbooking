// Enhanced Homepage with world-class UI/UX improvements
import React, { useState, useEffect } from 'react';
import { 
  HotelCardSkeleton, 
  PremiumSpinner, 
  StageProgressBar,
  ImageWithSkeleton
} from '../components/Loading/LoadingComponents';
import { 
  ResponsiveContainer, 
  ResponsiveGrid, 
  ResponsiveNavigation,
  ResponsiveHero,
  ResponsiveSearchBar,
  ResponsiveCard,
  ResponsiveFooter
} from '../components/Layout/ResponsiveLayout';
import { 
  AccessibilityProvider, 
  SkipNavigation,
  AccessibilitySettings,
  useAnnouncer,
  useFocusManagement
} from '../utils/accessibility/AccessibilityManager';
import {
  PageEntranceAnimation,
  StaggeredContainer,
  StaggeredItem,
  ScrollReveal,
  PremiumHoverCard,
  MorphingButton,
  TextReveal,
  MagneticElement
} from '../components/Animation/MotionComponents';
import {
  OptimizedImage,
  DebouncedSearchInput,
  LazyComponent
} from '../components/Performance/OptimizedComponents';
import LazyImage from '../components/Image/LazyImage';
import { generateSrcSet, generateSizes, preloadCriticalImages } from '../utils/imageOptimization';
import { hotelService } from '../services/api/HotelService';
import GoogleMapsWrapper from '../components/Maps/GoogleMapsWrapper';
import {
  HotelRoom3D,
  ARRoomVisualizer,
  PanoramaViewer
} from '../components/3D/ImmersiveComponents';
import VoiceSearchComponent from '../components/VoiceSearch/VoiceSearchComponent';
import EnhancedBookingFlow from '../components/Booking/EnhancedBookingFlow';
import Header from '../components/Header';
import { PersonalizedSection } from '../components/PersonalizedRecommendations';
import { motion } from 'framer-motion';
import './HomePage.css';
import './HomePage_Enhanced.css';

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStage, setSearchStage] = useState(0);
  const [searchProgress, setSearchProgress] = useState(0);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const [show3DView, setShow3DView] = useState(false);
  const [showARView, setShowARView] = useState(false);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [voiceSearchEnabled, setVoiceSearchEnabled] = useState(true);
  const [searchError, setSearchError] = useState('');

  const { announceSearch, announceLoading } = useAnnouncer();
  const { manageFocus } = useFocusManagement();
  
  // Preload critical hero images
  useEffect(() => {
    const heroImages = mockHotels.slice(0, 3).map(hotel => ({
      src: hotel.image,
      srcSet: generateSrcSet(hotel.image),
      sizes: generateSizes()
    }));
    preloadCriticalImages(heroImages);
  }, []);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      announceLoading(false, 'ページ');
    }, 2000);

    announceLoading(true, 'ページ');
    return () => clearTimeout(timer);
  }, [announceLoading]);

  // Mock data
  const mockHotels = [
    {
      id: 1,
      name: '東京ステーションホテル',
      location: '東京駅',
      price: 25000,
      originalPrice: 35000,
      discount: 30,
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
      amenities: ['WiFi', '駐車場', '朝食'],
      isLuxury: true
    },
    {
      id: 2,
      name: '新宿グランドホテル',
      location: '新宿',
      price: 18000,
      originalPrice: 24000,
      discount: 25,
      rating: 4.2,
      image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80',
      amenities: ['WiFi', 'ジム', 'プール'],
      isNew: true
    },
    {
      id: 3,
      name: '渋谷エクセルホテル',
      location: '渋谷',
      price: 22000,
      originalPrice: 32000,
      discount: 31,
      rating: 4.3,
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
      amenities: ['WiFi', '朝食', 'スパ'],
      isPopular: true
    }
  ];

  const searchStages = [
    'エリア検索',
    'ホテル検索',
    '価格比較',
    '空室確認',
    '結果表示'
  ];


  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSearchLoading(true);
    setSearchStage(0);
    setSearchProgress(0);
    setSearchError('');

    announceSearch(query, 0);

    try {
      // 🚀 OPTIMIZED SEARCH - Target: <300ms with streaming
      const OptimizedHotelSearchService = (await import('../services/OptimizedHotelSearchService.js')).default;
      
      const searchParams = {
        location: { name: query },
        checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        checkOut: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        guests: 2
      };

      // Streaming search with progressive results
      const results = await OptimizedHotelSearchService.searchHotels(searchParams, {
        streaming: true,
        onPartialResults: (partialResults, source) => {
          // Show partial results immediately for better UX
          if (partialResults.length > 0) {
            setHotels(partialResults);
            setSearchProgress(source === 'cache' ? 30 : source === 'instant' ? 50 : 80);
            setSearchStage(source === 'cache' ? 1 : source === 'instant' ? 2 : 3);
          }
        },
        onComplete: (finalResults) => {
          setHotels(finalResults);
          setSearchProgress(100);
          setSearchStage(4);
          setSearchLoading(false);
          announceSearch(query, finalResults.length);
        },
        onError: (error) => {
          console.warn('Optimized search failed:', error);
          // Fallback to mock data
          const filteredHotels = mockHotels.filter(hotel =>
            hotel.name.toLowerCase().includes(query.toLowerCase()) ||
            hotel.location.toLowerCase().includes(query.toLowerCase())
          );
          setHotels(filteredHotels.length > 0 ? filteredHotels : mockHotels);
          setSearchLoading(false);
          announceSearch(query, filteredHotels.length || mockHotels.length);
        }
      });

      // If not using streaming, handle the results directly
      if (results) {
        setHotels(results);
        setSearchLoading(false);
        announceSearch(query, results.length);
      }

    } catch (error) {
      console.warn('Search optimization failed, using fallback:', error);
      setSearchError(error.message);
      setSearchLoading(false);
      
      // Enhanced fallback with mock data
      const filteredHotels = mockHotels.filter(hotel =>
        hotel.name.toLowerCase().includes(query.toLowerCase()) ||
        hotel.location.toLowerCase().includes(query.toLowerCase())
      );

      setHotels(filteredHotels.length > 0 ? filteredHotels : mockHotels);
      announceSearch(query, filteredHotels.length || mockHotels.length);
      
      // Try to load featured hotels as final fallback
      try {
        const featuredHotels = await hotelService.getFeaturedHotels();
        setHotels(featuredHotels);
      } catch (fallbackError) {
        setHotels(mockHotels);
      }
    }
  };

  // Voice search handler
  const handleVoiceSearchResult = (transcript, confidence) => {
    if (confidence > 0.6) {
      handleSearch(transcript);
    } else {
      setSearchError(`音声認識の信頼度が低いです (${Math.round(confidence * 100)}%). もう一度お試しください。`);
    }
  };

  const handleVoiceSearchError = (error) => {
    setSearchError(`音声検索エラー: ${error.message}`);
  };

  // Enhanced Booking handlers with improved UX
  const handleBookingStart = (hotel) => {
    console.log('予約開始:', hotel);
    if (hotel && hotel.id && !hotel.isSoldOut) {
      setSelectedHotel(hotel);
      setShowBookingFlow(true);
      // Enhanced UX feedback
      announceSearch(`${hotel.name}の予約を開始します`, 1);
    } else if (hotel.isSoldOut) {
      setSearchError('申し訳ございません。このホテルは満室です。');
    } else {
      console.error('ホテル情報が不正です');
      setSearchError('ホテル情報の取得に失敗しました');
    }
  };

  const handleBookingComplete = (bookingResult) => {
    console.log('Booking completed:', bookingResult);
    setShowBookingFlow(false);
    setSelectedHotel(null);
    // Enhanced success feedback
    announceSearch('予約が完了しました！確認メールをお送りしました。', 1);
    
    // Clear any existing errors
    setSearchError('');
  };

  const handleBookingError = (error) => {
    console.error('Booking error:', error);
    setSearchError(`予約エラー: ${error.message}`);
  };

  const navigationItems = [
    { href: '#home', label: 'ホーム', active: true, icon: '🏠' },
    { href: '#search', label: '検索', icon: '🔍' },
    { href: '#deals', label: 'お得情報', icon: '💰' },
    { href: '#support', label: 'サポート', icon: '❓' }
  ];

  const footerSections = [
    {
      title: 'サービス',
      links: [
        { href: '#hotels', label: 'ホテル検索' },
        { href: '#deals', label: 'お得なプラン' },
        { href: '#last-minute', label: 'ラストミニッツ' }
      ]
    },
    {
      title: 'サポート',
      links: [
        { href: '#help', label: 'ヘルプ' },
        { href: '#contact', label: 'お問い合わせ' },
        { href: '#faq', label: 'よくある質問' }
      ]
    },
    {
      title: '会社情報',
      links: [
        { href: '#about', label: '会社概要' },
        { href: '#privacy', label: 'プライバシー' },
        { href: '#terms', label: '利用規約' }
      ]
    }
  ];

  const socialLinks = [
    { href: '#', icon: '📘', label: 'Facebook' },
    { href: '#', icon: '🐦', label: 'Twitter' },
    { href: '#', icon: '📷', label: 'Instagram' }
  ];

  if (loading) {
    return (
      <PageEntranceAnimation>
        <div className="homepage-loading">
          <PremiumSpinner size="large" message="LastMinuteStayを準備中..." />
          <TextReveal 
            text="世界最高水準のホテル体験をお届けします" 
            className="loading-subtitle"
          />
        </div>
      </PageEntranceAnimation>
    );
  }

  return (
    <AccessibilityProvider>
      <PageEntranceAnimation>
        <div className="homepage">
          <SkipNavigation />
          
          {/* Header with Dark Mode Toggle */}
          <Header showThemeToggle={true} sticky={true} />

        {/* Main Content */}
        <main id="main-content">
          {/* Hero Section */}
          <section className="hero-section" aria-label="メインビジュアル">
            <div className="hero-background">
              <div className="hero-gradient-layer"></div>
              <div className="hero-pattern-layer"></div>
              <div className="hero-glow-effect"></div>
            </div>
            
            <ResponsiveHero
              className="custom-hero"
              title={<>
                <span className="hero-title-accent">30秒</span>で決められる
                <span className="hero-title-main">ホテル予約</span>
              </>}
              subtitle={<>
                <span className="hero-subtitle-line1">ラストミニッツだからこその特別価格</span>
                <span className="hero-subtitle-line2">今すぐ、理想の宿泊体験を</span>
              </>}
              height="80vh"
              minHeight="600px"
              actions={
                <div className="hero-content-wrapper">
                  <div className="hero-search-container">
                    <div className="search-glow-effect"></div>
                    
                    {/* Enhanced Search Bar with Voice Integration */}
                    <div className="enhanced-search-wrapper">
                      <ResponsiveSearchBar
                        className="premium-search-bar"
                        onSearch={handleSearch}
                        placeholder="行き先・ホテル名・エリアを検索..."
                        suggestions={[
                          { text: '東京駅周辺', icon: '🌆' },
                          { text: '新宿エリア', icon: '🏙️' },
                          { text: '渋谷・原宿', icon: '🛍️' },
                          { text: '横浜みなとみらい', icon: '🌉' },
                          { text: '京都・祇園', icon: '⛩️' }
                        ]}
                      />
                      
                      {/* Voice Search Toggle */}
                      <div className="voice-search-toggle">
                        <motion.button
                          className={`voice-toggle-btn ${voiceSearchEnabled ? 'active' : ''}`}
                          onClick={() => setVoiceSearchEnabled(!voiceSearchEnabled)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {voiceSearchEnabled ? '🎤' : '🔇'}
                        </motion.button>
                      </div>
                    </div>
                    
                    {/* Voice Search Component */}
                    {voiceSearchEnabled && (
                      <motion.div
                        className="voice-search-section"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <VoiceSearchComponent
                          onSearchResult={handleVoiceSearchResult}
                          onError={handleVoiceSearchError}
                          placeholder="音声でホテルを検索してください..."
                          className="hero-voice-search"
                          maxRetries={3}
                          retryDelay={1500}
                          noiseThreshold={0.01}
                          silenceTimeout={4000}
                        />
                      </motion.div>
                    )}
                    
                    {/* Search Error Display */}
                    {searchError && (
                      <motion.div
                        className="search-error-banner"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <span className="error-icon">⚠️</span>
                        <span className="error-text">{searchError}</span>
                        <button 
                          className="error-dismiss"
                          onClick={() => setSearchError('')}
                        >
                          ✕
                        </button>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="hero-stats">
                    <div className="stat-item">
                      <span className="stat-number">50%</span>
                      <span className="stat-label">割引率</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">1万+</span>
                      <span className="stat-label">提携ホテル</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">98%</span>
                      <span className="stat-label">満足度</span>
                    </div>
                  </div>
                </div>
              }
            />
            
            <div className="hero-scroll-indicator" aria-hidden="true">
              <div className="scroll-mouse">
                <div className="scroll-wheel"></div>
              </div>
              <span className="scroll-text">Scroll</span>
            </div>
          </section>

          <ResponsiveContainer>
            {/* Search Progress */}
            {searchLoading && (
              <section className="search-progress" aria-live="polite">
                <StageProgressBar
                  currentStage={searchStage}
                  stages={searchStages}
                  progress={searchProgress}
                />
              </section>
            )}

            {/* Personalized Recommendations */}
            <ScrollReveal>
              <PersonalizedSection />
            </ScrollReveal>

            {/* Demo Personalized Recommendations for non-logged in users */}
            <ScrollReveal>
              <section className="demo-personalized-section" aria-label="デモ：パーソナライズされたおすすめ">
                <div className="demo-banner">
                  <span className="demo-icon">🎯</span>
                  <span className="demo-text">デモ：セグメント別パーソナライゼーション機能</span>
                </div>
                <PersonalizedSection demoMode={true} />
              </section>
            </ScrollReveal>

            {/* Hotel Results */}
            <ScrollReveal>
              <section 
                id="search-results" 
                className="hotels-section"
                aria-label="検索結果"
              >
                <TextReveal text="おすすめホテル" className="section-title" />
                
                {searchLoading ? (
                  <HotelCardSkeleton count={6} />
                ) : (
                  <>
                    {/* Hotel Map Integration */}
                    {hotels.length > 0 && (
                      <div className="hotels-map-section" style={{ marginBottom: '2rem' }}>
                        <GoogleMapsWrapper
                          hotels={hotels.map(hotel => ({
                            ...hotel,
                            location: hotel.coordinates ? {
                              lat: hotel.coordinates.lat,
                              lng: hotel.coordinates.lng
                            } : undefined
                          }))}
                          height="300px"
                          onHotelSelect={(hotel) => {
                            setSelectedHotel(hotel);
                            setShowBookingFlow(true);
                          }}
                          showUserLocation={true}
                          enableDirections={true}
                          enablePlacesSearch={true}
                          className="hotel-results-map"
                        />
                      </div>
                    )}
                    
                    <StaggeredContainer>
                      <ResponsiveGrid
                        columns={{ mobile: 1, tablet: 2, desktop: 3 }}
                        gap="24px"
                      >
                        {hotels.map((hotel) => (
                          <StaggeredItem key={hotel.id}>
                            <HotelCard hotel={hotel} />
                          </StaggeredItem>
                        ))}
                      </ResponsiveGrid>
                    </StaggeredContainer>
                  </>
                )}
              </section>
            </ScrollReveal>

            {/* 3D Hotel Experience Section */}
            <ScrollReveal>
              <section className="immersive-section" aria-label="没入型体験">
                <TextReveal text="没入型ホテル体験" className="section-title" />
                
                <div className="immersive-grid">
                  <LazyComponent fallback={<div>3D体験を読み込み中...</div>}>
                    <PremiumHoverCard className="experience-card">
                      <HotelRoom3D 
                        roomData={hotels[0]} 
                        className="room-3d-preview"
                      />
                      <div className="experience-info">
                        <h4>3D バーチャルツアー</h4>
                        <p>客室を360度確認できます</p>
                      </div>
                    </PremiumHoverCard>
                  </LazyComponent>

                  <LazyComponent fallback={<div>AR体験を読み込み中...</div>}>
                    <PremiumHoverCard className="experience-card">
                      <ARRoomVisualizer className="ar-preview" />
                      <div className="experience-info">
                        <h4>AR 客室プレビュー</h4>
                        <p>拡張現実で客室を確認</p>
                      </div>
                    </PremiumHoverCard>
                  </LazyComponent>

                  <LazyComponent fallback={<div>パノラマを読み込み中...</div>}>
                    <PremiumHoverCard className="experience-card">
                      <PanoramaViewer 
                        panoramaUrl="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80"
                        className="panorama-preview"
                      />
                      <div className="experience-info">
                        <h4>360° パノラマビュー</h4>
                        <p>ホテル全体を俯瞰できます</p>
                      </div>
                    </PremiumHoverCard>
                  </LazyComponent>
                </div>
              </section>
            </ScrollReveal>

            {/* Features Section */}
            <section className="features-section" aria-label="サービス特徴">
              <h2>LastMinuteStayの特徴</h2>
              <ResponsiveGrid
                columns={{ mobile: 1, tablet: 2, desktop: 3 }}
                gap="24px"
              >
                <FeatureCard
                  icon="⚡"
                  title="30秒で予約完了"
                  description="簡単操作で素早く予約が完了します"
                />
                <FeatureCard
                  icon="💰"
                  title="ラストミニッツ特価"
                  description="直前予約だからこその特別価格"
                />
                <FeatureCard
                  icon="🗺️"
                  title="地図で簡単検索"
                  description="直感的な地図検索で理想のホテルを発見"
                />
              </ResponsiveGrid>
            </section>
          </ResponsiveContainer>
        </main>

        {/* Footer */}
        <ResponsiveFooter
          sections={footerSections}
          socialLinks={socialLinks}
          copyright="© 2024 LastMinuteStay. All rights reserved."
          newsletter={true}
        />

        {/* Enhanced Booking Flow Modal */}
        <AnimatePresence>
          {showBookingFlow && selectedHotel && (
            <motion.div
              className="booking-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowBookingFlow(false);
                  setSelectedHotel(null);
                }
              }}
            >
              <motion.div
                className="booking-modal-content"
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 50 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="booking-modal-header">
                  <h2>{selectedHotel.name} の予約</h2>
                  <motion.button
                    className="close-modal-btn"
                    onClick={() => {
                      setShowBookingFlow(false);
                      setSelectedHotel(null);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    ✕
                  </motion.button>
                </div>
                
                <div className="booking-modal-body">
                  <EnhancedBookingFlow
                    hotel={selectedHotel}
                    onBookingComplete={handleBookingComplete}
                    onBookingError={handleBookingError}
                    enableVoiceSearch={voiceSearchEnabled}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D View Modal */}
        <AnimatePresence>
          {show3DView && (
            <motion.div
              className="immersive-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShow3DView(false);
                }
              }}
            >
              <motion.div
                className="immersive-modal-content"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="immersive-modal-header">
                  <h3>3D ルームツアー</h3>
                  <button
                    className="close-modal-btn"
                    onClick={() => setShow3DView(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="immersive-modal-body">
                  <HotelRoom3D 
                    roomData={selectedHotel || hotels[0]}
                    autoRotate={true}
                    enableControls={true}
                    quality="high"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AR View Modal */}
        <AnimatePresence>
          {showARView && (
            <motion.div
              className="immersive-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowARView(false);
                }
              }}
            >
              <motion.div
                className="immersive-modal-content"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="immersive-modal-header">
                  <h3>AR 客室プレビュー</h3>
                  <button
                    className="close-modal-btn"
                    onClick={() => setShowARView(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="immersive-modal-body">
                  <ARRoomVisualizer 
                    roomData={selectedHotel || hotels[0]}
                    onARStart={() => console.log('AR Started')}
                    onAREnd={() => console.log('AR Ended')}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Accessibility Settings Modal */}
        <AccessibilitySettings
          isOpen={showAccessibilitySettings}
          onClose={() => setShowAccessibilitySettings(false)}
        />
        </div>
      </PageEntranceAnimation>
    </AccessibilityProvider>
  );
};

// Enhanced Hotel Card Component with world-class animations
const HotelCard = ({ hotel }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Enhanced click handler with better UX feedback
  const handleCardClick = () => {
    if (hotel && !hotel.isSoldOut) {
      handleBookingStart(hotel);
    }
  };
  
  return (
    <PremiumHoverCard
      className={`hotel-card ${hotel.isLuxury ? 'luxury-card' : ''} ${hotel.isNew ? 'new-card' : ''} ${hotel.isPopular ? 'popular-card' : ''} ${hotel.isSoldOut ? 'sold-out-card' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      style={{ cursor: hotel.isSoldOut ? 'not-allowed' : 'pointer' }}
    >
      <ResponsiveCard
        image={
          <div className="hotel-image-wrapper">
            {hotel.discount && (
              <MagneticElement>
                <div className="discount-badge">
                  <span className="discount-value">-{hotel.discount}%</span>
                </div>
              </MagneticElement>
            )}
            {hotel.isLuxury && <div className="luxury-badge">Premium</div>}
            {hotel.isNew && <div className="new-badge">New</div>}
            {hotel.isPopular && <div className="popular-badge">人気</div>}
            <LazyImage
              src={hotel.image}
              alt={`${hotel.name}の外観`}
              aspectRatio={16/9}
              srcSet={generateSrcSet(hotel.image)}
              sizes={generateSizes({
                mobile: '(max-width: 640px) 100vw',
                tablet: '(max-width: 1024px) 50vw',
                desktop: '33vw'
              })}
              threshold={0.2}
              fadeInDuration={800}
              enableBlurUp={true}
              lowQualitySrc={hotel.image.replace(/\.(jpg|jpeg|png)/, '_lqip.$1')}
              showSkeleton={true}
              className="hotel-card-image"
            />
            <div className="image-overlay"></div>
            
            {/* 3D Preview Button */}
            <div className="preview-buttons">
              <MorphingButton
                className="preview-3d-btn"
                variant="secondary"
                onClick={() => setShow3DView(true)}
              >
                🏨 3D
              </MorphingButton>
              <MorphingButton
                className="preview-ar-btn"
                variant="secondary"
                onClick={() => setShowARView(true)}
              >
                📱 AR
              </MorphingButton>
            </div>
          </div>
        }
        title={<MagneticElement>{hotel.name}</MagneticElement>}
        subtitle={hotel.location}
        actions={
          <div className="hotel-actions">
            <MorphingButton 
              className="book-btn"
              variant="primary"
              onClick={() => handleBookingStart(hotel)}
            >
              <span className="btn-text">今すぐ予約</span>
              <span className="btn-icon">→</span>
            </MorphingButton>
            <div className="price-section">
              {hotel.originalPrice && (
                <span className="original-price">
                  ¥{hotel.originalPrice.toLocaleString()}
                </span>
              )}
              <span 
                id={`hotel-${hotel.id}-price`}
                className="price"
              >
                ¥{hotel.price.toLocaleString()}/泊
              </span>
            </div>
          </div>
        }
      >
        <div className="hotel-details">
          <div className="rating" aria-label={`評価${hotel.rating}点`}>
            <span className="rating-stars">{'★'.repeat(Math.floor(hotel.rating))}</span>
            <span className="rating-number">{hotel.rating}</span>
          </div>
          <div className="amenities" aria-label="設備">
            {hotel.amenities.map((amenity, index) => (
              <MagneticElement key={index}>
                <span className="amenity-tag premium-tag">
                  {amenity}
                </span>
              </MagneticElement>
            ))}
          </div>
        </div>
      </ResponsiveCard>
    </PremiumHoverCard>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => {
  return (
    <ResponsiveCard className="feature-card">
      <div className="feature-content">
        <div className="feature-icon" aria-hidden="true">{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </ResponsiveCard>
  );
};

export default HomePage;