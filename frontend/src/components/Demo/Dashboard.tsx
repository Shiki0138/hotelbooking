import React, { useState, useEffect } from 'react';
import { useAuth } from './UserAuth';
import WatchlistManager from './Watchlist';

interface NotificationHistory {
  id: string;
  notification_type: string;
  hotel_data: any;
  sent_at: string;
  watchlist_id: string;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'watchlist' | 'notifications' | 'settings'>('watchlist');
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    email_notifications: true,
    price_alert_frequency: 'daily',
    max_notifications_per_day: 5,
  });

  useEffect(() => {
    if (user && activeTab === 'notifications') {
      loadNotifications();
    }
  }, [user, activeTab]);

  const loadNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/notifications/history/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('demo_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: typeof settings) => {
    if (!user) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/users/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('demo_token')}`,
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">ダッシュボードを利用するにはログインが必要です</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">マイページ</h1>
              <p className="text-gray-600">ようこそ、{user.name}さん</p>
            </div>
            <button
              onClick={logout}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'watchlist', label: 'ウォッチリスト', icon: '⭐' },
              { key: 'notifications', label: '通知履歴', icon: '📧' },
              { key: 'settings', label: '設定', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'watchlist' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">ウォッチリスト管理</h2>
              <WatchlistManager />
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">通知履歴</h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">読み込み中...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>通知履歴はまだありません</p>
                  <p className="text-sm">ウォッチリストにホテルを追加すると、価格変動や空室情報をお知らせします</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                              notification.notification_type === 'price_drop' ? 'bg-green-500' : 'bg-blue-500'
                            }`}></span>
                            <h3 className="font-medium">
                              {notification.notification_type === 'price_drop' ? '価格下落アラート' : '空室情報'}
                            </h3>
                          </div>
                          
                          <p className="text-gray-700 mb-2">
                            {notification.hotel_data?.name || 'ホテル情報'}
                          </p>
                          
                          {notification.notification_type === 'price_drop' && notification.hotel_data?.price && (
                            <p className="text-green-600 font-medium">
                              ¥{notification.hotel_data.price.toLocaleString()} になりました！
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right text-sm text-gray-500">
                          {new Date(notification.sent_at).toLocaleDateString('ja-JP')}
                          <br />
                          {new Date(notification.sent_at).toLocaleTimeString('ja-JP', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">アカウント設定</h2>
              
              <div className="space-y-6">
                {/* 基本情報 */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">基本情報</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">メールアドレス:</span> {user.email}</p>
                    <p><span className="font-medium">お名前:</span> {user.name}</p>
                    <p><span className="font-medium">登録日:</span> {new Date(user.created_at).toLocaleDateString('ja-JP')}</p>
                  </div>
                </div>

                {/* 通知設定 */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">通知設定</h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.email_notifications}
                        onChange={(e) => updateSettings({
                          ...settings,
                          email_notifications: e.target.checked
                        })}
                        className="mr-2"
                      />
                      <span>メール通知を受け取る</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        アラート頻度
                      </label>
                      <select
                        value={settings.price_alert_frequency}
                        onChange={(e) => updateSettings({
                          ...settings,
                          price_alert_frequency: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="realtime">リアルタイム</option>
                        <option value="daily">1日1回</option>
                        <option value="weekly">週1回</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        1日あたりの最大通知数
                      </label>
                      <input
                        type="number"
                        value={settings.max_notifications_per_day}
                        onChange={(e) => updateSettings({
                          ...settings,
                          max_notifications_per_day: parseInt(e.target.value)
                        })}
                        min="1"
                        max="20"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 危険操作 */}
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h3 className="font-medium mb-3 text-red-800">危険操作</h3>
                  <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm">
                    アカウントを削除
                  </button>
                  <p className="text-xs text-red-600 mt-2">
                    ※ この操作は取り消せません。すべてのデータが削除されます。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;