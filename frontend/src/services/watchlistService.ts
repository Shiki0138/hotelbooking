import { WatchlistItem } from '../components/Watchlist/WatchlistModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface WatchlistResponse {
  watchlist: WatchlistItem[];
  total: number;
}

export interface PriceAlert {
  id: string;
  hotelId: string;
  hotelName: string;
  previousPrice: number;
  currentPrice: number;
  targetPrice?: number;
  discountRate?: number;
  alertType: 'target_met' | 'price_drop' | 'price_increase';
  timestamp: string;
}

class WatchlistService {
  // Get user's watchlist
  async getWatchlist(userId: string): Promise<WatchlistResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlist/user/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch watchlist');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      // Fallback to localStorage
      const localWatchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
      return { watchlist: localWatchlist, total: localWatchlist.length };
    }
  }

  // Add item to watchlist
  async addToWatchlist(userId: string, item: WatchlistItem): Promise<WatchlistItem> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, ...item }),
      });

      if (!response.ok) {
        throw new Error('Failed to add to watchlist');
      }

      const result = await response.json();
      
      // Also update localStorage
      const localWatchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
      localWatchlist.push(item);
      localStorage.setItem('hotelWatchlist', JSON.stringify(localWatchlist));
      
      return result;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      // Fallback to localStorage only
      const localWatchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
      localWatchlist.push(item);
      localStorage.setItem('hotelWatchlist', JSON.stringify(localWatchlist));
      return item;
    }
  }

  // Remove item from watchlist
  async removeFromWatchlist(userId: string, hotelId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlist/${userId}/${hotelId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove from watchlist');
      }

      // Also update localStorage
      const localWatchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
      const updated = localWatchlist.filter((item: WatchlistItem) => item.hotelId !== hotelId);
      localStorage.setItem('hotelWatchlist', JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      // Fallback to localStorage only
      const localWatchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
      const updated = localWatchlist.filter((item: WatchlistItem) => item.hotelId !== hotelId);
      localStorage.setItem('hotelWatchlist', JSON.stringify(updated));
    }
  }

  // Update watchlist item (notification settings, price targets, etc.)
  async updateWatchlistItem(userId: string, hotelId: string, updates: Partial<WatchlistItem>): Promise<WatchlistItem> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlist/${userId}/${hotelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update watchlist item');
      }

      const result = await response.json();
      
      // Also update localStorage
      const localWatchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
      const updatedList = localWatchlist.map((item: WatchlistItem) =>
        item.hotelId === hotelId ? { ...item, ...updates } : item
      );
      localStorage.setItem('hotelWatchlist', JSON.stringify(updatedList));
      
      return result;
    } catch (error) {
      console.error('Error updating watchlist item:', error);
      // Fallback to localStorage only
      const localWatchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
      const updatedList = localWatchlist.map((item: WatchlistItem) =>
        item.hotelId === hotelId ? { ...item, ...updates } : item
      );
      localStorage.setItem('hotelWatchlist', JSON.stringify(updatedList));
      const updatedItem = updatedList.find((item: WatchlistItem) => item.hotelId === hotelId);
      return updatedItem;
    }
  }

  // Get price alerts for user
  async getPriceAlerts(userId: string): Promise<PriceAlert[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlist/alerts/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch price alerts');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching price alerts:', error);
      // Return empty array as fallback
      return [];
    }
  }

  // Mark alert as read
  async markAlertAsRead(userId: string, alertId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlist/alerts/${userId}/${alertId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark alert as read');
      }
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  }

  // Get price history for a hotel
  async getPriceHistory(hotelId: string, days: number = 30): Promise<{ date: string; price: number }[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/hotels/${hotelId}/price-history?days=${days}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch price history');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching price history:', error);
      // Return mock data as fallback
      return this.generateMockPriceHistory(days);
    }
  }

  // Generate mock price history for demonstration
  private generateMockPriceHistory(days: number): { date: string; price: number }[] {
    const history: { date: string; price: number }[] = [];
    const basePrice = 15000 + Math.random() * 10000;
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
      const price = Math.round(basePrice * (1 + variation));
      history.push({
        date: date.toISOString().split('T')[0],
        price
      });
    }
    
    return history;
  }

  // Check if hotel is in watchlist
  isInWatchlist(hotelId: string): boolean {
    const watchlist = JSON.parse(localStorage.getItem('hotelWatchlist') || '[]');
    return watchlist.some((item: WatchlistItem) => item.hotelId === hotelId);
  }

  // Clear all watchlist items for user
  async clearWatchlist(userId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/watchlist/user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear watchlist');
      }

      // Also clear localStorage
      localStorage.setItem('hotelWatchlist', '[]');
    } catch (error) {
      console.error('Error clearing watchlist:', error);
      // Fallback to localStorage only
      localStorage.setItem('hotelWatchlist', '[]');
    }
  }
}

export const watchlistService = new WatchlistService();