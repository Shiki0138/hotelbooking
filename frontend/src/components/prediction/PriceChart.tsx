import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts';

interface PriceData {
  date: string;
  price: number;
  type: 'historical' | 'prediction';
  confidence?: number;
}

interface PriceChartProps {
  historicalData: Array<{ date: string; price: number }>;
  predictions: Array<{ date: string; price: number; confidence: number }>;
  hotelName: string;
}

export const PriceChart: React.FC<PriceChartProps> = ({ historicalData, predictions, hotelName }) => {
  // データを統合
  const combinedData: PriceData[] = [
    ...historicalData.map(d => ({ ...d, type: 'historical' as const })),
    ...predictions.map(d => ({ ...d, type: 'prediction' as const }))
  ];

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-semibold">{formatDate(label)}</p>
          <p className="text-lg font-bold text-red-500">
            ¥{payload[0].value.toLocaleString()}
          </p>
          {data.type === 'prediction' && data.confidence && (
            <p className="text-xs text-gray-600">
              信頼度: {data.confidence}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800">{hotelName}</h3>
        <p className="text-sm text-gray-600">価格推移と予測</p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF385C" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FF385C" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            
            <YAxis 
              tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* 予測の信頼区間（背景） */}
            <Area
              dataKey="price"
              fill="url(#colorPrice)"
              stroke="none"
              data={predictions}
            />
            
            {/* 実績価格 */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#FF385C"
              strokeWidth={3}
              dot={{ fill: '#FF385C', r: 4 }}
              data={historicalData}
              name="実績価格"
            />
            
            {/* 予測価格 */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#FF385C"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#FF385C', r: 3 }}
              data={predictions}
              name="予測価格"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span className="text-gray-600">実績</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500 border-dashed"></div>
            <span className="text-gray-600">予測</span>
          </div>
        </div>
      </div>
    </div>
  );
};