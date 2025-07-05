import { Request, Response } from 'express';
import LocationSearchService from '../../services/LocationSearchService';

const locationService = new LocationSearchService();

export const locationController = {
  // 都道府県一覧取得
  async getPrefectures(req: Request, res: Response) {
    try {
      const prefectures = await locationService.getPrefectures();
      
      res.json({
        success: true,
        data: prefectures,
        total: prefectures.length
      });
    } catch (error) {
      console.error('Error getting prefectures:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get prefectures'
      });
    }
  },

  // 市町村一覧取得
  async getCities(req: Request, res: Response) {
    try {
      const { prefectureId } = req.params;
      
      if (!prefectureId) {
        return res.status(400).json({
          success: false,
          error: 'Prefecture ID is required'
        });
      }

      const cities = await locationService.getCitiesByPrefecture(parseInt(prefectureId));
      
      res.json({
        success: true,
        data: cities,
        total: cities.length,
        prefecture_id: parseInt(prefectureId)
      });
    } catch (error) {
      console.error('Error getting cities:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cities'
      });
    }
  },

  // 地域別ホテル検索
  async searchHotelsByLocation(req: Request, res: Response) {
    try {
      const {
        prefectureId,
        cityId,
        areaId,
        priceRange,
        radius,
        latitude,
        longitude,
        limit = 20,
        offset = 0
      } = req.query;

      const searchParams = {
        prefectureId: prefectureId ? parseInt(prefectureId as string) : undefined,
        cityId: cityId ? parseInt(cityId as string) : undefined,
        areaId: areaId ? parseInt(areaId as string) : undefined,
        priceRange: priceRange as string,
        radius: radius ? parseFloat(radius as string) : undefined,
        latitude: latitude ? parseFloat(latitude as string) : undefined,
        longitude: longitude ? parseFloat(longitude as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const hotels = await locationService.searchHotelsByLocation(searchParams);
      
      res.json({
        success: true,
        data: hotels,
        total: hotels.length,
        search_params: searchParams,
        pagination: {
          limit: searchParams.limit,
          offset: searchParams.offset,
          has_more: hotels.length === searchParams.limit
        }
      });
    } catch (error) {
      console.error('Error searching hotels by location:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search hotels by location'
      });
    }
  },

  // 駅周辺ホテル検索
  async searchHotelsByStation(req: Request, res: Response) {
    try {
      const { stationId } = req.params;
      const { maxDistance, priceRange, limit = 20 } = req.query;

      if (!stationId) {
        return res.status(400).json({
          success: false,
          error: 'Station ID is required'
        });
      }

      const searchParams = {
        stationId: parseInt(stationId),
        maxDistance: maxDistance ? parseFloat(maxDistance as string) : undefined,
        priceRange: priceRange as string,
        limit: parseInt(limit as string)
      };

      const result = await locationService.searchHotelsByStation(searchParams);
      
      if (result.error) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result,
        search_params: searchParams
      });
    } catch (error) {
      console.error('Error searching hotels by station:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search hotels by station'
      });
    }
  },

  // 観光地周辺ホテル検索
  async searchHotelsByTouristSpot(req: Request, res: Response) {
    try {
      const { touristSpotId } = req.params;
      const { maxDistance, priceRange, limit = 20 } = req.query;

      if (!touristSpotId) {
        return res.status(400).json({
          success: false,
          error: 'Tourist spot ID is required'
        });
      }

      const searchParams = {
        touristSpotId: parseInt(touristSpotId),
        maxDistance: maxDistance ? parseFloat(maxDistance as string) : undefined,
        priceRange: priceRange as string,
        limit: parseInt(limit as string)
      };

      const result = await locationService.searchHotelsByTouristSpot(searchParams);
      
      if (result.error) {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result,
        search_params: searchParams
      });
    } catch (error) {
      console.error('Error searching hotels by tourist spot:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search hotels by tourist spot'
      });
    }
  },

  // 価格帯統計取得
  async getPriceStatistics(req: Request, res: Response) {
    try {
      const { prefectureId, cityId } = req.query;

      const params = {
        prefectureId: prefectureId ? parseInt(prefectureId as string) : undefined,
        cityId: cityId ? parseInt(cityId as string) : undefined
      };

      const statistics = await locationService.getHotelPriceStatistics(params);
      
      res.json({
        success: true,
        data: statistics,
        filter_params: params
      });
    } catch (error) {
      console.error('Error getting price statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get price statistics'
      });
    }
  },

  // 人気エリア取得
  async getPopularAreas(req: Request, res: Response) {
    try {
      const { prefectureId, limit = 10 } = req.query;

      const areas = await locationService.getPopularAreas(
        prefectureId ? parseInt(prefectureId as string) : null,
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        data: areas,
        total: areas.length,
        prefecture_id: prefectureId ? parseInt(prefectureId as string) : null
      });
    } catch (error) {
      console.error('Error getting popular areas:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular areas'
      });
    }
  },

  // 検索候補取得（オートコンプリート）
  async getSearchSuggestions(req: Request, res: Response) {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || (query as string).length < 2) {
        return res.json({
          success: true,
          data: [],
          message: 'Query too short'
        });
      }

      const suggestions = await locationService.getSearchSuggestions(
        query as string,
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        data: suggestions,
        query: query,
        total: suggestions.length
      });
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get search suggestions'
      });
    }
  },

  // 地域詳細情報取得
  async getLocationDetails(req: Request, res: Response) {
    try {
      const { type, id } = req.params;

      let result = null;

      switch (type) {
        case 'prefecture':
          result = await locationService.supabase
            .from('prefectures')
            .select('*')
            .eq('id', id)
            .single();
          break;

        case 'city':
          result = await locationService.supabase
            .from('cities')
            .select(`
              *,
              prefectures!inner(name, name_en, region)
            `)
            .eq('id', id)
            .single();
          break;

        case 'station':
          result = await locationService.supabase
            .from('stations')
            .select(`
              *,
              cities!inner(name, name_en, prefectures!inner(name))
            `)
            .eq('id', id)
            .single();
          break;

        case 'tourist_spot':
          result = await locationService.supabase
            .from('tourist_spots')
            .select(`
              *,
              cities!inner(name, name_en, prefectures!inner(name))
            `)
            .eq('id', id)
            .single();
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid location type'
          });
      }

      if (result.error) {
        return res.status(404).json({
          success: false,
          error: 'Location not found'
        });
      }

      res.json({
        success: true,
        data: result.data,
        type: type
      });
    } catch (error) {
      console.error('Error getting location details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get location details'
      });
    }
  },

  // マップ用ホテル一覧（軽量データ）
  async getHotelsForMap(req: Request, res: Response) {
    try {
      const {
        bounds, // "north,south,east,west"
        priceRange,
        limit = 100
      } = req.query;

      let query = locationService.supabase
        .from('hotel_locations')
        .select(`
          hotel_id,
          latitude,
          longitude,
          hotel_price_analysis!inner(current_avg_price)
        `);

      // 地図境界でフィルター
      if (bounds) {
        const [north, south, east, west] = (bounds as string).split(',').map(Number);
        query = query
          .gte('latitude', south)
          .lte('latitude', north)
          .gte('longitude', west)
          .lte('longitude', east);
      }

      // 価格帯フィルター
      if (priceRange && locationService.PRICE_RANGES[priceRange as string]) {
        const range = locationService.PRICE_RANGES[priceRange as string];
        query = query.gte('hotel_price_analysis.current_avg_price', range.min);
        if (range.max) {
          query = query.lte('hotel_price_analysis.current_avg_price', range.max);
        }
      }

      const { data, error } = await query.limit(parseInt(limit as string));

      if (error) throw error;

      const mapHotels = data.map(hotel => ({
        id: hotel.hotel_id,
        lat: hotel.latitude,
        lng: hotel.longitude,
        price: hotel.hotel_price_analysis?.current_avg_price || 0,
        priceRange: locationService.getPriceRangeLabel(hotel.hotel_price_analysis?.current_avg_price)
      }));

      res.json({
        success: true,
        data: mapHotels,
        total: mapHotels.length,
        bounds: bounds || null
      });
    } catch (error) {
      console.error('Error getting hotels for map:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get hotels for map'
      });
    }
  }
};