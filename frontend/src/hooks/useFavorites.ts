import { useState, useEffect, useCallback } from 'react';
import favoritesService from '../services/favoritesService';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    setLoading(true);
    try {
      const allFavorites = favoritesService.getAllFavorites();
      setFavorites(allFavorites);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = useCallback((hotelId: string) => {
    const isFavoriteNow = favoritesService.toggleFavorite(hotelId);
    loadFavorites();
    return isFavoriteNow;
  }, []);

  const addToFavorites = useCallback((hotelId: string) => {
    const success = favoritesService.addToFavorites(hotelId);
    if (success) {
      loadFavorites();
    }
    return success;
  }, []);

  const removeFromFavorites = useCallback((hotelId: string) => {
    const success = favoritesService.removeFromFavorites(hotelId);
    if (success) {
      loadFavorites();
    }
    return success;
  }, []);

  const isFavorite = useCallback((hotelId: string) => {
    return favorites.includes(hotelId);
  }, [favorites]);

  const clearAllFavorites = useCallback(() => {
    favoritesService.clearAllFavorites();
    setFavorites([]);
  }, []);

  return {
    favorites,
    loading,
    toggleFavorite,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    clearAllFavorites,
    favoritesCount: favorites.length
  };
};