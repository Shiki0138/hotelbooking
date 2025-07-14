import { createClient } from '@supabase/supabase-js';

// Supabaseの設定（環境変数から取得）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nanleckihedkmikctltb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 認証サービス
export const authService = {
  // メールアドレスでサインアップ
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    
    if (error) throw error;
    return data;
  },

  // メールアドレスでサインイン
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  // Googleでサインイン
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    
    if (error) throw error;
    return data;
  },

  // サインアウト
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // 現在のユーザーを取得
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // セッションを取得
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // パスワードリセット
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    return data;
  },

  // パスワード更新
  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return data;
  }
};

// お気に入りサービス
export const favoritesService = {
  // お気に入りを追加
  async addFavorite(hotelId: string) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('ログインが必要です');

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        hotel_id: hotelId,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return data;
  },

  // お気に入りを削除
  async removeFavorite(hotelId: string) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('ログインが必要です');

    const { error } = await supabase
      .from('favorites')
      .delete()
      .match({ user_id: user.id, hotel_id: hotelId });

    if (error) throw error;
  },

  // ユーザーのお気に入り一覧を取得
  async getUserFavorites() {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('favorites')
      .select('hotel_id')
      .eq('user_id', user.id);

    if (error) throw error;
    return data?.map(f => f.hotel_id) || [];
  }
};

// 価格アラートサービス
export const priceAlertService = {
  // アラートを作成
  async createAlert(hotelId: string, targetPrice: number, email?: string) {
    const user = await authService.getCurrentUser();
    
    const { data, error } = await supabase
      .from('price_alerts')
      .insert({
        user_id: user?.id,
        hotel_id: hotelId,
        target_price: targetPrice,
        email: email || user?.email,
        is_active: true,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return data;
  },

  // アラートを取得
  async getUserAlerts() {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  },

  // アラートを削除
  async deleteAlert(alertId: string) {
    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', alertId);

    if (error) throw error;
  }
};