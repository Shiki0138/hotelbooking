// Basic types for the hotel booking system

export interface Hotel {
  id: string;
  name: string;
  price: number;
  image?: string;
  location?: string;
  amenities?: string[];
  rooms?: Room[];
}

export interface Room {
  id: string;
  name: string;
  base_price: number;
  capacity: number;
}

export interface PricePrediction {
  date: string;
  price: number;
  confidence: number;
}

export interface NotificationChannel {
  type: 'email' | 'line' | 'sms' | 'push';
  enabled: boolean;
}

export interface WatchlistItem {
  hotelId: string;
  hotelName: string;
  currentPrice: number;
  targetPrice?: number;
  discountRate?: number;
  notificationChannels: NotificationChannel[];
  monitoringPeriod: {
    startDate: string;
    endDate: string;
    daysOfWeek: number[];
  };
  roomThreshold?: number;
  notifyOnAvailability?: boolean;
  icalUrl?: string;
  createdAt: string;
}