import React, { useState, useEffect } from 'react';
import { Hotel } from '../../types';
import './WatchlistButton.css';

interface WatchlistButtonProps {
  hotel: Hotel;
  showText?: boolean;
  className?: string;
  onOpenModal?: () => void;
}

export const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  hotel,
  showText = false,
  className = '',
  onOpenModal
}) => {
  const [isWatching, setIsWatching] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Check if hotel is in watchlist
    const watchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
    setIsWatching(watchlist.some((item: any) => item.hotelId === hotel.id));
  }, [hotel.id]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    
    if (!isWatching && onOpenModal) {
      // Open modal for new watchlist item
      onOpenModal();
    } else if (isWatching) {
      // Remove from watchlist
      const watchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
      const updatedWatchlist = watchlist.filter((item: any) => item.hotelId !== hotel.id);
      localStorage.setItem('hotelWatchlist', JSON.stringify(updatedWatchlist));
      setIsWatching(false);
      showNotification('ウォッチリストから削除しました');
    }
    
    setTimeout(() => setIsAnimating(false), 300);
  };

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <>
      <button
        className={`watchlist-button ${className} ${isAnimating ? 'animating' : ''}`}
        onClick={handleClick}
        aria-label={isWatching ? 'ウォッチリストから削除' : 'ウォッチリストに追加'}
        title={isWatching ? 'ウォッチリストから削除' : 'ウォッチリストに追加'}
      >
        <span className="watchlist-icon">
          {isWatching ? '👁️' : '👁️‍🗨️'}
        </span>
        {showText && (
          <span className="watchlist-text">
            {isWatching ? 'ウォッチ中' : 'ウォッチ'}
          </span>
        )}
      </button>
      
      {showToast && (
        <div className="watchlist-toast">
          {toastMessage}
        </div>
      )}
    </>
  );
};