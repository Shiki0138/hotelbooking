export interface AdvancedSearchFilters {
  // Basic filters
  city?: string;
  country?: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  
  // Price range
  priceRange?: {
    min: number;
    max: number;
  };
  
  // Hotel facilities
  hotelAmenities?: {
    wifi?: boolean;
    parking?: boolean;
    pool?: boolean;
    gym?: boolean;
    spa?: boolean;
    restaurant?: boolean;
    bar?: boolean;
    petFriendly?: boolean;
    airportShuttle?: boolean;
    businessCenter?: boolean;
    laundry?: boolean;
    roomService?: boolean;
  };
  
  // Room amenities
  roomAmenities?: {
    airConditioning?: boolean;
    balcony?: boolean;
    kitchenette?: boolean;
    minibar?: boolean;
    safe?: boolean;
    tv?: boolean;
    coffeeMaker?: boolean;
    bathTub?: boolean;
    nonSmoking?: boolean;
    oceanView?: boolean;
  };
  
  // Services
  services?: {
    freeBreakfast?: boolean;
    allInclusive?: boolean;
    freeCancellation?: boolean;
    payAtProperty?: boolean;
    instantConfirmation?: boolean;
    earlyCheckIn?: boolean;
    lateCheckOut?: boolean;
    concierge?: boolean;
  };
  
  // Ratings and reviews
  ratings?: {
    minRating?: number; // 1-5
    minReviewCount?: number;
    guestType?: 'business' | 'couples' | 'family' | 'solo' | 'all';
  };
  
  // Location preferences
  location?: {
    nearAirport?: boolean;
    nearBeach?: boolean;
    cityCenter?: boolean;
    nearSubway?: boolean;
    quietArea?: boolean;
    maxDistanceFromCenter?: number; // in km
    nearLandmarks?: string[];
  };
  
  // Property types
  propertyTypes?: Array<'hotel' | 'resort' | 'boutique' | 'apartment' | 'hostel' | 'ryokan' | 'villa'>;
  
  // Star rating
  starRatings?: number[]; // [3, 4, 5] for 3+ stars
  
  // Accessibility
  accessibility?: {
    wheelchairAccessible?: boolean;
    elevator?: boolean;
    accessibleBathroom?: boolean;
    brailleSignage?: boolean;
  };
  
  // Price preferences
  priceIncludes?: {
    includeTaxes?: boolean;
    includeServiceCharge?: boolean;
  };
  
  // Special offers
  specialOffers?: {
    hasDiscount?: boolean;
    lastMinuteDeal?: boolean;
    earlyBirdSpecial?: boolean;
    longStayDiscount?: boolean;
  };
}

export interface SortOptions {
  sortBy: 'price' | 'rating' | 'distance' | 'popularity' | 'deals' | 'reviewScore' | 'newest';
  sortOrder: 'asc' | 'desc';
}

export interface SearchPreferences {
  userId: string;
  savedFilters?: AdvancedSearchFilters;
  priceAlerts?: {
    destination: string;
    maxPrice: number;
    checkIn: Date;
    checkOut: Date;
  }[];
  recentSearches?: SearchHistory[];
  favoriteHotels?: string[];
  excludeHotels?: string[];
}

export interface SearchHistory {
  id: string;
  userId: string;
  filters: AdvancedSearchFilters;
  timestamp: Date;
  resultCount: number;
  clickedHotels?: string[];
}

export interface SearchSuggestion {
  type: 'city' | 'hotel' | 'landmark' | 'area';
  value: string;
  displayName: string;
  metadata?: {
    country?: string;
    hotelCount?: number;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

export interface PriceDistribution {
  min: number;
  max: number;
  average: number;
  distribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

export interface SearchAggregations {
  priceDistribution: PriceDistribution;
  amenitiesCount: Record<string, number>;
  ratingsDistribution: Record<number, number>;
  propertyTypesCount: Record<string, number>;
  locationClusters: {
    name: string;
    count: number;
    centerLat: number;
    centerLng: number;
  }[];
}