interface FavoriteHotel {
  hotelId: string;
  addedAt: string;
}

const FAVORITES_STORAGE_KEY = 'hotel_favorites';

class FavoritesService {
  private getFavorites(): FavoriteHotel[] {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveFavorites(favorites: FavoriteHotel[]): void {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }

  addToFavorites(hotelId: string): boolean {
    const favorites = this.getFavorites();
    
    if (this.isFavorite(hotelId)) {
      return false;
    }

    favorites.push({
      hotelId,
      addedAt: new Date().toISOString()
    });

    this.saveFavorites(favorites);
    return true;
  }

  removeFromFavorites(hotelId: string): boolean {
    const favorites = this.getFavorites();
    const filtered = favorites.filter(fav => fav.hotelId !== hotelId);
    
    if (filtered.length === favorites.length) {
      return false;
    }

    this.saveFavorites(filtered);
    return true;
  }

  toggleFavorite(hotelId: string): boolean {
    if (this.isFavorite(hotelId)) {
      this.removeFromFavorites(hotelId);
      return false;
    } else {
      this.addToFavorites(hotelId);
      return true;
    }
  }

  isFavorite(hotelId: string): boolean {
    const favorites = this.getFavorites();
    return favorites.some(fav => fav.hotelId === hotelId);
  }

  getAllFavorites(): string[] {
    const favorites = this.getFavorites();
    return favorites
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .map(fav => fav.hotelId);
  }

  getFavoritesCount(): number {
    return this.getFavorites().length;
  }

  clearAllFavorites(): void {
    localStorage.removeItem(FAVORITES_STORAGE_KEY);
  }
}

export default new FavoritesService();