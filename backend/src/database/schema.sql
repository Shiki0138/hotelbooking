-- ユーザーテーブル（Supabase Auth使用）
-- Supabase Authが自動的に管理

-- ユーザープロファイルテーブル
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- ユーザー興味関心テーブル
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 希望地域
  preferred_regions TEXT[] DEFAULT '{}',
  preferred_prefectures TEXT[] DEFAULT '{}',
  
  -- 価格帯
  min_budget INTEGER,
  max_budget INTEGER,
  
  -- ホテルタイプ
  hotel_types TEXT[] DEFAULT '{}', -- luxury, business, resort, etc.
  
  -- 通知設定
  notification_enabled BOOLEAN DEFAULT true,
  notification_frequency VARCHAR(50) DEFAULT 'daily', -- daily, weekly, immediate
  
  -- 希望の旅行時期
  travel_months INTEGER[] DEFAULT '{}', -- 1-12
  advance_notice_days INTEGER DEFAULT 30, -- 何日前から通知を受け取るか
  
  -- その他の条件
  min_rating NUMERIC(2,1) DEFAULT 4.0,
  must_have_amenities TEXT[] DEFAULT '{}', -- spa, pool, gym, etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- お気に入りホテルテーブル
CREATE TABLE IF NOT EXISTS favorite_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id VARCHAR(255) NOT NULL,
  hotel_name VARCHAR(255) NOT NULL,
  hotel_data JSONB, -- ホテルの詳細情報をJSON形式で保存
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, hotel_id)
);

-- 通知履歴テーブル
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- price_drop, new_availability, favorite_hotel
  hotel_id VARCHAR(255),
  hotel_name VARCHAR(255),
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- 価格アラートテーブル
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id VARCHAR(255) NOT NULL,
  hotel_name VARCHAR(255) NOT NULL,
  target_price INTEGER NOT NULL,
  current_price INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  triggered_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, hotel_id)
);

-- インデックスの作成
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_favorite_hotels_user_id ON favorite_hotels(user_id);
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_is_active ON price_alerts(is_active);

-- RLS (Row Level Security) ポリシー
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own favorites" ON favorite_hotels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorite_hotels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorite_hotels FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON notification_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notification_history FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts" ON price_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own alerts" ON price_alerts FOR ALL USING (auth.uid() = user_id);