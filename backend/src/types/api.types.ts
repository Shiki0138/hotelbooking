// API関連の型定義
import { Request } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  cached?: boolean;
  cachedAt?: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
  session?: {
    id: string;
    ipAddress: string;
    userAgent: string;
  };
}

// Agoda API Types
export interface AgodaSearchRequest {
  cityId: number;
  checkInDate: string;
  checkOutDate: string;
  numberOfAdults: number;
  numberOfRooms: number;
  childAges?: number[];
  currency?: string;
  language?: string;
}

export interface AgodaHotelResponse {
  hotelId: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  starRating: number;
  reviewScore: number;
  reviewCount: number;
  images: string[];
  amenities: string[];
  rooms: AgodaRoom[];
}

export interface AgodaRoom {
  roomId: string;
  name: string;
  maxOccupancy: number;
  price: number;
  originalPrice: number;
  currency: string;
  available: boolean;
  cancellationPolicy: string;
}

// Booking.com API Types
export interface BookingSearchRequest {
  dest_ids: string;
  checkin: string;
  checkout: string;
  guest_qty: number;
  room_qty: number;
  currency?: string;
  locale?: string;
}

export interface BookingHotelResponse {
  hotel_id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  star_rating: number;
  review_score: number;
  review_count: number;
  photo_urls: string[];
  facilities: string[];
  rooms: BookingRoom[];
}

export interface BookingRoom {
  room_id: string;
  name: string;
  max_occupancy: number;
  price: number;
  currency: string;
  availability: number;
  cancellation_info: string;
}

// Expedia API Types
export interface ExpediaSearchRequest {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  rooms: number;
  children?: number;
  currency?: string;
  locale?: string;
}

export interface ExpediaHotelResponse {
  hotelId: string;
  name: string;
  address: {
    streetAddress: string;
    city: string;
    province: string;
    countryCode: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  starRating: number;
  guestRating: number;
  totalReviews: number;
  images: ExpediaImage[];
  amenities: string[];
  rooms: ExpediaRoom[];
}

export interface ExpediaImage {
  url: string;
  caption: string;
  category: string;
}

export interface ExpediaRoom {
  roomId: string;
  name: string;
  maxOccupancy: number;
  rateInfo: {
    price: number;
    currency: string;
    total: number;
  };
  available: boolean;
  cancellationPolicy: string;
}

// Cache Types
export interface CacheConfig {
  ttl: number;
  key: string;
  compress?: boolean;
}

export interface CachedData<T = any> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
}

// Rate Limit Types
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}