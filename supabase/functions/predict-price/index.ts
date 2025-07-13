import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// OpenAI APIの型定義
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { hotelId, targetDates } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 過去の価格履歴を取得（3ヶ月分）
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    const { data: priceHistory, error: historyError } = await supabase
      .from('hotel_price_history')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .order('date')
    
    if (historyError) throw historyError
    
    // 外部データの取得（今回は簡易的にシミュレート）
    const targetDate = new Date(targetDates.checkin)
    const dayOfWeek = targetDate.getDay()
    const month = targetDate.getMonth()
    
    // 曜日と季節の情報
    const weekdayNames = ['日', '月', '火', '水', '木', '金', '土']
    const seasonInfo = {
      0: '正月', 1: '冬', 2: '桜シーズン', 3: '春', 4: '春', 5: '梅雨',
      6: '夏', 7: '夏休み', 8: '秋', 9: '秋', 10: '紅葉シーズン', 11: '年末'
    }
    
    // 価格統計の計算
    const prices = priceHistory?.map(h => h.price) || []
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    
    // OpenAI APIを使った予測（実装時はコメントアウトを解除）
    let prediction = {
      predictedPrice: avgPrice,
      confidence: 85,
      reasoning: "過去の傾向から予測",
      recommendation: "予約をお勧めします"
    }
    
    if (openaiKey) {
      const prompt = `
        以下のデータから、ホテルの価格を予測してください：
        
        ホテルID: ${hotelId}
        対象日: ${targetDates.checkin} (${weekdayNames[dayOfWeek]}曜日)
        季節: ${seasonInfo[month]}
        
        過去3ヶ月の価格統計:
        - 平均価格: ¥${Math.round(avgPrice).toLocaleString()}
        - 最高価格: ¥${Math.round(maxPrice).toLocaleString()}
        - 最低価格: ¥${Math.round(minPrice).toLocaleString()}
        
        最近の価格動向:
        ${priceHistory?.slice(-7).map(h => `${h.date}: ¥${h.price}`).join('\n')}
        
        以下のJSON形式で回答してください：
        {
          "predictedPrice": 予測価格（数値）,
          "confidence": 信頼度（0-100）,
          "reasoning": "予測の根拠（日本語）",
          "recommendation": "予約すべきかどうかの推奨（日本語）",
          "priceRangeMin": 予測価格の下限,
          "priceRangeMax": 予測価格の上限
        }
      `
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" }
          })
        })
        
        const data = await response.json() as OpenAIResponse
        prediction = JSON.parse(data.choices[0].message.content)
      } catch (error) {
        console.error('OpenAI API error:', error)
        // フォールバック: 簡易的な予測
        const weekendMultiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.3 : 1.0
        const seasonMultiplier = (month === 2 || month === 3 || month === 10 || month === 11) ? 1.2 : 1.0
        
        prediction = {
          predictedPrice: Math.round(avgPrice * weekendMultiplier * seasonMultiplier),
          confidence: 75,
          reasoning: `${weekdayNames[dayOfWeek]}曜日と${seasonInfo[month]}の傾向から予測しました。`,
          recommendation: weekendMultiplier > 1 ? "週末は料金が高めです。平日の予約がお得です。" : "適正価格です。予約をお勧めします。",
          priceRangeMin: Math.round(avgPrice * 0.9),
          priceRangeMax: Math.round(avgPrice * 1.1)
        }
      }
    } else {
      // OpenAI APIキーがない場合の簡易予測
      const weekendMultiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.3 : 1.0
      const seasonMultiplier = (month === 2 || month === 3 || month === 10 || month === 11) ? 1.2 : 1.0
      
      prediction = {
        predictedPrice: Math.round(avgPrice * weekendMultiplier * seasonMultiplier),
        confidence: 75,
        reasoning: `${weekdayNames[dayOfWeek]}曜日と${seasonInfo[month]}の傾向から予測しました。`,
        recommendation: weekendMultiplier > 1 ? "週末は料金が高めです。平日の予約がお得です。" : "適正価格です。予約をお勧めします。",
        priceRangeMin: Math.round(avgPrice * 0.9),
        priceRangeMax: Math.round(avgPrice * 1.1)
      }
    }
    
    // 予測結果を保存
    const { error: insertError } = await supabase
      .from('price_predictions')
      .insert({
        hotel_id: hotelId,
        prediction_date: new Date().toISOString().split('T')[0],
        target_date: targetDates.checkin,
        predicted_price: prediction.predictedPrice,
        confidence_score: prediction.confidence,
        price_range_min: prediction.priceRangeMin || prediction.predictedPrice * 0.9,
        price_range_max: prediction.priceRangeMax || prediction.predictedPrice * 1.1,
        reasoning: prediction.reasoning,
        factors: {
          dayOfWeek: weekdayNames[dayOfWeek],
          season: seasonInfo[month],
          historicalAverage: avgPrice,
          recommendation: prediction.recommendation
        }
      })
    
    if (insertError) {
      console.error('Error saving prediction:', insertError)
    }

    return new Response(
      JSON.stringify({
        prediction,
        historicalData: {
          average: avgPrice,
          min: minPrice,
          max: maxPrice,
          lastWeek: priceHistory?.slice(-7)
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in predict-price:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})