import { NextRequest, NextResponse } from 'next/server';

// Edge Runtime設定
export const runtime = 'edge';

// 価格データのキャッシュ（実際はRedisやKVを使用）
const priceCache = new Map<string, any>();

// 実際のAPIを模倣した高精度モックデータ（将来のAPI実装の基盤）
const getMockPrices = (hotelName: string, checkinDate?: string, checkoutDate?: string) => {
  // ホテルブランド別の実際の価格帯を反映
  const hotelPricing = {
    'リッツ': { base: 70000, variance: 0.3, premium: 1.5 },
    'マンダリン': { base: 75000, variance: 0.25, premium: 1.4 },
    'アマン': { base: 120000, variance: 0.4, premium: 2.0 },
    'フォーシーズンズ': { base: 95000, variance: 0.35, premium: 1.6 },
    'ペニンシュラ': { base: 68000, variance: 0.3, premium: 1.3 },
    'パーク ハイアット': { base: 55000, variance: 0.25, premium: 1.2 },
    'コンラッド': { base: 50000, variance: 0.2, premium: 1.1 },
    'ブセナ': { base: 48000, variance: 0.3, premium: 1.2 },
    'ハレクラニ': { base: 60000, variance: 0.25, premium: 1.3 },
    'ブルガリ': { base: 150000, variance: 0.5, premium: 3.0 },
    '星のや': { base: 80000, variance: 0.4, premium: 1.5 },
    '帝国ホテル': { base: 50000, variance: 0.2, premium: 1.2 },
    'オークラ': { base: 60000, variance: 0.25, premium: 1.3 }
  };

  // ホテル名からブランドを特定
  const brand = Object.keys(hotelPricing).find(key => hotelName.includes(key)) || 'default';
  const pricing = hotelPricing[brand] || { base: 45000, variance: 0.2, premium: 1.0 };
  const basePrice = pricing.base;
  
  // 日付に基づいた価格変動
  let dateMultiplier = 1;
  if (checkinDate) {
    const checkin = new Date(checkinDate);
    const dayOfWeek = checkin.getDay();
    
    // 週末は高め
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dateMultiplier = 1.3;
    } else if (dayOfWeek === 5) {
      dateMultiplier = 1.15;
    }
    
    // 繁忙期（夏休み、年末年始、GWなど）
    const month = checkin.getMonth();
    const date = checkin.getDate();
    
    // 8月（夏休み）
    if (month === 7) {
      dateMultiplier *= 1.4;
    }
    // 12月末〜1月初（年末年始）
    else if ((month === 11 && date >= 28) || (month === 0 && date <= 3)) {
      dateMultiplier *= 1.5;
    }
    // GW（4月末〜5月初）
    else if ((month === 3 && date >= 29) || (month === 4 && date <= 5)) {
      dateMultiplier *= 1.3;
    }
  }
  
  // 実際のサイト別価格差とランダム性を反映
  const siteMultipliers = {
    rakuten: 0.95 + Math.random() * 0.1, // 楽天トラベル: 0.95-1.05
    booking: 1.02 + Math.random() * 0.08, // Booking.com: 1.02-1.10  
    jalan: 0.92 + Math.random() * 0.08, // じゃらん: 0.92-1.00
    ikyu: 1.05 + Math.random() * 0.15, // 一休.com: 1.05-1.20
    google: 0.90 + Math.random() * 0.2  // Google Hotels: 0.90-1.10
  };

  // リアルな空室状況シミュレーション
  const getAvailability = (siteName: string) => {
    const availabilityRate = checkinDate ? 
      (new Date(checkinDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) > 7 ? 0.8 : 0.6 : 0.9;
    return Math.random() < availabilityRate;
  };

  // 価格計算
  const finalPrice = basePrice * dateMultiplier;
  
  return {
    rakuten: {
      price: Math.floor(finalPrice * siteMultipliers.rakuten),
      available: getAvailability('rakuten'),
      lastUpdated: new Date().toISOString(),
      currency: 'JPY',
      taxIncluded: true
    },
    booking: {
      price: Math.floor(finalPrice * siteMultipliers.booking),
      available: getAvailability('booking'),
      lastUpdated: new Date().toISOString(),
      currency: 'JPY',
      taxIncluded: false
    },
    jalan: {
      price: Math.floor(finalPrice * siteMultipliers.jalan),
      available: getAvailability('jalan'),
      lastUpdated: new Date().toISOString(),
      currency: 'JPY',
      taxIncluded: true
    },
    ikyu: {
      price: Math.floor(finalPrice * siteMultipliers.ikyu),
      available: getAvailability('ikyu'),
      lastUpdated: new Date().toISOString(),
      currency: 'JPY',
      taxIncluded: true
    },
    google: {
      minPrice: Math.floor(finalPrice * Math.min(...Object.values(siteMultipliers))),
      maxPrice: Math.floor(finalPrice * Math.max(...Object.values(siteMultipliers))),
      available: getAvailability('google'),
      lastUpdated: new Date().toISOString(),
      currency: 'JPY'
    },
    // メタデータ
    searchDates: {
      checkin: checkinDate || null,
      checkout: checkoutDate || null
    },
    hotelBrand: brand,
    basePrice: basePrice,
    priceFactors: {
      seasonalMultiplier: dateMultiplier,
      demandLevel: dateMultiplier > 1.3 ? 'high' : dateMultiplier > 1.1 ? 'medium' : 'low'
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
  return getMockPrices(hotelName, checkinDate, checkoutDate);
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