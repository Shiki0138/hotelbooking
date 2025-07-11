import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-key';

export const supabase = supabaseUrl === 'https://example.supabase.co' ? null as any : createClient(supabaseUrl, supabaseAnonKey);

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

class AuthService {
  // ユーザー登録
  async signUp(email: string, password: string, displayName: string) {
    if (!supabase) {
      console.warn('Supabase not configured');
      return { user: null, session: null };
    }
    try {
      // Supabase Authでユーザー作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // プロファイル作成
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          display_name: displayName
        });

      if (profileError) throw profileError;

      // デフォルトの設定を作成
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: authData.user.id
        });

      if (prefsError) throw prefsError;

      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // ログイン
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // ログアウト
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // 現在のユーザー取得
  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // ユーザープロファイル取得
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  // ユーザー設定取得
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get user preferences error:', error);
      return null;
    }
  }

  // ユーザー設定更新
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update user preferences error:', error);
      throw error;
    }
  }

  // お気に入りホテル追加
  async addFavoriteHotel(userId: string, hotel: any) {
    try {
      const { data, error } = await supabase
        .from('favorite_hotels')
        .insert({
          user_id: userId,
          hotel_id: hotel.id,
          hotel_name: hotel.name,
          hotel_data: hotel
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Add favorite hotel error:', error);
      throw error;
    }
  }

  // お気に入りホテル削除
  async removeFavoriteHotel(userId: string, hotelId: string) {
    try {
      const { error } = await supabase
        .from('favorite_hotels')
        .delete()
        .eq('user_id', userId)
        .eq('hotel_id', hotelId);

      if (error) throw error;
    } catch (error) {
      console.error('Remove favorite hotel error:', error);
      throw error;
    }
  }

  // お気に入りホテル一覧取得
  async getFavoriteHotels(userId: string): Promise<FavoriteHotel[]> {
    try {
      const { data, error } = await supabase
        .from('favorite_hotels')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get favorite hotels error:', error);
      return [];
    }
  }

  // お気に入りホテルかチェック
  async isFavoriteHotel(userId: string, hotelId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('favorite_hotels')
        .select('id')
        .eq('user_id', userId)
        .eq('hotel_id', hotelId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Check favorite hotel error:', error);
      return false;
    }
  }

  // 価格アラート設定
  async setPriceAlert(userId: string, hotelId: string, hotelName: string, targetPrice: number) {
    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .upsert({
          user_id: userId,
          hotel_id: hotelId,
          hotel_name: hotelName,
          target_price: targetPrice,
          is_active: true
        }, {
          onConflict: 'user_id,hotel_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Set price alert error:', error);
      throw error;
    }
  }

  // セッション監視
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export default new AuthService();