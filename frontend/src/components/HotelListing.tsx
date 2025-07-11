import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';
import { HotelBookingModal } from './HotelBookingModal';

interface Hotel {
  id: string;
  source?: 'rakuten' | 'agoda' | 'booking' | 'expedia';
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  price?: number;
  minPrice?: number;
  originalPrice?: number;
  discountedPrice?: number;
  discountPercentage?: number;
  images: string[];
  thumbnailUrl: string;
  access?: string;
  nearestStation?: string;
  rakutenUrl?: string;
  bookingUrl?: string;
  isLuxury?: boolean;
  isLastMinuteDeal?: boolean;
}

interface HotelListingProps {
  type: 'luxury' | 'lastMinute';
  city?: string;
  checkinDate?: string;
  checkoutDate?: string;
  useAggregator?: boolean;
}

export const HotelListing: React.FC<HotelListingProps> = ({ type, city, checkinDate, checkoutDate, useAggregator = false }) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    loadHotels();
  }, [type, city, checkinDate, checkoutDate]);

  const loadHotels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {};
      if (city) params.city = city;
      if (checkinDate) params.checkinDate = checkinDate;
      if (checkoutDate) params.checkoutDate = checkoutDate;

      const response = await (
        useAggregator
          ? (type === 'luxury' 
            ? apiService.hotels.aggregated({ ...params, sources: 'all' })
            : apiService.aggregator.getLastMinuteDeals({ ...params, sources: 'all' }))
          : (type === 'luxury' 
            ? apiService.rakuten.getLuxuryHotels(params)
            : apiService.rakuten.getLastMinuteDeals(params))
      );

      setHotels(response.data || []);
    } catch (err) {
      console.error('Failed to load hotels:', err);
      setError('ホテル情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        該当するホテルが見つかりませんでした
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {hotels.map((hotel) => (
        <div key={hotel.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="relative h-40">
            <img
              src={hotel.thumbnailUrl || hotel.images[0] || 'https://via.placeholder.com/400x300'}
              alt={hotel.name}
              className="w-full h-full object-cover"
            />
            {hotel.isLuxury && (
              <span className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                LUXURY
              </span>
            )}
            {hotel.isLastMinuteDeal && hotel.discountPercentage && (
              <div className="absolute top-2 right-2">
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                  -{hotel.discountPercentage}%
                </span>
              </div>
            )}
          </div>
          
          <div className="p-3">
            <h3 className="font-bold text-base mb-1 line-clamp-1">{hotel.name}</h3>
            
            <div className="flex items-center mb-1">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3 h-3 ${i < Math.floor(hotel.rating) ? 'fill-current' : 'fill-gray-300'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-gray-600 ml-1">
                {hotel.rating} ({hotel.reviewCount})
              </span>
            </div>

            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {hotel.city}
              </p>
              {hotel.source && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  hotel.source === 'rakuten' ? 'bg-red-100 text-red-600' :
                  hotel.source === 'agoda' ? 'bg-blue-100 text-blue-600' :
                  hotel.source === 'booking' ? 'bg-green-100 text-green-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {hotel.source === 'rakuten' ? '楽天' :
                   hotel.source === 'agoda' ? 'Agoda' :
                   hotel.source === 'booking' ? 'Booking' :
                   hotel.source}
                </span>
              )}
            </div>

            {hotel.nearestStation && (
              <p className="text-xs text-gray-500 mb-2 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                {hotel.nearestStation}
              </p>
            )}

            <div className="border-t pt-2">
              {hotel.isLastMinuteDeal && hotel.originalPrice ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 line-through">
                      ¥{hotel.originalPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-green-600">
                      {Math.round((hotel.originalPrice - (hotel.discountedPrice || 0)) / hotel.originalPrice * 100)}%お得！
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-xl font-bold text-red-600">
                      ¥{hotel.discountedPrice?.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-600 ml-1">/泊</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline">
                  <span className="text-xl font-bold text-gray-900">
                    ¥{(hotel.price || hotel.minPrice)?.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-600 ml-1">{hotel.minPrice ? '〜' : ''}/泊</span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleBooking(hotel)}
              className="mt-3 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-4 rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-bold text-sm shadow-md hover:shadow-lg transform hover:scale-105"
            >
              今すぐ予約
            </button>
          </div>
        </div>
      ))}
      
      {selectedHotel && (
        <HotelBookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedHotel(null);
          }}
          hotel={{
            id: selectedHotel.id,
            name: selectedHotel.name,
            thumbnailUrl: selectedHotel.thumbnailUrl,
            rating: selectedHotel.rating,
            city: selectedHotel.city
          }}
          checkinDate={checkinDate || new Date().toISOString().split('T')[0]}
          checkoutDate={checkoutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]}
        />
      )}
    </div>
  );
};