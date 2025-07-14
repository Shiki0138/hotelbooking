import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nanleckihedkmikctltb.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 価格履歴を取得
export async function fetchPriceHistory(hotelId: string, days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data, error } = await supabase
    .from('hotel_price_history')
    .select('*')
    .eq('hotel_id', hotelId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date')
  
  if (error) {
    console.error('Error fetching price history:', error)
    return []
  }
  
  return data
}

// 価格予測を取得
export async function getPricePrediction(hotelId: string, targetDate: string) {
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
  
  // 新しい予測を生成
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
    console.error('Error getting prediction:', response.error)
    return null
  }
  
  return response.data.prediction
}

// アフィリエイトクリックを記録
export async function trackAffiliateClick(hotelId: string, provider: string, userId?: string) {
  const { error } = await supabase
    .from('affiliate_clicks')
    .insert({
      hotel_id: hotelId,
      provider,
      user_id: userId,
      session_id: getSessionId()
    })
  
  if (error) {
    console.error('Error tracking click:', error)
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

// ユーザー行動を記録
export async function trackUserBehavior(
  action: string,
  hotelId?: string,
  searchParams?: any
) {
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
    console.error('Error tracking behavior:', error)
  }
}