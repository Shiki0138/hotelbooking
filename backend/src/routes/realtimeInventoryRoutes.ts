import { Router } from 'express';
import RealTimeInventoryService from '../services/realTimeInventoryService';
import LastMinuteAlertService from '../services/lastMinuteAlertService';
import RealtimeWebSocketService from '../services/realtimeWebSocketService';

/**
 * リアルタイム空室情報 API ルート
 * LastMinuteStay特化の空室速報機能
 */

const router = Router();

// サービスインスタンス (実際のアプリでは DI コンテナから取得)
let inventoryService: RealTimeInventoryService;
let alertService: LastMinuteAlertService;
let webSocketService: RealtimeWebSocketService;

/**
 * サービス初期化
 */
export function initializeServices(
  inventory: RealTimeInventoryService,
  alert: LastMinuteAlertService,
  webSocket: RealtimeWebSocketService
) {
  inventoryService = inventory;
  alertService = alert;
  webSocketService = webSocket;
}

/**
 * 現在の在庫スナップショット取得
 */
router.get('/inventory/snapshot', async (req, res) => {
  try {
    const snapshot = await inventoryService.getCurrentInventory();
    
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        message: '在庫情報が見つかりません'
      });
    }

    res.json({
      success: true,
      data: snapshot,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('在庫スナップショット取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * 特定ホテルの詳細情報取得
 */
router.get('/inventory/hotel/:hotelNo', async (req, res) => {
  try {
    const hotelNo = parseInt(req.params.hotelNo);
    
    if (isNaN(hotelNo)) {
      return res.status(400).json({
        success: false,
        message: '無効なホテル番号です'
      });
    }

    const hotelDetail = await inventoryService.getHotelDetail(hotelNo);
    
    if (!hotelDetail) {
      return res.status(404).json({
        success: false,
        message: 'ホテル情報が見つかりません'
      });
    }

    res.json({
      success: true,
      data: hotelDetail,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ホテル詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * 直前予約アラート履歴取得
 */
router.get('/alerts/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const alertHistory = inventoryService.getAlertHistory(limit);

    res.json({
      success: true,
      data: alertHistory,
      count: alertHistory.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('アラート履歴取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * ユーザー購読登録
 */
router.post('/subscription', async (req, res) => {
  try {
    const { userId, filters, notificationMethods } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ユーザーIDが必要です'
      });
    }

    await inventoryService.subscribeUser(userId, {
      filters: filters || {},
      notificationMethods: notificationMethods || ['websocket']
    });

    res.json({
      success: true,
      message: '購読登録が完了しました',
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('購読登録エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * ユーザー購読解除
 */
router.delete('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    await inventoryService.unsubscribeUser(userId);

    res.json({
      success: true,
      message: '購読解除が完了しました',
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('購読解除エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * アラートルール作成
 */
router.post('/alerts/rules', async (req, res) => {
  try {
    const ruleData = req.body;

    // 必須フィールドチェック
    if (!ruleData.name || !ruleData.conditions || !ruleData.actions) {
      return res.status(400).json({
        success: false,
        message: '必須フィールドが不足しています (name, conditions, actions)'
      });
    }

    const ruleId = alertService.addAlertRule(ruleData);

    res.status(201).json({
      success: true,
      message: 'アラートルールが作成されました',
      ruleId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('アラートルール作成エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * アラートルール一覧取得
 */
router.get('/alerts/rules', async (req, res) => {
  try {
    const activeRules = alertService.getActiveRules();

    res.json({
      success: true,
      data: activeRules,
      count: activeRules.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('アラートルール取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * アラートルール更新
 */
router.put('/alerts/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    const success = alertService.updateAlertRule(ruleId, updates);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'アラートルールが見つかりません'
      });
    }

    res.json({
      success: true,
      message: 'アラートルールが更新されました',
      ruleId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('アラートルール更新エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * アラートルール削除
 */
router.delete('/alerts/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;

    const success = alertService.removeAlertRule(ruleId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'アラートルールが見つかりません'
      });
    }

    res.json({
      success: true,
      message: 'アラートルールが削除されました',
      ruleId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('アラートルール削除エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * 統計情報取得
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      inventoryStats,
      alertMetrics,
      connectionMetrics,
      notificationHistory
    ] = await Promise.all([
      inventoryService.getStatistics(),
      alertService.getMetrics(),
      webSocketService.getConnectionMetrics(),
      alertService.getNotificationHistory(10)
    ]);

    res.json({
      success: true,
      data: {
        inventory: inventoryStats,
        alerts: alertMetrics,
        connections: connectionMetrics,
        recentNotifications: notificationHistory
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('統計情報取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * サービス健全性チェック
 */
router.get('/health', async (req, res) => {
  try {
    const checks = {
      inventoryService: inventoryService?.getStatistics().isRunning || false,
      alertService: alertService?.getActiveRules().length >= 0 || false,
      webSocketService: webSocketService?.getConnectionMetrics().totalConnections >= 0 || false
    };

    const allHealthy = Object.values(checks).every(check => check === true);

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      data: checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('健全性チェックエラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

/**
 * Server-Sent Events エンドポイント
 */
router.get('/events', (req, res) => {
  if (webSocketService) {
    const sseHandler = webSocketService.createSSEHandler();
    sseHandler(req, res);
  } else {
    res.status(503).json({
      success: false,
      message: 'WebSocketサービスが利用できません'
    });
  }
});

/**
 * 手動更新トリガー（開発・テスト用）
 */
router.post('/trigger-update', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: '本番環境では利用できません'
      });
    }

    // 手動で在庫更新をトリガー
    inventoryService.emit('manual-update-requested');

    res.json({
      success: true,
      message: '手動更新がトリガーされました',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('手動更新エラー:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

export default router;