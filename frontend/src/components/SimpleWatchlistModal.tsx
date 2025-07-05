import React, { useState } from 'react';

interface SimpleWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotel: {
    id: string;
    name: string;
    price: number;
  };
  onSave: (item: any) => void;
}

export const SimpleWatchlistModal: React.FC<SimpleWatchlistModalProps> = ({
  isOpen,
  onClose,
  hotel,
  onSave
}) => {
  const [targetPrice, setTargetPrice] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  if (!isOpen) return null;

  const days = ['日', '月', '火', '水', '木', '金', '土'];

  const handleSave = () => {
    const watchlistItem = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      currentPrice: hotel.price,
      targetPrice: targetPrice ? parseInt(targetPrice) : undefined,
      notificationChannels: notifyEmail ? ['email'] : [],
      daysOfWeek: selectedDays,
      createdAt: new Date().toISOString()
    };

    onSave(watchlistItem);
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                価格ウォッチ設定
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{hotel.name}</h4>
                <p className="text-sm text-gray-600">現在の価格: ¥{hotel.price.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目標価格
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    ¥
                  </span>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 35000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  通知設定
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">メール通知を受け取る</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  監視する曜日
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => toggleDay(index)}
                      className={`py-2 px-1 text-xs rounded ${
                        selectedDays.includes(index)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!targetPrice || selectedDays.length === 0}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                ウォッチリストに追加
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};