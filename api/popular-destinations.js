// Popular Destinations API Endpoint
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const popularDestinations = [
      {
        code: 'tokyo',
        name: '東京',
        latitude: 35.6762,
        longitude: 139.6503,
        description: '日本の首都、ビジネス・観光の中心地',
        image: 'https://source.unsplash.com/400x300/?tokyo,japan',
        hotelCount: 1200,
        averagePrice: 18000
      },
      {
        code: 'osaka',
        name: '大阪',
        latitude: 34.6937,
        longitude: 135.5023,
        description: 'グルメと文化の街、関西の玄関口',
        image: 'https://source.unsplash.com/400x300/?osaka,japan',
        hotelCount: 850,
        averagePrice: 14000
      },
      {
        code: 'kyoto',
        name: '京都',
        latitude: 35.0116,
        longitude: 135.7681,
        description: '古都の風情、歴史と文化の宝庫',
        image: 'https://source.unsplash.com/400x300/?kyoto,temple',
        hotelCount: 620,
        averagePrice: 16000
      },
      {
        code: 'yokohama',
        name: '横浜',
        latitude: 35.4437,
        longitude: 139.6380,
        description: '港町の魅力、中華街と赤レンガ倉庫',
        image: 'https://source.unsplash.com/400x300/?yokohama,japan',
        hotelCount: 480,
        averagePrice: 15000
      },
      {
        code: 'fukuoka',
        name: '福岡',
        latitude: 33.5904,
        longitude: 130.4017,
        description: '九州の玄関口、博多グルメの街',
        image: 'https://source.unsplash.com/400x300/?fukuoka,japan',
        hotelCount: 380,
        averagePrice: 12000
      },
      {
        code: 'okinawa',
        name: '沖縄',
        latitude: 26.2124,
        longitude: 127.6792,
        description: '南国リゾート、美しい海と文化',
        image: 'https://source.unsplash.com/400x300/?okinawa,beach',
        hotelCount: 320,
        averagePrice: 22000
      },
      {
        code: 'sapporo',
        name: '札幌',
        latitude: 43.0643,
        longitude: 141.3469,
        description: '北海道の中心、雪祭りとグルメ',
        image: 'https://source.unsplash.com/400x300/?sapporo,snow',
        hotelCount: 280,
        averagePrice: 13000
      },
      {
        code: 'hakone',
        name: '箱根',
        latitude: 35.2319,
        longitude: 139.1069,
        description: '温泉と富士山の絶景リゾート',
        image: 'https://source.unsplash.com/400x300/?hakone,onsen',
        hotelCount: 150,
        averagePrice: 28000
      },
      {
        code: 'atami',
        name: '熱海',
        latitude: 35.0951,
        longitude: 139.0739,
        description: '歴史ある温泉街、海を望む癒しの地',
        image: 'https://source.unsplash.com/400x300/?atami,onsen',
        hotelCount: 120,
        averagePrice: 24000
      },
      {
        code: 'nikko',
        name: '日光',
        latitude: 36.7581,
        longitude: 139.6097,
        description: '世界遺産の街、自然と歴史の調和',
        image: 'https://source.unsplash.com/400x300/?nikko,temple',
        hotelCount: 95,
        averagePrice: 19000
      }
    ];

    const response = {
      success: true,
      data: popularDestinations,
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Popular destinations error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};