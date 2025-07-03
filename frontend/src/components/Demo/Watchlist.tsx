import React, { useState, useEffect } from 'react';
import { useAuth } from './UserAuth';

interface Hotel {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  minPrice?: number;
  rating?: number;
}

interface WatchlistItem {
  id: string;
  user_id: string;
  hotel_id: string;
  hotel_name: string;
  hotel_data: Hotel;
  area: string;
  max_price: number;
  check_in_date: string;
  check_out_date: string;
  created_at: string;
}

interface WatchlistProps {
  hotel?: Hotel;
  onClose?: () => void;
}

const WatchlistManager: React.FC<WatchlistProps> = ({ hotel, onClose }) => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    hotel_id: hotel?.id || '',
    hotel_name: hotel?.name || '',
    area: '',
    max_price: hotel?.minPrice || 10000,
    check_in_date: '',
    check_out_date: '',
  });

  useEffect(() => {
    if (user) {
      loadWatchlist();
    }
  }, [user]);

  const loadWatchlist = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/watchlist/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('demo_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setWatchlist(data);
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/watchlist/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('demo_token')}`,
        },
        body: JSON.stringify({
          ...formData,
          user_id: user.id,
          hotel_data: hotel,
        }),
      });

      if (response.ok) {
        await loadWatchlist();
        setShowAddForm(false);
        onClose?.();
      }
    } catch (error) {
      console.error('Failed to add to watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = async (itemId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/watchlist/remove/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('demo_token')}`,
        },
      });

      if (response.ok) {
        await loadWatchlist();
      }
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600">ウォッチリストを利用するにはログインが必要です</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">ウォッチリスト</h2>
        {hotel && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            このホテルを追加
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-3">アラート条件設定</h3>
          <form onSubmit={addToWatchlist} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  チェックイン日
                </label>
                <input
                  type="date"
                  value={formData.check_in_date}
                  onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  チェックアウト日
                </label>
                <input
                  type="date"
                  value={formData.check_out_date}
                  onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                希望最高価格（1泊）
              </label>
              <input
                type="number"
                value={formData.max_price}
                onChange={(e) => setFormData({ ...formData, max_price: parseInt(e.target.value) })}
                min="1000"
                step="1000"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                この価格以下になったときにメールでお知らせします
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                エリア
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="例: 東京都渋谷区"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '追加中...' : 'ウォッチリストに追加'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {loading && watchlist.length === 0 && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        )}

        {watchlist.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <p>ウォッチリストは空です</p>
            <p className="text-sm">気になるホテルを追加してアラートを受け取りましょう</p>
          </div>
        )}

        {watchlist.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{item.hotel_name}</h3>
                <p className="text-gray-600 text-sm">{item.area}</p>
                
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="font-medium">チェックイン:</span> {new Date(item.check_in_date).toLocaleDateString('ja-JP')}</p>
                  <p><span className="font-medium">チェックアウト:</span> {new Date(item.check_out_date).toLocaleDateString('ja-JP')}</p>
                  <p><span className="font-medium">希望最高価格:</span> ¥{item.max_price.toLocaleString()}</p>
                </div>

                <div className="mt-2">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    アラート有効
                  </span>
                </div>
              </div>

              <div className="ml-4">
                {item.hotel_data?.imageUrl && (
                  <img
                    src={item.hotel_data.imageUrl}
                    alt={item.hotel_name}
                    className="w-20 h-16 object-cover rounded mb-2"
                  />
                )}
                <button
                  onClick={() => removeFromWatchlist(item.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {onClose && (
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};

export default WatchlistManager;