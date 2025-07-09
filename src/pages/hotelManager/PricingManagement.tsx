import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { format, addDays } from 'date-fns';
import { FaChartLine, FaPercentage, FaCalendarAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PricingData {
  room: {
    id: string;
    name: string;
    basePrice: number;
  };
  pricing: Array<{
    date: string;
    price: number;
    availableRooms: number;
  }>;
  competitorPricing: {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
  };
  recommendations: {
    suggestedPrice: number;
    priceAdjustment: number;
  };
}

export const PricingManagement: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [bulkPrice, setBulkPrice] = useState('');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const { token } = useAuth();

  const hotelId = 'hotel-1'; // In real app, this would come from context/props

  const fetchPricingData = async (roomId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/inventory/hotels/${hotelId}/rooms/${roomId}/pricing?startDate=${format(
          startDate,
          'yyyy-MM-dd'
        )}&endDate=${format(addDays(startDate, 30), 'yyyy-MM-dd')}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch pricing');

      const data = await response.json();
      setPricingData(data);
    } catch (error) {
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (!selectedRoom || selectedDates.size === 0 || !bulkPrice) {
      toast.error('Please select dates and enter a price');
      return;
    }

    try {
      const pricing = Array.from(selectedDates).map((date) => ({
        date,
        price: Number(bulkPrice),
      }));

      const response = await fetch(
        `/api/inventory/hotels/${hotelId}/rooms/${selectedRoom}/pricing`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pricing }),
        }
      );

      if (!response.ok) throw new Error('Failed to update pricing');

      toast.success('Pricing updated successfully');
      setSelectedDates(new Set());
      setBulkPrice('');
      fetchPricingData(selectedRoom);
    } catch (error) {
      toast.error('Failed to update pricing');
    }
  };

  const applyDynamicPricing = async () => {
    if (!pricingData || !selectedRoom) return;

    const confirmed = window.confirm(
      'Apply dynamic pricing recommendations for the next 30 days?'
    );
    if (!confirmed) return;

    try {
      const pricing = pricingData.pricing.map((item) => {
        // Simple dynamic pricing logic
        const dayOfWeek = new Date(item.date).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const occupancyFactor = item.availableRooms < 5 ? 1.2 : 1.0;
        const weekendFactor = isWeekend ? 1.15 : 1.0;
        
        const dynamicPrice = Math.round(
          pricingData.recommendations.suggestedPrice * occupancyFactor * weekendFactor
        );

        return {
          date: item.date,
          price: dynamicPrice,
        };
      });

      const response = await fetch(
        `/api/inventory/hotels/${hotelId}/rooms/${selectedRoom}/pricing`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pricing }),
        }
      );

      if (!response.ok) throw new Error('Failed to apply dynamic pricing');

      toast.success('Dynamic pricing applied successfully');
      fetchPricingData(selectedRoom);
    } catch (error) {
      toast.error('Failed to apply dynamic pricing');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const chartData = pricingData?.pricing.map((item) => ({
    date: format(new Date(item.date), 'MM/dd'),
    yourPrice: item.price,
    competitorAvg: pricingData.competitorPricing.averagePrice,
    suggested: pricingData.recommendations.suggestedPrice,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">価格管理</h1>

      {/* Room Selection */}
      <Card className="mb-6">
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            客室タイプを選択
          </label>
          <select
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
            value={selectedRoom}
            onChange={(e) => {
              setSelectedRoom(e.target.value);
              if (e.target.value) {
                fetchPricingData(e.target.value);
              }
            }}
          >
            <option value="">選択してください</option>
            <option value="room-1">スタンダードルーム</option>
            <option value="room-2">デラックスルーム</option>
            <option value="room-3">スイートルーム</option>
          </select>
        </div>
      </Card>

      {pricingData && (
        <>
          {/* Pricing Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">基本価格</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(pricingData.room.basePrice)}
                  </p>
                </div>
                <FaCalendarAlt className="text-gray-400 text-2xl" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">競合平均価格</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(pricingData.competitorPricing.averagePrice)}
                  </p>
                </div>
                <FaChartLine className="text-gray-400 text-2xl" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">推奨価格</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(pricingData.recommendations.suggestedPrice)}
                  </p>
                </div>
                <FaPercentage className="text-gray-400 text-2xl" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">推奨調整率</p>
                  <p className="text-2xl font-bold">
                    {pricingData.recommendations.priceAdjustment > 0 ? '+' : ''}
                    {pricingData.recommendations.priceAdjustment}%
                  </p>
                </div>
                <Button
                  onClick={applyDynamicPricing}
                  variant="primary"
                  size="sm"
                  className="ml-2"
                >
                  適用
                </Button>
              </div>
            </Card>
          </div>

          {/* Price Chart */}
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">価格推移</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="yourPrice"
                    stroke="#3B82F6"
                    name="現在価格"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="competitorAvg"
                    stroke="#EF4444"
                    name="競合平均"
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="suggested"
                    stroke="#10B981"
                    name="推奨価格"
                    strokeDasharray="3 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Bulk Price Update */}
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">一括価格更新</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    価格
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    placeholder="新価格を入力"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    適用日を選択
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {pricingData.pricing.slice(0, 14).map((item) => (
                      <button
                        key={item.date}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          selectedDates.has(item.date)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => {
                          const newDates = new Set(selectedDates);
                          if (newDates.has(item.date)) {
                            newDates.delete(item.date);
                          } else {
                            newDates.add(item.date);
                          }
                          setSelectedDates(newDates);
                        }}
                      >
                        {format(new Date(item.date), 'MM/dd')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleBulkPriceUpdate}
                  variant="primary"
                  disabled={selectedDates.size === 0 || !bulkPrice}
                >
                  選択した日付の価格を更新
                </Button>
              </div>
            </div>
          </Card>

          {/* Detailed Pricing Table */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">詳細価格設定</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日付
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        曜日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        在庫
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        現在価格
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        推奨価格
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        差額
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pricingData.pricing.map((item) => {
                      const date = new Date(item.date);
                      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][
                        date.getDay()
                      ];
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const priceDiff =
                        pricingData.recommendations.suggestedPrice - item.price;

                      return (
                        <tr key={item.date} className={isWeekend ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(date, 'yyyy/MM/dd')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {dayOfWeek}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.availableRooms}室
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(pricingData.recommendations.suggestedPrice)}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              priceDiff > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {priceDiff > 0 ? '+' : ''}
                            {formatCurrency(priceDiff)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};