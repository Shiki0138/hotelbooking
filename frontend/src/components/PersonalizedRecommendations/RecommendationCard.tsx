import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Hotel } from '../../types/hotel';
import { ReasonTags } from './ReasonTags';

interface RecommendationCardProps {
  hotel: Hotel & {
    reason_tags?: string[];
    personalization_score?: number;
    is_personalized?: boolean;
  };
  onFavoriteToggle?: (hotelId: string) => void;
  isFavorite?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  hotel,
  onFavoriteToggle,
  isFavorite = false
}) => {
  const { t } = useTranslation();

  const getLowestPrice = () => {
    if (!hotel.rooms || hotel.rooms.length === 0) return null;
    return Math.min(...hotel.rooms.map(room => room.base_price));
  };

  const lowestPrice = getLowestPrice();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative">
      {/* Personalized Badge */}
      {hotel.is_personalized && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
            <svg 
              className="w-4 h-4 mr-1" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            あなた向け
          </div>
        </div>
      )}

      {/* Hotel Image */}
      <div className="relative h-48">
        <img
          src={hotel.image_url || '/images/hotel-placeholder.jpg'}
          alt={hotel.name}
          className="w-full h-full object-cover"
        />
        
        {/* Favorite Button */}
        <button
          onClick={() => onFavoriteToggle?.(hotel.id)}
          className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:shadow-lg transition-shadow"
        >
          <svg
            className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Hotel Info */}
      <div className="p-4">
        <Link to={`/hotels/${hotel.id}`}>
          <h3 className="text-lg font-semibold mb-1 hover:text-blue-600">
            {hotel.name}
          </h3>
        </Link>

        <div className="flex items-center text-sm text-gray-600 mb-2">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          {hotel.city}, {hotel.country}
        </div>

        {/* Star Rating */}
        <div className="flex items-center mb-2">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className={`w-4 h-4 ${
                i < hotel.star_rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          {hotel.user_rating && (
            <span className="ml-2 text-sm text-gray-600">
              {hotel.user_rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Recommendation Reasons */}
        {hotel.reason_tags && hotel.reason_tags.length > 0 && (
          <div className="mb-3">
            <ReasonTags tags={hotel.reason_tags} />
          </div>
        )}

        {/* Price */}
        {lowestPrice && (
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-gray-600 text-sm">最低価格</span>
              <div className="text-2xl font-bold text-blue-600">
                ¥{lowestPrice.toLocaleString()}
                <span className="text-sm text-gray-600 font-normal">/泊</span>
              </div>
            </div>
            {hotel.personalization_score && hotel.personalization_score > 80 && (
              <div className="text-sm text-purple-600 font-semibold">
                {hotel.personalization_score}% マッチ
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};