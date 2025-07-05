import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api.service';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Clock, MapPin, Calendar, Users, DollarSign, X } from 'lucide-react';

interface SearchHistoryItem {
  id: string;
  filters: {
    city?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    priceRange?: {
      min: number;
      max: number;
    };
    rating?: number;
    hotelType?: string;
  };
  timestamp: string;
  resultCount: number;
}

const SearchHistory: React.FC = () => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      fetchSearchHistory();
    }
  }, [isAuthenticated]);

  const fetchSearchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/user-preferences/search-history');
      setSearchHistory(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch search history:', err);
      setError('Failed to load search history');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAgain = (item: SearchHistoryItem) => {
    const params = new URLSearchParams();
    
    if (item.filters.city) params.append('city', item.filters.city);
    if (item.filters.checkIn) params.append('checkIn', item.filters.checkIn);
    if (item.filters.checkOut) params.append('checkOut', item.filters.checkOut);
    if (item.filters.guests) params.append('guests', item.filters.guests.toString());
    if (item.filters.priceRange) {
      params.append('minPrice', item.filters.priceRange.min.toString());
      params.append('maxPrice', item.filters.priceRange.max.toString());
    }
    if (item.filters.rating) params.append('rating', item.filters.rating.toString());
    if (item.filters.hotelType) params.append('hotelType', item.filters.hotelType);
    
    navigate(`/search?${params.toString()}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Less than an hour ago';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600 mb-4">Sign in to view your search history</p>
        <Button onClick={() => navigate('/login')}>Sign In</Button>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchSearchHistory} className="mt-4">Retry</Button>
      </Card>
    );
  }

  if (searchHistory.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No search history yet</p>
        <p className="text-sm text-gray-500 mt-2">Your recent searches will appear here</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Searches</h3>
        <span className="text-sm text-gray-500">{searchHistory.length} searches</span>
      </div>
      
      {searchHistory.map((item) => (
        <Card key={item.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  {item.filters.city && (
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{item.filters.city}</span>
                    </div>
                  )}
                  {item.filters.checkIn && item.filters.checkOut && (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{formatDate(item.filters.checkIn)} - {formatDate(item.filters.checkOut)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {item.filters.guests && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{item.filters.guests} guests</span>
                    </div>
                  )}
                  {item.filters.priceRange && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>${item.filters.priceRange.min} - ${item.filters.priceRange.max}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(item.timestamp)}</span>
                  </div>
                  <span className="text-gray-500">
                    {item.resultCount} results
                  </span>
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSearchAgain(item)}
                className="ml-4"
              >
                Search Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SearchHistory;