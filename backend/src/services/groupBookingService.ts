import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface CorporateAccount {
  id?: string;
  company_name: string;
  company_code: string;
  tax_id?: string;
  billing_address: any;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone?: string;
  credit_limit?: number;
  payment_terms?: number;
  discount_percentage?: number;
  is_active?: boolean;
  metadata?: any;
}

export interface GroupBooking {
  id?: string;
  group_booking_number?: string;
  corporate_account_id?: string;
  organizer_user_id: string;
  hotel_id: string;
  group_name: string;
  check_in_date: string;
  check_out_date: string;
  total_rooms: number;
  total_guests: number;
  status?: string;
  payment_status?: string;
  total_amount?: number;
  deposit_amount?: number;
  deposit_paid?: boolean;
  special_requirements?: string;
  cancellation_policy?: any;
}

export interface GroupBookingRoom {
  group_booking_id: string;
  room_id: string;
  quantity: number;
  rate_per_room: number;
  occupancy_per_room: number;
  special_requests?: string;
}

export interface GroupBookingGuest {
  group_booking_id: string;
  room_assignment_id?: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  special_needs?: string;
  check_in_status?: string;
}

class GroupBookingService {
  // Corporate Account Management
  async createCorporateAccount(account: CorporateAccount): Promise<CorporateAccount> {
    // Generate unique company code if not provided
    if (!account.company_code) {
      account.company_code = await this.generateCompanyCode(account.company_name);
    }

    const { data, error } = await supabase
      .from('corporate_accounts')
      .insert([account])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCorporateAccount(id: string): Promise<CorporateAccount | null> {
    const { data, error } = await supabase
      .from('corporate_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateCorporateAccount(id: string, updates: Partial<CorporateAccount>): Promise<CorporateAccount> {
    const { data, error } = await supabase
      .from('corporate_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async addCorporateUser(accountId: string, userId: string, role: string = 'employee'): Promise<any> {
    const { data, error } = await supabase
      .from('corporate_account_users')
      .insert([{
        corporate_account_id: accountId,
        user_id: userId,
        role
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Group Booking Management
  async createGroupBooking(booking: GroupBooking): Promise<GroupBooking> {
    const { data, error } = await supabase
      .from('group_bookings')
      .insert([booking])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getGroupBooking(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('group_bookings')
      .select(`
        *,
        hotels(*),
        corporate_accounts(*),
        group_booking_rooms(*, rooms(*)),
        group_booking_guests(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateGroupBooking(id: string, updates: Partial<GroupBooking>): Promise<GroupBooking> {
    const { data, error } = await supabase
      .from('group_bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async confirmGroupBooking(id: string): Promise<GroupBooking> {
    return this.updateGroupBooking(id, {
      status: 'confirmed'
    });
  }

  async cancelGroupBooking(id: string): Promise<GroupBooking> {
    return this.updateGroupBooking(id, {
      status: 'cancelled'
    });
  }

  // Room Assignment
  async assignRooms(groupBookingId: string, rooms: GroupBookingRoom[]): Promise<GroupBookingRoom[]> {
    const { data, error } = await supabase
      .from('group_booking_rooms')
      .insert(rooms.map(room => ({
        ...room,
        group_booking_id: groupBookingId
      })))
      .select();

    if (error) throw error;
    return data || [];
  }

  async updateRoomAssignment(id: string, updates: Partial<GroupBookingRoom>): Promise<GroupBookingRoom> {
    const { data, error } = await supabase
      .from('group_booking_rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Guest Management
  async addGuests(groupBookingId: string, guests: GroupBookingGuest[]): Promise<GroupBookingGuest[]> {
    const { data, error } = await supabase
      .from('group_booking_guests')
      .insert(guests.map(guest => ({
        ...guest,
        group_booking_id: groupBookingId
      })))
      .select();

    if (error) throw error;
    return data || [];
  }

  async updateGuest(id: string, updates: Partial<GroupBookingGuest>): Promise<GroupBookingGuest> {
    const { data, error } = await supabase
      .from('group_booking_guests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async checkInGuest(id: string): Promise<GroupBookingGuest> {
    return this.updateGuest(id, {
      check_in_status: 'checked_in'
    });
  }

  async checkOutGuest(id: string): Promise<GroupBookingGuest> {
    return this.updateGuest(id, {
      check_in_status: 'checked_out'
    });
  }

  // Pricing and Invoicing
  async calculateGroupPricing(
    hotelId: string,
    rooms: { roomId: string; quantity: number }[],
    checkIn: string,
    checkOut: string,
    corporateAccountId?: string
  ): Promise<any> {
    // Get room rates for the date range
    const roomRates = await Promise.all(
      rooms.map(async ({ roomId, quantity }) => {
        const { data: availability } = await supabase
          .from('room_availability')
          .select('*, rooms(*)')
          .eq('room_id', roomId)
          .gte('date', checkIn)
          .lt('date', checkOut);

        const totalNights = this.calculateNights(checkIn, checkOut);
        const rates = availability || [];
        
        let subtotal = 0;
        rates.forEach(day => {
          subtotal += day.price * quantity;
        });

        return {
          room_id: roomId,
          quantity,
          rate_per_room: subtotal / quantity / totalNights,
          subtotal
        };
      })
    );

    const baseTotal = roomRates.reduce((sum, room) => sum + room.subtotal, 0);
    
    // Apply corporate discount if applicable
    let discount = 0;
    if (corporateAccountId) {
      const { data: account } = await supabase
        .from('corporate_accounts')
        .select('discount_percentage')
        .eq('id', corporateAccountId)
        .single();

      if (account?.discount_percentage) {
        discount = baseTotal * (account.discount_percentage / 100);
      }
    }

    return {
      room_rates: roomRates,
      base_total: baseTotal,
      discount,
      total: baseTotal - discount,
      deposit_required: (baseTotal - discount) * 0.3 // 30% deposit
    };
  }

  async createCorporateInvoice(
    corporateAccountId: string,
    bookingIds: string[],
    groupBookingIds: string[]
  ): Promise<any> {
    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculate total from bookings
    let items: any[] = [];
    let totalAmount = 0;

    // Add regular bookings
    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .in('id', bookingIds);

      bookings?.forEach(booking => {
        items.push({
          booking_id: booking.id,
          description: `Booking ${booking.booking_number}`,
          quantity: 1,
          unit_price: booking.total_price,
          total_price: booking.total_price
        });
        totalAmount += booking.total_price;
      });
    }

    // Add group bookings
    if (groupBookingIds.length > 0) {
      const { data: groupBookings } = await supabase
        .from('group_bookings')
        .select('*')
        .in('id', groupBookingIds);

      groupBookings?.forEach(booking => {
        items.push({
          group_booking_id: booking.id,
          description: `Group Booking ${booking.group_booking_number}`,
          quantity: 1,
          unit_price: booking.total_amount,
          total_price: booking.total_amount
        });
        totalAmount += booking.total_amount || 0;
      });
    }

    // Get payment terms
    const { data: account } = await supabase
      .from('corporate_accounts')
      .select('payment_terms')
      .eq('id', corporateAccountId)
      .single();

    const paymentTerms = account?.payment_terms || 30;
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + paymentTerms);

    // Create invoice
    const { data: invoice, error } = await supabase
      .from('corporate_invoices')
      .insert([{
        corporate_account_id: corporateAccountId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        total_amount: totalAmount,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    // Create invoice items
    const { error: itemsError } = await supabase
      .from('corporate_invoice_items')
      .insert(items.map(item => ({
        ...item,
        invoice_id: invoice.id
      })));

    if (itemsError) throw itemsError;

    return {
      ...invoice,
      items
    };
  }

  // Corporate Policies
  async createBookingPolicy(
    corporateAccountId: string,
    policyName: string,
    policyType: string,
    rules: any
  ): Promise<any> {
    const { data, error } = await supabase
      .from('corporate_booking_policies')
      .insert([{
        corporate_account_id: corporateAccountId,
        policy_name: policyName,
        policy_type: policyType,
        rules
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async checkBookingPolicy(
    corporateAccountId: string,
    bookingDetails: any
  ): Promise<{ allowed: boolean; violations: string[] }> {
    const { data: policies } = await supabase
      .from('corporate_booking_policies')
      .select('*')
      .eq('corporate_account_id', corporateAccountId)
      .eq('is_active', true);

    const violations: string[] = [];

    policies?.forEach(policy => {
      switch (policy.policy_type) {
        case 'budget':
          if (bookingDetails.total_amount > policy.rules.max_amount) {
            violations.push(`Exceeds budget limit of ${policy.rules.max_amount}`);
          }
          break;
        case 'hotel_selection':
          if (!policy.rules.allowed_hotels?.includes(bookingDetails.hotel_id)) {
            violations.push('Hotel not in approved list');
          }
          break;
        case 'room_type':
          if (!policy.rules.allowed_room_types?.includes(bookingDetails.room_type)) {
            violations.push('Room type not allowed by policy');
          }
          break;
      }
    });

    return {
      allowed: violations.length === 0,
      violations
    };
  }

  // Helper methods
  private async generateCompanyCode(companyName: string): Promise<string> {
    const prefix = companyName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
    
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${random}`;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  }

  private calculateNights(checkIn: string, checkOut: string): number {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Search and List
  async searchGroupBookings(filters: {
    status?: string;
    corporateAccountId?: string;
    hotelId?: string;
    checkInDate?: string;
    organizerId?: string;
  }): Promise<any[]> {
    let query = supabase
      .from('group_bookings')
      .select(`
        *,
        hotels(name, location),
        corporate_accounts(company_name)
      `);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.corporateAccountId) query = query.eq('corporate_account_id', filters.corporateAccountId);
    if (filters.hotelId) query = query.eq('hotel_id', filters.hotelId);
    if (filters.checkInDate) query = query.eq('check_in_date', filters.checkInDate);
    if (filters.organizerId) query = query.eq('organizer_user_id', filters.organizerId);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getCorporateBookingHistory(corporateAccountId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('group_bookings')
      .select(`
        *,
        hotels(name, location),
        group_booking_rooms(count)
      `)
      .eq('corporate_account_id', corporateAccountId)
      .order('check_in_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

export const groupBookingService = new GroupBookingService();