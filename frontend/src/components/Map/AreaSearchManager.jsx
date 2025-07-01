// Area search functionality for map-based hotel filtering
import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import './AreaSearchManager.css';

const AreaSearchManager = ({ 
  map, 
  onAreaSearch, 
  isActive, 
  onToggle,
  searchResults,
  loading 
}) => {
  const [searchBounds, setSearchBounds] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchStats, setSearchStats] = useState(null);

  // Debounced search function
  const debouncedSearch = debounce((bounds) => {
    if (onAreaSearch) {
      onAreaSearch({
        bounds,
        center: bounds.getCenter(),
        zoom: map.getZoom()
      });
    }
  }, 500);

  useEffect(() => {
    if (!map || !isActive) return;

    const handleMapMove = () => {
      if (!isDragging) return;
      
      const bounds = map.getBounds();
      setSearchBounds(bounds);
      debouncedSearch(bounds);
    };

    const handleDragStart = () => {
      setIsDragging(true);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    map.on('drag', handleMapMove);
    map.on('dragstart', handleDragStart);
    map.on('dragend', handleDragEnd);
    map.on('zoom', handleMapMove);

    // Initial search
    const initialBounds = map.getBounds();
    setSearchBounds(initialBounds);
    debouncedSearch(initialBounds);

    return () => {
      map.off('drag', handleMapMove);
      map.off('dragstart', handleDragStart);
      map.off('dragend', handleDragEnd);
      map.off('zoom', handleMapMove);
    };
  }, [map, isActive, isDragging, debouncedSearch]);

  useEffect(() => {
    if (searchResults) {
      setSearchStats({
        totalHotels: searchResults.length,
        priceRange: calculatePriceRange(searchResults),
        avgPrice: calculateAvgPrice(searchResults)
      });
    }
  }, [searchResults]);

  const calculatePriceRange = (hotels) => {
    if (!hotels || hotels.length === 0) return null;
    const prices = hotels.map(h => h.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  };

  const calculateAvgPrice = (hotels) => {
    if (!hotels || hotels.length === 0) return 0;
    return Math.round(
      hotels.reduce((sum, h) => sum + h.price, 0) / hotels.length
    );
  };

  return (
    <div className={`area-search-manager ${isActive ? 'active' : ''}`}>
      <button
        className={`area-search-toggle ${isActive ? 'active' : ''}`}
        onClick={onToggle}
      >
        <span className="toggle-icon">🔍</span>
        <span className="toggle-text">
          {isActive ? 'エリア検索中' : 'エリア検索'}
        </span>
      </button>

      {isActive && (
        <>
          <SearchInstructions />
          
          {loading && <SearchLoader />}
          
          {searchStats && !loading && (
            <SearchResults stats={searchStats} />
          )}
          
          <SearchBoundary 
            bounds={searchBounds} 
            isDragging={isDragging}
          />
        </>
      )}
    </div>
  );
};

// Search instructions overlay
const SearchInstructions = () => (
  <div className="search-instructions">
    <div className="instruction-content">
      <h4>🗺️ エリア検索</h4>
      <p>地図を移動してこのエリアのホテルを検索します</p>
      <ul>
        <li>地図をドラッグして検索エリアを移動</li>
        <li>ズームで検索範囲を調整</li>
        <li>リアルタイムで結果が更新されます</li>
      </ul>
    </div>
  </div>
);

// Loading indicator
const SearchLoader = () => (
  <div className="search-loader">
    <div className="loader-spinner"></div>
    <span>検索中...</span>
  </div>
);

// Search results summary
const SearchResults = ({ stats }) => (
  <div className="search-results-summary">
    <div className="results-header">
      <h4>検索結果</h4>
      <span className="results-count">{stats.totalHotels}件</span>
    </div>
    
    <div className="results-stats">
      <div className="stat-item">
        <span className="stat-label">平均価格</span>
        <span className="stat-value">¥{stats.avgPrice.toLocaleString()}</span>
      </div>
      
      {stats.priceRange && (
        <div className="stat-item">
          <span className="stat-label">価格帯</span>
          <span className="stat-value">
            ¥{stats.priceRange.min.toLocaleString()} - 
            ¥{stats.priceRange.max.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  </div>
);

// Visual boundary indicator
const SearchBoundary = ({ bounds, isDragging }) => {
  if (!bounds) return null;

  return (
    <div className={`search-boundary ${isDragging ? 'dragging' : ''}`}>
      <div className="boundary-corner top-left"></div>
      <div className="boundary-corner top-right"></div>
      <div className="boundary-corner bottom-left"></div>
      <div className="boundary-corner bottom-right"></div>
      <div className="boundary-center">
        <span className="boundary-text">検索エリア</span>
      </div>
    </div>
  );
};

// Advanced area search with filters
export const AdvancedAreaSearch = ({ 
  map, 
  onSearch, 
  filters = {},
  onFiltersChange 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleSearch = () => {
    if (!map) return;
    
    const bounds = map.getBounds();
    onSearch({
      bounds,
      filters: localFilters,
      center: bounds.getCenter(),
      zoom: map.getZoom()
    });
  };

  return (
    <div className="advanced-area-search">
      <button
        className="expand-search-btn"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>🔧 詳細検索</span>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {isExpanded && (
        <div className="search-filters">
          <div className="filter-group">
            <label>価格帯</label>
            <div className="price-range">
              <input
                type="number"
                placeholder="最低価格"
                value={localFilters.minPrice || ''}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />
              <span>〜</span>
              <input
                type="number"
                placeholder="最高価格"
                value={localFilters.maxPrice || ''}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>評価</label>
            <select
              value={localFilters.minRating || ''}
              onChange={(e) => handleFilterChange('minRating', e.target.value)}
            >
              <option value="">指定なし</option>
              <option value="3">3.0以上</option>
              <option value="4">4.0以上</option>
              <option value="4.5">4.5以上</option>
            </select>
          </div>

          <div className="filter-group">
            <label>設備</label>
            <div className="amenities-filter">
              {['WiFi', '駐車場', '朝食', 'ジム', 'プール'].map(amenity => (
                <label key={amenity} className="amenity-checkbox">
                  <input
                    type="checkbox"
                    checked={localFilters.amenities?.includes(amenity) || false}
                    onChange={(e) => {
                      const amenities = localFilters.amenities || [];
                      const newAmenities = e.target.checked
                        ? [...amenities, amenity]
                        : amenities.filter(a => a !== amenity);
                      handleFilterChange('amenities', newAmenities);
                    }}
                  />
                  <span>{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="apply-filters-btn" onClick={handleSearch}>
            この条件で検索
          </button>
        </div>
      )}
    </div>
  );
};

export default AreaSearchManager;