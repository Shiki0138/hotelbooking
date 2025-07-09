import { supabase } from '../config/supabase';
import { format, startOfDay, endOfDay, subDays, addDays } from 'date-fns';

export interface DailyMetrics {
  metric_date: string;
  hotel_id?: string;
  total_bookings: number;
  total_revenue: number;
  occupancy_rate: number;
  average_daily_rate: number;
  revenue_per_available_room: number;
  cancellation_rate: number;
  average_length_of_stay: number;
  direct_bookings: number;
  ota_bookings: number;
  corporate_bookings: number;
  group_bookings: number;
}

export interface RevenueAnalytics {
  period_start: string;
  period_end: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  hotel_id?: string;
  room_revenue: number;
  additional_services_revenue: number;
  cancellation_fees: number;
  total_revenue: number;
  revenue_by_channel: any;
  revenue_by_room_type: any;
  year_over_year_growth?: number;
}

export interface KPIDefinition {
  kpi_name: string;
  kpi_category: string;
  calculation_formula: string;
  target_value?: number;
  threshold_warning?: number;
  threshold_critical?: number;
  is_higher_better?: boolean;
}

class BusinessIntelligenceService {
  // Metrics Collection
  async collectDailyMetrics(date: string, hotelId?: string): Promise<void> {
    const metrics = hotelId 
      ? await this.calculateHotelMetrics(date, hotelId)
      : await this.calculateSystemMetrics(date);

    const { error } = await supabase
      .from('bi_daily_metrics')
      .upsert(metrics, {
        onConflict: 'metric_date,hotel_id'
      });

    if (error) throw error;
  }

  private async calculateHotelMetrics(date: string, hotelId: string): Promise<DailyMetrics> {
    const startDate = startOfDay(new Date(date));
    const endDate = endOfDay(new Date(date));

    // Get bookings data
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotelId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get rooms data
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('hotel_id', hotelId);

    const totalRooms = rooms?.length || 0;

    // Get occupancy data
    const { data: occupiedRooms } = await supabase
      .from('bookings')
      .select('*, rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotelId)
      .lte('check_in_date', date)
      .gte('check_out_date', date)
      .eq('status', 'confirmed');

    // Calculate metrics
    const totalBookings = bookings?.length || 0;
    const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0;
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms?.length || 0) / totalRooms) * 100 : 0;
    const averageDailyRate = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const revenuePerAvailableRoom = totalRooms > 0 ? totalRevenue / totalRooms : 0;

    // Cancellation rate
    const { data: cancellations } = await supabase
      .from('bookings')
      .select('*, rooms!inner(hotel_id)')
      .eq('rooms.hotel_id', hotelId)
      .eq('status', 'cancelled')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const cancellationRate = totalBookings > 0 
      ? ((cancellations?.length || 0) / totalBookings) * 100 
      : 0;

    // Average length of stay
    const totalNights = bookings?.reduce((sum, b) => {
      const nights = this.calculateNights(b.check_in_date, b.check_out_date);
      return sum + nights;
    }, 0) || 0;

    const averageLengthOfStay = totalBookings > 0 ? totalNights / totalBookings : 0;

    // Booking sources
    const directBookings = bookings?.filter(b => !b.source || b.source === 'direct').length || 0;
    const otaBookings = bookings?.filter(b => b.source && b.source.startsWith('ota_')).length || 0;
    const corporateBookings = bookings?.filter(b => b.corporate_account_id).length || 0;

    // Group bookings
    const { data: groupBookings } = await supabase
      .from('group_bookings')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return {
      metric_date: date,
      hotel_id: hotelId,
      total_bookings: totalBookings,
      total_revenue: totalRevenue,
      occupancy_rate: occupancyRate,
      average_daily_rate: averageDailyRate,
      revenue_per_available_room: revenuePerAvailableRoom,
      cancellation_rate: cancellationRate,
      average_length_of_stay: averageLengthOfStay,
      direct_bookings: directBookings,
      ota_bookings: otaBookings,
      corporate_bookings: corporateBookings,
      group_bookings: groupBookings?.length || 0
    };
  }

  private async calculateSystemMetrics(date: string): Promise<DailyMetrics> {
    // Aggregate metrics for all hotels
    const { data: hotels } = await supabase
      .from('hotels')
      .select('id');

    const hotelMetrics = await Promise.all(
      (hotels || []).map(hotel => this.calculateHotelMetrics(date, hotel.id))
    );

    // Sum up all metrics
    return hotelMetrics.reduce((acc, metrics) => ({
      metric_date: date,
      hotel_id: undefined,
      total_bookings: acc.total_bookings + metrics.total_bookings,
      total_revenue: acc.total_revenue + metrics.total_revenue,
      occupancy_rate: acc.occupancy_rate + metrics.occupancy_rate / hotelMetrics.length,
      average_daily_rate: acc.average_daily_rate + metrics.average_daily_rate / hotelMetrics.length,
      revenue_per_available_room: acc.revenue_per_available_room + metrics.revenue_per_available_room / hotelMetrics.length,
      cancellation_rate: acc.cancellation_rate + metrics.cancellation_rate / hotelMetrics.length,
      average_length_of_stay: acc.average_length_of_stay + metrics.average_length_of_stay / hotelMetrics.length,
      direct_bookings: acc.direct_bookings + metrics.direct_bookings,
      ota_bookings: acc.ota_bookings + metrics.ota_bookings,
      corporate_bookings: acc.corporate_bookings + metrics.corporate_bookings,
      group_bookings: acc.group_bookings + metrics.group_bookings
    }), {
      metric_date: date,
      hotel_id: undefined,
      total_bookings: 0,
      total_revenue: 0,
      occupancy_rate: 0,
      average_daily_rate: 0,
      revenue_per_available_room: 0,
      cancellation_rate: 0,
      average_length_of_stay: 0,
      direct_bookings: 0,
      ota_bookings: 0,
      corporate_bookings: 0,
      group_bookings: 0
    } as DailyMetrics);
  }

  // Revenue Analytics
  async generateRevenueAnalytics(
    periodStart: string,
    periodEnd: string,
    periodType: RevenueAnalytics['period_type'],
    hotelId?: string
  ): Promise<RevenueAnalytics> {
    // Get bookings in period
    let bookingsQuery = supabase
      .from('bookings')
      .select('*, rooms!inner(hotel_id, room_type), payment_transactions(*)')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)
      .eq('status', 'confirmed');

    if (hotelId) {
      bookingsQuery = bookingsQuery.eq('rooms.hotel_id', hotelId);
    }

    const { data: bookings } = await bookingsQuery;

    // Calculate revenue breakdown
    const roomRevenue = bookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0;
    
    // Get cancellation fees
    const { data: cancellations } = await supabase
      .from('bookings')
      .select('cancellation_fee')
      .gte('cancelled_at', periodStart)
      .lte('cancelled_at', periodEnd)
      .eq('status', 'cancelled')
      .not('cancellation_fee', 'is', null);

    const cancellationFees = cancellations?.reduce((sum, c) => sum + Number(c.cancellation_fee), 0) || 0;

    // Revenue by channel
    const revenueByChannel: Record<string, number> = {};
    bookings?.forEach(booking => {
      const channel = booking.booking_source || 'direct';
      revenueByChannel[channel] = (revenueByChannel[channel] || 0) + Number(booking.total_price);
    });

    // Revenue by room type
    const revenueByRoomType: Record<string, number> = {};
    bookings?.forEach(booking => {
      const roomType = booking.rooms.room_type;
      revenueByRoomType[roomType] = (revenueByRoomType[roomType] || 0) + Number(booking.total_price);
    });

    // Calculate YoY growth
    let yearOverYearGrowth: number | undefined;
    if (periodType !== 'daily') {
      const lastYearStart = this.getLastYearDate(periodStart);
      const lastYearEnd = this.getLastYearDate(periodEnd);
      
      const { data: lastYearRevenue } = await supabase
        .from('bi_revenue_analytics')
        .select('total_revenue')
        .eq('period_start', lastYearStart)
        .eq('period_end', lastYearEnd)
        .eq('period_type', periodType)
        .single();

      if (lastYearRevenue) {
        yearOverYearGrowth = ((roomRevenue - lastYearRevenue.total_revenue) / lastYearRevenue.total_revenue) * 100;
      }
    }

    const analytics: RevenueAnalytics = {
      period_start: periodStart,
      period_end: periodEnd,
      period_type: periodType,
      hotel_id: hotelId,
      room_revenue: roomRevenue,
      additional_services_revenue: 0, // TODO: Implement when services are added
      cancellation_fees: cancellationFees,
      total_revenue: roomRevenue + cancellationFees,
      revenue_by_channel: revenueByChannel,
      revenue_by_room_type: revenueByRoomType,
      year_over_year_growth: yearOverYearGrowth
    };

    // Store analytics
    const { error } = await supabase
      .from('bi_revenue_analytics')
      .insert([analytics]);

    if (error) throw error;

    return analytics;
  }

  // Performance Tracking
  async trackKPI(kpiId: string, hotelId?: string): Promise<void> {
    const { data: kpiDef } = await supabase
      .from('bi_kpi_definitions')
      .select('*')
      .eq('id', kpiId)
      .single();

    if (!kpiDef) throw new Error('KPI definition not found');

    const actualValue = await this.calculateKPIValue(kpiDef, hotelId);
    const targetValue = kpiDef.target_value;
    
    let variancePercentage = 0;
    if (targetValue) {
      variancePercentage = ((actualValue - targetValue) / targetValue) * 100;
    }

    // Determine status
    let status: string;
    if (kpiDef.threshold_critical && actualValue <= kpiDef.threshold_critical) {
      status = 'critical';
    } else if (kpiDef.threshold_warning && actualValue <= kpiDef.threshold_warning) {
      status = 'warning';
    } else if (targetValue && actualValue >= targetValue) {
      status = kpiDef.is_higher_better ? 'exceeded' : 'warning';
    } else {
      status = 'on_target';
    }

    // Store tracking
    const { error } = await supabase
      .from('bi_kpi_tracking')
      .insert([{
        kpi_id: kpiId,
        hotel_id: hotelId,
        tracking_date: format(new Date(), 'yyyy-MM-dd'),
        actual_value: actualValue,
        target_value: targetValue,
        variance_percentage: variancePercentage,
        status
      }]);

    if (error) throw error;
  }

  private async calculateKPIValue(kpiDef: KPIDefinition, hotelId?: string): Promise<number> {
    // Implementation depends on the specific KPI formula
    // This is a simplified example
    switch (kpiDef.kpi_name) {
      case 'Monthly Revenue':
        const { data } = await supabase
          .from('bi_daily_metrics')
          .select('total_revenue')
          .gte('metric_date', format(startOfMonth(new Date()), 'yyyy-MM-dd'))
          .lte('metric_date', format(new Date(), 'yyyy-MM-dd'))
          .eq('hotel_id', hotelId);
        
        return data?.reduce((sum, d) => sum + d.total_revenue, 0) || 0;

      case 'Average Occupancy Rate':
        const { data: occupancy } = await supabase
          .from('bi_daily_metrics')
          .select('occupancy_rate')
          .gte('metric_date', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
          .lte('metric_date', format(new Date(), 'yyyy-MM-dd'))
          .eq('hotel_id', hotelId);
        
        const total = occupancy?.reduce((sum, d) => sum + d.occupancy_rate, 0) || 0;
        return occupancy?.length ? total / occupancy.length : 0;

      default:
        return 0;
    }
  }

  // Reporting
  async generateDashboard(hotelId?: string, dateRange?: { start: string; end: string }): Promise<any> {
    const endDate = dateRange?.end || format(new Date(), 'yyyy-MM-dd');
    const startDate = dateRange?.start || format(subDays(new Date(endDate), 30), 'yyyy-MM-dd');

    // Get daily metrics
    let metricsQuery = supabase
      .from('bi_daily_metrics')
      .select('*')
      .gte('metric_date', startDate)
      .lte('metric_date', endDate);

    if (hotelId) {
      metricsQuery = metricsQuery.eq('hotel_id', hotelId);
    }

    const { data: metrics } = await metricsQuery;

    // Calculate summary statistics
    const summary = {
      total_revenue: metrics?.reduce((sum, m) => sum + m.total_revenue, 0) || 0,
      total_bookings: metrics?.reduce((sum, m) => sum + m.total_bookings, 0) || 0,
      average_occupancy: this.calculateAverage(metrics || [], 'occupancy_rate'),
      average_adr: this.calculateAverage(metrics || [], 'average_daily_rate'),
      average_revpar: this.calculateAverage(metrics || [], 'revenue_per_available_room')
    };

    // Get recent KPIs
    const { data: kpis } = await supabase
      .from('bi_kpi_tracking')
      .select('*, bi_kpi_definitions(*)')
      .eq('hotel_id', hotelId)
      .eq('tracking_date', endDate);

    // Get revenue breakdown
    const { data: revenueAnalytics } = await supabase
      .from('bi_revenue_analytics')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('period_start', startDate)
      .lte('period_end', endDate)
      .order('period_end', { ascending: false })
      .limit(1)
      .single();

    return {
      summary,
      daily_metrics: metrics,
      kpis,
      revenue_analytics: revenueAnalytics,
      charts: {
        revenue_trend: this.generateChartData(metrics || [], 'metric_date', 'total_revenue'),
        occupancy_trend: this.generateChartData(metrics || [], 'metric_date', 'occupancy_rate'),
        booking_sources: this.generateBookingSourcesChart(metrics || [])
      }
    };
  }

  // Forecasting
  async generateForecast(
    hotelId: string,
    forecastPeriod: number = 30
  ): Promise<any> {
    // Get historical data
    const { data: historicalData } = await supabase
      .from('bi_daily_metrics')
      .select('*')
      .eq('hotel_id', hotelId)
      .gte('metric_date', format(subDays(new Date(), 365), 'yyyy-MM-dd'))
      .order('metric_date', { ascending: true });

    if (!historicalData || historicalData.length < 30) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Simple moving average forecast (in production, use more sophisticated models)
    const recentData = historicalData.slice(-30);
    const avgOccupancy = this.calculateAverage(recentData, 'occupancy_rate');
    const avgADR = this.calculateAverage(recentData, 'average_daily_rate');
    const avgRevenue = this.calculateAverage(recentData, 'total_revenue');

    // Generate forecast
    const forecast = {
      hotel_id: hotelId,
      model_type: 'linear_regression',
      forecast_date: format(new Date(), 'yyyy-MM-dd'),
      forecast_period: forecastPeriod,
      predicted_occupancy: avgOccupancy,
      predicted_adr: avgADR,
      predicted_revenue: avgRevenue * forecastPeriod,
      confidence_interval: {
        occupancy: { low: avgOccupancy * 0.9, high: avgOccupancy * 1.1 },
        adr: { low: avgADR * 0.95, high: avgADR * 1.05 },
        revenue: { low: avgRevenue * forecastPeriod * 0.85, high: avgRevenue * forecastPeriod * 1.15 }
      },
      model_accuracy: 85 // Placeholder - calculate based on historical accuracy
    };

    // Store forecast
    const { error } = await supabase
      .from('bi_forecasting_models')
      .insert([forecast]);

    if (error) throw error;

    return forecast;
  }

  // Helper methods
  private calculateNights(checkIn: string, checkOut: string): number {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateAverage(data: any[], field: string): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
    return sum / data.length;
  }

  private getLastYearDate(date: string): string {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() - 1);
    return format(d, 'yyyy-MM-dd');
  }

  private generateChartData(data: any[], xField: string, yField: string): any[] {
    return data.map(item => ({
      x: item[xField],
      y: item[yField]
    }));
  }

  private generateBookingSourcesChart(metrics: DailyMetrics[]): any {
    const totals = metrics.reduce((acc, m) => ({
      direct: acc.direct + m.direct_bookings,
      ota: acc.ota + m.ota_bookings,
      corporate: acc.corporate + m.corporate_bookings,
      group: acc.group + m.group_bookings
    }), { direct: 0, ota: 0, corporate: 0, group: 0 });

    return [
      { label: 'Direct', value: totals.direct },
      { label: 'OTA', value: totals.ota },
      { label: 'Corporate', value: totals.corporate },
      { label: 'Group', value: totals.group }
    ];
  }
}

export const businessIntelligenceService = new BusinessIntelligenceService();

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}