// モック認証サービス（開発・デモ用）
export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_regions: string[];
  preferred_prefectures: string[];
  min_budget: number | null;
  max_budget: number | null;
  hotel_types: string[];
  notification_enabled: boolean;
  notification_frequency: 'daily' | 'weekly' | 'immediate';
  travel_months: number[];
  advance_notice_days: number;
  min_rating: number;
  must_have_amenities: string[];
}

export interface FavoriteHotel {
  id: string;
  user_id: string;
  hotel_id: string;
  hotel_name: string;
  hotel_data: any;
  notes: string | null;
  created_at: string;
}

// ローカルストレージのキー
const STORAGE_KEYS = {
  USER: 'mockUser',
  PREFERENCES: 'mockPreferences',
  FAVORITES: 'mockFavorites'
};

class MockAuthService {
  private currentUser: any = null;
  private authChangeCallbacks: ((event: string, session: any) => void)[] = [];

  constructor() {
    // ローカルストレージから復元
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    }
  }

  // ユーザー登録
  async signUp(email: string, password: string, displayName: string) {
    // デモ用：メールアドレスとパスワードの簡単な検証
    if (!email.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    const userId = 'user_' + Date.now();
    const user = {
      id: userId,
      email,
      user_metadata: {
        display_name: displayName
      }
    };

    // ユーザー情報を保存
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    
    // デフォルトの設定を作成
    const preferences: UserPreferences = {
      id: 'pref_' + Date.now(),
      user_id: userId,
      preferred_regions: [],
      preferred_prefectures: [],
      min_budget: null,
      max_budget: null,
      hotel_types: [],
      notification_enabled: true,
      notification_frequency: 'daily',
      travel_months: [],
      advance_notice_days: 30,
      min_rating: 4.0,
      must_have_amenities: []
    };
    
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
    
    // 認証状態変更を通知
    this.notifyAuthChange('SIGNED_IN', { user });
    
    // バックエンドにも通知（デモ用）
    console.log('Demo: User registered:', { email, displayName });
    
    return { user, session: { user } };
  }

  // ログイン
  async signIn(email: string, password: string) {
    // デモ用：任意のメールアドレスでログイン可能
    const userId = 'user_' + email.replace(/[@.]/g, '_');
    const user = {
      id: userId,
      email,
      user_metadata: {
        display_name: email.split('@')[0]
      }
    };

    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    
    // 既存の設定を読み込むか、新規作成
    let preferences = this.getStoredPreferences();
    if (!preferences || preferences.user_id !== userId) {
      preferences = {
        id: 'pref_' + Date.now(),
        user_id: userId,
        preferred_regions: [],
        preferred_prefectures: [],
        min_budget: null,
        max_budget: null,
        hotel_types: [],
        notification_enabled: true,
        notification_frequency: 'daily',
        travel_months: [],
        advance_notice_days: 30,
        min_rating: 4.0,
        must_have_amenities: []
      };
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
    }
    
    this.notifyAuthChange('SIGNED_IN', { user });
    
    return { user, session: { user } };
  }

  // ログアウト
  async signOut() {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.USER);
    this.notifyAuthChange('SIGNED_OUT', null);
  }

  // 現在のユーザー取得
  async getCurrentUser() {
    return this.currentUser;
  }

  // ユーザープロファイル取得
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!this.currentUser || this.currentUser.id !== userId) return null;
    
    return {
      id: 'profile_' + userId,
      user_id: userId,
      display_name: this.currentUser.user_metadata?.display_name || 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // ユーザー設定取得
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const preferences = this.getStoredPreferences();
    if (preferences && preferences.user_id === userId) {
      return preferences;
    }
    return null;
  }

  // ユーザー設定更新
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
    const current = await this.getUserPreferences(userId);
    if (!current) throw new Error('Preferences not found');
    
    const updated = {
      ...current,
      ...preferences,
      updated_at: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    
    // バックエンドに通知（デモ用）
    console.log('Demo: Preferences updated, sending to backend for email notifications');
    this.sendPreferencesToBackend(updated);
    
    return updated;
  }

  // お気に入りホテル追加
  async addFavoriteHotel(userId: string, hotel: any) {
    const favorites = this.getStoredFavorites();
    const newFavorite: FavoriteHotel = {
      id: 'fav_' + Date.now(),
      user_id: userId,
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      hotel_data: hotel,
      notes: null,
      created_at: new Date().toISOString()
    };
    
    favorites.push(newFavorite);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    
    return newFavorite;
  }

  // お気に入りホテル削除
  async removeFavoriteHotel(userId: string, hotelId: string) {
    const favorites = this.getStoredFavorites();
    const filtered = favorites.filter(f => !(f.user_id === userId && f.hotel_id === hotelId));
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
  }

  // お気に入りホテル一覧取得
  async getFavoriteHotels(userId: string): Promise<FavoriteHotel[]> {
    const favorites = this.getStoredFavorites();
    return favorites.filter(f => f.user_id === userId);
  }

  // お気に入りホテルかチェック
  async isFavoriteHotel(userId: string, hotelId: string): Promise<boolean> {
    const favorites = this.getStoredFavorites();
    return favorites.some(f => f.user_id === userId && f.hotel_id === hotelId);
  }

  // 価格アラート設定
  async setPriceAlert(userId: string, hotelId: string, hotelName: string, targetPrice: number) {
    console.log('Demo: Price alert set', { hotelName, targetPrice });
    // デモ用：バックエンドに通知
    this.sendPriceAlertToBackend(userId, hotelId, hotelName, targetPrice);
    
    return {
      id: 'alert_' + Date.now(),
      user_id: userId,
      hotel_id: hotelId,
      hotel_name: hotelName,
      target_price: targetPrice,
      is_active: true
    };
  }

  // セッション監視
  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.authChangeCallbacks.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = this.authChangeCallbacks.indexOf(callback);
            if (index > -1) {
              this.authChangeCallbacks.splice(index, 1);
            }
          }
        }
      }
    };
  }

  // プライベートメソッド
  private notifyAuthChange(event: string, session: any) {
    this.authChangeCallbacks.forEach(cb => cb(event, session));
  }

  private getStoredPreferences(): UserPreferences | null {
    const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    return stored ? JSON.parse(stored) : null;
  }

  private getStoredFavorites(): FavoriteHotel[] {
    const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return stored ? JSON.parse(stored) : [];
  }

  // バックエンドへの通知（デモ用）
  private async sendPreferencesToBackend(preferences: UserPreferences) {
    try {
      const API_URL = import.meta.env?.VITE_API_URL || 'https://backend-7kfmeq3wi-shikis-projects-6e27447a.vercel.app';
      const response = await fetch(`${API_URL}/api/user/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: preferences.user_id,
          email: this.currentUser?.email,
          preferences
        })
      });
      console.log('Preferences sent to backend:', response.ok);
    } catch (error) {
      console.error('Failed to send preferences to backend:', error);
    }
  }

  private async sendPriceAlertToBackend(userId: string, hotelId: string, hotelName: string, targetPrice: number) {
    try {
      const API_URL = import.meta.env?.VITE_API_URL || 'https://backend-7kfmeq3wi-shikis-projects-6e27447a.vercel.app';
      const response = await fetch(`${API_URL}/api/user/price-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: this.currentUser?.email,
          hotelId,
          hotelName,
          targetPrice
        })
      });
      console.log('Price alert sent to backend:', response.ok);
    } catch (error) {
      console.error('Failed to send price alert to backend:', error);
    }
  }
}

export default new MockAuthService();