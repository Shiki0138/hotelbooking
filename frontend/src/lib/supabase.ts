import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nanleckihedkmikctltb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hbmxlY2tpaGVka21pa2N0bHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAwNzE2MTIsImV4cCI6MjAwNTY0NzYxMn0.disabled-key'

// Supabaseクライアントを作成（エラーハンドリング付き）
export const supabase = (() => {
  try {
    if (!supabaseAnonKey || supabaseAnonKey.includes('disabled')) {
      console.warn('Supabase is disabled due to missing API key');
      return null;
    }
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error);
    return null;
  }
})()

// 価格履歴を取得（エラーハンドリング付き）
export async function fetchPriceHistory(hotelId: string, days: number = 30) {
  if (!supabase) return [];
  
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const { data, error } = await supabase
      .from('hotel_price_history')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date')
    
    if (error) {
      console.warn('Error fetching price history:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.warn('Price history service unavailable:', error)
    return []
  }
}

// 価格予測を取得（エラーハンドリング付き）
export async function getPricePrediction(hotelId: string, targetDate: string) {
  if (!supabase) return null;
  
  try {
    // まず既存の予測を確認
    const { data: existing } = await supabase
      .from('price_predictions')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('target_date', targetDate)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24時間以内
      .single()
    
    if (existing) {
      return existing
    }
  } catch (error) {
    console.warn('Price prediction table not available:', error)
    return null
  }
  
  try {
    // 新しい予測を生成
    if (!supabase) return null;
    
    const response = await supabase.functions.invoke('predict-price', {
      body: {
        hotelId,
        targetDates: {
          checkin: targetDate,
          checkout: targetDate
        }
      }
    })
    
    if (response.error) {
      console.warn('Error getting prediction:', response.error)
      return null
    }
    
    return response.data.prediction
  } catch (error) {
    console.warn('Price prediction service unavailable:', error)
    return null
  }
}

// アフィリエイトクリックを記録（エラーハンドリング付き）
export async function trackAffiliateClick(hotelId: string, provider: string, userId?: string) {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('affiliate_clicks')
      .insert({
        hotel_id: hotelId,
        provider,
        user_id: userId,
        session_id: getSessionId()
      })
    
    if (error) {
      console.warn('Error tracking click:', error)
    }
  } catch (error) {
    console.warn('Affiliate tracking unavailable:', error)
  }
}

// セッションIDを取得/生成
function getSessionId(): string {
  const key = 'hotel_booking_session_id'
  let sessionId = sessionStorage.getItem(key)
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem(key, sessionId)
  }
  
  return sessionId
}

// ユーザー行動を記録（エラーハンドリング付き）
export async function trackUserBehavior(
  action: string,
  hotelId?: string,
  searchParams?: any
) {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('user_behaviors')
      .insert({
        session_id: getSessionId(),
        action_type: action,
        hotel_id: hotelId,
        search_params: searchParams,
        page_url: window.location.href
      })
    
    if (error) {
      console.warn('Error tracking behavior:', error)
    }
  } catch (error) {
    console.warn('User behavior tracking unavailable:', error)
  }
}