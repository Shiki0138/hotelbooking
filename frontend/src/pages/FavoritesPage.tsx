import React from 'react';
import { useTranslation } from 'react-i18next';
import { FavoritesList } from '../components/Favorites';
import { useFavorites } from '../hooks/useFavorites';

const FavoritesPage: React.FC = () => {
  const { t } = useTranslation();

  // Mock hotel renderer - in real app, this would fetch hotel data
  const renderHotel = (hotelId: string) => {
    return (
      <div style={{ padding: '20px' }}>
        <h3>Hotel {hotelId}</h3>
        <p>Hotel details would be loaded here</p>
      </div>
    );
  };

  return (
    <div className="favorites-page">
      <FavoritesList renderHotel={renderHotel} />
    </div>
  );
};

export default FavoritesPage;