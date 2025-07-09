import { Request, Response } from 'express';
import { RevenueManagementService } from '../services/revenueManagementService';
import { format } from 'date-fns';

const revenueService = new RevenueManagementService();

export const getRevenueForecast = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { days = 30 } = req.query;

    const forecast = await revenueService.getRevenueForecast(
      hotelId,
      Number(days)
    );

    res.json({
      ...forecast,
      forecast: forecast.forecast.map((f) => ({
        ...f,
        date: format(f.date, 'yyyy-MM-dd'),
      })),
    });
  } catch (error) {
    console.error('Get revenue forecast error:', error);
    res.status(500).json({ error: 'Failed to generate revenue forecast' });
  }
};

export const getCompetitorAnalysis = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;
    const { category, location } = req.query;

    if (!category || !location) {
      return res.status(400).json({
        error: 'Category and location are required',
      });
    }

    const analysis = await revenueService.getCompetitorAnalysis(
      hotelId,
      category as string,
      location as string
    );

    res.json(analysis);
  } catch (error) {
    console.error('Get competitor analysis error:', error);
    res.status(500).json({ error: 'Failed to get competitor analysis' });
  }
};

export const applyDynamicPricing = async (req: Request, res: Response) => {
  try {
    const { hotelId, roomId } = req.params;
    const { startDate, endDate, aggressiveness = 'moderate' } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Start date and end date are required',
      });
    }

    await revenueService.applyDynamicPricing(
      hotelId,
      roomId,
      new Date(startDate),
      new Date(endDate),
      aggressiveness as 'conservative' | 'moderate' | 'aggressive'
    );

    res.json({
      message: 'Dynamic pricing applied successfully',
      hotelId,
      roomId,
      startDate,
      endDate,
      aggressiveness,
    });
  } catch (error) {
    console.error('Apply dynamic pricing error:', error);
    res.status(500).json({ error: 'Failed to apply dynamic pricing' });
  }
};

export const getYieldRecommendations = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;

    const recommendations = await revenueService.getYieldRecommendations(
      hotelId
    );

    res.json({
      hotelId,
      recommendations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get yield recommendations error:', error);
    res.status(500).json({ error: 'Failed to get yield recommendations' });
  }
};

export const calculateOptimalPrice = async (req: Request, res: Response) => {
  try {
    const {
      basePrice,
      occupancyRate,
      dayOfWeek,
      seasonalFactor = 1.0,
      competitorPrice,
      historicalDemand = 0.7,
    } = req.body;

    if (!basePrice || occupancyRate === undefined || dayOfWeek === undefined) {
      return res.status(400).json({
        error: 'Base price, occupancy rate, and day of week are required',
      });
    }

    const optimalPrice = await revenueService.calculateOptimalPrice({
      basePrice: Number(basePrice),
      occupancyRate: Number(occupancyRate),
      dayOfWeek: Number(dayOfWeek),
      seasonalFactor: Number(seasonalFactor),
      competitorPrice: Number(competitorPrice) || Number(basePrice),
      historicalDemand: Number(historicalDemand),
    });

    res.json({
      basePrice: Number(basePrice),
      optimalPrice,
      priceIncrease: optimalPrice - Number(basePrice),
      percentageChange: ((optimalPrice - Number(basePrice)) / Number(basePrice)) * 100,
    });
  } catch (error) {
    console.error('Calculate optimal price error:', error);
    res.status(500).json({ error: 'Failed to calculate optimal price' });
  }
};