import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { FaUndo, FaCalculator, FaHistory, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface RefundCalculation {
  refundAmount: number;
  refundPercentage: number;
  cancellationFee: number;
  reason: string;
}

interface RefundPolicy {
  daysBeforeCheckIn: number;
  refundPercentage: number;
}

export const RefundManagement: React.FC = () => {
  const [bookingId, setBookingId] = useState('');
  const [calculation, setCalculation] = useState<RefundCalculation | null>(null);
  const [policies, setPolicies] = useState<RefundPolicy[]>([
    { daysBeforeCheckIn: 30, refundPercentage: 100 },
    { daysBeforeCheckIn: 14, refundPercentage: 80 },
    { daysBeforeCheckIn: 7, refundPercentage: 50 },
    { daysBeforeCheckIn: 3, refundPercentage: 20 },
    { daysBeforeCheckIn: 0, refundPercentage: 0 },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { token, user } = useAuth();

  const calculateRefund = async () => {
    if (!bookingId) {
      toast.error('Please enter a booking ID');
      return;
    }

    try {
      const response = await fetch(
        `/api/refunds/bookings/${bookingId}/refund-calculation`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to calculate refund');

      const data = await response.json();
      setCalculation(data);
    } catch (error) {
      toast.error('Failed to calculate refund');
    }
  };

  const processRefund = async () => {
    if (!bookingId || !calculation) return;

    const confirmed = window.confirm(
      `Process refund of ${formatCurrency(calculation.refundAmount)}?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/refunds/bookings/${bookingId}/refund`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            refundAmount: calculation.refundAmount,
            reason: calculation.reason,
            notifyCustomer: true,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to process refund');

      toast.success('Refund processed successfully');
      setBookingId('');
      setCalculation(null);
    } catch (error) {
      toast.error('Failed to process refund');
    } finally {
      setIsProcessing(false);
    }
  };

  const updatePolicies = async () => {
    try {
      const response = await fetch(
        `/api/refunds/hotels/hotel-1/refund-policies`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ policies }),
        }
      );

      if (!response.ok) throw new Error('Failed to update policies');

      toast.success('Refund policies updated');
    } catch (error) {
      toast.error('Failed to update policies');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HOTEL_MANAGER';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">返金管理</h1>

      {/* Refund Calculator */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaCalculator className="mr-2" /> 返金計算
          </h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="予約ID"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            />
            <Button onClick={calculateRefund} variant="primary">
              計算
            </Button>
          </div>

          {calculation && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">返金額</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculation.refundAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">キャンセル料</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(calculation.cancellationFee)}
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600">返金率</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-green-500 h-4 rounded-full"
                      style={{ width: `${calculation.refundPercentage}%` }}
                    />
                  </div>
                  <span className="font-semibold">{calculation.refundPercentage}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4">{calculation.reason}</p>
              {isAdmin && (
                <Button
                  onClick={processRefund}
                  variant="primary"
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? '処理中...' : '返金を実行'}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Refund Policies */}
      {isAdmin && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaHistory className="mr-2" /> 返金ポリシー設定
            </h2>
            <div className="space-y-3 mb-4">
              {policies.map((policy, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">
                        チェックイン前日数
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-lg"
                        value={policy.daysBeforeCheckIn}
                        onChange={(e) => {
                          const newPolicies = [...policies];
                          newPolicies[index].daysBeforeCheckIn = Number(e.target.value);
                          setPolicies(newPolicies);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">返金率 (%)</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-lg"
                        value={policy.refundPercentage}
                        min="0"
                        max="100"
                        onChange={(e) => {
                          const newPolicies = [...policies];
                          newPolicies[index].refundPercentage = Number(e.target.value);
                          setPolicies(newPolicies);
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      const newPolicies = policies.filter((_, i) => i !== index);
                      setPolicies(newPolicies);
                    }}
                    variant="danger"
                    size="sm"
                  >
                    削除
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setPolicies([
                    ...policies,
                    { daysBeforeCheckIn: 0, refundPercentage: 0 },
                  ]);
                }}
                variant="secondary"
              >
                ポリシー追加
              </Button>
              <Button onClick={updatePolicies} variant="primary">
                保存
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Refund Status Legend */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">返金ステータス</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full" />
              <span className="text-sm">処理待ち</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full" />
              <span className="text-sm">処理中</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-green-500" />
              <span className="text-sm">完了</span>
            </div>
            <div className="flex items-center gap-2">
              <FaTimesCircle className="text-red-500" />
              <span className="text-sm">失敗</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};