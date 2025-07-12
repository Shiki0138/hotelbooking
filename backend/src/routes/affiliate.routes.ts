import { Router } from 'express';
import { AffiliateController } from '../controllers/affiliate.controller';

const router = Router();
const affiliateController = new AffiliateController();

/**
 * アフィリエイト関連ルート
 */

// クリック追跡
router.post('/track/click', affiliateController.trackClick);

// コンバージョン追跡
router.post('/track/conversion', affiliateController.trackConversion);

// アフィリエイトURL生成
router.get('/url', affiliateController.generateUrl);

// 統計情報取得
router.get('/stats', affiliateController.getStats);

// プロバイダー別統計
router.get('/stats/:provider', affiliateController.getProviderStats);

// 収益レポート
router.get('/report', affiliateController.getRevenueReport);

// コンバージョン状態更新
router.put('/conversion/:conversionId/status', affiliateController.updateConversionStatus);

// リダイレクト（アフィリエイトリンク）
router.get('/redirect/:clickId', affiliateController.redirect);

export default router;