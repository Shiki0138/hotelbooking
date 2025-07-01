// Practical Hotel Booking Page with Real APIs
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HotelSearchService from '../services/HotelSearchService';
import GoogleMapsAPI from '../services/api/googleMaps';
import { MapWeatherComponent } from '../components/Maps/MapWeatherComponent';
import { PriceComparisonComponent } from '../components/PriceComparison/PriceComparisonComponent';
import { DebouncedSearchInput } from '../components/Performance/OptimizedComponents';
import { MorphingButton, ScrollReveal, StaggeredContainer, StaggeredItem } from '../components/Animation/MotionComponents';

const PracticalHotelBookingPage = () => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Search parameters
  const [searchParams, setSearchParams] = useState({
    location: null,
    checkIn: '',
    checkOut: '',
    guests: 1,
    rooms: 1
  });
  
  // UI state
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [showPriceComparison, setShowPriceComparison] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('JPY');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Set default dates
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setSearchParams(prev => ({
      ...prev,
      checkIn: today.toISOString().split('T')[0],
      checkOut: tomorrow.toISOString().split('T')[0]
    }));

    // デフォルトで東京を設定
    setSearchParams(prev => ({
      ...prev,
      location: {
        name: '東京',
        area: 'tokyo',
        latitude: 35.6762,
        longitude: 139.6503
      }
    }));
    setSearchQuery('東京');
  }, []);

  // Handle location search with autocomplete
  const handleLocationSearch = useCallback(async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Get quick search suggestions
      const quickSuggestions = await HotelSearchService.quickSearch(query);
      
      // Get Google Places suggestions
      const placesSuggestions = await GoogleMapsAPI.getPlacesSuggestions(query);
      
      // Combine and deduplicate suggestions
      const combinedSuggestions = [
        ...quickSuggestions.map(item => ({
          id: `quick_${item.name}`,
          name: item.name,
          city: item.city,
          country: item.country,
          location: {
            latitude: item.latitude,
            longitude: item.longitude
          },
          type: 'destination'
        })),
        ...placesSuggestions.slice(0, 5).map(item => ({
          id: `places_${item.placeId}`,
          name: item.mainText,
          description: item.secondaryText,
          placeId: item.placeId,
          type: 'place'
        }))
      ];

      setSuggestions(combinedSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Location search failed:', error);
    }
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion) => {
    try {
      let location = null;

      if (suggestion.type === 'destination') {
        location = suggestion.location;
        location.name = suggestion.name;
        location.city = suggestion.city;
      } else if (suggestion.type === 'place') {
        const placeDetails = await GoogleMapsAPI.getPlaceDetails(suggestion.placeId);
        if (placeDetails) {
          location = {
            latitude: placeDetails.location.latitude,
            longitude: placeDetails.location.longitude,
            name: placeDetails.name,
            address: placeDetails.formattedAddress
          };
        }
      }

      if (location) {
        setSearchParams(prev => ({ ...prev, location }));
        setSearchQuery(location.name || location.address || '');
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Suggestion selection failed:', error);
    }
  };

  // Execute hotel search
  const executeSearch = async () => {
    if (!searchParams.location || !searchParams.checkIn || !searchParams.checkOut) {
      setError('検索条件を入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await HotelSearchService.searchHotels({
        location: searchParams.location,
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut,
        guests: searchParams.guests,
        rooms: searchParams.rooms
      });

      setSearchResults(results);
      
      if (results.length === 0) {
        setError('条件に該当するホテルが見つかりませんでした');
      }
    } catch (error) {
      console.error('Hotel search failed:', error);
      setError('検索中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // Handle hotel selection from map
  const handleHotelSelectFromMap = (hotel) => {
    setSelectedHotel(hotel);
    // Scroll to hotel details
    const hotelElement = document.getElementById(`hotel-${hotel.id}`);
    if (hotelElement) {
      hotelElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="practical-hotel-booking-page" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* Header */}
      <header style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(10px)',
        padding: '20px 0',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <h1 style={{ 
            margin: '0',
            fontSize: '2rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}>
            🏨 LastMinuteStay - 実用的ホテル予約
          </h1>
          <p style={{ 
            textAlign: 'center', 
            color: '#666', 
            margin: '8px 0 0 0',
            fontSize: '1.1rem'
          }}>
            リアルタイム価格比較 • 地図統合 • 天気予報 • 多通貨対応
          </p>
        </div>
      </header>

      {/* Search Section */}
      <section style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <ScrollReveal>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '30px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
              ホテルを検索
            </h2>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px',
              marginBottom: '20px'
            }}>
              {/* Location Search */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  📍 目的地
                </label>
                <DebouncedSearchInput
                  placeholder="都市名、ホテル名を入力..."
                  onSearch={handleLocationSearch}
                  className="location-search"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(5px)'
                  }}
                />
                
                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                    >
                      {suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                            transition: 'background 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'rgba(102, 126, 234, 0.1)'}
                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                          <div style={{ fontWeight: 'bold', color: '#333' }}>
                            {suggestion.name}
                          </div>
                          {suggestion.description && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {suggestion.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Check-in Date */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  📅 チェックイン
                </label>
                <input
                  type="date"
                  value={searchParams.checkIn}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, checkIn: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(5px)'
                  }}
                />
              </div>

              {/* Check-out Date */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  📅 チェックアウト
                </label>
                <input
                  type="date"
                  value={searchParams.checkOut}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, checkOut: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(5px)'
                  }}
                />
              </div>

              {/* Guests */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  👥 ゲスト数
                </label>
                <select
                  value={searchParams.guests}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(5px)'
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num}名</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Button */}
            <div style={{ textAlign: 'center' }}>
              <MorphingButton
                onClick={executeSearch}
                disabled={loading}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '🔍 検索中...' : '🔍 ホテルを検索'}
              </MorphingButton>
            </div>

            {/* Current Location Button */}
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <button
                onClick={async () => {
                  try {
                    const location = await GoogleMapsAPI.getCurrentLocation();
                    const addresses = await GoogleMapsAPI.reverseGeocode(location.latitude, location.longitude);
                    if (addresses.length > 0) {
                      setSearchParams(prev => ({
                        ...prev,
                        location: {
                          latitude: location.latitude,
                          longitude: location.longitude,
                          name: '現在地',
                          address: addresses[0].formattedAddress
                        }
                      }));
                      setSearchQuery('現在地');
                    }
                  } catch (error) {
                    alert('現在地の取得に失敗しました');
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#333',
                  cursor: 'pointer',
                  backdropFilter: 'blur(5px)'
                }}
              >
                📍 現在地を使用
              </button>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              maxWidth: '1200px',
              margin: '0 auto 20px auto',
              padding: '0 20px'
            }}
          >
            <div style={{
              background: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              color: '#d32f2f',
              textAlign: 'center'
            }}>
              ⚠️ {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Section */}
      {searchResults.length > 0 && (
        <section style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
          {/* View Toggle */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '10px', 
            marginBottom: '30px' 
          }}>
            <MorphingButton
              onClick={() => setShowMap(!showMap)}
              variant={showMap ? 'primary' : 'secondary'}
            >
              {showMap ? '🗺️ 地図を非表示' : '🗺️ 地図を表示'}
            </MorphingButton>
            
            <MorphingButton
              onClick={() => setShowPriceComparison(!showPriceComparison)}
              variant={showPriceComparison ? 'primary' : 'secondary'}
            >
              {showPriceComparison ? '💱 価格比較を非表示' : '💱 価格比較を表示'}
            </MorphingButton>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: showMap ? '1fr 1fr' : '1fr', 
            gap: '30px' 
          }}>
            {/* Hotel List */}
            <div>
              <h3 style={{ marginBottom: '20px', color: '#333' }}>
                検索結果 ({searchResults.length}件)
              </h3>
              
              <StaggeredContainer>
                {searchResults.map((hotel, index) => (
                  <StaggeredItem key={hotel.id}>
                    <div
                      id={`hotel-${hotel.id}`}
                      style={{
                        background: selectedHotel?.id === hotel.id 
                          ? 'rgba(102, 126, 234, 0.1)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '20px',
                        marginBottom: '20px',
                        backdropFilter: 'blur(10px)',
                        border: selectedHotel?.id === hotel.id 
                          ? '2px solid #667eea' 
                          : '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => {
                        setSelectedHotel(hotel);
                        // ホテル詳細ページへ遷移
                        if (hotel.id) {
                          window.location.href = `/hotel/${hotel.id}?source=${hotel.source || 'unknown'}&checkIn=${searchParams.checkIn}&checkOut=${searchParams.checkOut}&guests=${searchParams.guests}&rooms=${searchParams.rooms}`;
                        }
                      }}
                    >
                      <div style={{ display: 'flex', gap: '15px' }}>
                        {/* Hotel Image */}
                        <div style={{ 
                          width: '120px', 
                          height: '90px', 
                          borderRadius: '8px',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          <img
                            src={hotel.images?.[0]?.url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'}
                            alt={hotel.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>

                        {/* Hotel Info */}
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
                            {hotel.name}
                          </h4>
                          
                          {hotel.location?.address && (
                            <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
                              📍 {hotel.location.address}
                            </p>
                          )}

                          {hotel.rating && (
                            <div style={{ margin: '8px 0', fontSize: '14px' }}>
                              <span style={{ color: '#ffa500' }}>
                                {'★'.repeat(Math.floor(hotel.rating.stars || hotel.rating))}
                              </span>
                              <span style={{ marginLeft: '8px', color: '#666' }}>
                                {hotel.rating.stars || hotel.rating}/5
                              </span>
                              {hotel.rating.review?.count && (
                                <span style={{ marginLeft: '8px', color: '#666', fontSize: '12px' }}>
                                  ({hotel.rating.review.count} レビュー)
                                </span>
                              )}
                            </div>
                          )}

                          {hotel.amenities && hotel.amenities.length > 0 && (
                            <div style={{ margin: '8px 0' }}>
                              {hotel.amenities.slice(0, 3).map((amenity, i) => (
                                <span
                                  key={i}
                                  style={{
                                    display: 'inline-block',
                                    background: 'rgba(102, 126, 234, 0.1)',
                                    color: '#667eea',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    marginRight: '6px',
                                    marginBottom: '4px'
                                  }}
                                >
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Price */}
                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                          {hotel.price?.total && (
                            <div>
                              <div style={{ 
                                fontSize: '24px', 
                                fontWeight: 'bold', 
                                color: '#333',
                                marginBottom: '4px'
                              }}>
                                ¥{hotel.price.total.toLocaleString()}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                /泊
                              </div>
                              {hotel.source && (
                                <div style={{ 
                                  fontSize: '10px', 
                                  color: '#666',
                                  marginTop: '4px'
                                }}>
                                  {hotel.source}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <MorphingButton
                            style={{ 
                              marginTop: '10px',
                              padding: '8px 16px',
                              fontSize: '14px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // ホテル詳細ページへ遷移
                              window.location.href = `/hotel/${hotel.id}?source=${hotel.source || 'unknown'}&checkIn=${searchParams.checkIn}&checkOut=${searchParams.checkOut}&guests=${searchParams.guests}&rooms=${searchParams.rooms}`;
                            }}
                          >
                            詳細を見る
                          </MorphingButton>
                        </div>
                      </div>
                    </div>
                  </StaggeredItem>
                ))}
              </StaggeredContainer>
            </div>

            {/* Map and Price Comparison */}
            {showMap && (
              <div style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
                <MapWeatherComponent
                  hotels={searchResults}
                  onHotelSelect={handleHotelSelectFromMap}
                  showWeather={true}
                  height="400px"
                  className="mb-20"
                />
                
                {showPriceComparison && (
                  <div style={{ marginTop: '20px' }}>
                    <PriceComparisonComponent
                      hotels={searchResults}
                      onCurrencyChange={setSelectedCurrency}
                      showComparison={true}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default PracticalHotelBookingPage;