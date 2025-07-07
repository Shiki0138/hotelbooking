// Real-time Rakuten Vacant Hotel Search API Endpoint
const rakutenService = require('../../src/services/rakutenRealTimeService');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    
    const {
      checkinDate,
      checkoutDate,
      latitude,
      longitude,
      prefecture,
      searchRadius = 3,
      adultNum = 2,
      roomNum = 1,
      maxCharge,
      minCharge,
      sortType = 'standard',
      onsenFlag = false,
      page = 1,
      hits = 30
    } = req.query;

    // Validate required parameters
    if (!checkinDate || !checkoutDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: checkinDate and checkoutDate'
      });
    }

    // Handle prefecture-based search
    let searchLat = parseFloat(latitude);
    let searchLng = parseFloat(longitude);
    
    if (prefecture && (!latitude || !longitude)) {
      const prefectureCoords = getPrefectureCoordinates(prefecture);
      if (prefectureCoords) {
        searchLat = prefectureCoords.latitude;
        searchLng = prefectureCoords.longitude;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid prefecture or missing coordinates'
        });
      }
    }

    if (isNaN(searchLat) || isNaN(searchLng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid latitude or longitude values'
      });
    }

    console.log('🔍 Vacant hotel search:', { 
      checkinDate, 
      checkoutDate, 
      searchLat, 
      searchLng, 
      prefecture 
    });

    // Call Rakuten API
    const searchResult = await rakutenService.searchVacantHotels({
      checkinDate,
      checkoutDate,
      latitude: searchLat,
      longitude: searchLng,
      searchRadius: parseInt(searchRadius),
      adultNum: parseInt(adultNum),
      roomNum: parseInt(roomNum),
      maxCharge: maxCharge ? parseInt(maxCharge) : undefined,
      minCharge: minCharge ? parseInt(minCharge) : undefined,
      sortType,
      onsenFlag: onsenFlag === 'true',
      page: parseInt(page),
      hits: parseInt(hits)
    });

    const searchTime = Date.now() - startTime;

    const response = {
      success: true,
      data: {
        hotels: searchResult.hotels,
        pagination: {
          total: searchResult.total,
          page: searchResult.page,
          pageCount: searchResult.pageCount || 1,
          hasMore: searchResult.page < (searchResult.pageCount || 1)
        },
        searchTime,
        isFallback: searchResult.isFallback || false,
        searchParams: {
          checkinDate,
          checkoutDate,
          latitude: searchLat,
          longitude: searchLng,
          prefecture
        }
      },
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Vacant hotel search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

// Prefecture coordinates mapping
function getPrefectureCoordinates(prefecture) {
  const prefectureMap = {
    'tokyo': { latitude: 35.6762, longitude: 139.6503 },
    'osaka': { latitude: 34.6937, longitude: 135.5023 },
    'kyoto': { latitude: 35.0116, longitude: 135.7681 },
    'yokohama': { latitude: 35.4437, longitude: 139.6380 },
    'fukuoka': { latitude: 33.5904, longitude: 130.4017 },
    'okinawa': { latitude: 26.2124, longitude: 127.6792 },
    'sapporo': { latitude: 43.0643, longitude: 141.3469 },
    'sendai': { latitude: 38.2682, longitude: 140.8694 },
    'nagoya': { latitude: 35.1815, longitude: 136.9066 },
    'kobe': { latitude: 34.6901, longitude: 135.1956 },
    'hiroshima': { latitude: 34.3853, longitude: 132.4553 },
    'kanazawa': { latitude: 36.5942, longitude: 136.6256 },
    'nikko': { latitude: 36.7581, longitude: 139.6097 },
    'hakone': { latitude: 35.2319, longitude: 139.1069 },
    'atami': { latitude: 35.0951, longitude: 139.0739 }
  };

  return prefectureMap[prefecture.toLowerCase()] || null;
}