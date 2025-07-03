// Enhanced Hotel Search Form Component for Demo Mode
// Comprehensive search with filters, suggestions, and real-time validation

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './EnhancedSearchForm.css';

const EnhancedSearchForm = ({ onSearch, initialFilters = {}, isLoading = false }) => {
  // Search state
  const [searchParams, setSearchParams] = useState({
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
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableFilters, setAvailableFilters] = useState(null);

  // Refs
  const keywordInputRef = useRef(null);
  const searchFormRef = useRef(null);

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

  // Load search suggestions
  const loadSearchSuggestions = useCallback(async (query) => {
    try {
      const response = await fetch(`/api/hotels/suggestions?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        const allSuggestions = [
          ...data.data.locations.map(loc => ({ type: 'location', text: loc })),
          ...data.data.hotels.map(hotel => ({ type: 'hotel', text: hotel })),
          ...data.data.popular.map(pop => ({ type: 'popular', text: pop }))
        ];
        setSuggestions(allSuggestions.slice(0, 8));
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  }, []);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear specific field errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Hide suggestions when field is not keyword
    if (field !== 'keyword') {
      setShowSuggestions(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'location') {
      setSearchParams(prev => ({
        ...prev,
        keyword: suggestion.text
      }));
    } else {
      setSearchParams(prev => ({
        ...prev,
        keyword: suggestion.text
      }));
    }
    setShowSuggestions(false);
    keywordInputRef.current?.focus();
  };

  // Handle price range selection
  const handlePriceRangeChange = (priceRange) => {
    setSearchParams(prev => ({
      ...prev,
      minPrice: priceRange.min,
      maxPrice: priceRange.max
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Date validation
    if (searchParams.checkInDate && searchParams.checkOutDate) {
      const checkIn = new Date(searchParams.checkInDate);
      const checkOut = new Date(searchParams.checkOutDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkIn < today) {
        newErrors.checkInDate = 'チェックイン日は今日以降を選択してください';
      }

      if (checkOut <= checkIn) {
        newErrors.checkOutDate = 'チェックアウト日はチェックイン日より後を選択してください';
      }
    }

    // Guest validation
    if (searchParams.guests < 1 || searchParams.guests > 20) {
      newErrors.guests = '宿泊人数は1〜20人で入力してください';
    }

    // Room validation
    if (searchParams.rooms < 1 || searchParams.rooms > 10) {
      newErrors.rooms = '部屋数は1〜10部屋で入力してください';
    }

    // Price validation
    if (searchParams.minPrice && searchParams.maxPrice && 
        parseInt(searchParams.minPrice) > parseInt(searchParams.maxPrice)) {
      newErrors.maxPrice = '上限価格は下限価格より高く設定してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Clean search params
    const cleanParams = Object.entries(searchParams).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    console.log('🔍 Submitting search with params:', cleanParams);
    onSearch(cleanParams);
    setShowSuggestions(false);
  };

  // Handle quick search buttons
  const handleQuickSearch = (params) => {
    const mergedParams = { ...searchParams, ...params };
    setSearchParams(mergedParams);
    onSearch(mergedParams);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams({
      keyword: '',
      area: 'tokyo',
      subArea: '',
      checkInDate: searchParams.checkInDate,
      checkOutDate: searchParams.checkOutDate,
      guests: 2,
      rooms: 1,
      minPrice: '',
      maxPrice: '',
      rating: '',
      hotelType: '',
      sortBy: 'price'
    });
    setErrors({});
  };

  return (
    <div className="enhanced-search-form">
      <form ref={searchFormRef} onSubmit={handleSubmit} className="search-form">
        {/* Main Search Row */}
        <div className="search-row main-search">
          {/* Keyword Search */}
          <div className="search-field keyword-field">
            <label htmlFor="keyword">キーワード・エリア</label>
            <div className="input-with-suggestions">
              <input
                ref={keywordInputRef}
                type="text"
                id="keyword"
                value={searchParams.keyword}
                onChange={(e) => handleInputChange('keyword', e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="東京駅、新宿、ホテル名など"
                className={errors.keyword ? 'error' : ''}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`suggestion-item ${suggestion.type}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <span className="suggestion-icon">
                        {suggestion.type === 'location' ? '📍' : 
                         suggestion.type === 'hotel' ? '🏨' : '🔥'}
                      </span>
                      {suggestion.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.keyword && <span className="error-message">{errors.keyword}</span>}
          </div>

          {/* Area Selection */}
          <div className="search-field area-field">
            <label htmlFor="area">エリア</label>
            <select
              id="area"
              value={searchParams.area}
              onChange={(e) => handleInputChange('area', e.target.value)}
            >
              <optgroup label="人気エリア">
                {areaOptions.filter(area => area.popular).map(area => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="その他エリア">
                {areaOptions.filter(area => !area.popular).map(area => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Check-in Date */}
          <div className="search-field date-field">
            <label htmlFor="checkInDate">チェックイン</label>
            <input
              type="date"
              id="checkInDate"
              value={searchParams.checkInDate}
              onChange={(e) => handleInputChange('checkInDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={errors.checkInDate ? 'error' : ''}
            />
            {errors.checkInDate && <span className="error-message">{errors.checkInDate}</span>}
          </div>

          {/* Check-out Date */}
          <div className="search-field date-field">
            <label htmlFor="checkOutDate">チェックアウト</label>
            <input
              type="date"
              id="checkOutDate"
              value={searchParams.checkOutDate}
              onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
              min={searchParams.checkInDate || new Date().toISOString().split('T')[0]}
              className={errors.checkOutDate ? 'error' : ''}
            />
            {errors.checkOutDate && <span className="error-message">{errors.checkOutDate}</span>}
          </div>

          {/* Guests */}
          <div className="search-field guests-field">
            <label htmlFor="guests">人数</label>
            <select
              id="guests"
              value={searchParams.guests}
              onChange={(e) => handleInputChange('guests', parseInt(e.target.value))}
              className={errors.guests ? 'error' : ''}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>
                  {num}人
                </option>
              ))}
            </select>
            {errors.guests && <span className="error-message">{errors.guests}</span>}
          </div>

          {/* Search Button */}
          <div className="search-field search-button-field">
            <button
              type="submit"
              className="search-button primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  検索中...
                </>
              ) : (
                <>
                  🔍 検索
                </>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="filters-toggle">
          <button
            type="button"
            className="toggle-filters-button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <span>詳細フィルター</span>
            <span className={`toggle-icon ${showAdvancedFilters ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="advanced-filters">
            <div className="filters-row">
              {/* Price Range */}
              <div className="filter-group price-filter">
                <label>料金帯</label>
                <div className="price-range-buttons">
                  {priceRanges.map((range, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`price-range-button ${
                        searchParams.minPrice === range.min && 
                        searchParams.maxPrice === range.max ? 'active' : ''
                      }`}
                      onClick={() => handlePriceRangeChange(range)}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                
                {/* Custom Price Range */}
                <div className="custom-price-range">
                  <input
                    type="number"
                    placeholder="下限"
                    value={searchParams.minPrice}
                    onChange={(e) => handleInputChange('minPrice', e.target.value)}
                    min="0"
                    step="1000"
                  />
                  <span>〜</span>
                  <input
                    type="number"
                    placeholder="上限"
                    value={searchParams.maxPrice}
                    onChange={(e) => handleInputChange('maxPrice', e.target.value)}
                    min="0"
                    step="1000"
                    className={errors.maxPrice ? 'error' : ''}
                  />
                  <span>円</span>
                </div>
                {errors.maxPrice && <span className="error-message">{errors.maxPrice}</span>}
              </div>

              {/* Hotel Type */}
              <div className="filter-group hotel-type-filter">
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
              <div className="filter-group rating-filter">
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
              <div className="filter-group sort-filter">
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

              {/* Rooms */}
              <div className="filter-group rooms-filter">
                <label htmlFor="rooms">部屋数</label>
                <select
                  id="rooms"
                  value={searchParams.rooms}
                  onChange={(e) => handleInputChange('rooms', parseInt(e.target.value))}
                  className={errors.rooms ? 'error' : ''}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>
                      {num}部屋
                    </option>
                  ))}
                </select>
                {errors.rooms && <span className="error-message">{errors.rooms}</span>}
              </div>
            </div>

            {/* Filter Actions */}
            <div className="filter-actions">
              <button
                type="button"
                className="clear-filters-button"
                onClick={clearFilters}
              >
                フィルターをクリア
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Quick Search Buttons */}
      <div className="quick-search-buttons">
        <button
          type="button"
          className="quick-search-button"
          onClick={() => handleQuickSearch({ area: 'tokyo', keyword: '新宿' })}
        >
          🏙️ 新宿エリア
        </button>
        <button
          type="button"
          className="quick-search-button"
          onClick={() => handleQuickSearch({ area: 'tokyo', keyword: '渋谷' })}
        >
          🌆 渋谷エリア
        </button>
        <button
          type="button"
          className="quick-search-button"
          onClick={() => handleQuickSearch({ area: 'osaka', keyword: '梅田' })}
        >
          🏢 大阪梅田
        </button>
        <button
          type="button"
          className="quick-search-button"
          onClick={() => handleQuickSearch({ area: 'kyoto', keyword: '京都駅' })}
        >
          🏛️ 京都駅周辺
        </button>
        <button
          type="button"
          className="quick-search-button"
          onClick={() => handleQuickSearch({ hotelType: 'business', maxPrice: 10000 })}
        >
          💼 格安ビジネス
        </button>
        <button
          type="button"
          className="quick-search-button"
          onClick={() => handleQuickSearch({ hotelType: 'resort', minPrice: 20000 })}
        >
          🏖️ 高級リゾート
        </button>
      </div>
    </div>
  );
};

export default EnhancedSearchForm;