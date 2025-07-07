import React, { useState, useEffect } from 'react';
import { websocketService, NotificationData } from '../../services/websocketService';
import { watchlistNotificationService } from '../../services/watchlistNotificationService';
import { priceAlertService } from '../../services/priceAlertService';
import './NotificationCenter.css';

interface NotificationCenterProps {
  userId: string;
  className?: string;
}

interface StoredNotification extends NotificationData {
  id: string;
  read: boolean;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  userId, 
  className = '' 
}) => {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'price_drop' | 'availability'>('all');
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  useEffect(() => {
    // 初期化
    initializeNotifications();
    
    // WebSocket通知リスナー設定
    setupNotificationListeners();
    
    // 通知許可状態チェック
    checkNotificationPermission();
    
    // ユーザーIDをWebSocketサービスに設定
    websocketService.setUserId(userId);
    
    return () => {
      // クリーンアップ
      websocketService.removeEventListener('all', handleNewNotification);
    };
  }, [userId]);

  const initializeNotifications = () => {
    const stored = websocketService.getStoredNotificationsList();
    setNotifications(stored);
    setUnreadCount(stored.filter((n: StoredNotification) => !n.read).length);
  };

  const setupNotificationListeners = () => {
    websocketService.addEventListener('all', handleNewNotification);
  };

  const handleNewNotification = (data: NotificationData) => {
    const newNotification: StoredNotification = {
      ...data,
      id: Date.now().toString(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // 音とバイブレーション
    playNotificationSound(data.type);
    vibrateDevice();
  };

  const checkNotificationPermission = async () => {
    const granted = await websocketService.requestNotificationPermission();
    setIsPermissionGranted(granted);
  };

  const playNotificationSound = (type: string) => {
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
    audio.play().catch(() => {});
  };

  const vibrateDevice = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    
    setUnreadCount(prev => Math.max(0, prev - 1));
    websocketService.markNotificationAsRead(notificationId);
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
    
    notifications.forEach(n => {
      if (!n.read) {
        websocketService.markNotificationAsRead(n.id);
      }
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    websocketService.clearAllNotifications();
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'price_drop':
        return notifications.filter(n => n.type === 'price_drop');
      case 'availability':
        return notifications.filter(n => n.type === 'availability');
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'price_drop':
        return '💰';
      case 'availability':
        return '🏨';
      case 'favorite_update':
        return '⭐';
      case 'watchlist_alert':
        return '👀';
      default:
        return '📱';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'price_drop':
        return 'text-green-600';
      case 'availability':
        return 'text-blue-600';
      case 'favorite_update':
        return 'text-yellow-600';
      case 'watchlist_alert':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '今';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
    return date.toLocaleDateString('ja-JP');
  };

  const handleNotificationClick = (notification: StoredNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // ホテル詳細ページに遷移
    if (notification.hotelId) {
      window.location.href = `/hotel/${notification.hotelId}`;
    }
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <div className={`notification-center ${className}`}>
      {/* 通知ベル */}
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="通知センター"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知パネル */}
      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>通知センター</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={markAllAsRead}
                >
                  すべて既読
                </button>
              )}
              <button
                className="clear-all-btn"
                onClick={clearAllNotifications}
              >
                クリア
              </button>
            </div>
          </div>

          {/* フィルター */}
          <div className="notification-filters">
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              すべて ({notifications.length})
            </button>
            <button
              className={filter === 'unread' ? 'active' : ''}
              onClick={() => setFilter('unread')}
            >
              未読 ({unreadCount})
            </button>
            <button
              className={filter === 'price_drop' ? 'active' : ''}
              onClick={() => setFilter('price_drop')}
            >
              価格下落
            </button>
            <button
              className={filter === 'availability' ? 'active' : ''}
              onClick={() => setFilter('availability')}
            >
              空室情報
            </button>
          </div>

          {/* 通知許可状態 */}
          {!isPermissionGranted && (
            <div className="permission-notice">
              <p>
                <span>⚠️</span>
                ブラウザ通知が無効になっています。
                <button onClick={checkNotificationPermission}>
                  有効にする
                </button>
              </p>
            </div>
          )}

          {/* 通知リスト */}
          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <div className="no-notifications">
                <span className="empty-icon">📭</span>
                <p>通知はありません</p>
              </div>
            ) : (
              filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <div className="notification-icon">
                      <span className={getNotificationColor(notification.type)}>
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>
                    
                    <div className="notification-body">
                      <p className="notification-message">
                        {notification.message}
                      </p>
                      
                      {notification.metadata && (
                        <div className="notification-metadata">
                          {notification.metadata.oldPrice && notification.metadata.newPrice && (
                            <span className="price-change">
                              ¥{notification.metadata.oldPrice.toLocaleString()} → 
                              ¥{notification.metadata.newPrice.toLocaleString()}
                              {notification.metadata.percentageChange && (
                                <span className="percentage-change">
                                  ({notification.metadata.percentageChange.toFixed(1)}%下落)
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="notification-time">
                        {formatTimestamp(notification.timestamp)}
                      </div>
                    </div>
                  </div>
                  
                  {!notification.read && (
                    <button
                      className="mark-read-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      aria-label="既読にする"
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 設定リンク */}
          <div className="notification-footer">
            <a href="/notification-settings" className="settings-link">
              通知設定
            </a>
          </div>
        </div>
      )}

      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="notification-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};