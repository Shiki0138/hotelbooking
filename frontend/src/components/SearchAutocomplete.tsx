import React, { useState, useRef, useEffect, useCallback } from 'react';
import { autocompleteDebounce } from '../utils/debounce';

interface AutocompleteResult {
  id: string;
  type: 'city' | 'hotel' | 'landmark' | 'area';
  text: string;
  displayText: string;
  subtitle?: string;
  score: number;
  metadata?: any;
}

interface SearchAutocompleteProps {
  placeholder?: string;
  onSelect: (result: AutocompleteResult) => void;
  onInputChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  initialValue?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  placeholder = "目的地を検索...",
  onSelect,
  onInputChange,
  className = "",
  disabled = false,
  initialValue = ""
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    autocompleteDebounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      
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
          `/api/autocomplete/suggestions?q=${encodeURIComponent(query)}&limit=8`,
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
    onInputChange?.(value);
    
    if (value.trim()) {
      debouncedSearch(value.trim());
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
        
      case 'Tab':
        // Allow tab to close suggestions
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };
  
  // Handle suggestion selection
  const handleSelect = (suggestion: AutocompleteResult) => {
    setInputValue(suggestion.displayText);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect(suggestion);
    
    // Update search history
    fetch('/api/autocomplete/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerm: suggestion.text })
    }).catch(err => console.warn('Failed to update search history:', err));
  };
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          listRef.current && !listRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  const getIconForType = (type: string) => {
    switch (type) {
      case 'city': return '🏙️';
      case 'hotel': return '🏨';
      case 'landmark': return '🗺️';
      case 'area': return '📍';
      default: return '🔍';
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 pl-12 pr-10 text-lg border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            transition-all duration-200
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
          `}
          autoComplete="off"
          spellCheck="false"
        />
        
        {/* Search icon */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
          🔍
        </div>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Clear button */}
        {inputValue && !isLoading && (
          <button
            onClick={() => {
              setInputValue('');
              setSuggestions([]);
              setIsOpen(false);
              onInputChange?.('');
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mt-1 text-sm text-red-600">
          {error}
        </div>
      )}
      
      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className={`
                px-4 py-3 cursor-pointer transition-colors duration-150
                flex items-center space-x-3
                ${index === selectedIndex 
                  ? 'bg-blue-50 text-blue-900' 
                  : 'hover:bg-gray-50'
                }
                ${index === 0 ? 'rounded-t-lg' : ''}
                ${index === suggestions.length - 1 ? 'rounded-b-lg' : 'border-b border-gray-100'}
              `}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <span className="text-xl">{getIconForType(suggestion.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {suggestion.displayText}
                </div>
                {suggestion.subtitle && (
                  <div className="text-sm text-gray-500 truncate">
                    {suggestion.subtitle}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 capitalize">
                {suggestion.type}
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {/* No results message */}
      {isOpen && !isLoading && suggestions.length === 0 && inputValue.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="px-4 py-3 text-gray-500 text-center">
            「{inputValue}」の検索結果が見つかりません
          </div>
        </div>
      )}
    </div>
  );
};