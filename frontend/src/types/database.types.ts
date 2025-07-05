/**
 * Database Types for Supabase
 * Auto-generated types for type safety
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      hotels: {
        Row: {
          id: string
          rakuten_hotel_id: string
          name: string
          name_en: string | null
          location: string
          prefecture: string
          address: string
          latitude: number | null
          longitude: number | null
          description: string | null
          star_rating: number | null
          amenities: Json
          images: Json
          policies: Json
          rakuten_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rakuten_hotel_id: string
          name: string
          name_en?: string | null
          location: string
          prefecture: string
          address: string
          latitude?: number | null
          longitude?: number | null
          description?: string | null
          star_rating?: number | null
          amenities?: Json
          images?: Json
          policies?: Json
          rakuten_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rakuten_hotel_id?: string
          name?: string
          name_en?: string | null
          location?: string
          prefecture?: string
          address?: string
          latitude?: number | null
          longitude?: number | null
          description?: string | null
          star_rating?: number | null
          amenities?: Json
          images?: Json
          policies?: Json
          rakuten_data?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          full_name: string | null
          phone_number: string | null
          preferred_language: string
          preferred_areas: string[] | null
          marketing_consent: boolean
          notification_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone_number?: string | null
          preferred_language?: string
          preferred_areas?: string[] | null
          marketing_consent?: boolean
          notification_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone_number?: string | null
          preferred_language?: string
          preferred_areas?: string[] | null
          marketing_consent?: boolean
          notification_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          hotel_id: string
          hotel_name: string
          location: string
          check_in: string
          check_out: string
          guests_count: number
          target_price: number | null
          max_price: number | null
          alert_enabled: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          hotel_id: string
          hotel_name: string
          location: string
          check_in: string
          check_out: string
          guests_count?: number
          target_price?: number | null
          max_price?: number | null
          alert_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          hotel_id?: string
          hotel_name?: string
          location?: string
          check_in?: string
          check_out?: string
          guests_count?: number
          target_price?: number | null
          max_price?: number | null
          alert_enabled?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      hotel_price_history: {
        Row: {
          id: string
          hotel_id: string
          hotel_name: string
          check_in: string
          check_out: string
          guests_count: number
          current_price: number | null
          previous_price: number | null
          availability_status: string
          room_types_available: number
          raw_api_response: Json | null
          check_timestamp: string
        }
        Insert: {
          id?: string
          hotel_id: string
          hotel_name: string
          check_in: string
          check_out: string
          guests_count: number
          current_price?: number | null
          previous_price?: number | null
          availability_status: string
          room_types_available?: number
          raw_api_response?: Json | null
          check_timestamp?: string
        }
        Update: {
          id?: string
          hotel_id?: string
          hotel_name?: string
          check_in?: string
          check_out?: string
          guests_count?: number
          current_price?: number | null
          previous_price?: number | null
          availability_status?: string
          room_types_available?: number
          raw_api_response?: Json | null
          check_timestamp?: string
        }
      }
      notification_queue: {
        Row: {
          id: string
          user_id: string
          watchlist_id: string | null
          notification_type: string
          priority: string
          subject: string
          data: Json
          status: string
          error_message: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          watchlist_id?: string | null
          notification_type: string
          priority?: string
          subject: string
          data: Json
          status?: string
          error_message?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          watchlist_id?: string | null
          notification_type?: string
          priority?: string
          subject?: string
          data?: Json
          status?: string
          error_message?: string | null
          processed_at?: string | null
          created_at?: string
        }
      }
      user_notification_preferences: {
        Row: {
          id: string
          user_id: string
          email_notifications: boolean
          availability_alerts: boolean
          price_drop_alerts: boolean
          price_drop_threshold: number
          price_drop_amount: number
          daily_digest: boolean
          instant_alerts: boolean
          max_alerts_per_day: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_notifications?: boolean
          availability_alerts?: boolean
          price_drop_alerts?: boolean
          price_drop_threshold?: number
          price_drop_amount?: number
          daily_digest?: boolean
          instant_alerts?: boolean
          max_alerts_per_day?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_notifications?: boolean
          availability_alerts?: boolean
          price_drop_alerts?: boolean
          price_drop_threshold?: number
          price_drop_amount?: number
          daily_digest?: boolean
          instant_alerts?: boolean
          max_alerts_per_day?: number
          created_at?: string
          updated_at?: string
        }
      }
      notification_history: {
        Row: {
          id: string
          user_id: string
          watchlist_id: string | null
          notification_type: string
          hotel_data: Json
          price_info: Json | null
          email_subject: string
          email_status: string
          sent_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          watchlist_id?: string | null
          notification_type: string
          hotel_data: Json
          price_info?: Json | null
          email_subject: string
          email_status?: string
          sent_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          watchlist_id?: string | null
          notification_type?: string
          hotel_data?: Json
          price_info?: Json | null
          email_subject?: string
          email_status?: string
          sent_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      active_watchlist: {
        Row: {
          id: string | null
          user_id: string | null
          hotel_id: string | null
          hotel_name: string | null
          location: string | null
          check_in: string | null
          check_out: string | null
          guests_count: number | null
          target_price: number | null
          max_price: number | null
          alert_enabled: boolean | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          email: string | null
          full_name: string | null
          price_drop_threshold: number | null
          instant_alerts: boolean | null
          availability_alerts: boolean | null
        }
      }
      recent_price_drops: {
        Row: {
          hotel_id: string | null
          hotel_name: string | null
          check_in: string | null
          check_out: string | null
          guests_count: number | null
          current_price: number | null
          previous_price: number | null
          drop_percentage: number | null
          drop_amount: number | null
          availability_status: string | null
          check_timestamp: string | null
        }
      }
      system_statistics: {
        Row: {
          total_users: number | null
          active_watchlists: number | null
          price_checks_24h: number | null
          notifications_sent_24h: number | null
          monitored_hotels: number | null
        }
      }
    }
    Functions: {
      calculate_price_drop_percentage: {
        Args: {
          current_price: number
          previous_price: number
        }
        Returns: number
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_availability_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          hotel_id: string
          hotel_name: string
          avg_price: number
          min_price: number
          availability_rate: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Specific table types
export type Hotel = Tables<'hotels'>
export type UserProfile = Tables<'user_profiles'>
export type Watchlist = Tables<'watchlist'>
export type HotelPriceHistory = Tables<'hotel_price_history'>
export type NotificationQueue = Tables<'notification_queue'>
export type UserNotificationPreferences = Tables<'user_notification_preferences'>
export type NotificationHistory = Tables<'notification_history'>

// View types
export type ActiveWatchlist = Database['public']['Views']['active_watchlist']['Row']
export type RecentPriceDrop = Database['public']['Views']['recent_price_drops']['Row']
export type SystemStatistics = Database['public']['Views']['system_statistics']['Row']