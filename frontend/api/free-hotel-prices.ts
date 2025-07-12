import { NextRequest, NextResponse } from 'next/server';

// Edge Runtime設定
export const runtime = 'edge';

// 楽天トラベルAPI（無料枠）の設定
const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID || 'demo-app-id';
const RAKUTEN_API_URL = 'https://app.rakuten.co.jp/services/api/Travel';

// キャッシュストア（実際はVercel KVやRedisを使用）
const priceCache = new Map<string, any>();

// 楽天APIから無料で価格を取得
async function fetchRakutenFreeAPI(hotelName: string, checkin?: string, checkout?: string) {
  try {
    // 1. ホテル検索（無料）
    const searchUrl = `${RAKUTEN_API_URL}/SimpleHotelSearch/20170426?applicationId=${RAKUTEN_APP_ID}&format=json&keyword=${encodeURIComponent(hotelName)}&hits=5`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return null;
    
    const searchData = await searchResponse.json();
    const hotels = searchData.hotels || [];
    
    if (hotels.length === 0) return null;
    
    // 2. 空室検索（無料）
    if (checkin && checkout && hotels[0]) {
      const hotelNo = hotels[0].hotel[0].hotelBasicInfo.hotelNo;
      const vacantUrl = `${RAKUTEN_API_URL}/VacantHotelSearch/20170426?applicationId=${RAKUTEN_APP_ID}&format=json&hotelNo=${hotelNo}&checkinDate=${checkin}&checkoutDate=${checkout}`;
      
      const vacantResponse = await fetch(vacantUrl);
      if (vacantResponse.ok) {
        const vacantData = await vacantResponse.json();
        return {
          hotelName: hotels[0].hotel[0].hotelBasicInfo.hotelName,
          minPrice: vacantData.hotels?.[0]?.hotel?.[0]?.hotelBasicInfo?.hotelMinCharge || null,
          available: !!vacantData.hotels?.length,
          source: 'rakuten_free_api'
        };
      }
    }
    
    // 基本情報のみ返す
    return {
      hotelName: hotels[0].hotel[0].hotelBasicInfo.hotelName,
      minPrice: hotels[0].hotel[0].hotelBasicInfo.hotelMinCharge,
      available: null,
      source: 'rakuten_free_api'
    };
    
  } catch (error) {
    console.error('楽天API error:', error);
    return null;
  }
}

// アフィリエイトフィードから価格取得（サンプル）
async function fetchAffiliateFeeds(hotelName: string) {
  // ここでBooking.comやじゃらんのアフィリエイトXMLフィードを取得
  // デモ用の静的データを返す
  return {
    booking: {
      price: null,
      available: null,
      affiliateUrl: `https://www.booking.com/search.html?ss=${encodeURIComponent(hotelName)}&aid=YOUR_AFFILIATE_ID`
    },
    jalan: {
      price: null,
      available: null,
      affiliateUrl: `https://www.jalan.net/uw/uwp2011/uww2011init.do?keyword=${encodeURIComponent(hotelName)}`
    }
  };
}

// Google Maps APIから基本情報取得（月$200無料枠）
async function fetchGooglePlacesInfo(hotelName: string) {
  // Google Places APIの実装
  // ここではデモデータを返す
  return {
    priceLevel: 4, // 1-4のスケール
    rating: 4.5,
    userRatingsTotal: 1234
  };
}

// 複数ソースのデータを統合
function mergeDataSources(rakutenData: any, affiliateData: any, googleData?: any) {
  const merged: any = {
    lastUpdated: new Date().toISOString(),
    sources: []
  };
  
  // 楽天データ
  if (rakutenData) {
    merged.rakuten = {
      price: rakutenData.minPrice,
      available: rakutenData.available,
      source: 'free_api'
    };
    merged.sources.push('rakuten');
  }
  
  // アフィリエイトデータ
  if (affiliateData) {
    merged.booking = affiliateData.booking;
    merged.jalan = affiliateData.jalan;
    merged.sources.push('affiliate');
  }
  
  // Google データ
  if (googleData) {
    merged.google = {
      priceLevel: googleData.priceLevel,
      rating: googleData.rating,
      reviews: googleData.userRatingsTotal
    };
    merged.sources.push('google');
  }
  
  // 価格範囲の推定
  if (rakutenData?.minPrice) {
    merged.estimatedPriceRange = {
      min: Math.floor(rakutenData.minPrice * 0.9),
      max: Math.floor(rakutenData.minPrice * 1.3)
    };
  }
  
  return merged;
}

// メインのGETハンドラー
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelName = searchParams.get('hotelName');
    const checkin = searchParams.get('checkin');
    const checkout = searchParams.get('checkout');
    
    if (!hotelName) {
      return NextResponse.json(
        { error: 'Hotel name is required' },
        { status: 400 }
      );
    }
    
    // キャッシュチェック（24時間有効）
    const cacheKey = `free-${hotelName}-${checkin}-${checkout}`;
    const cached = priceCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < 86400000)) {
      return NextResponse.json({
        ...cached.data,
        cached: true
      });
    }
    
    // 並列でデータ取得
    const [rakutenData, affiliateData] = await Promise.all([
      fetchRakutenFreeAPI(hotelName, checkin, checkout),
      fetchAffiliateFeeds(hotelName)
    ]);
    
    // データ統合
    const mergedData = mergeDataSources(rakutenData, affiliateData);
    
    // 実装のヒント
    mergedData.implementation_notes = {
      next_steps: [
        '1. 楽天デベロッパーアカウントを作成してAPP_IDを取得',
        '2. Booking.comアフィリエイトプログラムに登録',
        '3. じゃらんnet（リクルート）のAPIに申請',
        '4. Vercel KVでキャッシュ層を実装',
        '5. レート制限とエラーハンドリングを追加'
      ],
      free_limits: {
        rakuten: '1秒1リクエスト、1日10万リクエスト',
        google_maps: '月$200分の無料クレジット',
        affiliate: '無制限（成果報酬型）'
      }
    };
    
    // キャッシュに保存
    priceCache.set(cacheKey, {
      data: mergedData,
      timestamp: Date.now()
    });
    
    // CORSヘッダーを設定
    return NextResponse.json(mergedData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
    
  } catch (error) {
    console.error('Free price fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch prices',
        fallback: {
          message: '価格情報は各予約サイトでご確認ください',
          rakutenUrl: `https://travel.rakuten.co.jp/`,
          bookingUrl: `https://www.booking.com/`
        }
      },
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