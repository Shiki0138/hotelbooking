interface NotificationData {
  type: 'price_drop' | 'availability' | 'favorite_update' | 'watchlist_alert';
  hotelId: string;
  message: string;
  timestamp: number;
  metadata?: {
    oldPrice?: number;
    newPrice?: number;
    priceChange?: number;
    percentageChange?: number;
    availabilityCount?: number;
  };
}

interface WebSocketMessage {
  event: string;
  data: NotificationData;
}

class WebSocketNotificationService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, ((data: NotificationData) => void)[]> = new Map();
  private isConnected = false;
  private userId: string | null = null;

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'wss://nanleckihedkmikctltb.supabase.co/realtime/v1/websocket';
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.subscribeToChannels();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      
      if (event.code !== 1000) { // Not a normal closure
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.initializeConnection();
    }, delay);
  }

  private subscribeToChannels() {
    if (!this.ws || !this.userId) return;

    const subscriptions = [
      {
        topic: `notifications:${this.userId}`,
        event: 'notification',
        payload: {}
      },
      {
        topic: 'price_updates',
        event: 'price_change',
        payload: {}
      },
      {
        topic: 'availability_updates',
        event: 'availability_change',
        payload: {}
      }
    ];

    subscriptions.forEach(sub => {
      this.send({
        topic: sub.topic,
        event: 'phx_join',
        payload: sub.payload,
        ref: Date.now().toString()
      });
    });
  }

  private handleMessage(message: WebSocketMessage) {
    const { event, data } = message;
    
    // 通知音再生
    this.playNotificationSound(data.type);
    
    // ブラウザ通知表示
    this.showBrowserNotification(data);
    
    // 登録されたリスナーに通知
    const typeListeners = this.listeners.get(data.type) || [];
    const allListeners = this.listeners.get('all') || [];
    
    [...typeListeners, ...allListeners].forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });

    // UIに表示する通知をローカルストレージに保存
    this.saveNotificationToStorage(data);
  }

  private playNotificationSound(type: string) {
    const audio = new Audio();
    
    switch (type) {
      case 'price_drop':
        audio.src = '/sounds/price-drop.mp3';
        break;
      case 'availability':
        audio.src = '/sounds/availability.mp3';
        break;
      default:
        audio.src = '/sounds/notification.mp3';
    }
    
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Sound play failed:', e));
  }

  private async showBrowserNotification(data: NotificationData) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(this.getNotificationTitle(data), {
        body: data.message,
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        tag: `hotel-${data.hotelId}`,
        renotify: true,
        requireInteraction: data.type === 'price_drop',
        actions: [
          {
            action: 'view',
            title: '詳細を見る',
            icon: '/icons/view-icon.png'
          },
          {
            action: 'dismiss',
            title: '閉じる',
            icon: '/icons/close-icon.png'
          }
        ]
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = `/hotel/${data.hotelId}`;
        notification.close();
      };
    }
  }

  private getNotificationTitle(data: NotificationData): string {
    switch (data.type) {
      case 'price_drop':
        return '🎉 価格が下がりました！';
      case 'availability':
        return '🏨 空室が見つかりました！';
      case 'favorite_update':
        return '⭐ お気に入りホテルの更新';
      case 'watchlist_alert':
        return '👀 ウォッチリストアラート';
      default:
        return '📱 LastMinuteStay通知';
    }
  }

  private saveNotificationToStorage(data: NotificationData) {
    const notifications = this.getStoredNotifications();
    notifications.unshift({
      ...data,
      id: Date.now().toString(),
      read: false
    });
    
    // 最新100件まで保持
    localStorage.setItem('notifications', JSON.stringify(notifications.slice(0, 100)));
  }

  private getStoredNotifications() {
    try {
      return JSON.parse(localStorage.getItem('notifications') || '[]');
    } catch {
      return [];
    }
  }

  public addEventListener(type: string, callback: (data: NotificationData) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  public removeEventListener(type: string, callback: (data: NotificationData) => void) {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      const index = typeListeners.indexOf(callback);
      if (index > -1) {
        typeListeners.splice(index, 1);
      }
    }
  }

  public send(message: any) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  public setUserId(userId: string) {
    this.userId = userId;
    if (this.isConnected) {
      this.subscribeToChannels();
    }
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  public getStoredNotificationsList() {
    return this.getStoredNotifications();
  }

  public markNotificationAsRead(notificationId: string) {
    const notifications = this.getStoredNotifications();
    const notification = notifications.find((n: any) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }

  public clearAllNotifications() {
    localStorage.removeItem('notifications');
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const websocketService = new WebSocketNotificationService();
export type { NotificationData, WebSocketMessage };