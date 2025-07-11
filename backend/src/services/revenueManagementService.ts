import { prisma } from '../lib/prisma';
import { subDays, addDays, startOfDay, endOfDay } from 'date-fns';

interface PricingStrategy {
  basePrice: number;
  occupancyRate: number;
  dayOfWeek: number;
  seasonalFactor: number;
  competitorPrice: number;
  historicalDemand: number;
}

export class RevenueManagementService {
  // Calculate optimal price based on multiple factors
  async calculateOptimalPrice(strategy: PricingStrategy): Promise<number> {
    const {
      basePrice,
      occupancyRate,
      dayOfWeek,
      seasonalFactor,
      competitorPrice,
      historicalDemand,
    } = strategy;

    // Occupancy-based pricing
    let occupancyMultiplier = 1.0;
    if (occupancyRate > 0.9) {
      occupancyMultiplier = 1.3;
    } else if (occupancyRate > 0.8) {
      occupancyMultiplier = 1.2;
    } else if (occupancyRate > 0.7) {
      occupancyMultiplier = 1.1;
    } else if (occupancyRate < 0.3) {
      occupancyMultiplier = 0.85;
    } else if (occupancyRate < 0.5) {
      occupancyMultiplier = 0.95;
    }

    // Day of week pricing
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFriday = dayOfWeek === 5;
    const dayMultiplier = isWeekend ? 1.2 : isFriday ? 1.1 : 1.0;

    // Competitor-based pricing
    const competitorRatio = competitorPrice / basePrice;
    let competitorMultiplier = 1.0;
    if (competitorRatio > 1.2) {
      competitorMultiplier = 1.1; // Competitors are charging more, we can increase
    } else if (competitorRatio < 0.8) {
      competitorMultiplier = 0.95; // Competitors are cheaper, we should adjust
    }

    // Historical demand factor
    const demandMultiplier = 1 + (historicalDemand - 1) * 0.1;

    // Calculate final price
    const optimalPrice = Math.round(
      basePrice *
        occupancyMultiplier *
        dayMultiplier *
        seasonalFactor *
        competitorMultiplier *
        demandMultiplier
    );

    // Ensure price doesn't deviate too much from base
    const maxPrice = basePrice * 2;
    const minPrice = basePrice * 0.7;

    return Math.max(minPrice, Math.min(maxPrice, optimalPrice));
  }

  // Get revenue forecast for a hotel
  async getRevenueForecast(
    hotelId: string,
    days: number = 30
  ): Promise<{
    forecast: Array<{
      date: Date;
      expectedRevenue: number;
      expectedOccupancy: number;
      recommendedADR: number;
    }>;
    totalExpectedRevenue: number;
  }> {
    const startDate = new Date();
    const endDate = addDays(startDate, days);

    // Get hotel rooms and current bookings
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        rooms: {
          include: {
            availability: {
              where: {
                date: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
            bookings: {
              where: {
                checkInDate: { lte: endDate },
                checkOutDate: { gte: startDate },
                status: { in: ['CONFIRMED', 'PENDING'] },
              },
            },
          },
        },
      },
    });

    if (!hotel) {
      throw new Error('Hotel not found');
    }

    // Calculate forecast for each day
    const forecast = [];
    let totalExpectedRevenue = 0;

    for (let i = 0; i < days; i++) {
      const currentDate = addDays(startDate, i);
      const dayOfWeek = currentDate.getDay();

      let totalRooms = 0;
      let bookedRooms = 0;
      let dailyRevenue = 0;
      let totalADR = 0;
      let roomCount = 0;

      for (const room of hotel.rooms) {
        totalRooms += room.quantity;

        // Count bookings for this date
        const bookingsForDate = room.bookings.filter(
          (booking) =>
            new Date(booking.checkInDate) <= currentDate &&
            new Date(booking.checkOutDate) > currentDate
        );
        bookedRooms += bookingsForDate.length;

        // Get availability and pricing for this date
        const availability = room.availability.find(
          (a) =>
            new Date(a.date).toDateString() === currentDate.toDateString()
        );

        const roomPrice = availability?.price || room.price;
        const availableRooms = availability
          ? availability.availableRooms
          : room.quantity - bookingsForDate.length;

        // Calculate expected bookings based on historical patterns
        const historicalOccupancy = await this.getHistoricalOccupancy(
          hotelId,
          dayOfWeek
        );
        const expectedBookings = Math.floor(
          availableRooms * historicalOccupancy
        );

        dailyRevenue += expectedBookings * roomPrice;
        totalADR += roomPrice;
        roomCount++;
      }

      const occupancyRate = totalRooms > 0 ? bookedRooms / totalRooms : 0;
      const expectedOccupancy =
        totalRooms > 0 ? (bookedRooms + (totalRooms - bookedRooms) * 0.6) / totalRooms : 0;
      const recommendedADR = roomCount > 0 ? totalADR / roomCount : 0;

      forecast.push({
        date: currentDate,
        expectedRevenue: dailyRevenue,
        expectedOccupancy: expectedOccupancy * 100,
        recommendedADR,
      });

      totalExpectedRevenue += dailyRevenue;
    }

    return {
      forecast,
      totalExpectedRevenue,
    };
  }

  // Get historical occupancy rate for a specific day of week
  private async getHistoricalOccupancy(
    hotelId: string,
    dayOfWeek: number
  ): Promise<number> {
    const thirtyDaysAgo = subDays(new Date(), 30);

    const historicalData = await prisma.$queryRaw<
      Array<{ occupancy_rate: number }>
    >`
      SELECT 
        AVG(CAST(booked_rooms AS FLOAT) / CAST(total_rooms AS FLOAT)) as occupancy_rate
      FROM (
        SELECT 
          DATE(b.check_in_date) as booking_date,
          COUNT(DISTINCT b.id) as booked_rooms,
          (SELECT SUM(quantity) FROM rooms WHERE hotel_id = ${hotelId}) as total_rooms
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE r.hotel_id = ${hotelId}
          AND b.status IN ('CONFIRMED', 'COMPLETED')
          AND b.created_at >= ${thirtyDaysAgo}
          AND EXTRACT(DOW FROM b.check_in_date) = ${dayOfWeek}
        GROUP BY DATE(b.check_in_date)
      ) as daily_occupancy
    `;

    return historicalData[0]?.occupancy_rate || 0.6; // Default 60% if no data
  }

  // Get competitor pricing analysis
  async getCompetitorAnalysis(
    hotelId: string,
    category: string,
    location: string
  ): Promise<{
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    pricePosition: 'below' | 'average' | 'above';
    recommendedAdjustment: number;
  }> {
    // Get competitor hotels in same category and location
    const competitors = await prisma.hotel.findMany({
      where: {
        id: { not: hotelId },
        category,
        city: location,
        status: 'ACTIVE',
      },
      include: {
        rooms: true,
      },
    });

    if (competitors.length === 0) {
      return {
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        pricePosition: 'average',
        recommendedAdjustment: 0,
      };
    }

    // Calculate average room prices for competitors
    const competitorPrices = competitors.flatMap((hotel) =>
      hotel.rooms.map((room) => room.price)
    );

    const averagePrice =
      competitorPrices.reduce((sum, price) => sum + price, 0) /
      competitorPrices.length;
    const minPrice = Math.min(...competitorPrices);
    const maxPrice = Math.max(...competitorPrices);

    // Get our hotel's average price
    const ourHotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: { rooms: true },
    });

    const ourAveragePrice =
      ourHotel?.rooms.reduce((sum, room) => sum + room.price, 0) /
        ourHotel?.rooms.length || 0;

    // Determine price position
    let pricePosition: 'below' | 'average' | 'above' = 'average';
    if (ourAveragePrice < averagePrice * 0.9) {
      pricePosition = 'below';
    } else if (ourAveragePrice > averagePrice * 1.1) {
      pricePosition = 'above';
    }

    // Calculate recommended adjustment
    const priceDifference = averagePrice - ourAveragePrice;
    const recommendedAdjustment = Math.round(
      (priceDifference / ourAveragePrice) * 100
    );

    return {
      averagePrice,
      minPrice,
      maxPrice,
      pricePosition,
      recommendedAdjustment,
    };
  }

  // Apply dynamic pricing for a date range
  async applyDynamicPricing(
    hotelId: string,
    roomId: string,
    startDate: Date,
    endDate: Date,
    aggressiveness: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ): Promise<void> {
    const room = await prisma.room.findFirst({
      where: { id: roomId, hotelId },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new Error('Hotel not found');
    }

    // Get competitor analysis
    const competitorAnalysis = await this.getCompetitorAnalysis(
      hotelId,
      hotel.category,
      hotel.city
    );

    // Apply pricing for each day
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Get current occupancy
      const bookings = await prisma.booking.count({
        where: {
          roomId,
          checkInDate: { lte: currentDate },
          checkOutDate: { gt: currentDate },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      });

      const occupancyRate = bookings / room.quantity;
      const dayOfWeek = currentDate.getDay();

      // Seasonal factor (simplified - in production, use more sophisticated logic)
      const month = currentDate.getMonth();
      const isHighSeason = month >= 6 && month <= 8; // Summer
      const seasonalFactor = isHighSeason ? 1.2 : 1.0;

      // Get historical demand
      const historicalDemand = await this.getHistoricalOccupancy(
        hotelId,
        dayOfWeek
      );

      // Calculate optimal price
      const optimalPrice = await this.calculateOptimalPrice({
        basePrice: room.price,
        occupancyRate,
        dayOfWeek,
        seasonalFactor,
        competitorPrice: competitorAnalysis.averagePrice,
        historicalDemand,
      });

      // Apply aggressiveness factor
      let finalPrice = optimalPrice;
      if (aggressiveness === 'conservative') {
        finalPrice = room.price + (optimalPrice - room.price) * 0.5;
      } else if (aggressiveness === 'aggressive') {
        finalPrice = room.price + (optimalPrice - room.price) * 1.5;
      }

      // Update or create availability record
      await prisma.roomAvailability.upsert({
        where: {
          roomId_date: {
            roomId,
            date: currentDate,
          },
        },
        update: {
          price: Math.round(finalPrice),
        },
        create: {
          roomId,
          date: currentDate,
          availableRooms: room.quantity - bookings,
          price: Math.round(finalPrice),
        },
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Get yield management recommendations
  async getYieldRecommendations(
    hotelId: string
  ): Promise<Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    potentialImpact: string;
  }>> {
    const recommendations = [];

    // Analyze current performance
    const forecast = await this.getRevenueForecast(hotelId, 7);
    const avgOccupancy =
      forecast.forecast.reduce((sum, f) => sum + f.expectedOccupancy, 0) /
      forecast.forecast.length;

    // Low occupancy recommendation
    if (avgOccupancy < 60) {
      recommendations.push({
        type: 'pricing',
        priority: 'high',
        recommendation: 'Consider reducing prices to increase occupancy',
        potentialImpact: `+${Math.round((70 - avgOccupancy) * 0.5)}% revenue increase`,
      });
    }

    // High occupancy recommendation
    if (avgOccupancy > 85) {
      recommendations.push({
        type: 'pricing',
        priority: 'high',
        recommendation: 'Increase prices to maximize revenue per available room',
        potentialImpact: '+10-15% ADR increase',
      });
    }

    // Weekend pricing
    const weekendDays = forecast.forecast.filter(
      (f) => f.date.getDay() === 0 || f.date.getDay() === 6
    );
    const weekdayDays = forecast.forecast.filter(
      (f) => f.date.getDay() !== 0 && f.date.getDay() !== 6
    );

    if (weekendDays.length > 0 && weekdayDays.length > 0) {
      const avgWeekendOccupancy =
        weekendDays.reduce((sum, f) => sum + f.expectedOccupancy, 0) /
        weekendDays.length;
      const avgWeekdayOccupancy =
        weekdayDays.reduce((sum, f) => sum + f.expectedOccupancy, 0) /
        weekdayDays.length;

      if (avgWeekendOccupancy > avgWeekdayOccupancy + 20) {
        recommendations.push({
          type: 'pricing',
          priority: 'medium',
          recommendation: 'Implement higher weekend pricing',
          potentialImpact: '+5-8% weekend revenue',
        });
      }
    }

    // Length of stay recommendations
    recommendations.push({
      type: 'restrictions',
      priority: 'medium',
      recommendation: 'Consider minimum stay requirements for high-demand periods',
      potentialImpact: 'Reduced operational costs, higher guest satisfaction',
    });

    // Early booking incentives
    if (avgOccupancy < 70) {
      recommendations.push({
        type: 'promotions',
        priority: 'low',
        recommendation: 'Offer early booking discounts (10-15% for 30+ days advance)',
        potentialImpact: 'Improved forecast accuracy, earlier cash flow',
      });
    }

    return recommendations;
  }
}