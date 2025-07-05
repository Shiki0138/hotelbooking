import express from 'express';
import { locationController } from '../controllers/locationController';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// 公開API（認証不要）

// 都道府県一覧取得
router.get('/prefectures', rateLimiter, locationController.getPrefectures);

// 指定都道府県の市町村一覧取得
router.get('/prefectures/:prefectureId/cities', rateLimiter, locationController.getCities);

// 地域別ホテル検索
router.get('/hotels', rateLimiter, locationController.searchHotelsByLocation);

// 駅周辺ホテル検索
router.get('/stations/:stationId/hotels', rateLimiter, locationController.searchHotelsByStation);

// 観光地周辺ホテル検索
router.get('/tourist-spots/:touristSpotId/hotels', rateLimiter, locationController.searchHotelsByTouristSpot);

// 価格帯統計取得
router.get('/price-statistics', rateLimiter, locationController.getPriceStatistics);

// 人気エリア取得
router.get('/popular-areas', rateLimiter, locationController.getPopularAreas);

// 検索候補取得（オートコンプリート）
router.get('/suggestions', rateLimiter, locationController.getSearchSuggestions);

// 地域詳細情報取得
router.get('/:type/:id', rateLimiter, locationController.getLocationDetails);

// マップ用ホテル一覧（軽量データ）
router.get('/map/hotels', rateLimiter, locationController.getHotelsForMap);

export default router;