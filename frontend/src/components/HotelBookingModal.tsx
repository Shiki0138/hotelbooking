import React, { useState, useEffect } from 'react';
import apiService from '../services/api.service';

interface BookingLink {
  name: string;
  url: string;
  directBooking?: boolean;
  affiliate?: boolean;
}

interface HotelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotel: {
    id: string;
    name: string;
    thumbnailUrl: string;
    rating: number;
    city: string;
  };
  checkinDate: string;
  checkoutDate: string;
}

export const HotelBookingModal: React.FC<HotelBookingModalProps> = ({
  isOpen,
  onClose,
  hotel,
  checkinDate,
  checkoutDate
}) => {
  const [bookingLinks, setBookingLinks] = useState<Record<string, BookingLink>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBookingLinks();
    }
  }, [isOpen, hotel.id]);

  const fetchBookingLinks = async () => {
    setLoading(true);
    try {
      // ホテルIDから実際のhotelIdを抽出（例: "rakuten_74944" → "ritz-carlton-tokyo"）
      const hotelMapping: Record<string, string> = {
        '74944': 'ritz-carlton-tokyo',
        '1217': 'park-hyatt-tokyo',
        '67648': 'mandarin-oriental-tokyo',
        '40391': 'busena-terrace',
        '168223': 'halekulani-okinawa',
      };
      
      const hotelId = hotelMapping[hotel.id.replace('rakuten_', '')] || hotel.id;
      
      const response = await fetch(`http://localhost:8000/api/hotel-details/${hotelId}/booking-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkinDate,
          checkoutDate,
          adults: 2,
          rooms: 1
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBookingLinks(data.bookingLinks);
      }
    } catch (error) {
      console.error('Failed to fetch booking links:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">予約サイトを選択</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hotel Info */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-start space-x-4">
            <img
              src={hotel.thumbnailUrl}
              alt={hotel.name}
              className="w-24 h-24 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-bold text-lg">{hotel.name}</h3>
              <div className="flex items-center mt-1">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(hotel.rating) ? 'fill-current' : 'fill-gray-300'}`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-600 ml-2">{hotel.city}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">チェックイン:</span> {new Date(checkinDate).toLocaleDateString('ja-JP')}
                <span className="mx-2">→</span>
                <span className="font-medium">チェックアウト:</span> {new Date(checkoutDate).toLocaleDateString('ja-JP')}
              </div>
            </div>
          </div>
        </div>

        {/* Booking Links */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">予約サイト情報を取得中...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 公式サイト */}
              {bookingLinks.official && (
                <a
                  href={bookingLinks.official.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-blue-900">{bookingLinks.official.name}</div>
                      <div className="text-sm text-blue-700 mt-1">
                        ベストレート保証・会員特典あり
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full mr-2">
                        おすすめ
                      </span>
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </a>
              )}

              {/* 楽天トラベル */}
              {bookingLinks.rakuten && (
                <a
                  href={bookingLinks.rakuten.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{bookingLinks.rakuten.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        楽天ポイントが貯まる・使える
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              )}

              {/* その他の予約サイト */}
              {Object.entries(bookingLinks).map(([key, link]) => {
                if (key === 'official' || key === 'rakuten') return null;
                return (
                  <a
                    key={key}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{link.name}</div>
                      </div>
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <p className="text-xs text-gray-500 text-center">
            各予約サイトの価格・空室状況は実際のサイトでご確認ください
          </p>
        </div>
      </div>
    </div>
  );
};