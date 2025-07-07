import React, { useState, useEffect } from 'react';
import { Search, Map, Calendar, SlidersHorizontal } from 'lucide-react';
import AdvancedSearch, { SearchParams } from './AdvancedSearch';
import MapSearch from './MapSearch';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface HotelSearchFormProps {
  onSearch?: (results: any[]) => void;
}

type SearchTab = 'quick' | 'advanced' | 'map';

const HotelSearchForm: React.FC<HotelSearchFormProps> = ({ onSearch }) => {
  const [activeTab, setActiveTab] = useState<SearchTab>('quick');
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [savedSearches, setSavedSearches] = useState<SearchParams[]>([]);
  const navigate = useNavigate();

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    // Load saved searches from localStorage
    const saved = localStorage.getItem('savedHotelSearches');
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  const handleQuickSearch = async () => {
    if (!quickSearchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await axios.get('/api/hotels/search', {
        params: { query: quickSearchQuery },
      });
      const results = response.data.hotels || [];
      setSearchResults(results);
      if (onSearch) {
        onSearch(results);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Use mock data for now
      const mockResults = generateMockResults(quickSearchQuery);
      setSearchResults(mockResults);
      if (onSearch) {
        onSearch(mockResults);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdvancedSearch = async (params: SearchParams) => {
    setIsSearching(true);
    try {
      const response = await axios.post('/api/hotels/advanced-search', params);
      const results = response.data.hotels || [];
      setSearchResults(results);
      if (onSearch) {
        onSearch(results);
      }
      
      // Save search preferences
      saveSearchPreferences(params);
    } catch (error) {
      console.error('Advanced search error:', error);
      // Use mock data for now
      const mockResults = generateMockResults(params.location || params.city || 'Hotels');
      setSearchResults(mockResults);
      if (onSearch) {
        onSearch(mockResults);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapSearchArea = async (bounds: google.maps.LatLngBounds, center: { lat: number; lng: number }) => {
    setIsSearching(true);
    try {
      const response = await axios.get('/api/hotels/search-by-location', {
        params: {
          latitude: center.lat,
          longitude: center.lng,
          bounds: {
            north: bounds.getNorthEast().lat(),
            south: bounds.getSouthWest().lat(),
            east: bounds.getNorthEast().lng(),
            west: bounds.getSouthWest().lng(),
          },
        },
      });
      const results = response.data.hotels || [];
      setSearchResults(results);
      if (onSearch) {
        onSearch(results);
      }
    } catch (error) {
      console.error('Map search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectHotel = (hotel: any) => {
    navigate(`/hotels/${hotel.id}`);
  };

  const saveSearchPreferences = (params: SearchParams) => {
    const updatedSearches = [params, ...savedSearches.slice(0, 4)];
    setSavedSearches(updatedSearches);
    localStorage.setItem('savedHotelSearches', JSON.stringify(updatedSearches));
  };

  const generateMockResults = (query: string) => {
    const hotels = [
      { id: '1', name: 'Tokyo Grand Hotel', price: 15000, rating: 4.5, location: query },
      { id: '2', name: 'Sakura Inn', price: 8000, rating: 4.2, location: query },
      { id: '3', name: 'Imperial Palace Hotel', price: 25000, rating: 4.8, location: query },
      { id: '4', name: 'Budget Stay Tokyo', price: 5000, rating: 3.9, location: query },
      { id: '5', name: 'Luxury Suites', price: 35000, rating: 4.9, location: query },
    ];
    return hotels;
  };

  const tabs = [
    { id: 'quick' as SearchTab, label: 'Quick Search', icon: Search },
    { id: 'advanced' as SearchTab, label: 'Advanced', icon: SlidersHorizontal },
    { id: 'map' as SearchTab, label: 'Map Search', icon: Map },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      {/* Tab Navigation */}
      <div className="bg-white rounded-t-lg shadow-sm border-b">
        <div className="flex flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] flex items-center justify-center px-4 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-lg shadow-lg">
        {/* Quick Search Tab */}
        {activeTab === 'quick' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuickSearch()}
                  placeholder="Search by city, hotel name, or landmark..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleQuickSearch}
                disabled={isSearching}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSearching ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>

            {/* Recent Searches */}
            {savedSearches.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Searches</h3>
                <div className="flex flex-wrap gap-2">
                  {savedSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleAdvancedSearch(search)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                    >
                      {search.city || search.prefecture || search.location || 'Saved Search'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced Search Tab */}
        {activeTab === 'advanced' && (
          <div className="p-6">
            <AdvancedSearch
              onSearch={handleAdvancedSearch}
              initialParams={savedSearches[0]}
            />
          </div>
        )}

        {/* Map Search Tab */}
        {activeTab === 'map' && (
          <div className="relative">
            {googleMapsApiKey ? (
              <MapSearch
                apiKey={googleMapsApiKey}
                onSelectHotel={handleSelectHotel}
                onSearchArea={handleMapSearchArea}
              />
            ) : (
              <div className="p-12 text-center">
                <Map className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Google Maps API key is required for map search.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile-optimized Results Summary */}
      {searchResults.length > 0 && (
        <div className="mt-4 bg-blue-50 rounded-lg p-3 sm:hidden">
          <p className="text-sm font-medium text-blue-900">
            Found {searchResults.length} hotels
          </p>
        </div>
      )}
    </div>
  );
};

export default HotelSearchForm;