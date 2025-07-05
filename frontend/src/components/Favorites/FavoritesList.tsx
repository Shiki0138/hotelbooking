import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '../../hooks/useFavorites';
import './FavoritesList.css';

interface FavoritesListProps {
  renderHotel: (hotelId: string) => React.ReactNode;
}

const FavoritesList: React.FC<FavoritesListProps> = ({ renderHotel }) => {
  const { t } = useTranslation();
  const { favorites, loading, clearAllFavorites } = useFavorites();

  if (loading) {
    return <div className="favorites-loading">{t('common.loading')}</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="favorites-empty">
        <h2>{t('favorites.title')}</h2>
        <p>{t('favorites.noFavorites')}</p>
      </div>
    );
  }

  return (
    <div className="favorites-list">
      <div className="favorites-header">
        <h2>{t('favorites.title')} ({favorites.length})</h2>
        <button
          className="clear-favorites-btn"
          onClick={() => {
            if (window.confirm('Clear all favorites?')) {
              clearAllFavorites();
            }
          }}
        >
          Clear All
        </button>
      </div>
      <div className="favorites-grid">
        {favorites.map((hotelId) => (
          <div key={hotelId} className="favorite-item">
            {renderHotel(hotelId)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesList;