import { NextRequest, NextResponse } from 'next/server';

// Edge Runtime設定
export const runtime = 'edge';

// 価格データのキャッシュ（実際はRedisやKVを使用）
const priceCache = new Map<string, any>();

// モックデータ（実際のAPIが使えるまでの仮実装）
const getMockPrices = (hotelName: string) => {
  // ホテル名に基づいて異なる価格を生成
  const basePrice = hotelName.includes('リッツ') ? 65000 : 
                   hotelName.includes('マンダリン') ? 75000 : 
                   hotelName.includes('ブセナ') ? 48000 : 
                   hotelName.includes('ハレクラニ') ? 60000 : 45000;
  
  const variation = Math.random() * 0.2; // ±10%の変動
  
  return {
    rakuten: {
      price: Math.floor(basePrice * (1 - variation * 0.5)),
      available: true,
      lastUpdated: new Date().toISOString()
    },
    booking: {
      price: Math.floor(basePrice * (1 + variation * 0.1)),
      available: true,
      lastUpdated: new Date().toISOString()
    },
    jalan: {
      price: Math.floor(basePrice * (1 - variation * 0.3)),
      available: true,
      lastUpdated: new Date().toISOString()
    },
    google: {
      minPrice: Math.floor(basePrice * (1 - variation * 0.5)),
      maxPrice: Math.floor(basePrice * (1 + variation * 0.2)),
      available: true,
      lastUpdated: new Date().toISOString()
    }
  };
};

// 実際のAPI呼び出し（将来実装）
const fetchRealPrices = async (hotelName: string, checkinDate?: string, checkoutDate?: string) => {
  // TODO: 各予約サイトのAPIを呼び出し
  // 楽天トラベルAPI
  // const rakutenPrice = await fetchRakutenAPI(hotelName, checkinDate, checkoutDate);
  
  // Booking.com API
  // const bookingPrice = await fetchBookingAPI(hotelName, checkinDate, checkoutDate);
  
  // じゃらんAPI
  // const jalanPrice = await fetchJalanAPI(hotelName, checkinDate, checkoutDate);
  
  // 現在はモックデータを返す
  return getMockPrices(hotelName);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelName = searchParams.get('hotelName');
    const checkinDate = searchParams.get('checkin');
    const checkoutDate = searchParams.get('checkout');
    
    if (!hotelName) {
      return NextResponse.json(
        { error: 'Hotel name is required' },
        { status: 400 }
      );
    }
    
    // キャッシュチェック（5分間有効）
    const cacheKey = `${hotelName}-${checkinDate}-${checkoutDate}`;
    const cached = priceCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < 300000)) {
      return NextResponse.json(cached.data);
    }
    
    // 価格を取得
    const prices = await fetchRealPrices(hotelName, checkinDate, checkoutDate);
    
    // キャッシュに保存
    priceCache.set(cacheKey, {
      data: prices,
      timestamp: Date.now()
    });
    
    // CORSヘッダーを設定
    return NextResponse.json(prices, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
    
  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}

// OPTIONS リクエストの処理（CORS）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}