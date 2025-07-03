// Enhanced Search Results Component for Demo Mode
// Modern hotel listings with filtering, sorting, and detailed information

import React, { useState, useEffect, useRef } from 'react';
import './SearchResults.css';

const SearchResults = ({ 
  searchResults, 
  isLoading, 
  onHotelSelect, 
  onLoadMore,
  viewMode = 'grid',
  onViewModeChange 
}) => {
  const [sortBy, setSortBy] = useState('price');
  const [filteredResults, setFilteredResults] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    priceRange: '',
    rating: '',
    hotelType: '',
    amenities: []
  });
  const [mapVisible, setMapVisible] = useState(false);
  const resultsRef = useRef(null);

  // Update filtered results when search results or filters change
  useEffect(() => {
    if (searchResults?.hotels) {
      let filtered = [...searchResults.hotels];
      
      // Apply filters
      if (activeFilters.priceRange) {
        const [min, max] = activeFilters.priceRange.split('-').map(Number);
        filtered = filtered.filter(hotel => {
          const price = hotel.pricing?.minPrice || 0;
          return price >= min && (max ? price <= max : true);
        });
      }
      
      if (activeFilters.rating) {
        filtered = filtered.filter(hotel => 
          (hotel.rating?.overall || 0) >= parseFloat(activeFilters.rating)
        );
      }
      
      if (activeFilters.hotelType) {
        filtered = filtered.filter(hotel => 
          hotel.hotelType === activeFilters.hotelType
        );
      }
      
      // Apply sorting
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'price':
            return (a.pricing?.minPrice || 0) - (b.pricing?.minPrice || 0);
          case 'price_desc':
            return (b.pricing?.minPrice || 0) - (a.pricing?.minPrice || 0);
          case 'rating':
            return (b.rating?.overall || 0) - (a.rating?.overall || 0);
          case 'name':
            return (a.name || '').localeCompare(b.name || '');
          case 'distance':
            // Would implement distance calculation from search center
            return 0;
          default:
            return 0;
        }
      });
      
      setFilteredResults(filtered);
    }
  }, [searchResults, activeFilters, sortBy]);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters({
      priceRange: '',
      rating: '',
      hotelType: '',
      amenities: []
    });
  };

  // Format price display
  const formatPrice = (price) => {
    if (!price) return 'Price not available';
    return `¥${price.toLocaleString()}`;
  };

  // Format rating display
  const formatRating = (rating) => {
    if (!rating) return 0;
    return Math.round(rating * 10) / 10;
  };

  // Generate star rating display
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="star-rating">
        {'★'.repeat(fullStars)}
        {hasHalfStar && '☆'}
        {'☆'.repeat(emptyStars)}
        <span className="rating-number">({formatRating(rating)})</span>
      </div>
    );
  };

  // Render hotel amenities
  const renderAmenities = (hotel) => {
    const amenities = hotel.amenities || [];
    const commonAmenities = ['Wi-Fi', '駐車場', 'レストラン', '温泉', 'ジム'];
    
    return (
      <div className="hotel-amenities">
        {commonAmenities.slice(0, 3).map((amenity, index) => (
          <span key={index} className="amenity-tag">
            {amenity}
          </span>
        ))}
        {commonAmenities.length > 3 && (
          <span className="amenity-more">+{commonAmenities.length - 3}個</span>
        )}
      </div>
    );
  };

  // Render availability status
  const renderAvailability = (hotel) => {
    if (hotel.availability?.isAvailable) {
      const roomsLeft = hotel.availability.availableRooms;
      if (roomsLeft <= 3) {
        return <span className="availability urgent">残り{roomsLeft}室</span>;
      }
      return <span className="availability available">空室あり</span>;
    }
    return <span className="availability unavailable">満室</span>;
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="loading-skeleton">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="skeleton-card">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-text short"></div>
            <div className="skeleton-price"></div>
          </div>
        </div>
      ))}
    </div>
  );

  // Render no results message
  const renderNoResults = () => (
    <div className="no-results">
      <div className="no-results-icon">🏨</div>
      <h3>検索条件に一致するホテルが見つかりませんでした</h3>
      <p>検索条件を変更して再度お試しください</p>
      <button 
        className="clear-filters-button"
        onClick={clearFilters}
      >
        フィルターをクリア
      </button>
    </div>
  );

  // Render individual hotel card
  const renderHotelCard = (hotel, index) => (
    <div 
      key={hotel.id || index}
      className={`hotel-card ${viewMode}`}
      onClick={() => onHotelSelect(hotel)}
    >
      {/* Hotel Image */}
      <div className="hotel-image">
        <img 
          src={hotel.images?.thumbnail || hotel.images?.main || '/images/hotel-placeholder.jpg'}
          alt={hotel.name}
          loading="lazy"
          onError={(e) => {
            e.target.src = '/images/hotel-placeholder.jpg';
          }}
        />
        <div className="image-overlay">
          <span className="view-details">詳細を見る</span>
        </div>
        {renderAvailability(hotel)}
      </div>

      {/* Hotel Information */}
      <div className="hotel-info">
        <div className="hotel-header">
          <h3 className="hotel-name">{hotel.name}</h3>
          <div className="hotel-type">{hotel.hotelType}</div>
        </div>

        <div className="hotel-location">
          📍 {hotel.address?.fullAddress || hotel.address?.city}
        </div>

        {hotel.access && (
          <div className="hotel-access">
            🚃 {hotel.access}
          </div>
        )}

        <div className="hotel-rating">
          {renderStars(hotel.rating?.overall || 0)}
          {hotel.reviewCount > 0 && (
            <span className="review-count">({hotel.reviewCount}件)</span>
          )}
        </div>

        {renderAmenities(hotel)}

        <div className="hotel-pricing">
          <div className="price-main">
            {formatPrice(hotel.pricing?.minPrice)}
            <span className="price-unit">〜/泊</span>
          </div>
          {hotel.pricing?.maxPrice && hotel.pricing.maxPrice !== hotel.pricing.minPrice && (
            <div className="price-range">
              {formatPrice(hotel.pricing.minPrice)} - {formatPrice(hotel.pricing.maxPrice)}
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="hotel-actions">
          <button 
            className="action-button primary"
            onClick={(e) => {
              e.stopPropagation();
              onHotelSelect(hotel);
            }}
          >
            詳細・予約
          </button>
          <button 
            className="action-button secondary"
            onClick={(e) => {
              e.stopPropagation();
              // Add to watchlist functionality
            }}
          >
            💙 保存
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="search-results loading">
        <div className="results-header">
          <h2>ホテルを検索中...</h2>
        </div>
        {renderLoadingSkeleton()}
      </div>
    );
  }

  if (!searchResults || !searchResults.hotels || searchResults.hotels.length === 0) {
    return (
      <div className="search-results empty">
        {renderNoResults()}
      </div>
    );
  }

  return (
    <div className="search-results" ref={resultsRef}>
      {/* Results Header */}
      <div className="results-header">
        <div className="results-summary">
          <h2>
            検索結果 <span className="result-count">{filteredResults.length}</span>件
          </h2>
          {searchResults.searchTime && (
            <span className="search-time">
              検索時間: {searchResults.searchTime}ms
            </span>
          )}
        </div>

        {/* View Controls */}
        <div className="view-controls">
          <div className="view-mode-buttons">
            <button
              className={`view-mode-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="グリッド表示"
            >
              ⊞
            </button>
            <button
              className={`view-mode-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
              title="リスト表示"
            >
              ☰
            </button>
            <button
              className={`view-mode-button ${mapVisible ? 'active' : ''}`}
              onClick={() => setMapVisible(!mapVisible)}
              title="地図表示"
            >
              🗺️
            </button>
          </div>

          <div className="sort-controls">
            <label htmlFor="sort-select">並び順:</label>
            <select 
              id="sort-select"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="price">料金が安い順</option>
              <option value="price_desc">料金が高い順</option>
              <option value="rating">評価が高い順</option>
              <option value="name">名前順</option>
              <option value="distance">距離が近い順</option>
            </select>
          </div>

          <button
            className="filters-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            🔧 フィルター {Object.values(activeFilters).some(v => v && v.length > 0) && '●'}
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      {showFilters && (
        <div className="quick-filters">
          <div className="filter-group">
            <label>料金帯:</label>
            <select 
              value={activeFilters.priceRange}
              onChange={(e) => handleFilterChange('priceRange', e.target.value)}
            >
              <option value="">すべて</option>
              <option value="0-5000">5,000円未満</option>
              <option value="5000-10000">5,000円〜10,000円</option>
              <option value="10000-20000">10,000円〜20,000円</option>
              <option value="20000-50000">20,000円〜50,000円</option>
              <option value="50000-">50,000円以上</option>
            </select>
          </div>

          <div className="filter-group">
            <label>評価:</label>
            <select 
              value={activeFilters.rating}
              onChange={(e) => handleFilterChange('rating', e.target.value)}
            >
              <option value="">すべて</option>
              <option value="4.5">4.5以上</option>
              <option value="4.0">4.0以上</option>
              <option value="3.5">3.5以上</option>
              <option value="3.0">3.0以上</option>
            </select>
          </div>

          <div className="filter-group">
            <label>ホテルタイプ:</label>
            <select 
              value={activeFilters.hotelType}
              onChange={(e) => handleFilterChange('hotelType', e.target.value)}
            >
              <option value="">すべて</option>
              <option value="business">ビジネスホテル</option>
              <option value="hotel">シティホテル</option>
              <option value="resort">リゾートホテル</option>
              <option value="ryokan">旅館</option>
            </select>
          </div>

          {Object.values(activeFilters).some(v => v && v.length > 0) && (
            <button className="clear-filters" onClick={clearFilters}>
              クリア
            </button>
          )}
        </div>
      )}

      {/* Map View */}
      {mapVisible && (
        <div className="map-container">
          <div className="map-placeholder">
            <p>地図機能は開発中です</p>
            <small>Google Maps APIまたはMapbox統合予定</small>
          </div>
        </div>
      )}

      {/* Hotel Results */}
      <div className={`hotels-container ${viewMode}`}>
        {filteredResults.map((hotel, index) => renderHotelCard(hotel, index))}
      </div>

      {/* Load More Button */}
      {searchResults.pagination?.hasMore && (
        <div className="load-more-container">
          <button 
            className="load-more-button"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? '読み込み中...' : 'さらに表示'}
          </button>
        </div>
      )}

      {/* Results Footer */}
      <div className="results-footer">
        <div className="results-info">
          表示中: {filteredResults.length}件 / 全{searchResults.totalResults || searchResults.hotels.length}件
        </div>
        {searchResults.suggestions && searchResults.suggestions.length > 0 && (
          <div className="search-suggestions">
            <span>関連検索: </span>
            {searchResults.suggestions.map((suggestion, index) => (
              <button 
                key={index}
                className="suggestion-tag"
                onClick={() => {
                  // Handle suggestion click
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;