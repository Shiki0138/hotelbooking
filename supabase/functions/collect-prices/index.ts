import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ホテルリスト（既存システムから移行）
const HOTELS = [
  { id: 'ritz_tokyo', name: 'ザ・リッツ・カールトン東京', basePrice: 45000 },
  { id: 'mandarin_tokyo', name: 'マンダリン オリエンタル 東京', basePrice: 42000 },
  { id: 'aman_tokyo', name: 'アマン東京', basePrice: 65000 },
  { id: 'peninsula_tokyo', name: 'ザ・ペニンシュラ東京', basePrice: 38000 },
  { id: 'park_hyatt_tokyo', name: 'パーク ハイアット 東京', basePrice: 35000 },
  { id: 'conrad_tokyo', name: 'コンラッド東京', basePrice: 32000 },
  { id: 'imperial_tokyo', name: '帝国ホテル東京', basePrice: 28000 },
  { id: 'okura_tokyo', name: 'The Okura Tokyo', basePrice: 30000 },
  { id: 'four_seasons_tokyo_otemachi', name: 'フォーシーズンズホテル東京大手町', basePrice: 48000 },
  { id: 'hoshinoya_tokyo', name: '星のや東京', basePrice: 55000 }
]

// 価格変動要因のシミュレーション
function calculatePriceFactors(date: Date) {
  const dayOfWeek = date.getDay()
  const month = date.getMonth()
  
  let multiplier = 1.0
  
  // 曜日による変動
  if (dayOfWeek === 5 || dayOfWeek === 6) { // 金土
    multiplier *= 1.3
  } else if (dayOfWeek === 0) { // 日曜
    multiplier *= 1.1
  }
  
  // 季節による変動
  if (month === 2 || month === 3) { // 桜シーズン
    multiplier *= 1.4
  } else if (month === 10 || month === 11) { // 紅葉シーズン
    multiplier *= 1.3
  } else if (month === 7 || month === 8) { // 夏休み
    multiplier *= 1.2
  } else if (month === 11 || month === 0) { // 年末年始
    multiplier *= 1.5
  }
  
  // ランダム要因（需要変動シミュレーション）
  multiplier *= (0.85 + Math.random() * 0.3) // 85%〜115%の変動
  
  return {
    multiplier,
    occupancyRate: Math.min(0.95, 0.6 + (multiplier - 1) * 0.5)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 今日から90日分のデータを生成
    const today = new Date()
    const records = []
    
    for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + dayOffset)
      const dateStr = targetDate.toISOString().split('T')[0]
      
      const factors = calculatePriceFactors(targetDate)
      
      for (const hotel of HOTELS) {
        const price = Math.round(hotel.basePrice * factors.multiplier)
        
        records.push({
          hotel_id: hotel.id,
          hotel_name: hotel.name,
          date: dateStr,
          price: price,
          room_type: 'standard',
          availability_status: factors.occupancyRate > 0.9 ? 'limited' : 'available',
          occupancy_rate: factors.occupancyRate
        })
      }
    }
    
    // バッチで挿入（既存データは更新）
    const { error } = await supabase
      .from('hotel_price_history')
      .upsert(records, { onConflict: 'hotel_id,date,room_type' })
    
    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ 
        message: 'Price collection completed',
        recordsProcessed: records.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in collect-prices:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})