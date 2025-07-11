// API Configuration
// Backend runs on port 8000, Frontend runs on port 8080

// Support both Vite and Webpack environments
const API_BASE_URL = 
  import.meta?.env?.VITE_API_URL || 
  'https://backend-7kfmeq3wi-shikis-projects-6e27447a.vercel.app';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  endpoints: {
    // Auth endpoints
    auth: {
      login: `${API_BASE_URL}/auth/login`,
      signup: `${API_BASE_URL}/auth/signup`,
      logout: `${API_BASE_URL}/auth/logout`,
      refresh: `${API_BASE_URL}/auth/refresh`,
      profile: `${API_BASE_URL}/auth/profile`
    },
    // Hotel endpoints
    hotels: {
      list: `${API_BASE_URL}/hotels`,
      detail: (id: string) => `${API_BASE_URL}/hotels/${id}`,
      search: `${API_BASE_URL}/search`,
      autocomplete: `${API_BASE_URL}/autocomplete`,
      aggregated: `${API_BASE_URL}/hotels/aggregated`
    },
    // Rakuten endpoints
    rakuten: {
      luxuryHotels: `${API_BASE_URL}/rakuten/luxury-hotels`,
      lastMinuteDeals: `${API_BASE_URL}/rakuten/last-minute-deals`,
      bookingUrl: `${API_BASE_URL}/rakuten/booking-url`,
      favoriteConditions: `${API_BASE_URL}/rakuten/favorite-conditions`
    },
    // Booking endpoints
    bookings: {
      create: `${API_BASE_URL}/bookings`,
      list: `${API_BASE_URL}/bookings`,
      detail: (id: string) => `${API_BASE_URL}/bookings/${id}`,
      cancel: (id: string) => `${API_BASE_URL}/bookings/${id}/cancel`
    },
    // Room endpoints
    rooms: {
      list: (hotelId: string) => `${API_BASE_URL}/hotels/${hotelId}/rooms`,
      detail: (roomId: string) => `${API_BASE_URL}/rooms/${roomId}`,
      availability: `${API_BASE_URL}/rooms/availability`
    },
    // External services
    weather: {
      current: `${API_BASE_URL}/weather`,
      forecast: `${API_BASE_URL}/weather/forecast`
    },
    geocoding: {
      search: `${API_BASE_URL}/geocoding`,
      reverse: `${API_BASE_URL}/geocoding/reverse`
    },
    currency: {
      rates: `${API_BASE_URL}/currency/rates`,
      convert: `${API_BASE_URL}/currency/convert`
    },
    images: {
      upload: `${API_BASE_URL}/images/upload`,
      optimize: `${API_BASE_URL}/images/optimize`
    },
    // Aggregator endpoints
    aggregator: {
      luxuryHotels: `${API_BASE_URL}/aggregator/luxury-hotels`,
      lastMinuteDeals: `${API_BASE_URL}/aggregator/last-minute-deals`,
      compareprices: `${API_BASE_URL}/aggregator/compare-prices`
    }
  },
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export default API_CONFIG;