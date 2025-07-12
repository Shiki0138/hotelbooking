import { CacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_language: string;
  preferred_currency: string;
  notification_email: boolean;
  preferred_providers: string[];
  price_range_min?: number;
  price_range_max?: number;
  preferred_amenities: string[];
  preferred_regions: string[];
  preferred_prefectures: string[];
  hotel_types: string[];
  min_rating: number;
  travel_months: number[];
  advance_notice_days: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
}

export interface CreateUserPreferencesRequest {
  user_id: string;
  preferred_language?: string;
  preferred_currency?: string;
  notification_email?: boolean;
  preferred_providers?: string[];
  price_range_min?: number;
  price_range_max?: number;
  preferred_amenities?: string[];
  preferred_regions?: string[];
  preferred_prefectures?: string[];
  hotel_types?: string[];
  min_rating?: number;
  travel_months?: number[];
  advance_notice_days?: number;
}

export class UserModel {
  private cache: CacheService;

  constructor() {
    this.cache = new CacheService();
  }

  // ユーザー作成（認証なしでも動作）
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // In-memory storage for demo purposes
      const user: User = {
        id: this.generateId(),
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        avatar_url: userData.avatar_url,
        is_active: true,
        role: 'user',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Cache user data
      await this.cache.set(`user:${user.id}`, user, 3600);
      
      logger.info('User created successfully', { userId: user.id });
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  // ユーザー取得
  async getUserById(userId: string): Promise<User | null> {
    try {
      const cachedUser = await this.cache.get(`user:${userId}`);
      if (cachedUser) {
        return cachedUser as User;
      }

      // In production, this would query the database
      return null;
    } catch (error) {
      logger.error('Error getting user:', error);
      throw error;
    }
  }

  // ユーザー更新
  async updateUser(userId: string, updateData: UpdateUserRequest): Promise<User | null> {
    try {
      const existingUser = await this.getUserById(userId);
      if (!existingUser) {
        return null;
      }

      const updatedUser: User = {
        ...existingUser,
        ...updateData,
        updated_at: new Date()
      };

      await this.cache.set(`user:${userId}`, updatedUser, 3600);
      
      logger.info('User updated successfully', { userId });
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  // ユーザー設定作成
  async createUserPreferences(preferencesData: CreateUserPreferencesRequest): Promise<UserPreferences> {
    try {
      const preferences: UserPreferences = {
        id: this.generateId(),
        user_id: preferencesData.user_id,
        preferred_language: preferencesData.preferred_language || 'ja',
        preferred_currency: preferencesData.preferred_currency || 'JPY',
        notification_email: preferencesData.notification_email !== false,
        preferred_providers: preferencesData.preferred_providers || ['agoda', 'booking', 'expedia'],
        price_range_min: preferencesData.price_range_min,
        price_range_max: preferencesData.price_range_max,
        preferred_amenities: preferencesData.preferred_amenities || [],
        preferred_regions: preferencesData.preferred_regions || [],
        preferred_prefectures: preferencesData.preferred_prefectures || [],
        hotel_types: preferencesData.hotel_types || [],
        min_rating: preferencesData.min_rating || 4.0,
        travel_months: preferencesData.travel_months || [],
        advance_notice_days: preferencesData.advance_notice_days || 30,
        created_at: new Date(),
        updated_at: new Date()
      };

      await this.cache.set(`user_preferences:${preferences.user_id}`, preferences, 3600);
      
      logger.info('User preferences created successfully', { userId: preferences.user_id });
      return preferences;
    } catch (error) {
      logger.error('Error creating user preferences:', error);
      throw error;
    }
  }

  // ユーザー設定取得
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const cachedPreferences = await this.cache.get(`user_preferences:${userId}`);
      if (cachedPreferences) {
        return cachedPreferences as UserPreferences;
      }

      // デフォルト設定を作成
      const defaultPreferences = await this.createUserPreferences({ user_id: userId });
      return defaultPreferences;
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      throw error;
    }
  }

  // ユーザー設定更新
  async updateUserPreferences(userId: string, updateData: Partial<CreateUserPreferencesRequest>): Promise<UserPreferences | null> {
    try {
      const existingPreferences = await this.getUserPreferences(userId);
      if (!existingPreferences) {
        return null;
      }

      const updatedPreferences: UserPreferences = {
        ...existingPreferences,
        ...updateData,
        updated_at: new Date()
      };

      await this.cache.set(`user_preferences:${userId}`, updatedPreferences, 3600);
      
      logger.info('User preferences updated successfully', { userId });
      return updatedPreferences;
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // お気に入りホテル追加
  async addFavoriteHotel(userId: string, hotelId: string, hotelData?: any): Promise<void> {
    try {
      const favoriteKey = `favorites:${userId}`;
      const existingFavorites = await this.cache.get(favoriteKey);
      const favoritesArray = Array.isArray(existingFavorites) ? existingFavorites : [];
      
      const favoriteHotel = {
        id: this.generateId(),
        user_id: userId,
        hotel_id: hotelId,
        hotel_data: hotelData,
        notes: '',
        created_at: new Date()
      };

      const updatedFavorites = [...favoritesArray, favoriteHotel];
      await this.cache.set(favoriteKey, updatedFavorites, 7200);
      
      logger.info('Hotel added to favorites', { userId, hotelId });
    } catch (error) {
      logger.error('Error adding favorite hotel:', error);
      throw error;
    }
  }

  // お気に入りホテル取得
  async getFavoriteHotels(userId: string): Promise<any[]> {
    try {
      const favoriteKey = `favorites:${userId}`;
      const favorites = await this.cache.get(favoriteKey);
      return Array.isArray(favorites) ? favorites : [];
    } catch (error) {
      logger.error('Error getting favorite hotels:', error);
      return [];
    }
  }

  // お気に入りホテル削除
  async removeFavoriteHotel(userId: string, hotelId: string): Promise<void> {
    try {
      const favoriteKey = `favorites:${userId}`;
      const existingFavorites = await this.cache.get(favoriteKey);
      const favoritesArray = Array.isArray(existingFavorites) ? existingFavorites : [];
      
      const updatedFavorites = favoritesArray.filter((fav: any) => fav.hotel_id !== hotelId);
      await this.cache.set(favoriteKey, updatedFavorites, 7200);
      
      logger.info('Hotel removed from favorites', { userId, hotelId });
    } catch (error) {
      logger.error('Error removing favorite hotel:', error);
      throw error;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}