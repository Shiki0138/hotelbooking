import axios from 'axios';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Coordinates {
  lat: number;
  lng: number;
}

interface Hotel {
  id: string;
  name: string;
  position: Coordinates;
  price: number;
  rating: number;
  image: string;
  address: string;
  distance?: number;
}

interface GeocodeResult {
  formatted_address: string;
  geometry: {
    location: Coordinates;
  };
  place_id: string;
}

interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: Coordinates;
  };
  rating?: number;
  price_level?: number;
}

// Geocode an address to get coordinates
export const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        formatted_address: result.formatted_address,
        geometry: {
          location: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          },
        },
        place_id: result.place_id,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Reverse geocode coordinates to get address
export const reverseGeocode = async (coordinates: Coordinates): Promise<string> => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.lat},${coordinates.lng}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].formatted_address;
    }
    return 'Unknown location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown location';
  }
};

// Search for places (landmarks, attractions, etc.)
export const searchPlaces = async (
  query: string,
  location?: Coordinates,
  radius: number = 5000
): Promise<PlaceSearchResult[]> => {
  try {
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&key=${GOOGLE_MAPS_API_KEY}`;

    if (location) {
      url += `&location=${location.lat},${location.lng}&radius=${radius}`;
    }

    const response = await axios.get(url);

    if (response.data.results) {
      return response.data.results.map((place: any) => ({
        place_id: place.place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        geometry: {
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          },
        },
        rating: place.rating,
        price_level: place.price_level,
      }));
    }
    return [];
  } catch (error) {
    console.error('Place search error:', error);
    return [];
  }
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(point2.lat - point1.lat);
  const dLon = toRad(point2.lng - point1.lng);
  const lat1 = toRad(point1.lat);
  const lat2 = toRad(point2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 1000); // Return distance in meters
};

// Helper function to convert degrees to radians
const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

// Search hotels by location using backend API
export const searchHotelsByLocation = async (
  center: Coordinates,
  radius: number
): Promise<Hotel[]> => {
  try {
    const response = await axios.get(`${BACKEND_API_URL}/api/hotels/search-by-location`, {
      params: {
        latitude: center.lat,
        longitude: center.lng,
        radius: radius,
      },
    });

    return response.data.hotels.map((hotel: any) => ({
      id: hotel.id,
      name: hotel.name,
      position: {
        lat: hotel.latitude,
        lng: hotel.longitude,
      },
      price: hotel.price,
      rating: hotel.rating,
      image: hotel.image || 'https://via.placeholder.com/300x200?text=Hotel',
      address: hotel.address,
      distance: hotel.distance,
    }));
  } catch (error) {
    console.error('Hotel search error:', error);
    // Return mock data for development
    return generateMockHotels(center, radius);
  }
};

// Generate mock hotel data for development
const generateMockHotels = (center: Coordinates, radius: number): Hotel[] => {
  const mockHotels: Hotel[] = [];
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
  ];

  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;
    const distance = Math.random() * radius * 0.8; // Random distance within 80% of radius
    const lat = center.lat + (distance / 111000) * Math.cos(angle); // 111km per degree latitude
    const lng = center.lng + (distance / (111000 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(angle);

    mockHotels.push({
      id: `hotel-${i + 1}`,
      name: hotelNames[i],
      position: { lat, lng },
      price: Math.floor(Math.random() * 20000) + 5000,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // Rating between 3.0 and 5.0
      image: `https://source.unsplash.com/400x300/?hotel,${i}`,
      address: `${Math.floor(Math.random() * 100) + 1}-${Math.floor(Math.random() * 10) + 1} Example Street, Tokyo`,
      distance: Math.round(distance),
    });
  }

  return mockHotels.sort((a, b) => (a.distance || 0) - (b.distance || 0));
};

// Get place details
export const getPlaceDetails = async (placeId: string): Promise<any> => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,rating,price_level,photos,reviews,opening_hours&key=${GOOGLE_MAPS_API_KEY}`
    );

    return response.data.result;
  } catch (error) {
    console.error('Place details error:', error);
    return null;
  }
};

// Get directions between two points
export const getDirections = async (
  origin: Coordinates,
  destination: Coordinates,
  mode: 'driving' | 'walking' | 'transit' = 'driving'
): Promise<any> => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`
    );

    return response.data;
  } catch (error) {
    console.error('Directions error:', error);
    return null;
  }
};

// Autocomplete predictions for search
export const getAutocompletePredictions = async (
  input: string,
  location?: Coordinates,
  radius: number = 50000
): Promise<any[]> => {
  try {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&key=${GOOGLE_MAPS_API_KEY}`;

    if (location) {
      url += `&location=${location.lat},${location.lng}&radius=${radius}`;
    }

    const response = await axios.get(url);
    return response.data.predictions || [];
  } catch (error) {
    console.error('Autocomplete error:', error);
    return [];
  }
};