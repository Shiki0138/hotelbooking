const axios = require('axios');

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 1000); // Return distance in meters
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Mock hotel data generator for development
const generateMockHotels = (latitude, longitude, radius) => {
  const hotelNames = [
    'Tokyo Grand Hotel',
    'Sakura Inn',
    'Mount Fuji View Hotel',
    'Shibuya Crossing Hotel',
    'Imperial Palace Hotel',
    'Zen Garden Resort',
    'Kabuki Theater Hotel',
    'Harajuku Boutique Hotel',
    'Asakusa Traditional Inn',
    'Rainbow Bridge Hotel',
    'Ginza Luxury Suites',
    'Roppongi Hills Hotel',
    'Shinjuku Park Hotel',
    'Ueno Station Hotel',
    'Odaiba Bay Resort',
  ];

  const hotels = [];
  const numHotels = Math.floor(Math.random() * 10) + 5;

  for (let i = 0; i < numHotels && i < hotelNames.length; i++) {
    // Generate random position within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius * 0.8; // Keep within 80% of radius
    
    // Convert distance and angle to lat/lng offset
    const latOffset = (distance / 111000) * Math.cos(angle);
    const lngOffset = (distance / (111000 * Math.cos(latitude * Math.PI / 180))) * Math.sin(angle);
    
    const hotelLat = latitude + latOffset;
    const hotelLng = longitude + lngOffset;
    const actualDistance = calculateDistance(latitude, longitude, hotelLat, hotelLng);

    hotels.push({
      id: `hotel-${i + 1}`,
      name: hotelNames[i],
      latitude: hotelLat,
      longitude: hotelLng,
      address: `${Math.floor(Math.random() * 100) + 1}-${Math.floor(Math.random() * 10) + 1} District ${i + 1}, Tokyo`,
      price: Math.floor(Math.random() * 30000) + 5000,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
      image: `https://source.unsplash.com/400x300/?hotel,japan,${i}`,
      distance: actualDistance,
      amenities: [
        'wifi',
        'parking',
        'breakfast',
        Math.random() > 0.5 ? 'pool' : null,
        Math.random() > 0.5 ? 'gym' : null,
        Math.random() > 0.7 ? 'spa' : null,
      ].filter(Boolean),
      roomTypes: ['Standard', 'Deluxe', 'Suite'],
      availability: Math.random() > 0.2,
    });
  }

  return hotels.sort((a, b) => a.distance - b.distance);
};

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
    const { latitude, longitude, radius = 5000, bounds } = req.query;

    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required parameters: latitude and longitude',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const searchRadius = parseInt(radius);

    if (isNaN(lat) || isNaN(lng) || isNaN(searchRadius)) {
      return res.status(400).json({
        error: 'Invalid parameter values',
      });
    }

    // In production, this would call the Rakuten Travel API
    // For now, we'll use mock data
    let hotels = generateMockHotels(lat, lng, searchRadius);

    // If bounds are provided, filter hotels within bounds
    if (bounds) {
      const { north, south, east, west } = bounds;
      hotels = hotels.filter(hotel => {
        return hotel.latitude >= south && 
               hotel.latitude <= north && 
               hotel.longitude >= west && 
               hotel.longitude <= east;
      });
    }

    // Add search metadata
    const response = {
      success: true,
      search_center: {
        latitude: lat,
        longitude: lng,
      },
      search_radius: searchRadius,
      total_results: hotels.length,
      hotels: hotels,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Location search error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
};