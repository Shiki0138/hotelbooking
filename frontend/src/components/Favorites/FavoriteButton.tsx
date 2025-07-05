import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '../../hooks/useFavorites';
import './FavoriteButton.css';

interface FavoriteButtonProps {
  hotelId: string;
  showText?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ hotelId, showText = false }) => {
  const { t } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(hotelId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newState = toggleFavorite(hotelId);
    
    // Show toast notification
    const message = newState 
      ? t('favorites.addedToFavorites')
      : t('favorites.removedFromFavorites');
    
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'favorite-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  };

  return (
    <button
      className={`favorite-button ${isFav ? 'is-favorite' : ''}`}
      onClick={handleClick}
      aria-label={isFav ? t('hotel.removeFromFavorites') : t('hotel.addToFavorites')}
    >
      <span className="heart-icon">
        {isFav ? '❤️' : '🤍'}
      </span>
      {showText && (
        <span className="favorite-text">
          {isFav ? t('hotel.removeFromFavorites') : t('hotel.addToFavorites')}
        </span>
      )}
    </button>
  );
};

export default FavoriteButton;