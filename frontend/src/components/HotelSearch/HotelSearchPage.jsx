// Main Hotel Search Page for Demo Mode
// Integrates enhanced search form, results display, and API calls

import React, { useState, useEffect, useCallback } from 'react';
import EnhancedSearchForm from './EnhancedSearchForm';
import SearchResults from './SearchResults';
import './HotelSearchPage.css';

const HotelSearchPage = () => {
  // Search state
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [currentSearchParams, setCurrentSearchParams] = useState(null);
  
  // UI state
  const [viewMode, setViewMode] = useState('grid');
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showHotelModal, setShowHotelModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);

  // Search history for analytics
  const [searchHistory, setSearchHistory] = useState([]);

  // Load initial data and saved preferences
  useEffect(() => {
    loadSavedPreferences();
    // Optionally load popular hotels or recent searches
    loadPopularHotels();
  }, []);

  // Load user preferences from localStorage
  const loadSavedPreferences = () => {
    try {
      const savedViewMode = localStorage.getItem('hotelSearch_viewMode');
      if (savedViewMode) {
        setViewMode(savedViewMode);
      }
      
      const savedSearchHistory = localStorage.getItem('hotelSearch_history');
      if (savedSearchHistory) {
        setSearchHistory(JSON.parse(savedSearchHistory));
      }
    } catch (error) {
      console.error('Failed to load saved preferences:', error);
    }
  };

  // Save user preferences
  const savePreferences = useCallback(() => {
    try {
      localStorage.setItem('hotelSearch_viewMode', viewMode);
      localStorage.setItem('hotelSearch_history', JSON.stringify(searchHistory.slice(0, 10)));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [viewMode, searchHistory]);

  // Save preferences when they change
  useEffect(() => {
    savePreferences();
  }, [savePreferences]);

  // Load popular hotels as default content
  const loadPopularHotels = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/hotels/search?area=tokyo&limit=12&sortBy=rating');
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data);
      } else {
        console.warn('Failed to load popular hotels, using mock data');
        setSearchResults(getMockSearchResults());
      }
    } catch (error) {
      console.error('Error loading popular hotels:', error);
      setSearchResults(getMockSearchResults());
    } finally {
      setIsLoading(false);
    }
  };

  // Main search function
  const handleSearch = async (searchParams) => {
    try {
      setIsLoading(true);
      setSearchError(null);
      setCurrentSearchParams(searchParams);
      setCurrentPage(1);

      // Add to search history
      const newSearch = {
        params: searchParams,
        timestamp: new Date().toISOString(),
        id: Date.now()
      };
      setSearchHistory(prev => [newSearch, ...prev.slice(0, 9)]);

      console.log('🔍 Performing search with params:', searchParams);

      // Build query string
      const queryParams = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/hotels/search?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data);
        setHasMoreResults(data.data.pagination?.hasMore || false);
        
        // Scroll to results
        scrollToResults();
      } else {
        throw new Error(data.error || 'Search failed');
      }

    } catch (error) {
      console.error('❌ Search error:', error);
      setSearchError(error.message);
      
      // Fallback to mock data
      console.warn('Using mock data as fallback');
      setSearchResults(getMockSearchResults(searchParams));
    } finally {
      setIsLoading(false);
    }
  };

  // Load more results for pagination
  const handleLoadMore = async () => {
    if (!currentSearchParams || isLoading || !hasMoreResults) return;

    try {
      setIsLoading(true);
      const nextPage = currentPage + 1;

      const queryParams = new URLSearchParams();
      Object.entries(currentSearchParams).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          queryParams.append(key, value);
        }
      });
      queryParams.set('page', nextPage);

      const response = await fetch(`/api/hotels/search?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setSearchResults(prev => ({
            ...prev,
            hotels: [...prev.hotels, ...data.data.hotels],
            totalResults: data.data.totalResults,
            pagination: data.data.pagination
          }));
          setCurrentPage(nextPage);
          setHasMoreResults(data.data.pagination?.hasMore || false);
        }
      }
    } catch (error) {
      console.error('❌ Load more error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle hotel selection
  const handleHotelSelect = (hotel) => {
    setSelectedHotel(hotel);
    setShowHotelModal(true);
    
    // Track hotel view for analytics
    console.log('🏨 Hotel selected:', hotel.name);
  };

  // Handle view mode change
  const handleViewModeChange = (newViewMode) => {
    setViewMode(newViewMode);
  };

  // Scroll to search results
  const scrollToResults = () => {
    const resultsElement = document.querySelector('.search-results');
    if (resultsElement) {
      resultsElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Get mock search results for fallback
  const getMockSearchResults = (searchParams = {}) => {
    const mockHotels = [
      {
        id: 'demo-001',
        name: 'デモホテル東京駅前',
        nameKana: 'デモホテルトウキョウエキマエ',
        description: 'デモモード用のサンプルホテルです。JR東京駅から徒歩3分の好立地。',
        address: {
          zipCode: '100-0005',
          prefecture: '東京都',
          city: '千代田区',
          fullAddress: '東京都千代田区丸の内1-1-1'
        },
        location: {
          latitude: 35.6812,
          longitude: 139.7671
        },
        access: 'JR東京駅徒歩3分、丸ノ内線東京駅直結',
        images: {
          main: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Demo+Hotel+Tokyo',
          thumbnail: 'https://via.placeholder.com/200x150/0066cc/ffffff?text=Demo'
        },
        pricing: {
          minPrice: 8500,
          maxPrice: 25000,
          currency: 'JPY'
        },
        rating: {
          overall: 4.3,
          service: 4.2,
          location: 4.8,
          room: 4.1,
          equipment: 4.2,
          bath: 4.0,
          meal: 4.0
        },
        reviewCount: 1247,
        roomCount: 180,
        checkIn: '15:00',
        checkOut: '11:00',
        hotelType: 'hotel',
        availability: {
          isAvailable: true,
          availableRooms: 8,
          lastChecked: new Date().toISOString()
        },
        amenities: ['Wi-Fi', '駐車場', 'レストラン', 'ジム']
      },
      {
        id: 'demo-002',
        name: 'ビジネスホテル新宿',
        nameKana: 'ビジネスホテルシンジュク',
        description: 'コストパフォーマンス抜群のビジネスホテル。新宿駅東口から徒歩5分。',
        address: {
          zipCode: '160-0022',
          prefecture: '東京都',
          city: '新宿区',
          fullAddress: '東京都新宿区新宿3-1-1'
        },
        location: {
          latitude: 35.6896,
          longitude: 139.7006
        },
        access: 'JR新宿駅東口徒歩5分',
        images: {
          main: 'https://via.placeholder.com/400x300/009688/ffffff?text=Business+Hotel',
          thumbnail: 'https://via.placeholder.com/200x150/009688/ffffff?text=Business'
        },
        pricing: {
          minPrice: 5800,
          maxPrice: 12000,
          currency: 'JPY'
        },
        rating: {
          overall: 3.9,
          service: 3.8,
          location: 4.2,
          room: 3.7,
          equipment: 3.8,
          bath: 3.6,
          meal: 3.5
        },
        reviewCount: 892,
        roomCount: 120,
        checkIn: '15:00',
        checkOut: '10:00',
        hotelType: 'business',
        availability: {
          isAvailable: true,
          availableRooms: 3,
          lastChecked: new Date().toISOString()
        },
        amenities: ['Wi-Fi', '自動販売機', 'コインランドリー']
      },
      {
        id: 'demo-003',
        name: 'ラグジュアリーホテル銀座',
        nameKana: 'ラグジュアリーホテルギンザ',
        description: '銀座の中心地に位置する最高級ホテル。洗練されたサービスと設備。',
        address: {
          zipCode: '104-0061',
          prefecture: '東京都',
          city: '中央区',
          fullAddress: '東京都中央区銀座4-1-1'
        },
        location: {
          latitude: 35.6762,
          longitude: 139.7653
        },
        access: '地下鉄銀座駅直結、JR有楽町駅徒歩5分',
        images: {
          main: 'https://via.placeholder.com/400x300/8e24aa/ffffff?text=Luxury+Hotel',
          thumbnail: 'https://via.placeholder.com/200x150/8e24aa/ffffff?text=Luxury'
        },
        pricing: {
          minPrice: 35000,
          maxPrice: 150000,
          currency: 'JPY'
        },
        rating: {
          overall: 4.8,
          service: 4.9,
          location: 4.9,
          room: 4.7,
          equipment: 4.8,
          bath: 4.6,
          meal: 4.8
        },
        reviewCount: 456,
        roomCount: 200,
        checkIn: '15:00',
        checkOut: '12:00',
        hotelType: 'luxury',
        availability: {
          isAvailable: true,
          availableRooms: 12,
          lastChecked: new Date().toISOString()
        },
        amenities: ['Wi-Fi', 'スパ', 'レストラン', 'ジム', 'コンシェルジュ', '駐車場']
      }
    ];

    return {
      hotels: mockHotels,
      totalResults: mockHotels.length,
      searchParams: searchParams,
      searchTime: 234,
      timestamp: new Date().toISOString(),
      suggestions: ['東京駅周辺', '新宿 格安', '銀座 高級ホテル'],
      pagination: {
        page: 1,
        limit: 30,
        hasMore: false
      }
    };
  };

  return (
    <div className="hotel-search-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>🏨 LastMinuteStay</h1>
          <p className="header-subtitle">理想のホテルを見つけよう</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="search-section">
        <EnhancedSearchForm
          onSearch={handleSearch}
          isLoading={isLoading}
          initialFilters={currentSearchParams}
        />
        
        {searchError && (
          <div className="search-error">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <div>
                <strong>検索エラー:</strong> {searchError}
                <p>モックデータを表示しています。</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="results-section">
        <SearchResults
          searchResults={searchResults}
          isLoading={isLoading}
          onHotelSelect={handleHotelSelect}
          onLoadMore={handleLoadMore}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
      </div>

      {/* Hotel Detail Modal */}
      {showHotelModal && selectedHotel && (
        <div className="hotel-modal-overlay" onClick={() => setShowHotelModal(false)}>
          <div className="hotel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedHotel.name}</h2>
              <button 
                className="close-button"
                onClick={() => setShowHotelModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="hotel-detail-info">
                <img 
                  src={selectedHotel.images?.main || '/images/hotel-placeholder.jpg'}
                  alt={selectedHotel.name}
                  className="modal-image"
                />
                <div className="hotel-details">
                  <p><strong>住所:</strong> {selectedHotel.address?.fullAddress}</p>
                  <p><strong>アクセス:</strong> {selectedHotel.access}</p>
                  <p><strong>料金:</strong> {selectedHotel.pricing?.minPrice ? `¥${selectedHotel.pricing.minPrice.toLocaleString()}〜` : '価格未定'}</p>
                  <p><strong>評価:</strong> {selectedHotel.rating?.overall || 0}/5.0 ({selectedHotel.reviewCount || 0}件)</p>
                  <p><strong>チェックイン:</strong> {selectedHotel.checkIn} / <strong>チェックアウト:</strong> {selectedHotel.checkOut}</p>
                  {selectedHotel.description && (
                    <p><strong>説明:</strong> {selectedHotel.description}</p>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button className="booking-button">
                  🎯 予約に進む
                </button>
                <button className="watchlist-button">
                  💙 ウォッチリストに追加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search History Sidebar (for demo) */}
      {searchHistory.length > 0 && (
        <div className="search-history-sidebar">
          <h3>検索履歴</h3>
          <div className="history-list">
            {searchHistory.slice(0, 5).map((search, index) => (
              <div 
                key={search.id}
                className="history-item"
                onClick={() => handleSearch(search.params)}
              >
                <div className="history-summary">
                  {search.params.keyword || search.params.area || '条件検索'}
                </div>
                <div className="history-time">
                  {new Date(search.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelSearchPage;