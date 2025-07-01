import { Request, Response, NextFunction } from 'express';
import { AdvancedSearchService } from '../services/advancedSearchService';
import { AdvancedSearchFilters, SortOptions } from '../types/search';
import { createError } from '../utils/errorFactory';
import { ErrorCode } from '../types/errors';
import Joi from 'joi';

// Comprehensive validation schema
const advancedSearchSchema = Joi.object({
  // Basic filters
  city: Joi.string().optional(),
  country: Joi.string().optional(),
  checkIn: Joi.date().required(),
  checkOut: Joi.date().greater(Joi.ref('checkIn')).required(),
  guests: Joi.number().integer().min(1).max(20).required(),
  
  // Price range with slider support
  priceRange: Joi.object({
    min: Joi.number().min(0).required(),
    max: Joi.number().greater(Joi.ref('min')).required()
  }).optional(),
  
  // Hotel amenities
  hotelAmenities: Joi.object({
    wifi: Joi.boolean().optional(),
    parking: Joi.boolean().optional(),
    pool: Joi.boolean().optional(),
    gym: Joi.boolean().optional(),
    spa: Joi.boolean().optional(),
    restaurant: Joi.boolean().optional(),
    bar: Joi.boolean().optional(),
    petFriendly: Joi.boolean().optional(),
    airportShuttle: Joi.boolean().optional(),
    businessCenter: Joi.boolean().optional(),
    laundry: Joi.boolean().optional(),
    roomService: Joi.boolean().optional()
  }).optional(),
  
  // Room amenities
  roomAmenities: Joi.object({
    airConditioning: Joi.boolean().optional(),
    balcony: Joi.boolean().optional(),
    kitchenette: Joi.boolean().optional(),
    minibar: Joi.boolean().optional(),
    safe: Joi.boolean().optional(),
    tv: Joi.boolean().optional(),
    coffeeMaker: Joi.boolean().optional(),
    bathTub: Joi.boolean().optional(),
    nonSmoking: Joi.boolean().optional(),
    oceanView: Joi.boolean().optional()
  }).optional(),
  
  // Services
  services: Joi.object({
    freeBreakfast: Joi.boolean().optional(),
    allInclusive: Joi.boolean().optional(),
    freeCancellation: Joi.boolean().optional(),
    payAtProperty: Joi.boolean().optional(),
    instantConfirmation: Joi.boolean().optional(),
    earlyCheckIn: Joi.boolean().optional(),
    lateCheckOut: Joi.boolean().optional(),
    concierge: Joi.boolean().optional()
  }).optional(),
  
  // Ratings
  ratings: Joi.object({
    minRating: Joi.number().min(1).max(5).optional(),
    minReviewCount: Joi.number().min(0).optional(),
    guestType: Joi.string().valid('business', 'couples', 'family', 'solo', 'all').optional()
  }).optional(),
  
  // Location
  location: Joi.object({
    nearAirport: Joi.boolean().optional(),
    nearBeach: Joi.boolean().optional(),
    cityCenter: Joi.boolean().optional(),
    nearSubway: Joi.boolean().optional(),
    quietArea: Joi.boolean().optional(),
    maxDistanceFromCenter: Joi.number().min(0).max(50).optional(),
    nearLandmarks: Joi.array().items(Joi.string()).optional()
  }).optional(),
  
  // Property types
  propertyTypes: Joi.array().items(
    Joi.string().valid('hotel', 'resort', 'boutique', 'apartment', 'hostel', 'ryokan', 'villa')
  ).optional(),
  
  // Star ratings
  starRatings: Joi.array().items(Joi.number().min(1).max(5)).optional(),
  
  // Accessibility
  accessibility: Joi.object({
    wheelchairAccessible: Joi.boolean().optional(),
    elevator: Joi.boolean().optional(),
    accessibleBathroom: Joi.boolean().optional(),
    brailleSignage: Joi.boolean().optional()
  }).optional(),
  
  // Special offers
  specialOffers: Joi.object({
    hasDiscount: Joi.boolean().optional(),
    lastMinuteDeal: Joi.boolean().optional(),
    earlyBirdSpecial: Joi.boolean().optional(),
    longStayDiscount: Joi.boolean().optional()
  }).optional(),
  
  // Sort options
  sortBy: Joi.string().valid('price', 'rating', 'distance', 'popularity', 'deals', 'reviewScore', 'newest').default('price'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export class SearchController {
  private searchService = new AdvancedSearchService();
  
  // Advanced search with all filters
  advancedSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = advancedSearchSchema.validate(req.query);
      
      if (error) {
        throw createError(ErrorCode.VALIDATION_ERROR, {
          details: error.details
        }, error.details?.[0]?.message || 'Validation error');
      }
      
      // Extract sort options
      const sortOptions: SortOptions = {
        sortBy: value.sortBy,
        sortOrder: value.sortOrder
      };
      
      // Extract filters
      const filters: AdvancedSearchFilters = {
        ...value,
        checkIn: new Date(value.checkIn),
        checkOut: new Date(value.checkOut)
      };
      
      // Perform search
      const results = await this.searchService.searchHotels(
        filters,
        sortOptions,
        value.page,
        value.limit
      );
      
      res.json(results);
    } catch (error) {
      next(error);
    }
  };
  
  // Get search aggregations for filters
  getSearchAggregations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const basicFilters = Joi.object({
        city: Joi.string().optional(),
        country: Joi.string().optional(),
        checkIn: Joi.date().required(),
        checkOut: Joi.date().greater(Joi.ref('checkIn')).required(),
        guests: Joi.number().integer().min(1).required()
      });
      
      const { error, value } = basicFilters.validate(req.query);
      
      if (error) {
        throw createError(ErrorCode.VALIDATION_ERROR, {
          details: error.details
        });
      }
      
      const filters: AdvancedSearchFilters = {
        ...value,
        checkIn: new Date(value.checkIn),
        checkOut: new Date(value.checkOut)
      };
      
      const aggregations = await this.searchService.getSearchAggregations(filters);
      
      res.json(aggregations);
    } catch (error) {
      next(error);
    }
  };
  
  // Auto-suggestions for search
  getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json([]);
      }
      
      const suggestions = await this.searchService.getSuggestions(q);
      
      return res.json(suggestions);
    } catch (error) {
      return next(error);
    }
  };
  
  // Get price range for slider
  getPriceRange = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { city, checkIn, checkOut, guests } = req.query;
      
      if (!checkIn || !checkOut || !guests) {
        throw createError(ErrorCode.MISSING_REQUIRED_FIELD, {
          required: ['checkIn', 'checkOut', 'guests']
        });
      }
      
      const filters: AdvancedSearchFilters = {
        city: city as string,
        checkIn: new Date(checkIn as string),
        checkOut: new Date(checkOut as string),
        guests: parseInt(guests as string)
      };
      
      const aggregations = await this.searchService.getSearchAggregations(filters);
      
      res.json({
        min: aggregations.priceDistribution.min,
        max: aggregations.priceDistribution.max,
        average: aggregations.priceDistribution.average,
        distribution: aggregations.priceDistribution.distribution
      });
    } catch (error) {
      next(error);
    }
  };
}