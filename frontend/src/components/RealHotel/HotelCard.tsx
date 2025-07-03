import React from 'react';

export interface Hotel {
  hotelNo: string;
  hotelName: string;
  hotelInformationUrl: string;
  hotelThumbnailUrl: string;
  roomThumbnailUrl?: string;
  hotelMinCharge: number;
  latitude: number;
  longitude: number;
  reviewAverage: number;
  reviewCount: number;
  userReview?: string;
  address1: string;
  address2: string;
  telephoneNo: string;
  access: string;
  hotelSpecial?: string;
  vacancy?: 'available' | 'few' | 'none';
}

interface HotelCardProps {
  hotel: Hotel;
  onViewDetails: (hotel: Hotel) => void;
  onAddToWatchlist?: (hotel: Hotel) => void;
}

const HotelCard: React.FC<HotelCardProps> = ({ hotel, onViewDetails, onAddToWatchlist }) => {
  const getVacancyBadge = () => {
    if (hotel.vacancy === 'none') {
      return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">満室</span>;
    } else if (hotel.vacancy === 'few') {
      return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">残りわずか</span>;
    } else {
      return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">空室あり</span>;
    }
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      <div className="relative">
        {/* ホテル画像 */}
        <img
          src={hotel.hotelThumbnailUrl || hotel.roomThumbnailUrl || 'https://via.placeholder.com/400x300'}
          alt={hotel.hotelName}
          className="w-full h-48 object-cover"
          loading="lazy"
        />
        
        {/* 価格ラベル */}
        <div className="absolute bottom-0 right-0 bg-black bg-opacity-75 text-white px-3 py-2 rounded-tl-lg">
          <div className="text-xs">1泊</div>
          <div className="text-lg font-bold">{formatPrice(hotel.hotelMinCharge)}〜</div>
        </div>

        {/* お気に入りボタン */}
        {onAddToWatchlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToWatchlist(hotel);
            }}
            className="absolute top-2 right-2 bg-white bg-opacity-90 p-2 rounded-full hover:bg-opacity-100 transition-opacity"
            title="ウォッチリストに追加"
          >
            <svg className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-4">
        {/* ホテル名 */}
        <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-2">
          {hotel.hotelName}
        </h3>

        {/* 評価 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center">
            <span className="text-yellow-400">
              {'★'.repeat(Math.floor(hotel.reviewAverage))}
              {'☆'.repeat(5 - Math.floor(hotel.reviewAverage))}
            </span>
            <span className="ml-1 text-sm font-medium">{hotel.reviewAverage.toFixed(1)}</span>
          </div>
          <span className="text-sm text-gray-500">({hotel.reviewCount}件)</span>
          {getVacancyBadge()}
        </div>

        {/* 住所・アクセス */}
        <div className="text-sm text-gray-600 mb-3">
          <p className="line-clamp-1">{hotel.address1} {hotel.address2}</p>
          {hotel.access && (
            <p className="line-clamp-1 mt-1">{hotel.access}</p>
          )}
        </div>

        {/* 特別情報 */}
        {hotel.hotelSpecial && (
          <div className="mb-3">
            <p className="text-sm text-blue-600 line-clamp-2">{hotel.hotelSpecial}</p>
          </div>
        )}

        {/* ユーザーレビュー */}
        {hotel.userReview && (
          <div className="mb-3 p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-700 line-clamp-2">"{hotel.userReview}"</p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(hotel)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            詳細を見る
          </button>
          
          <a
            href={hotel.hotelInformationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors text-sm font-medium flex items-center gap-1"
          >
            楽天で予約
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;