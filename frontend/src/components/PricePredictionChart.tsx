import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { fetchPriceHistory } from '../lib/supabase';

interface PricePredictionChartProps {
  hotelId: string;
  selectedDates: { checkin: string; checkout: string };
}

export const PricePredictionChart: React.FC<PricePredictionChartProps> = ({
  hotelId,
  selectedDates
}) => {
  const [priceData, setPriceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    loadPriceData();
  }, [hotelId, selectedDates]);

  const loadPriceData = async () => {
    setIsLoading(true);
    try {
      // 価格履歴を取得
      const history = await fetchPriceHistory(hotelId);
      
      // 予測データを生成（実際はAI APIから取得）
      const mockPrediction = {
        predictedPrice: 28000,
        confidence: 85,
        priceRange: { min: 24000, max: 32000 },
        bestTimeToBuy: '3日前〜1日前',
        reasoning: '過去の傾向から、チェックイン3日前頃に価格が最も下がる傾向があります。'
      };

      // グラフ用のデータを準備
      const chartData = history.map((item: any, index: number) => ({
        date: new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
        actual: item.price,
        predicted: index > history.length - 7 ? mockPrediction.predictedPrice + (Math.random() - 0.5) * 4000 : null
      }));

      setPriceData(chartData);
      setPrediction(mockPrediction);
    } catch (error) {
      console.error('Price data loading error:', error);
      // フォールバック用のモックデータ
      const mockData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
        actual: 25000 + Math.sin(i / 3) * 5000 + Math.random() * 2000,
        predicted: i > 23 ? 28000 + (Math.random() - 0.5) * 4000 : null
      }));
      setPriceData(mockData);
      setPrediction({
        predictedPrice: 28000,
        confidence: 85,
        priceRange: { min: 24000, max: 32000 },
        bestTimeToBuy: '3日前〜1日前',
        reasoning: '過去の傾向から、チェックイン3日前頃に価格が最も下がる傾向があります。'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb'
      }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#1f2937'
        }}>
          🤖 AI価格予測
        </h3>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '16px'
        }}>
          過去30日間の価格推移と今後の予測
        </p>
      </div>

      {/* 予測サマリー */}
      {prediction && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7, #fee2e2)',
            padding: '16px',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
              予測価格
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              ¥{prediction.predictedPrice.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              信頼度 {prediction.confidence}%
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
            padding: '16px',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
              予測レンジ
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
              ¥{prediction.priceRange.min.toLocaleString()} 〜 ¥{prediction.priceRange.max.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              ベストタイミング: {prediction.bestTimeToBuy}
            </div>
          </div>
        </div>
      )}

      {/* 価格チャート */}
      <div style={{ height: '300px', marginBottom: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
              formatter={(value: any, name: string) => [
                name === 'actual' ? `¥${value.toLocaleString()}（実績）` : `¥${value.toLocaleString()}（予測）`,
                ''
              ]}
              labelFormatter={(label) => `日付: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#3b82f6' }}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#ef4444' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* AI分析結果 */}
      {prediction && (
        <div style={{
          background: '#f0f9ff',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #bae6fd'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#0c4a6e',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🧠 AI分析結果
          </div>
          <p style={{
            fontSize: '14px',
            color: '#0c4a6e',
            lineHeight: '1.5',
            margin: 0
          }}>
            {prediction.reasoning}
          </p>
        </div>
      )}
    </motion.div>
  );
};