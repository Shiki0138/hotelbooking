import React, { useState, useRef, useEffect, useCallback } from 'react';
import { autocompleteDebounce } from '../utils/debounce';
import './EnhancedSearchBar.css';

interface AutocompleteResult {
  id: string;
  type: 'city' | 'hotel' | 'landmark' | 'area' | 'station';
  text: string;
  displayText: string;
  subtitle?: string;
  score: number;
  metadata?: {
    distance?: string;
    price?: string;
    rating?: number;
    popular?: boolean;
  };
}

interface SearchHistory {
  id: string;
  text: string;
  timestamp: Date;
}

interface EnhancedSearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onSelect?: (result: AutocompleteResult) => void;
  className?: string;
  disabled?: boolean;
  initialValue?: string;
  showFilters?: boolean;
  autoFocus?: boolean;
}

export const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  placeholder = "東京駅、新宿、ホテル名を検索...",
  onSearch,
  onSelect,
  className = "",
  disabled = false,
  initialValue = "",
  showFilters = true,
  autoFocus = false
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    autocompleteDebounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        setShowHistory(true);
        return;
      }
      
      setShowHistory(false);
      
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(
          `/api/autocomplete/suggestions?q=${encodeURIComponent(query)}&limit=10`,
          {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setIsOpen(true);
        setSelectedIndex(-1);
        
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Autocomplete error:', err);
          setError('検索に失敗しました');
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 150),
    []
  );
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.trim()) {
      debouncedSearch(value.trim());
    } else {
      setSuggestions([]);
      setIsOpen(false);
      setShowHistory(true);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addToHistory(inputValue.trim());
      onSearch(inputValue.trim());
      setIsOpen(false);
    }
  };
  
  // Add to search history
  const addToHistory = (text: string) => {
    const newHistory = [
      { id: Date.now().toString(), text, timestamp: new Date() },
      ...searchHistory.filter(h => h.text !== text).slice(0, 4)
    ];
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const items = showHistory ? searchHistory : suggestions;
    
    if (!isOpen || items.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (showHistory) {
            const history = searchHistory[selectedIndex];
            setInputValue(history.text);
            onSearch(history.text);
          } else {
            const suggestion = suggestions[selectedIndex];
            handleSelect(suggestion);
          }
        } else {
          handleSubmit(e);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };
  
  // Handle suggestion selection
  const handleSelect = (suggestion: AutocompleteResult) => {
    setInputValue(suggestion.displayText);
    setIsOpen(false);
    setSelectedIndex(-1);
    addToHistory(suggestion.displayText);
    
    if (onSelect) {
      onSelect(suggestion);
    } else {
      onSearch(suggestion.displayText);
    }
  };
  
  // Handle history item selection
  const handleHistorySelect = (history: SearchHistory) => {
    setInputValue(history.text);
    setIsOpen(false);
    onSearch(history.text);
  };
  
  // Clear search history
  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const getIconForType = (type: string) => {
    switch (type) {
      case 'city': return '🏙️';
      case 'hotel': return '🏨';
      case 'landmark': return '🗺️';
      case 'area': return '📍';
      case 'station': return '🚉';
      default: return '🔍';
    }
  };
  
  const getPopularityBadge = (metadata?: any) => {
    if (metadata?.popular) {
      return <span className="popularity-badge">人気</span>;
    }
    return null;
  };
  
  return (
    <div ref={containerRef} className={`enhanced-search-bar ${className} ${isFocused ? 'focused' : ''}`}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <div className="search-icon-wrapper">
            <span className="search-icon">🔍</span>
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              if (inputValue.length < 2 && searchHistory.length > 0) {
                setShowHistory(true);
                setIsOpen(true);
              } else if (suggestions.length > 0) {
                setIsOpen(true);
              }
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            className="search-input"
            autoComplete="off"
            spellCheck="false"
          />
          
          {/* Action buttons */}
          <div className="search-actions">
            {isLoading && (
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
            )}
            
            {inputValue && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  setInputValue('');
                  setSuggestions([]);
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                className="clear-button"
                aria-label="検索をクリア"
              >
                ✕
              </button>
            )}
            
            <button
              type="submit"
              className="search-button"
              disabled={!inputValue.trim() || disabled}
              aria-label="検索"
            >
              <span>検索</span>
            </button>
          </div>
        </div>
        
        {/* Filter buttons */}
        {showFilters && (
          <div className="search-filters">
            <button type="button" className="filter-button active">
              <span className="filter-icon">📅</span>
              今夜
            </button>
            <button type="button" className="filter-button">
              <span className="filter-icon">👥</span>
              2名
            </button>
            <button type="button" className="filter-button">
              <span className="filter-icon">💰</span>
              予算
            </button>
            <button type="button" className="filter-button">
              <span className="filter-icon">⚙️</span>
              詳細条件
            </button>
          </div>
        )}
      </form>
      
      {/* Error message */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
      
      {/* Suggestions dropdown */}
      {isOpen && (
        <div className="suggestions-dropdown">
          {/* Search history */}
          {showHistory && searchHistory.length > 0 && (
            <div className="history-section">
              <div className="section-header">
                <span>最近の検索</span>
                <button onClick={clearHistory} className="clear-history-btn">
                  クリア
                </button>
              </div>
              <ul className="suggestions-list">
                {searchHistory.map((history, index) => (
                  <li
                    key={history.id}
                    onClick={() => handleHistorySelect(history)}
                    className={`suggestion-item history-item ${
                      index === selectedIndex ? 'selected' : ''
                    }`}
                  >
                    <span className="suggestion-icon">🕐</span>
                    <span className="suggestion-text">{history.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Autocomplete suggestions */}
          {!showHistory && suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  onClick={() => handleSelect(suggestion)}
                  className={`suggestion-item ${
                    index === selectedIndex ? 'selected' : ''
                  }`}
                >
                  <span className="suggestion-icon">
                    {getIconForType(suggestion.type)}
                  </span>
                  <div className="suggestion-content">
                    <div className="suggestion-main">
                      <span className="suggestion-text">
                        {suggestion.displayText}
                      </span>
                      {getPopularityBadge(suggestion.metadata)}
                    </div>
                    {suggestion.subtitle && (
                      <div className="suggestion-subtitle">
                        {suggestion.subtitle}
                      </div>
                    )}
                    {suggestion.metadata && (
                      <div className="suggestion-metadata">
                        {suggestion.metadata.distance && (
                          <span className="metadata-item">
                            📍 {suggestion.metadata.distance}
                          </span>
                        )}
                        {suggestion.metadata.price && (
                          <span className="metadata-item">
                            💰 {suggestion.metadata.price}〜
                          </span>
                        )}
                        {suggestion.metadata.rating && (
                          <span className="metadata-item">
                            ⭐ {suggestion.metadata.rating}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="suggestion-type">
                    {suggestion.type === 'city' && '都市'}
                    {suggestion.type === 'hotel' && 'ホテル'}
                    {suggestion.type === 'landmark' && 'ランドマーク'}
                    {suggestion.type === 'area' && 'エリア'}
                    {suggestion.type === 'station' && '駅'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          
          {/* No results */}
          {!showHistory && !isLoading && suggestions.length === 0 && inputValue.length >= 2 && (
            <div className="no-results">
              <span className="no-results-icon">🔍</span>
              <p>「{inputValue}」の検索結果が見つかりません</p>
              <p className="no-results-hint">別のキーワードをお試しください</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};