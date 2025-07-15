// Enhanced Hotel Search Form Component for Demo Mode
// Comprehensive search with filters, suggestions, and real-time validation

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { searchHotels, Hotel } from '../../data/hotelsDatabase';
import './EnhancedSearchForm.css';

interface SearchParams {
  keyword: string;
  area: string;
  subArea: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  rooms: number;
  minPrice: string;
  maxPrice: string;
  rating: string;
  hotelType: string;
  sortBy: string;
}

interface HotelSuggestion {
  type: 'hotel' | 'location' | 'popular';
  text: string;
  hotel?: Hotel;
}

interface EnhancedSearchFormProps {
  onSearch: (params: SearchParams) => void;
  initialFilters?: Partial<SearchParams>;
  isLoading?: boolean;
}

const EnhancedSearchForm: React.FC<EnhancedSearchFormProps> = ({ 
  onSearch, 
  initialFilters = {}, 
  isLoading = false 
}) => {
  // Search state
  const [searchParams, setSearchParams] = useState<SearchParams>({
    keyword: '',
    area: 'tokyo',
    subArea: '',
    checkInDate: '',
    checkOutDate: '',
    guests: 2,
    rooms: 1,
    minPrice: '',
    maxPrice: '',
    rating: '',
    hotelType: '',
    sortBy: 'price',
    ...initialFilters
  });

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<HotelSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableFilters, setAvailableFilters] = useState(null);

  // Refs
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const searchFormRef = useRef<HTMLFormElement>(null);

  // Area options
  const areaOptions = [
    { value: 'tokyo', label: '東京都', popular: true },
    { value: 'osaka', label: '大阪府', popular: true },
    { value: 'kyoto', label: '京都府', popular: true },
    { value: 'kanagawa', label: '神奈川県', popular: false },
    { value: 'chiba', label: '千葉県', popular: false },
    { value: 'saitama', label: '埼玉県', popular: false },
    { value: 'hokkaido', label: '北海道', popular: true },
    { value: 'okinawa', label: '沖縄県', popular: true }
  ];

  // Price ranges
  const priceRanges = [
    { min: '', max: '', label: '指定なし' },
    { min: 0, max: 5000, label: '5,000円未満' },
    { min: 5000, max: 10000, label: '5,000円〜10,000円' },
    { min: 10000, max: 20000, label: '10,000円〜20,000円' },
    { min: 20000, max: 50000, label: '20,000円〜50,000円' },
    { min: 50000, max: '', label: '50,000円以上' }
  ];

  // Hotel types
  const hotelTypes = [
    { value: '', label: 'すべて' },
    { value: 'business', label: 'ビジネスホテル' },
    { value: 'hotel', label: 'シティホテル' },
    { value: 'resort', label: 'リゾートホテル' },
    { value: 'ryokan', label: '旅館' },
    { value: 'pension', label: 'ペンション・民宿' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'price', label: '料金が安い順' },
    { value: 'price_desc', label: '料金が高い順' },
    { value: 'rating', label: '評価が高い順' },
    { value: 'name', label: '名前順' }
  ];

  // Load available filters on mount
  useEffect(() => {
    loadAvailableFilters();
  }, []);

  // Load suggestions when keyword changes
  useEffect(() => {
    if (searchParams.keyword.length > 1) {
      loadSearchSuggestions(searchParams.keyword);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchParams.keyword]);

  // Set default dates
  useEffect(() => {
    if (!searchParams.checkInDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 2);
      
      setSearchParams(prev => ({
        ...prev,
        checkInDate: tomorrow.toISOString().split('T')[0],
        checkOutDate: nextDay.toISOString().split('T')[0]
      }));
    }
  }, []);

  // Load available filters from API
  const loadAvailableFilters = async () => {
    try {
      const response = await fetch('/api/hotels/filters');
      if (response.ok) {
        const data = await response.json();
        setAvailableFilters(data.data);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  // Load search suggestions using real hotel database
  const loadSearchSuggestions = useCallback((query: string) => {
    const hotels = searchHotels(query, 8);
    const hotelSuggestions: HotelSuggestion[] = hotels.map(hotel => ({
      type: 'hotel' as const,
      text: hotel.name,
      hotel
    }));

    // 地域の候補も追加
    const areaSuggestions: HotelSuggestion[] = [];
    const areaKeywords = ['東京', '大阪', '京都', '新宿', '渋谷', '梅田', '心斎橋'];
    areaKeywords.forEach(area => {
      if (area.includes(query) || query.includes(area)) {
        areaSuggestions.push({
          type: 'location' as const,
          text: area
        });
      }
    });

    const allSuggestions = [...hotelSuggestions, ...areaSuggestions].slice(0, 8);
    setSuggestions(allSuggestions);
    setShowSuggestions(allSuggestions.length > 0);
  }, []);

  // Handle input changes
  const handleInputChange = (field: keyof SearchParams, value: string | number) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear related errors
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: HotelSuggestion) => {
    if (suggestion.type === 'hotel' && suggestion.hotel) {
      setSearchParams(prev => ({
        ...prev,
        keyword: suggestion.hotel!.name
      }));
    } else {
      setSearchParams(prev => ({
        ...prev,
        keyword: suggestion.text
      }));
    }
    setShowSuggestions(false);
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!searchParams.keyword && !searchParams.area) {
      newErrors.keyword = 'キーワードまたはエリアを入力してください';
    }
    
    if (!searchParams.checkInDate) {
      newErrors.checkInDate = 'チェックイン日を選択してください';
    }
    
    if (!searchParams.checkOutDate) {
      newErrors.checkOutDate = 'チェックアウト日を選択してください';
    }
    
    if (searchParams.checkInDate && searchParams.checkOutDate) {
      const checkIn = new Date(searchParams.checkInDate);
      const checkOut = new Date(searchParams.checkOutDate);
      if (checkOut <= checkIn) {
        newErrors.checkOutDate = 'チェックアウト日はチェックイン日より後にしてください';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSearch(searchParams);
    }
  };

  // Handle price range selection
  const handlePriceRangeSelect = (range: typeof priceRanges[0]) => {
    setSearchParams(prev => ({
      ...prev,
      minPrice: range.min.toString(),
      maxPrice: range.max.toString()
    }));
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchFormRef.current && !searchFormRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <form ref={searchFormRef} onSubmit={handleSearch} className="enhanced-search-form">
      <div className="search-main-section">
        {/* Keyword Search */}
        <div className="search-field search-keyword">
          <label htmlFor="keyword">キーワード</label>
          <div className="keyword-input-wrapper">
            <input
              ref={keywordInputRef}
              id="keyword"
              type="text"
              value={searchParams.keyword}
              onChange={(e) => handleInputChange('keyword', e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="ホテル名・エリア名"
              className={errors.keyword ? 'error' : ''}
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`suggestion-item ${suggestion.type}`}
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <span className="suggestion-icon">
                      {suggestion.type === 'hotel' ? '🏨' : 
                       suggestion.type === 'location' ? '📍' : '⭐'}
                    </span>
                    <div className="suggestion-content">
                      <div className="suggestion-text">{suggestion.text}</div>
                      {suggestion.type === 'hotel' && suggestion.hotel && (
                        <div className="suggestion-details">
                          {suggestion.hotel.location} · 
                          <span className={`category-badge ${suggestion.hotel.category}`}>
                            {suggestion.hotel.category === 'luxury' ? '高級' :
                             suggestion.hotel.category === 'popular' ? '人気' :
                             suggestion.hotel.category === 'business' ? 'ビジネス' :
                             suggestion.hotel.category === 'standard' ? 'スタンダード' : '格安'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.keyword && <span className="error-message">{errors.keyword}</span>}
        </div>

        {/* Area Selection */}
        <div className="search-field search-area">
          <label htmlFor="area">エリア</label>
          <select
            id="area"
            value={searchParams.area}
            onChange={(e) => handleInputChange('area', e.target.value)}
          >
            <optgroup label="人気エリア">
              {areaOptions.filter(opt => opt.popular).map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="その他のエリア">
              {areaOptions.filter(opt => !opt.popular).map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Date Selection */}
        <div className="search-field search-dates">
          <div className="date-field">
            <label htmlFor="checkIn">チェックイン</label>
            <input
              id="checkIn"
              type="date"
              value={searchParams.checkInDate}
              onChange={(e) => handleInputChange('checkInDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={errors.checkInDate ? 'error' : ''}
            />
            {errors.checkInDate && <span className="error-message">{errors.checkInDate}</span>}
          </div>
          
          <div className="date-field">
            <label htmlFor="checkOut">チェックアウト</label>
            <input
              id="checkOut"
              type="date"
              value={searchParams.checkOutDate}
              onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
              min={searchParams.checkInDate || new Date().toISOString().split('T')[0]}
              className={errors.checkOutDate ? 'error' : ''}
            />
            {errors.checkOutDate && <span className="error-message">{errors.checkOutDate}</span>}
          </div>
        </div>

        {/* Guests and Rooms */}
        <div className="search-field search-capacity">
          <div className="capacity-field">
            <label htmlFor="guests">宿泊人数</label>
            <select
              id="guests"
              value={searchParams.guests}
              onChange={(e) => handleInputChange('guests', parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>{num}名</option>
              ))}
            </select>
          </div>
          
          <div className="capacity-field">
            <label htmlFor="rooms">部屋数</label>
            <select
              id="rooms"
              value={searchParams.rooms}
              onChange={(e) => handleInputChange('rooms', parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num}部屋</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Button */}
        <button 
          type="submit" 
          className="search-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading-text">
              <span className="spinner"></span>
              検索中...
            </span>
          ) : (
            <>
              <span className="search-icon">🔍</span>
              検索
            </>
          )}
        </button>
      </div>

      {/* Advanced Filters Toggle */}
      <button
        type="button"
        className="advanced-filters-toggle"
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
      >
        <span className="toggle-icon">{showAdvancedFilters ? '▲' : '▼'}</span>
        詳細条件を{showAdvancedFilters ? '閉じる' : '開く'}
      </button>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="advanced-filters-section">
          {/* Price Range */}
          <div className="filter-group">
            <label>料金範囲</label>
            <div className="price-range-buttons">
              {priceRanges.map((range, index) => (
                <button
                  key={index}
                  type="button"
                  className={`price-range-button ${
                    searchParams.minPrice === range.min.toString() &&
                    searchParams.maxPrice === range.max.toString() ? 'active' : ''
                  }`}
                  onClick={() => handlePriceRangeSelect(range)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hotel Type */}
          <div className="filter-group">
            <label htmlFor="hotelType">ホテルタイプ</label>
            <select
              id="hotelType"
              value={searchParams.hotelType}
              onChange={(e) => handleInputChange('hotelType', e.target.value)}
            >
              {hotelTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Rating */}
          <div className="filter-group">
            <label htmlFor="rating">評価</label>
            <select
              id="rating"
              value={searchParams.rating}
              onChange={(e) => handleInputChange('rating', e.target.value)}
            >
              <option value="">指定なし</option>
              <option value="4.5">4.5以上</option>
              <option value="4.0">4.0以上</option>
              <option value="3.5">3.5以上</option>
              <option value="3.0">3.0以上</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="filter-group">
            <label htmlFor="sortBy">並び順</label>
            <select
              id="sortBy"
              value={searchParams.sortBy}
              onChange={(e) => handleInputChange('sortBy', e.target.value)}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </form>
  );
};

export default EnhancedSearchForm;