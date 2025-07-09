import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { format, addDays, startOfWeek } from 'date-fns';
import { FaCalendarAlt, FaDollarSign, FaChartLine, FaBed } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface InventoryData {
  hotel: {
    id: string;
    name: string;
    totalRooms: number;
  };
  inventory: Array<{
    id: string;
    name: string;
    type: string;
    totalQuantity: number;
    basePrice: number;
    availability: Array<{
      date: string;
      availableRooms: number;
      price: number;
    }>;
  }>;
  occupancyByDate: Array<{
    date: string;
    occupiedRooms: number;
    availableRooms: number;
    occupancyRate: number;
  }>;
  summary: {
    averageOccupancy: number;
    totalBookings: number;
    totalRevenue: number;
  };
}

export const InventoryDashboard: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date());
  const [editingCell, setEditingCell] = useState<{
    roomId: string;
    date: string;
    field: 'availability' | 'price';
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    // In a real app, fetch user's hotels first
    const mockHotelId = 'hotel-1'; // This would come from API
    setSelectedHotelId(mockHotelId);
    fetchInventoryData(mockHotelId);
  }, []);

  const fetchInventoryData = async (hotelId: string) => {
    try {
      const response = await fetch(
        `/api/inventory/hotels/${hotelId}/inventory?startDate=${format(
          startDate,
          'yyyy-MM-dd'
        )}&endDate=${format(addDays(startDate, 13), 'yyyy-MM-dd')}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch inventory');

      const data = await response.json();
      setInventoryData(data);
    } catch (error) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (roomId: string, date: string, field: 'availability' | 'price') => {
    const room = inventoryData?.inventory.find((r) => r.id === roomId);
    const availability = room?.availability.find((a) => a.date === date);
    
    if (availability) {
      setEditingCell({ roomId, date, field });
      setEditValue(
        field === 'availability'
          ? availability.availableRooms.toString()
          : availability.price.toString()
      );
    }
  };

  const saveEdit = async () => {
    if (!editingCell || !inventoryData) return;

    try {
      const response = await fetch(
        `/api/inventory/hotels/${selectedHotelId}/rooms/${editingCell.roomId}/availability`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            date: editingCell.date,
            [editingCell.field === 'availability' ? 'availableRooms' : 'price']: Number(
              editValue
            ),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update');

      toast.success('Updated successfully');
      setEditingCell(null);
      fetchInventoryData(selectedHotelId);
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const getDatesArray = () => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!inventoryData) {
    return <div>Error loading data</div>;
  }

  const dates = getDatesArray();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                在庫管理ダッシュボード
              </h1>
              <p className="mt-1 text-sm text-gray-500">{inventoryData.hotel.name}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaBed className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      総客室数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {inventoryData.hotel.totalRooms}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaChartLine className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      平均稼働率
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {inventoryData.summary.averageOccupancy.toFixed(1)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaCalendarAlt className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      予約数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {inventoryData.summary.totalBookings}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaDollarSign className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      総収益
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(inventoryData.summary.totalRevenue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Date Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            onClick={() => setStartDate(addDays(startDate, -7))}
            variant="secondary"
            size="sm"
          >
            ← 前週
          </Button>
          <div className="text-center">
            <h3 className="text-lg font-medium">
              {format(startDate, 'yyyy年MM月dd日')} - {format(addDays(startDate, 13), 'MM月dd日')}
            </h3>
          </div>
          <Button
            onClick={() => setStartDate(addDays(startDate, 7))}
            variant="secondary"
            size="sm"
          >
            次週 →
          </Button>
        </div>

        {/* Inventory Grid */}
        <Card className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                    客室タイプ
                  </th>
                  {dates.map((date) => (
                    <th
                      key={date.toISOString()}
                      className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]"
                    >
                      <div>{format(date, 'MM/dd')}</div>
                      <div className="text-gray-400 normal-case">
                        {format(date, 'EEE')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventoryData.inventory.map((room) => (
                  <React.Fragment key={room.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {room.name}
                        <div className="text-xs text-gray-500">
                          総数: {room.totalQuantity}室
                        </div>
                      </td>
                      {dates.map((date) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const availability = room.availability.find(
                          (a) => a.date === dateStr
                        );
                        const occupancy = inventoryData.occupancyByDate.find(
                          (o) => o.date === dateStr
                        );
                        const isEditing =
                          editingCell?.roomId === room.id &&
                          editingCell?.date === dateStr;

                        return (
                          <td
                            key={dateStr}
                            className={`px-2 py-4 whitespace-nowrap text-sm text-center ${
                              occupancy && occupancy.occupancyRate > 80
                                ? 'bg-red-50'
                                : occupancy && occupancy.occupancyRate > 60
                                ? 'bg-yellow-50'
                                : 'bg-green-50'
                            }`}
                          >
                            <div className="space-y-1">
                              {/* Available Rooms */}
                              <div
                                className="cursor-pointer hover:bg-white rounded px-1"
                                onClick={() =>
                                  handleCellEdit(room.id, dateStr, 'availability')
                                }
                              >
                                {isEditing && editingCell.field === 'availability' ? (
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={saveEdit}
                                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                                    className="w-full text-center border rounded px-1"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="font-medium">
                                    {availability?.availableRooms || 0}室
                                  </span>
                                )}
                              </div>
                              {/* Price */}
                              <div
                                className="cursor-pointer hover:bg-white rounded px-1"
                                onClick={() => handleCellEdit(room.id, dateStr, 'price')}
                              >
                                {isEditing && editingCell.field === 'price' ? (
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={saveEdit}
                                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                                    className="w-full text-center border rounded px-1"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="text-xs text-gray-600">
                                    ¥{availability?.price.toLocaleString() || room.basePrice.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">使い方</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• セルをクリックして在庫数や価格を編集できます</li>
            <li>• 背景色は稼働率を表します（緑: 低、黄: 中、赤: 高）</li>
            <li>• 変更は自動的に保存されます</li>
          </ul>
        </div>
      </main>
    </div>
  );
};