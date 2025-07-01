import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { location, checkin, checkout, guests } = await req.json()
    
    // Rakuten Travel API integration
    const rakutenApiKey = Deno.env.get('RAKUTEN_API_KEY')
    const rakutenAppId = Deno.env.get('RAKUTEN_APP_ID')
    
    const params = new URLSearchParams({
      applicationId: rakutenAppId,
      checkinDate: checkin,
      checkoutDate: checkout,
      keyword: location,
      hits: 30,
      sort: '+roomCharge',
      hotelType: '0,1,2,3' // All hotel types
    })

    const response = await fetch(
      `https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426?${params}`,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )

    const data = await response.json()
    
    // Transform Rakuten data to our format
    const hotels = data.hotels?.map((item: any) => {
      const hotel = item.hotel[0].hotelBasicInfo
      return {
        id: hotel.hotelNo,
        name: hotel.hotelName,
        location: `${hotel.prefecture}${hotel.city}`,
        image: hotel.hotelImageUrl,
        originalPrice: hotel.hotelMaxCharge,
        discountPrice: hotel.hotelMinCharge,
        discount: Math.round((1 - hotel.hotelMinCharge / hotel.hotelMaxCharge) * 100),
        rating: hotel.reviewAverage || 4.5,
        features: hotel.hotelSpecial?.split('、') || [],
        availability: hotel.roomAvailable ? 'Available' : 'Limited',
        description: hotel.hotelSpecial,
        address: hotel.address1 + hotel.address2
      }
    }) || []

    return new Response(
      JSON.stringify({ hotels, total: hotels.length }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})