import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { EventEmitter } from 'events';
import jwt from 'jsonwebtoken';
import RealTimeInventoryService, { InventoryUpdate, InventorySnapshot } from './realTimeInventoryService';
import LastMinuteAlertService, { AlertRule } from './lastMinuteAlertService';

/**
 * WebSocket/SSE リアルタイム通信サービス
 * LastMinuteStay 特化の即座情報更新システム
 */

interface SocketUser {
  id: string;
  socketId: string;
  userId?: string;
  preferences: {
    maxPrice?: number;
    minPrice?: number;
    areas?: string[];
    urgencyLevels?: ('low' | 'medium' | 'high' | 'critical')[];
    alertTypes?: string[];
  };
  rooms: string[];
  connectedAt: Date;
  lastActivity: Date;
}

interface RoomStats {
  roomName: string;
  userCount: number;
  messageCount: number;
  createdAt: Date;
  lastActivity: Date;
}

interface MessageEvent {
  type: 'inventory-update' | 'alert' | 'price-drop' | 'room-update' | 'system' | 'user-action';
  data: any;
  timestamp: Date;
  room?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface ConnectionMetrics {
  totalConnections: number;
  authenticatedConnections: number;
  anonymousConnections: number;
  activeRooms: number;
  messagesPerMinute: number;
  averageLatency: number;
  uptime: Date;
}

class RealtimeWebSocketService extends EventEmitter {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, SocketUser>();
  private rooms = new Map<string, RoomStats>();
  private messageBuffer: MessageEvent[] = [];
  private maxBufferSize = 1000;
  private messageCount = 0;
  private startTime = new Date();
  private inventoryService?: RealTimeInventoryService;
  private alertService?: LastMinuteAlertService;

  constructor(httpServer: HttpServer) {
    super();
    
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupSocketHandlers();
    this.setupCleanupTimer();
    
    console.log('WebSocketサービス初期化完了');
  }

  /**
   * サービス連携設定
   */
  setServices(inventoryService: RealTimeInventoryService, alertService: LastMinuteAlertService): void {
    this.inventoryService = inventoryService;
    this.alertService = alertService;

    // 在庫更新イベント購読
    this.inventoryService.on('inventory-updated', (data) => {
      this.broadcastInventoryUpdate(data);
    });

    // アラートイベント購読
    this.alertService.on('websocket-notification', (payload) => {
      this.broadcastAlert(payload);
    });

    console.log('外部サービス連携設定完了');
  }

  /**
   * Socket.IO イベントハンドラー設定
   */
  private setupSocketHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      const user: SocketUser = {
        id: socket.id,
        socketId: socket.id,
        preferences: {},
        rooms: [],
        connectedAt: new Date(),
        lastActivity: new Date()
      };

      this.connectedUsers.set(socket.id, user);
      console.log(`新規接続: ${socket.id} (合計: ${this.connectedUsers.size})`);

      // 接続時イベント
      socket.emit('connected', {
        socketId: socket.id,
        serverTime: new Date().toISOString(),
        availableRooms: Array.from(this.rooms.keys())
      });

      // ユーザー認証
      socket.on('authenticate', (data) => {
        this.handleAuthentication(socket, data);
      });

      // 設定更新
      socket.on('update-preferences', (preferences) => {
        this.handlePreferencesUpdate(socket, preferences);
      });

      // ルーム参加
      socket.on('join-room', (roomName) => {
        this.handleJoinRoom(socket, roomName);
      });

      // ルーム退室
      socket.on('leave-room', (roomName) => {
        this.handleLeaveRoom(socket, roomName);
      });

      // 在庫情報要求
      socket.on('request-inventory', () => {
        this.handleInventoryRequest(socket);
      });

      // 特定ホテル監視開始
      socket.on('watch-hotel', (hotelNo) => {
        this.handleWatchHotel(socket, hotelNo);
      });

      // 特定ホテル監視停止
      socket.on('unwatch-hotel', (hotelNo) => {
        this.handleUnwatchHotel(socket, hotelNo);
      });

      // アラート設定
      socket.on('configure-alerts', (config) => {
        this.handleAlertConfiguration(socket, config);
      });

      // ユーザーアクション
      socket.on('user-action', (action) => {
        this.handleUserAction(socket, action);
      });

      // 接続終了
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // エラーハンドリング
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
        this.emit('socket-error', { socketId: socket.id, error });
      });

      // アクティビティ更新
      socket.onAny(() => {
        this.updateUserActivity(socket.id);
      });

      this.emit('user-connected', user);
    });
  }

  /**
   * 認証ミドルウェア
   */
  private async authenticateSocket(socket: any, next: any): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
        socket.userId = (decoded as any).userId;
      }
      
      next();
    } catch (error) {
      // 認証失敗でも接続は許可（匿名ユーザー）
      next();
    }
  }

  /**
   * ユーザー認証処理
   */
  private handleAuthentication(socket: any, data: { token: string }): void {
    try {
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'default-secret');
      const userId = (decoded as any).userId;
      
      const user = this.connectedUsers.get(socket.id);
      if (user) {
        user.userId = userId;
        socket.userId = userId;
        
        socket.emit('authenticated', { success: true, userId });
        console.log(`ユーザー認証成功: ${userId} (${socket.id})`);
        
        this.emit('user-authenticated', { socketId: socket.id, userId });
      }
    } catch (error) {
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
      console.error(`認証失敗 ${socket.id}:`, error);
    }
  }

  /**
   * 設定更新処理
   */
  private handlePreferencesUpdate(socket: any, preferences: any): void {
    const user = this.connectedUsers.get(socket.id);
    if (user) {
      user.preferences = { ...user.preferences, ...preferences };
      socket.emit('preferences-updated', user.preferences);
      
      console.log(`設定更新: ${socket.id}`, preferences);
      this.emit('preferences-updated', { socketId: socket.id, preferences: user.preferences });
    }
  }

  /**
   * ルーム参加処理
   */
  private handleJoinRoom(socket: any, roomName: string): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) return;

    socket.join(roomName);
    user.rooms.push(roomName);

    // ルーム統計更新
    let roomStats = this.rooms.get(roomName);
    if (!roomStats) {
      roomStats = {
        roomName,
        userCount: 0,
        messageCount: 0,
        createdAt: new Date(),
        lastActivity: new Date()
      };
      this.rooms.set(roomName, roomStats);
    }
    
    roomStats.userCount++;
    roomStats.lastActivity = new Date();

    socket.emit('joined-room', { room: roomName, userCount: roomStats.userCount });
    socket.to(roomName).emit('user-joined', { socketId: socket.id, room: roomName });

    console.log(`ルーム参加: ${socket.id} -> ${roomName}`);
    this.emit('room-joined', { socketId: socket.id, roomName, userCount: roomStats.userCount });
  }

  /**
   * ルーム退室処理
   */
  private handleLeaveRoom(socket: any, roomName: string): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) return;

    socket.leave(roomName);
    user.rooms = user.rooms.filter(room => room !== roomName);

    const roomStats = this.rooms.get(roomName);
    if (roomStats) {
      roomStats.userCount = Math.max(0, roomStats.userCount - 1);
      roomStats.lastActivity = new Date();

      if (roomStats.userCount === 0) {
        this.rooms.delete(roomName);
      }
    }

    socket.emit('left-room', { room: roomName });
    socket.to(roomName).emit('user-left', { socketId: socket.id, room: roomName });

    console.log(`ルーム退室: ${socket.id} <- ${roomName}`);
    this.emit('room-left', { socketId: socket.id, roomName });
  }

  /**
   * 在庫情報要求処理
   */
  private async handleInventoryRequest(socket: any): Promise<void> {
    try {
      if (!this.inventoryService) {
        socket.emit('inventory-error', { error: '在庫サービスが利用できません' });
        return;
      }

      const snapshot = await this.inventoryService.getCurrentInventory();
      socket.emit('inventory-snapshot', snapshot);

      console.log(`在庫情報送信: ${socket.id}`);
    } catch (error) {
      console.error(`在庫情報取得エラー ${socket.id}:`, error);
      socket.emit('inventory-error', { error: 'Failed to fetch inventory' });
    }
  }

  /**
   * ホテル監視開始処理
   */
  private handleWatchHotel(socket: any, hotelNo: number): void {
    const roomName = `hotel:${hotelNo}`;
    this.handleJoinRoom(socket, roomName);
    
    socket.emit('hotel-watch-started', { hotelNo });
    console.log(`ホテル監視開始: ${socket.id} -> Hotel ${hotelNo}`);
  }

  /**
   * ホテル監視停止処理
   */
  private handleUnwatchHotel(socket: any, hotelNo: number): void {
    const roomName = `hotel:${hotelNo}`;
    this.handleLeaveRoom(socket, roomName);
    
    socket.emit('hotel-watch-stopped', { hotelNo });
    console.log(`ホテル監視停止: ${socket.id} <- Hotel ${hotelNo}`);
  }

  /**
   * アラート設定処理
   */
  private handleAlertConfiguration(socket: any, config: any): void {
    const user = this.connectedUsers.get(socket.id);
    if (user) {
      user.preferences = { ...user.preferences, ...config };
      socket.emit('alert-config-updated', config);
      
      console.log(`アラート設定更新: ${socket.id}`, config);
    }
  }

  /**
   * ユーザーアクション処理
   */
  private handleUserAction(socket: any, action: { type: string; data: any }): void {
    const messageEvent: MessageEvent = {
      type: 'user-action',
      data: action,
      timestamp: new Date()
    };

    this.addToMessageBuffer(messageEvent);
    this.emit('user-action', { socketId: socket.id, action });

    console.log(`ユーザーアクション: ${socket.id} - ${action.type}`);
  }

  /**
   * 接続終了処理
   */
  private handleDisconnection(socket: any, reason: string): void {
    const user = this.connectedUsers.get(socket.id);
    if (user) {
      // 全ルームから退室
      user.rooms.forEach(roomName => {
        const roomStats = this.rooms.get(roomName);
        if (roomStats) {
          roomStats.userCount = Math.max(0, roomStats.userCount - 1);
          if (roomStats.userCount === 0) {
            this.rooms.delete(roomName);
          }
        }
      });

      this.connectedUsers.delete(socket.id);
      console.log(`接続終了: ${socket.id} (理由: ${reason}) (残り: ${this.connectedUsers.size})`);
      
      this.emit('user-disconnected', { user, reason });
    }
  }

  /**
   * アクティビティ更新
   */
  private updateUserActivity(socketId: string): void {
    const user = this.connectedUsers.get(socketId);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  /**
   * 在庫更新ブロードキャスト
   */
  private broadcastInventoryUpdate(data: {
    updates: InventoryUpdate[];
    alerts: any[];
    snapshot: InventorySnapshot;
  }): void {
    const messageEvent: MessageEvent = {
      type: 'inventory-update',
      data,
      timestamp: new Date(),
      priority: 'medium'
    };

    // 全体ブロードキャスト
    this.io.emit('inventory-update', data);

    // 特定ホテル監視ユーザーに詳細情報送信
    data.updates.forEach(update => {
      const hotelRoom = `hotel:${update.hotelNo}`;
      this.io.to(hotelRoom).emit('hotel-update', update);
    });

    this.addToMessageBuffer(messageEvent);
    console.log(`在庫更新ブロードキャスト: ${data.updates.length}件`);
  }

  /**
   * アラートブロードキャスト
   */
  private broadcastAlert(payload: any): void {
    const messageEvent: MessageEvent = {
      type: 'alert',
      data: payload,
      timestamp: new Date(),
      priority: payload.urgency
    };

    // フィルタリングして対象ユーザーに送信
    this.connectedUsers.forEach((user, socketId) => {
      if (this.shouldSendAlert(user, payload)) {
        this.io.to(socketId).emit('alert', payload);
      }
    });

    this.addToMessageBuffer(messageEvent);
    console.log(`アラートブロードキャスト: ${payload.alertType} - ${payload.data.hotelName}`);
  }

  /**
   * アラート送信判定
   */
  private shouldSendAlert(user: SocketUser, payload: any): boolean {
    const prefs = user.preferences;
    
    // 価格フィルタ
    if (prefs.maxPrice && payload.data.currentPrice > prefs.maxPrice) {
      return false;
    }
    if (prefs.minPrice && payload.data.currentPrice < prefs.minPrice) {
      return false;
    }

    // 緊急度フィルタ
    if (prefs.urgencyLevels && !prefs.urgencyLevels.includes(payload.urgency)) {
      return false;
    }

    // アラートタイプフィルタ
    if (prefs.alertTypes && !prefs.alertTypes.includes(payload.alertType)) {
      return false;
    }

    return true;
  }

  /**
   * メッセージバッファに追加
   */
  private addToMessageBuffer(message: MessageEvent): void {
    this.messageBuffer.unshift(message);
    this.messageCount++;
    
    if (this.messageBuffer.length > this.maxBufferSize) {
      this.messageBuffer = this.messageBuffer.slice(0, this.maxBufferSize);
    }
  }

  /**
   * 定期クリーンアップ
   */
  private setupCleanupTimer(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30分

      // 非アクティブユーザーのクリーンアップ
      this.connectedUsers.forEach((user, socketId) => {
        if (user.lastActivity < cutoff) {
          this.io.sockets.sockets.get(socketId)?.disconnect(true);
        }
      });

      // 空ルームのクリーンアップ
      this.rooms.forEach((room, roomName) => {
        if (room.userCount === 0 && room.lastActivity < cutoff) {
          this.rooms.delete(roomName);
        }
      });

    }, 5 * 60 * 1000); // 5分毎
  }

  /**
   * Server-Sent Events エンドポイント
   */
  createSSEHandler() {
    return (req: any, res: any) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const clientId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 初期メッセージ
      res.write(`data: ${JSON.stringify({
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString()
      })}\n\n`);

      // イベントリスナー設定
      const inventoryListener = (data: any) => {
        res.write(`event: inventory-update\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const alertListener = (data: any) => {
        res.write(`event: alert\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      this.on('inventory-updated', inventoryListener);
      this.on('alert', alertListener);

      // Keep-alive
      const keepAlive = setInterval(() => {
        res.write('data: {"type":"ping"}\n\n');
      }, 30000);

      // 接続終了処理
      req.on('close', () => {
        clearInterval(keepAlive);
        this.removeListener('inventory-updated', inventoryListener);
        this.removeListener('alert', alertListener);
        console.log(`SSE接続終了: ${clientId}`);
      });

      console.log(`SSE接続開始: ${clientId}`);
    };
  }

  /**
   * 接続統計取得
   */
  getConnectionMetrics(): ConnectionMetrics {
    const authenticated = Array.from(this.connectedUsers.values()).filter(u => u.userId).length;
    const messagesPerMinute = this.messageCount / ((Date.now() - this.startTime.getTime()) / 60000);

    return {
      totalConnections: this.connectedUsers.size,
      authenticatedConnections: authenticated,
      anonymousConnections: this.connectedUsers.size - authenticated,
      activeRooms: this.rooms.size,
      messagesPerMinute: Math.round(messagesPerMinute * 100) / 100,
      averageLatency: 0, // TODO: 実装
      uptime: this.startTime
    };
  }

  /**
   * ルーム一覧取得
   */
  getRooms(): RoomStats[] {
    return Array.from(this.rooms.values());
  }

  /**
   * メッセージ履歴取得
   */
  getMessageHistory(limit: number = 100): MessageEvent[] {
    return this.messageBuffer.slice(0, limit);
  }

  /**
   * サービス停止
   */
  shutdown(): void {
    this.io.close();
    this.removeAllListeners();
    console.log('WebSocketサービスを停止しました');
  }
}

export default RealtimeWebSocketService;
export type { SocketUser, RoomStats, MessageEvent, ConnectionMetrics };