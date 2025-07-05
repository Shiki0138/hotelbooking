const { createClient } = require('@supabase/supabase-js');

class LocationSearchService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // 価格帯定義
    this.PRICE_RANGES = {
      budget: { min: 0, max: 15000, label: '～1.5万円' },
      standard: { min: 15001, max: 30000, label: '1.5～3万円' },
      premium: { min: 30001, max: 50000, label: '3～5万円' },
      luxury: { min: 50001, max: 100000, label: '5～10万円' },
      ultra: { min: 100001, max: null, label: '10万円～' }
    };
    
    // 検索範囲定義（km）
    this.SEARCH_RADIUS = {
      nearby: 1,
      walkable: 3,
      accessible: 10,
      area: 25
    };
  }

  // 都道府県一覧取得
  async getPrefectures() {
    try {
      const { data, error } = await this.supabase
        .from('prefectures')
        .select('id, name, name_en, region')
        .order('id');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching prefectures:', error);
      return [];
    }
  }

  // 指定都道府県の市町村一覧取得
  async getCitiesByPrefecture(prefectureId) {
    try {
      const { data, error } = await this.supabase
        .from('cities')
        .select('id, name, name_en, latitude, longitude, is_major_city')
        .eq('prefecture_id', prefectureId)
        .order('is_major_city', { ascending: false })
        .order('name');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching cities:', error);
      return [];
    }
  }

  // 地域別ホテル検索
  async searchHotelsByLocation(params) {
    try {
      const {
        prefectureId,
        cityId,
        areaId,
        priceRange,
        radius = this.SEARCH_RADIUS.area,
        latitude,
        longitude,
        limit = 20,
        offset = 0
      } = params;

      let query = this.supabase
        .from('hotel_locations')
        .select(`
          hotel_id,
          prefecture_id,
          city_id,
          area_id,
          address,
          latitude,
          longitude,
          nearest_station_id,
          distance_to_station_m,
          walk_time_to_station_min,
          tourist_access_score,
          business_access_score,
          transport_access_score,
          prefectures!inner(name, name_en),
          cities!inner(name, name_en),
          areas(name, name_en),
          stations(name, name_en, line_name),
          hotel_price_analysis!inner(
            current_avg_price,
            min_price,
            max_price,
            price_category_id,
            price_categories!inner(name, category_code)
          )
        `);

      // 都道府県フィルター
      if (prefectureId) {
        query = query.eq('prefecture_id', prefectureId);
      }

      // 市町村フィルター
      if (cityId) {
        query = query.eq('city_id', cityId);
      }

      // エリアフィルター
      if (areaId) {
        query = query.eq('area_id', areaId);
      }

      // 価格帯フィルター
      if (priceRange && this.PRICE_RANGES[priceRange]) {
        const range = this.PRICE_RANGES[priceRange];
        query = query.gte('hotel_price_analysis.current_avg_price', range.min);
        if (range.max) {
          query = query.lte('hotel_price_analysis.current_avg_price', range.max);
        }
      }

      // 座標指定の場合の距離フィルター
      if (latitude && longitude && radius) {
        // 簡易的な距離計算（より精密にはPostGISのST_DWithinを使用）
        const latRange = radius / 111; // 1度 ≈ 111km
        const lngRange = radius / (111 * Math.cos(latitude * Math.PI / 180));
        
        query = query
          .gte('latitude', latitude - latRange)
          .lte('latitude', latitude + latRange)
          .gte('longitude', longitude - lngRange)
          .lte('longitude', longitude + lngRange);
      }

      const { data, error } = await query
        .range(offset, offset + limit - 1)
        .order('tourist_access_score', { ascending: false });

      if (error) throw error;

      // 距離計算と追加情報の付与
      return data.map(hotel => ({
        ...hotel,
        distance_km: latitude && longitude ? 
          this.calculateDistance(latitude, longitude, hotel.latitude, hotel.longitude) : null,
        price_range_label: this.getPriceRangeLabel(hotel.hotel_price_analysis?.current_avg_price),
        access_scores: {
          tourist: hotel.tourist_access_score,
          business: hotel.business_access_score,
          transport: hotel.transport_access_score,
          overall: Math.round((hotel.tourist_access_score + hotel.business_access_score + hotel.transport_access_score) / 3)
        }
      }));

    } catch (error) {
      console.error('Error searching hotels by location:', error);
      return [];
    }
  }

  // 駅周辺ホテル検索
  async searchHotelsByStation(params) {
    try {
      const {
        stationId,
        maxDistance = this.SEARCH_RADIUS.walkable,
        priceRange,
        limit = 20
      } = params;

      // 駅情報取得
      const { data: station, error: stationError } = await this.supabase
        .from('stations')
        .select('id, name, latitude, longitude, city_id')
        .eq('id', stationId)
        .single();

      if (stationError || !station) {
        throw new Error('Station not found');
      }

      // 駅周辺のホテル検索
      const hotels = await this.searchHotelsByLocation({
        latitude: station.latitude,
        longitude: station.longitude,
        radius: maxDistance,
        priceRange,
        limit
      });

      return {
        station,
        hotels,
        search_params: {
          max_distance_km: maxDistance,
          price_range: priceRange
        }
      };

    } catch (error) {
      console.error('Error searching hotels by station:', error);
      return { station: null, hotels: [], error: error.message };
    }
  }

  // 観光地周辺ホテル検索
  async searchHotelsByTouristSpot(params) {
    try {
      const {
        touristSpotId,
        maxDistance = this.SEARCH_RADIUS.accessible,
        priceRange,
        limit = 20
      } = params;

      // 観光地情報取得
      const { data: spot, error: spotError } = await this.supabase
        .from('tourist_spots')
        .select('id, name, category, latitude, longitude, rating, city_id')
        .eq('id', touristSpotId)
        .single();

      if (spotError || !spot) {
        throw new Error('Tourist spot not found');
      }

      // 観光地周辺のホテル検索
      const hotels = await this.searchHotelsByLocation({
        latitude: spot.latitude,
        longitude: spot.longitude,
        radius: maxDistance,
        priceRange,
        limit
      });

      return {
        tourist_spot: spot,
        hotels,
        search_params: {
          max_distance_km: maxDistance,
          price_range: priceRange
        }
      };

    } catch (error) {
      console.error('Error searching hotels by tourist spot:', error);
      return { tourist_spot: null, hotels: [], error: error.message };
    }
  }

  // 価格帯別ホテル統計
  async getHotelPriceStatistics(params = {}) {
    try {
      const { prefectureId, cityId } = params;

      let query = this.supabase
        .from('hotel_price_analysis')
        .select(`
          price_category_id,
          price_categories!inner(name, category_code, min_price, max_price),
          hotel_locations!inner(prefecture_id, city_id)
        `);

      if (prefectureId) {
        query = query.eq('hotel_locations.prefecture_id', prefectureId);
      }

      if (cityId) {
        query = query.eq('hotel_locations.city_id', cityId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 価格帯別集計
      const statistics = {};
      data.forEach(item => {
        const category = item.price_categories.category_code;
        if (!statistics[category]) {
          statistics[category] = {
            name: item.price_categories.name,
            code: category,
            min_price: item.price_categories.min_price,
            max_price: item.price_categories.max_price,
            hotel_count: 0
          };
        }
        statistics[category].hotel_count++;
      });

      return Object.values(statistics);

    } catch (error) {
      console.error('Error getting price statistics:', error);
      return [];
    }
  }

  // 人気エリア取得
  async getPopularAreas(prefectureId = null, limit = 10) {
    try {
      let query = this.supabase
        .from('hotel_locations')
        .select(`
          city_id,
          cities!inner(name, name_en, is_major_city),
          hotel_price_analysis!inner(current_avg_price)
        `);

      if (prefectureId) {
        query = query.eq('prefecture_id', prefectureId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 市町村別集計
      const areaStats = {};
      data.forEach(item => {
        const cityId = item.city_id;
        if (!areaStats[cityId]) {
          areaStats[cityId] = {
            city_id: cityId,
            city_name: item.cities.name,
            city_name_en: item.cities.name_en,
            is_major_city: item.cities.is_major_city,
            hotel_count: 0,
            avg_price: 0,
            total_price: 0
          };
        }
        areaStats[cityId].hotel_count++;
        areaStats[cityId].total_price += item.hotel_price_analysis.current_avg_price || 0;
      });

      // 平均価格計算とソート
      const areas = Object.values(areaStats)
        .map(area => ({
          ...area,
          avg_price: Math.round(area.total_price / area.hotel_count)
        }))
        .sort((a, b) => b.hotel_count - a.hotel_count)
        .slice(0, limit);

      return areas;

    } catch (error) {
      console.error('Error getting popular areas:', error);
      return [];
    }
  }

  // 距離計算（Haversine formula）
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 100) / 100; // 小数点以下2桁
  }

  // 価格帯ラベル取得
  getPriceRangeLabel(price) {
    if (!price) return '料金未設定';
    
    for (const [key, range] of Object.entries(this.PRICE_RANGES)) {
      if (price >= range.min && (!range.max || price <= range.max)) {
        return range.label;
      }
    }
    return '料金未設定';
  }

  // 検索候補取得（オートコンプリート用）
  async getSearchSuggestions(query, limit = 10) {
    try {
      const searchTerm = `%${query}%`;
      
      // 都道府県・市町村・駅・観光地を横断検索
      const [prefectures, cities, stations, touristSpots] = await Promise.all([
        this.supabase
          .from('prefectures')
          .select('id, name, name_en')
          .or(`name.ilike.${searchTerm},name_en.ilike.${searchTerm}`)
          .limit(3),
        
        this.supabase
          .from('cities')
          .select('id, name, name_en, prefecture_id, prefectures!inner(name)')
          .or(`name.ilike.${searchTerm},name_en.ilike.${searchTerm}`)
          .limit(4),
        
        this.supabase
          .from('stations')
          .select('id, name, name_en, city_id, cities!inner(name)')
          .or(`name.ilike.${searchTerm},name_en.ilike.${searchTerm}`)
          .limit(3),
        
        this.supabase
          .from('tourist_spots')
          .select('id, name, name_en, category, city_id, cities!inner(name)')
          .or(`name.ilike.${searchTerm},name_en.ilike.${searchTerm}`)
          .limit(3)
      ]);

      const suggestions = [
        ...(prefectures.data || []).map(item => ({
          type: 'prefecture',
          id: item.id,
          name: item.name,
          name_en: item.name_en,
          display_name: item.name
        })),
        ...(cities.data || []).map(item => ({
          type: 'city',
          id: item.id,
          name: item.name,
          name_en: item.name_en,
          display_name: `${item.name} (${item.prefectures.name})`
        })),
        ...(stations.data || []).map(item => ({
          type: 'station',
          id: item.id,
          name: item.name,
          name_en: item.name_en,
          display_name: `${item.name}駅 (${item.cities.name})`
        })),
        ...(touristSpots.data || []).map(item => ({
          type: 'tourist_spot',
          id: item.id,
          name: item.name,
          name_en: item.name_en,
          category: item.category,
          display_name: `${item.name} (${item.cities.name})`
        }))
      ];

      return suggestions.slice(0, limit);

    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }
}

module.exports = LocationSearchService;