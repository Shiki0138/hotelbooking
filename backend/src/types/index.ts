export interface SearchFilters {
  city?: string;
  country?: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  amenities?: string[];
  radius?: number;
  latitude?: number;
  longitude?: number;
  sortBy?: 'price' | 'rating' | 'distance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
  id: string;
}

export interface AvailabilityUpdate {
  roomId: string;
  date: Date;
  available: number;
  price: number;
}