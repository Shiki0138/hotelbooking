import React, { useState, useCallback } from 'react';
import { Calendar, MapPin, Users, Sliders, Filter } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { prefectures, getCitiesByPrefecture } from '../../utils/locations';

interface AdvancedSearchProps {
  onSearch: (params: SearchParams) => void;
  initialParams?: SearchParams;
}

export interface SearchParams {
  location?: string;
  prefecture?: string;
  city?: string;
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: number;
  rooms: number;
  priceMin?: number;
  priceMax?: number;
  amenities: string[];
  sortBy: 'price' | 'rating' | 'distance';
  sortOrder: 'asc' | 'desc';
}

const amenitiesList = [
  { id: 'wifi', label: 'WiFi', icon: '📶' },
  { id: 'parking', label: 'Parking', icon: '🚗' },
  { id: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { id: 'pool', label: 'Pool', icon: '🏊' },
  { id: 'gym', label: 'Gym', icon: '💪' },
  { id: 'spa', label: 'Spa', icon: '🧖' },
  { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { id: 'bar', label: 'Bar', icon: '🍸' },
  { id: 'laundry', label: 'Laundry', icon: '🧺' },
  { id: 'petFriendly', label: 'Pet Friendly', icon: '🐕' },
  { id: 'nonSmoking', label: 'Non-Smoking', icon: '🚭' },
  { id: 'airConditioning', label: 'Air Conditioning', icon: '❄️' },
];

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ onSearch, initialParams }) => {
  const [params, setParams] = useState<SearchParams>(
    initialParams || {
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000), // Tomorrow
      adults: 2,
      children: 0,
      rooms: 1,
      amenities: [],
      sortBy: 'price',
      sortOrder: 'asc',
    }
  );

  const [showFilters, setShowFilters] = useState(false);
  const [cities, setCities] = useState<string[]>([]);

  const handlePrefectureChange = useCallback((prefecture: string) => {
    setParams(prev => ({ ...prev, prefecture, city: '' }));
    setCities(getCitiesByPrefecture(prefecture));
  }, []);

  const handleAmenityToggle = useCallback((amenityId: string) => {
    setParams(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  }, []);

  const handleSearch = useCallback(() => {
    onSearch(params);
  }, [params, onSearch]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Location Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <MapPin className="w-4 h-4 mr-1" />
            Prefecture
          </label>
          <select
            value={params.prefecture || ''}
            onChange={(e) => handlePrefectureChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Prefecture</option>
            {prefectures.map(pref => (
              <option key={pref} value={pref}>{pref}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">City</label>
          <select
            value={params.city || ''}
            onChange={(e) => setParams(prev => ({ ...prev, city: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!params.prefecture}
          >
            <option value="">Select City</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Or Search Location</label>
          <input
            type="text"
            value={params.location || ''}
            onChange={(e) => setParams(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Tokyo Tower, Shibuya..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4 mr-1" />
            Check-in Date
          </label>
          <DatePicker
            selected={params.checkInDate}
            onChange={(date) => setParams(prev => ({ ...prev, checkInDate: date || new Date() }))}
            minDate={new Date()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            dateFormat="yyyy/MM/dd"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4 mr-1" />
            Check-out Date
          </label>
          <DatePicker
            selected={params.checkOutDate}
            onChange={(date) => setParams(prev => ({ ...prev, checkOutDate: date || new Date() }))}
            minDate={params.checkInDate}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            dateFormat="yyyy/MM/dd"
          />
        </div>
      </div>

      {/* Guest and Room Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Users className="w-4 h-4 mr-1" />
            Adults
          </label>
          <select
            value={params.adults}
            onChange={(e) => setParams(prev => ({ ...prev, adults: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5, 6].map(num => (
              <option key={num} value={num}>{num} {num === 1 ? 'Adult' : 'Adults'}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Children</label>
          <select
            value={params.children}
            onChange={(e) => setParams(prev => ({ ...prev, children: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[0, 1, 2, 3, 4].map(num => (
              <option key={num} value={num}>{num} {num === 1 ? 'Child' : 'Children'}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Rooms</label>
          <select
            value={params.rooms}
            onChange={(e) => setParams(prev => ({ ...prev, rooms: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5].map(num => (
              <option key={num} value={num}>{num} {num === 1 ? 'Room' : 'Rooms'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
      >
        <Filter className="w-4 h-4 mr-2" />
        {showFilters ? 'Hide' : 'Show'} Advanced Filters
      </button>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="space-y-6 border-t pt-6">
          {/* Price Range */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Sliders className="w-4 h-4 mr-1" />
              Price Range (per night)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                value={params.priceMin || ''}
                onChange={(e) => setParams(prev => ({ ...prev, priceMin: parseInt(e.target.value) || undefined }))}
                placeholder="Min"
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={params.priceMax || ''}
                onChange={(e) => setParams(prev => ({ ...prev, priceMax: parseInt(e.target.value) || undefined }))}
                placeholder="Max"
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">JPY</span>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Amenities</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {amenitiesList.map(amenity => (
                <label
                  key={amenity.id}
                  className="flex items-center space-x-2 cursor-pointer hover:text-blue-600"
                >
                  <input
                    type="checkbox"
                    checked={params.amenities.includes(amenity.id)}
                    onChange={() => handleAmenityToggle(amenity.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">
                    {amenity.icon} {amenity.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Sort By</label>
              <select
                value={params.sortBy}
                onChange={(e) => setParams(prev => ({ ...prev, sortBy: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="price">Price</option>
                <option value="rating">Rating</option>
                <option value="distance">Distance</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Order</label>
              <select
                value={params.sortOrder}
                onChange={(e) => setParams(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asc">Low to High</option>
                <option value="desc">High to Low</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search Button */}
      <button
        onClick={handleSearch}
        className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
      >
        Search Hotels
      </button>
    </div>
  );
};

export default AdvancedSearch;