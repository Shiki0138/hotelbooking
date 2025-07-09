import { supabase } from '../config/supabase';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface OTAProvider {
  id?: string;
  provider_name: string;
  provider_code: string;
  api_endpoint: string;
  api_version?: string;
  is_active?: boolean;
  rate_limit?: number;
  credentials?: any;
  configuration?: any;
}

export interface HotelOTAMapping {
  id?: string;
  hotel_id: string;
  provider_id: string;
  external_hotel_id: string;
  external_hotel_name?: string;
  mapping_confidence?: number;
  is_verified?: boolean;
  metadata?: any;
}

export interface OTABooking {
  provider_id: string;
  external_booking_id: string;
  hotel_id: string;
  room_id?: string;
  check_in_date: string;
  check_out_date: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guests_count: number;
  total_amount: number;
  commission_amount?: number;
  currency?: string;
  booking_status: string;
  raw_booking_data: any;
}

class OTAIntegrationService {
  private providers: Map<string, OTAProvider> = new Map();

  // Provider Management
  async registerProvider(provider: OTAProvider): Promise<OTAProvider> {
    const { data, error } = await supabase
      .from('ota_providers')
      .insert([provider])
      .select()
      .single();

    if (error) throw error;
    
    this.providers.set(data.provider_code, data);
    return data;
  }

  async getProviders(activeOnly: boolean = true): Promise<OTAProvider[]> {
    let query = supabase.from('ota_providers').select('*');
    
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  }

  // Hotel Mapping
  async mapHotel(mapping: HotelOTAMapping): Promise<HotelOTAMapping> {
    const { data, error } = await supabase
      .from('hotel_ota_mappings')
      .insert([mapping])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getHotelMappings(hotelId: string): Promise<HotelOTAMapping[]> {
    const { data, error } = await supabase
      .from('hotel_ota_mappings')
      .select('*, ota_providers(*)')
      .eq('hotel_id', hotelId);

    if (error) throw error;
    return data || [];
  }

  // Inventory Sync
  async syncInventory(providerId: string, hotelId: string, dateRange: { start: string; end: string }) {
    try {
      // Create sync job
      const jobId = await this.createSyncJob(providerId, 'inventory_sync', {
        hotel_id: hotelId,
        date_range: dateRange
      });

      // Get provider and mapping
      const provider = await this.getProvider(providerId);
      const mapping = await this.getHotelMapping(hotelId, providerId);

      if (!provider || !mapping) {
        throw new Error('Provider or mapping not found');
      }

      // Call provider API based on provider type
      let inventory;
      switch (provider.provider_code) {
        case 'booking_com':
          inventory = await this.syncBookingComInventory(provider, mapping, dateRange);
          break;
        case 'expedia':
          inventory = await this.syncExpediaInventory(provider, mapping, dateRange);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider.provider_code}`);
      }

      // Update inventory cache
      await this.updateInventoryCache(providerId, mapping.id!, inventory);

      // Complete sync job
      await this.completeSyncJob(jobId, { items_synced: inventory.length });

      return inventory;
    } catch (error: any) {
      await this.failSyncJob(jobId!, error.message);
      throw error;
    }
  }

  // Booking Sync
  async syncBookings(providerId: string, since?: Date) {
    try {
      const jobId = await this.createSyncJob(providerId, 'booking_sync', { since });

      const provider = await this.getProvider(providerId);
      if (!provider) throw new Error('Provider not found');

      // Get bookings from provider
      let bookings;
      switch (provider.provider_code) {
        case 'booking_com':
          bookings = await this.syncBookingComBookings(provider, since);
          break;
        case 'expedia':
          bookings = await this.syncExpediaBookings(provider, since);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider.provider_code}`);
      }

      // Import bookings
      const imported = await this.importBookings(providerId, bookings);

      await this.completeSyncJob(jobId, { bookings_imported: imported.length });

      return imported;
    } catch (error: any) {
      await this.failSyncJob(jobId!, error.message);
      throw error;
    }
  }

  // Provider-specific implementations
  private async syncBookingComInventory(provider: OTAProvider, mapping: HotelOTAMapping, dateRange: any) {
    const response = await this.makeAPICall(provider, 'GET', '/availability', {
      hotel_id: mapping.external_hotel_id,
      checkin: dateRange.start,
      checkout: dateRange.end
    });

    // Transform Booking.com response to our format
    return response.data.rooms.map((room: any) => ({
      room_id: room.room_id,
      date: room.date,
      availability: room.available_rooms,
      rate: room.price,
      currency: room.currency,
      rate_plan_code: room.rate_plan_id,
      restrictions: {
        min_los: room.min_length_of_stay,
        max_los: room.max_length_of_stay,
        closed_to_arrival: room.closed_to_arrival,
        closed_to_departure: room.closed_to_departure
      }
    }));
  }

  private async syncExpediaInventory(provider: OTAProvider, mapping: HotelOTAMapping, dateRange: any) {
    const response = await this.makeAPICall(provider, 'GET', '/properties/availability', {
      property_id: mapping.external_hotel_id,
      checkin_date: dateRange.start,
      checkout_date: dateRange.end
    });

    // Transform Expedia response to our format
    return response.data.availability.map((avail: any) => ({
      room_id: avail.room_type_id,
      date: avail.date,
      availability: avail.available_count,
      rate: avail.rate.amount,
      currency: avail.rate.currency,
      rate_plan_code: avail.rate_plan_code,
      restrictions: avail.restrictions
    }));
  }

  private async syncBookingComBookings(provider: OTAProvider, since?: Date) {
    const params: any = {};
    if (since) {
      params.modified_since = since.toISOString();
    }

    const response = await this.makeAPICall(provider, 'GET', '/reservations', params);

    return response.data.reservations.map((res: any) => ({
      external_booking_id: res.reservation_id,
      hotel_id: res.hotel_id,
      room_id: res.room_id,
      check_in_date: res.checkin,
      check_out_date: res.checkout,
      guest_name: res.guest.name,
      guest_email: res.guest.email,
      guest_phone: res.guest.phone,
      guests_count: res.guest_count,
      total_amount: res.total_amount,
      commission_amount: res.commission_amount,
      currency: res.currency,
      booking_status: res.status,
      raw_booking_data: res
    }));
  }

  private async syncExpediaBookings(provider: OTAProvider, since?: Date) {
    const params: any = {};
    if (since) {
      params.since = since.toISOString();
    }

    const response = await this.makeAPICall(provider, 'GET', '/bookings', params);

    return response.data.bookings.map((booking: any) => ({
      external_booking_id: booking.booking_id,
      hotel_id: booking.property_id,
      room_id: booking.room_id,
      check_in_date: booking.check_in,
      check_out_date: booking.check_out,
      guest_name: `${booking.primary_guest.first_name} ${booking.primary_guest.last_name}`,
      guest_email: booking.primary_guest.email,
      guest_phone: booking.primary_guest.phone,
      guests_count: booking.total_guests,
      total_amount: booking.total_cost.amount,
      commission_amount: booking.commission.amount,
      currency: booking.total_cost.currency,
      booking_status: booking.status,
      raw_booking_data: booking
    }));
  }

  // Helper methods
  private async makeAPICall(provider: OTAProvider, method: string, endpoint: string, params?: any, data?: any) {
    const startTime = Date.now();
    let response;
    let error;

    try {
      const config = {
        method,
        url: `${provider.api_endpoint}${endpoint}`,
        headers: this.getAuthHeaders(provider),
        params,
        data
      };

      response = await axios(config);

      // Log successful API call
      await this.logAPICall(provider.id!, {
        request_type: method,
        request_url: config.url,
        request_headers: config.headers,
        request_body: data,
        response_status: response.status,
        response_headers: response.headers,
        response_body: response.data,
        duration_ms: Date.now() - startTime
      });

      return response;
    } catch (err: any) {
      error = err;

      // Log failed API call
      await this.logAPICall(provider.id!, {
        request_type: method,
        request_url: `${provider.api_endpoint}${endpoint}`,
        request_headers: this.getAuthHeaders(provider),
        request_body: data,
        response_status: err.response?.status,
        response_headers: err.response?.headers,
        response_body: err.response?.data,
        error_message: err.message,
        duration_ms: Date.now() - startTime
      });

      throw error;
    }
  }

  private getAuthHeaders(provider: OTAProvider): any {
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (provider.credentials) {
      switch (provider.provider_code) {
        case 'booking_com':
          headers['Authorization'] = `Basic ${Buffer.from(`${provider.credentials.username}:${provider.credentials.password}`).toString('base64')}`;
          break;
        case 'expedia':
          headers['Api-Key'] = provider.credentials.api_key;
          headers['Secret'] = provider.credentials.secret;
          break;
      }
    }

    return headers;
  }

  private async getProvider(providerId: string): Promise<OTAProvider | null> {
    const { data, error } = await supabase
      .from('ota_providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getHotelMapping(hotelId: string, providerId: string): Promise<HotelOTAMapping | null> {
    const { data, error } = await supabase
      .from('hotel_ota_mappings')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('provider_id', providerId)
      .single();

    if (error) throw error;
    return data;
  }

  private async createSyncJob(providerId: string, jobType: string, parameters: any): Promise<string> {
    const { data, error } = await supabase
      .from('ota_sync_jobs')
      .insert([{
        provider_id: providerId,
        job_type: jobType,
        status: 'running',
        parameters,
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  private async completeSyncJob(jobId: string, results: any): Promise<void> {
    const { error } = await supabase
      .from('ota_sync_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results
      })
      .eq('id', jobId);

    if (error) throw error;
  }

  private async failSyncJob(jobId: string, errorMessage: string): Promise<void> {
    const { error } = await supabase
      .from('ota_sync_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', jobId);

    if (error) throw error;
  }

  private async updateInventoryCache(providerId: string, mappingId: string, inventory: any[]): Promise<void> {
    const records = inventory.map(item => ({
      provider_id: providerId,
      hotel_mapping_id: mappingId,
      room_mapping_id: item.room_id,
      date: item.date,
      availability: item.availability,
      rate: item.rate,
      currency: item.currency,
      rate_plan_code: item.rate_plan_code,
      restrictions: item.restrictions,
      last_synced_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('ota_inventory_cache')
      .upsert(records, {
        onConflict: 'provider_id,room_mapping_id,date,rate_plan_code'
      });

    if (error) throw error;
  }

  private async importBookings(providerId: string, bookings: any[]): Promise<OTABooking[]> {
    const records = bookings.map(booking => ({
      ...booking,
      provider_id: providerId,
      synced_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('ota_bookings')
      .upsert(records, {
        onConflict: 'provider_id,external_booking_id'
      })
      .select();

    if (error) throw error;
    return data || [];
  }

  private async logAPICall(providerId: string, logData: any): Promise<void> {
    const { error } = await supabase
      .from('ota_api_logs')
      .insert([{
        provider_id: providerId,
        ...logData
      }]);

    if (error) console.error('Failed to log API call:', error);
  }
}

export const otaIntegrationService = new OTAIntegrationService();