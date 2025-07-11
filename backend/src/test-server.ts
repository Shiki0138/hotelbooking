import express from 'express';
import cors from 'cors';
import hotelDetailsRoutes from './routes/hotelDetailsRoutes';
import userRoutes from './routes/userRoutes';

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Mock Rakuten endpoints with real hotel data
app.get('/api/rakuten/luxury-hotels', (req, res) => {
  const city = req.query.city as string;
  // const affiliateId = process.env.RAKUTEN_AFFILIATE_ID || '1234567890';
  
  const allHotels = [
    {
      id: '74944',
      name: 'ザ・リッツ・カールトン東京',
      description: '東京ミッドタウンの53階からの絶景を誇る5つ星ホテル',
      address: '東京都港区赤坂九丁目7番1号 東京ミッドタウンタワー',
      city: '東京都',
      country: '日本',
      latitude: 35.6654,
      longitude: 139.7307,
      rating: 4.8,
      reviewCount: 2856,
      minPrice: 65000,
      images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=300&fit=crop',
      access: '地下鉄日比谷線・大江戸線「六本木」駅直結',
      nearestStation: '六本木駅',
      rakutenUrl: 'https://travel.rakuten.co.jp/HOTEL/74944/74944.html',
      isLuxury: true,
    },
    {
      id: '1217',
      name: 'パーク ハイアット 東京',
      description: '新宿の高層ビル最上階に位置するラグジュアリーホテル',
      address: '東京都新宿区西新宿三丁目7番1-2号',
      city: '東京都',
      country: '日本',
      latitude: 35.6854,
      longitude: 139.6908,
      rating: 4.7,
      reviewCount: 1890,
      minPrice: 48000,
      images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
      access: 'JR「新宿」駅南口から徒歩12分',
      nearestStation: '新宿駅',
      rakutenUrl: 'https://travel.rakuten.co.jp/HOTEL/1217/1217.html',
      isLuxury: true,
    },
    {
      id: '67648',
      name: 'マンダリン オリエンタル 東京',
      description: '日本橋の伝統とモダンが融合したラグジュアリーホテル',
      address: '東京都中央区日本橋室町二丁目1番1号',
      city: '東京都',
      country: '日本',
      latitude: 35.6864,
      longitude: 139.7733,
      rating: 4.9,
      reviewCount: 3210,
      minPrice: 72000,
      images: ['https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=400&h=300&fit=crop',
      access: '地下鉄銀座線「三越前」駅直結',
      nearestStation: '三越前駅',
      rakutenUrl: 'https://travel.rakuten.co.jp/HOTEL/67648/67648.html',
      isLuxury: true,
    },
    {
      id: '40391',
      name: 'ザ・ブセナテラス',
      description: '沖縄・部瀬名岳の美しいビーチリゾート',
      address: '沖縄県名護市字喜瀬1808',
      city: '沖縄県',
      country: '日本',
      latitude: 26.6943,
      longitude: 127.9777,
      rating: 4.7,
      reviewCount: 1567,
      minPrice: 42000,
      images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop',
      access: '那覇空港から車で約50分',
      nearestStation: '那覇空港',
      rakutenUrl: 'https://travel.rakuten.co.jp/HOTEL/40391/40391.html',
      isLuxury: true,
    },
    {
      id: '168223',
      name: 'ハレクラニ沖縄',
      description: '美しいサンゴ礁に囲まれた伊良部島の高級リゾート',
      address: '沖縄県国頭郡恩納村字名嘉真ヤーシ原2591-1',
      city: '沖縄県',
      country: '日本',
      latitude: 26.8606,
      longitude: 127.9436,
      rating: 4.8,
      reviewCount: 892,
      minPrice: 55000,
      images: ['https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=400&h=300&fit=crop',
      access: '那覇空港から車で約60分',
      nearestStation: '那覇空港',
      rakutenUrl: 'https://travel.rakuten.co.jp/HOTEL/168223/168223.html',
      isLuxury: true,
    },
    {
      id: '28110',
      name: 'ザ・リッツ・カールトン大阪',
      description: '大阪の中心地に位置するエレガントな高級ホテル',
      address: '大阪府大阪市北区梅田2-5-25',
      city: '大阪府',
      country: '日本',
      latitude: 34.7003,
      longitude: 135.4959,
      rating: 4.8,
      reviewCount: 2134,
      minPrice: 48000,
      images: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop',
      access: 'JR「大阪」駅から徒歩7分',
      nearestStation: '大阪駅',
      rakutenUrl: 'https://travel.rakuten.co.jp/HOTEL/28110/28110.html',
      isLuxury: true,
    },
    {
      id: '151637',
      name: 'フォーシーズンズホテル京都',
      description: '京都の伝統美と現代のラグジュアリーが融合',
      address: '京都府京都市下京区妙法院前町445-3',
      city: '京都府',
      country: '日本',
      latitude: 35.0084,
      longitude: 135.7704,
      rating: 4.9,
      reviewCount: 987,
      minPrice: 85000,
      images: ['https://images.unsplash.com/photo-1565329921943-7e537b7a2ea9?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1565329921943-7e537b7a2ea9?w=400&h=300&fit=crop',
      access: '京阪本線「神宮丸太町」駅から徒歩3分',
      nearestStation: '神宮丸太町駅',
      rakutenUrl: 'https://travel.rakuten.co.jp/HOTEL/151637/151637.html',
      isLuxury: true,
    }
  ];
  
  // Filter by city if specified
  let filteredHotels = allHotels;
  if (city && city !== 'all') {
    filteredHotels = allHotels.filter(hotel => {
      const cityMap: { [key: string]: string[] } = {
        'tokyo': ['東京都'],
        'osaka': ['大阪府'],
        'kyoto': ['京都府'],
        'okinawa': ['沖縄県']
      };
      return cityMap[city]?.includes(hotel.city) || false;
    });
  }
  
  res.json({
    data: filteredHotels,
    pagination: {
      page: 1,
      limit: 20,
      total: filteredHotels.length,
      totalPages: 1,
    }
  });
});

app.get('/api/rakuten/last-minute-deals', (req, res) => {
  const city = req.query.city as string;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID || '1234567890';
  
  const allDeals = [
    {
      id: '147',
      name: 'ヒルトン東京',
      description: '新宿の高層ビルに位置する便利な高級ホテル',
      address: '東京都新宿区西新宿6-6-2',
      city: '東京都',
      country: '日本',
      latitude: 35.6932,
      longitude: 139.6905,
      rating: 4.5,
      reviewCount: 3421,
      originalPrice: 32000,
      discountedPrice: 19200,
      discountPercentage: 40,
      images: ['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop',
      access: '都営大江戸線「都庁前」駅から徒歩3分',
      nearestStation: '都庁前駅',
      rakutenUrl: `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=https://travel.rakuten.co.jp/HOTEL/147/147.html`,
      isLastMinuteDeal: true,
    },
    {
      id: '9761',
      name: 'ウェスティンホテル東京',
      description: '恵比寿ガーデンプレイス内のラグジュアリーホテル',
      address: '東京都目黒区三田一丁目4番1号',
      city: '東京都',
      country: '日本',
      latitude: 35.6432,
      longitude: 139.7216,
      rating: 4.6,
      reviewCount: 2876,
      originalPrice: 38000,
      discountedPrice: 26600,
      discountPercentage: 30,
      images: ['https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=400&h=300&fit=crop',
      access: 'JR「恵比寿」駅から徒歩10分',
      nearestStation: '恵比寿駅',
      rakutenUrl: `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=https://travel.rakuten.co.jp/HOTEL/9761/9761.html`,
      isLastMinuteDeal: true,
    },
    {
      id: '153',
      name: 'グランド ハイアット 東京',
      description: '六本木ヒルズの中心に位置するインターナショナルホテル',
      address: '東京都港区六本木6-10-3',
      city: '東京都',
      country: '日本',
      latitude: 35.6596,
      longitude: 139.7306,
      rating: 4.5,
      reviewCount: 4123,
      originalPrice: 42000,
      discountedPrice: 25200,
      discountPercentage: 40,
      images: ['https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400&h=300&fit=crop',
      access: '地下鉄「六本木」駅から徒歩3分',
      nearestStation: '六本木駅',
      rakutenUrl: `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=https://travel.rakuten.co.jp/HOTEL/153/153.html`,
      isLastMinuteDeal: true,
    },
    {
      id: '5976',
      name: 'スイスホテル南海大阪',
      description: '難波駅直結の便利なシティホテル',
      address: '大阪府大阪市中央区難波5-1-60',
      city: '大阪府',
      country: '日本',
      latitude: 34.6627,
      longitude: 135.5022,
      rating: 4.4,
      reviewCount: 5678,
      originalPrice: 28000,
      discountedPrice: 16800,
      discountPercentage: 40,
      images: ['https://images.unsplash.com/photo-1519449556851-5720b33024e7?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1519449556851-5720b33024e7?w=400&h=300&fit=crop',
      access: '南海「難波」駅直結',
      nearestStation: '難波駅',
      rakutenUrl: `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=https://travel.rakuten.co.jp/HOTEL/5976/5976.html`,
      isLastMinuteDeal: true,
    },
    {
      id: '18550',
      name: 'シェラトン都ホテル大阪',
      description: '都心のオアシス、上本町の高級ホテル',
      address: '大阪府大阪市天王寺区上本町6-1-55',
      city: '大阪府',
      country: '日本',
      latitude: 34.6673,
      longitude: 135.5197,
      rating: 4.6,
      reviewCount: 3210,
      originalPrice: 35000,
      discountedPrice: 22750,
      discountPercentage: 35,
      images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop',
      access: '地下鉄「上本町」駅直結',
      nearestStation: '上本町駅',
      rakutenUrl: `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=https://travel.rakuten.co.jp/HOTEL/18550/18550.html`,
      isLastMinuteDeal: true,
    }
  ];
  
  // Filter by city if specified
  let filteredDeals = allDeals;
  if (city && city !== 'all') {
    filteredDeals = allDeals.filter(hotel => {
      const cityMap: { [key: string]: string[] } = {
        'tokyo': ['東京都'],
        'osaka': ['大阪府'],
        'kyoto': ['京都府'],
        'okinawa': ['沖縄県']
      };
      return cityMap[city]?.includes(hotel.city) || false;
    });
  }
  
  res.json({
    data: filteredDeals,
    pagination: {
      page: 1,
      limit: 30,
      total: filteredDeals.length,
      totalPages: 1,
    }
  });
});

app.post('/api/rakuten/booking-url', (req, res) => {
  const { hotelName, checkinDate, checkoutDate } = req.body;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID || '1234567890';
  
  // ホテル名でキーワード検索するURLを生成
  const searchUrl = new URL('https://hb.afl.rakuten.co.jp/hgc/' + affiliateId + '/');
  searchUrl.searchParams.set('pc', 'https://travel.rakuten.co.jp/dsearch/');
  searchUrl.searchParams.set('f_no', '1'); // 検索結果を表示
  searchUrl.searchParams.set('f_nen1', checkinDate.substring(0, 4));
  searchUrl.searchParams.set('f_tuki1', checkinDate.substring(5, 7));
  searchUrl.searchParams.set('f_hi1', checkinDate.substring(8, 10));
  searchUrl.searchParams.set('f_nen2', checkoutDate.substring(0, 4));
  searchUrl.searchParams.set('f_tuki2', checkoutDate.substring(5, 7));
  searchUrl.searchParams.set('f_hi2', checkoutDate.substring(8, 10));
  searchUrl.searchParams.set('f_keyword', encodeURIComponent(hotelName));
  searchUrl.searchParams.set('f_otona_su', '2');
  
  res.json({
    bookingUrl: searchUrl.toString()
  });
});

// Aggregated hotel search endpoint
app.get('/api/hotels/aggregated', (req, res) => {
  const sources = req.query.sources || 'all';
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID || '1234567890';
  const agodaId = process.env.AGODA_SITE_ID || '1234567';
  
  const allHotels = [
    // Rakuten hotels
    {
      id: 'rakuten_16000',
      source: 'rakuten',
      name: 'ザ・リッツ・カールトン東京',
      description: '東京ミッドタウンの53階からの絶景',
      address: '東京都港区赤坂九丁目7番1号',
      city: '東京都',
      country: '日本',
      latitude: 35.6654,
      longitude: 139.7307,
      rating: 4.8,
      reviewCount: 2856,
      price: 65000,
      images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=300&fit=crop',
      bookingUrl: `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=https://travel.rakuten.co.jp/HOTEL/16000/16000.html`,
      isLuxury: true,
    },
    // Agoda hotels
    {
      id: 'agoda_2298764',
      source: 'agoda',
      name: 'コンラッド東京',
      address: '東京都港区東新橋1-9-1',
      city: '東京',
      country: '日本',
      latitude: 35.6619,
      longitude: 139.7631,
      rating: 4.5,
      reviewCount: 4521,
      price: 52000,
      originalPrice: 65000,
      discountPercentage: 20,
      images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=300&fit=crop',
      bookingUrl: `https://www.agoda.com/partners/partnersearch.aspx?site_id=${agodaId}&hid=2298764`,
      isLuxury: true,
    },
    {
      id: 'agoda_432156',
      source: 'agoda',
      name: 'アンダーズ東京',
      address: '東京都港区虎ノ門一丁目23番4号',
      city: '東京',
      country: '日本',
      latitude: 35.6677,
      longitude: 139.7497,
      rating: 4.6,
      reviewCount: 3210,
      price: 58000,
      originalPrice: 72000,
      discountPercentage: 19,
      images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop',
      bookingUrl: `https://www.agoda.com/partners/partnersearch.aspx?site_id=${agodaId}&hid=432156`,
      isLuxury: true,
    },
    // Mock Booking.com hotel
    {
      id: 'booking_345678',
      source: 'booking',
      name: 'パークハイアット東京',
      address: '東京都新宿区西新宿三丁目7番1-2号',
      city: '東京',
      country: '日本',
      latitude: 35.6854,
      longitude: 139.6908,
      rating: 4.7,
      reviewCount: 1890,
      price: 48000,
      images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop'],
      thumbnailUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
      bookingUrl: 'https://www.booking.com/hotel/jp/park-hyatt-tokyo.html',
      isLuxury: true,
    }
  ];
  
  // Filter by sources if specified
  let filteredHotels = allHotels;
  if (sources !== 'all' && typeof sources === 'string') {
    const sourceList = sources.split(',');
    filteredHotels = allHotels.filter(hotel => sourceList.includes(hotel.source));
  }
  
  res.json({
    data: filteredHotels,
    sources: {
      rakuten: filteredHotels.filter(h => h.source === 'rakuten').length,
      agoda: filteredHotels.filter(h => h.source === 'agoda').length,
      booking: filteredHotels.filter(h => h.source === 'booking').length,
      total: filteredHotels.length,
    },
    pagination: {
      page: 1,
      limit: 50,
      total: filteredHotels.length,
      totalPages: 1,
    }
  });
});

// Add hotel details routes
app.use('/api/hotel-details', hotelDetailsRoutes);

// Add user routes
app.use('/api/user', userRoutes);

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});