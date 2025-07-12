// ホテル関連の型定義
export interface Hotel {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  address: string;
  city: string;
  prefecture: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  category: 'luxury' | 'business' | 'resort' | 'budget' | 'boutique';
  starRating: number;
  userRating: number;
  reviewCount: number;
  amenities: string[];
  images: HotelImage[];
  checkInTime: string;
  checkOutTime: string;
  policies?: HotelPolicies;
  nearestStation?: string;
  distanceFromStation?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HotelImage {
  url: string;
  caption?: string;
  type: 'main' | 'room' | 'facility' | 'dining' | 'other';
  order: number;
}

export interface HotelPolicies {
  cancellation: string;
  checkIn: string;
  checkOut: string;
  children: string;
  pets: string;
  smoking: string;
  payment: string[];
}

export interface Room {
  id: string;
  hotelId: string;
  name: string;
  nameEn?: string;
  description: string;
  maxOccupancy: number;
  size: number;
  bedType: string;
  amenities: string[];
  images: string[];
  basePrice: number;
}

export interface PriceData {
  hotelId: string;
  roomId?: string;
  checkIn: Date;
  checkOut: Date;
  provider: 'agoda' | 'booking' | 'expedia';
  price: number;
  originalPrice?: number;
  currency: string;
  available: boolean;
  roomsLeft?: number;
  cancellationPolicy?: string;
  includes?: string[];
  fetchedAt: Date;
}

export interface SearchParams {
  location?: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  rooms: number;
  priceMin?: number;
  priceMax?: number;
  starRating?: number[];
  amenities?: string[];
  sortBy?: 'price' | 'rating' | 'distance' | 'popularity';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  hotels: HotelWithPrice[];
  totalCount: number;
  page: number;
  totalPages: number;
  filters: AvailableFilters;
}

export interface HotelWithPrice extends Hotel {
  prices: PriceData[];
  lowestPrice?: number;
  highestPrice?: number;
}

export interface AvailableFilters {
  priceRange: { min: number; max: number };
  starRatings: number[];
  amenities: string[];
  locations: string[];
}

export interface BookingRedirect {
  hotelId: string;
  provider: 'agoda' | 'booking' | 'expedia';
  checkIn: Date;
  checkOut: Date;
  guests: number;
  rooms: number;
  affiliateUrl: string;
  trackingId: string;
}

export interface ClickTracking {
  id: string;
  userId?: string;
  sessionId: string;
  hotelId: string;
  provider: string;
  clickedAt: Date;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
}

export interface ConversionTracking {
  id: string;
  clickId: string;
  bookingId: string;
  amount: number;
  commission: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  confirmedAt?: Date;
}