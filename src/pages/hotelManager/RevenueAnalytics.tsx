import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { FaChartLine, FaDollarSign, FaHotel, FaLightbulb } from 'react-icons/fa';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

interface RevenueForecast {
  forecast: Array<{
    date: string;
    expectedRevenue: number;
    expectedOccupancy: number;
    recommendedADR: number;
  }>;
  totalExpectedRevenue: number;
}

interface YieldRecommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  potentialImpact: string;
}

interface CompetitorAnalysis {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  pricePosition: 'below' | 'average' | 'above';
  recommendedAdjustment: number;
}

export const RevenueAnalytics: React.FC = () => {
  const [forecast, setForecast] = useState<RevenueForecast | null>(null);
  const [recommendations, setRecommendations] = useState<YieldRecommendation[]>([]);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const { token } = useAuth();

  const hotelId = 'hotel-1'; // In real app, this would come from context/props

  useEffect(() => {
    fetchAllData();
  }, [selectedPeriod]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRevenueForecast(),
        fetchRecommendations(),
        fetchCompetitorAnalysis(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueForecast = async () => {
    try {
      const response = await fetch(
        `/api/revenue/hotels/${hotelId}/forecast?days=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch forecast');

      const data = await response.json();
      setForecast(data);
    } catch (error) {
      toast.error('Failed to load revenue forecast');
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(
        `/api/revenue/hotels/${hotelId}/recommendations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch recommendations');

      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (error) {
      toast.error('Failed to load recommendations');
    }
  };

  const fetchCompetitorAnalysis = async () => {
    try {
      const response = await fetch(
        `/api/revenue/hotels/${hotelId}/competitors?category=luxury&location=Tokyo`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch competitor analysis');

      const data = await response.json();
      setCompetitorAnalysis(data);
    } catch (error) {
      toast.error('Failed to load competitor analysis');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'below':
        return 'text-red-600';
      case 'above':
        return 'text-green-600';
      default:
        return 'text-blue-600';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const chartData = forecast?.forecast.slice(0, 14).map((f) => ({
    date: format(new Date(f.date), 'MM/dd'),
    revenue: f.expectedRevenue,
    occupancy: f.expectedOccupancy,
    adr: f.recommendedADR,
  }));

  const occupancyDistribution = [
    { name: 'High (>80%)', value: forecast?.forecast.filter(f => f.expectedOccupancy > 80).length || 0 },
    { name: 'Medium (50-80%)', value: forecast?.forecast.filter(f => f.expectedOccupancy >= 50 && f.expectedOccupancy <= 80).length || 0 },
    { name: 'Low (<50%)', value: forecast?.forecast.filter(f => f.expectedOccupancy < 50).length || 0 },
  ];

  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">収益分析ダッシュボード</h1>
        <div className="flex gap-2">
          {['7', '30', '90'].map((days) => (
            <Button
              key={days}
              onClick={() => setSelectedPeriod(days)}
              variant={selectedPeriod === days ? 'primary' : 'secondary'}
              size="sm"
            >
              {days}日間
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">予測総収益</p>
              <p className="text-2xl font-bold">
                {formatCurrency(forecast?.totalExpectedRevenue || 0)}
              </p>
              <p className="text-xs text-gray-400">次{selectedPeriod}日間</p>
            </div>
            <FaDollarSign className="text-gray-400 text-2xl" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均稼働率</p>
              <p className="text-2xl font-bold">
                {(
                  (forecast?.forecast.reduce((sum, f) => sum + f.expectedOccupancy, 0) || 0) /
                  (forecast?.forecast.length || 1)
                ).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400">予測値</p>
            </div>
            <FaHotel className="text-gray-400 text-2xl" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">平均ADR</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  (forecast?.forecast.reduce((sum, f) => sum + f.recommendedADR, 0) || 0) /
                  (forecast?.forecast.length || 1)
                )}
              </p>
              <p className="text-xs text-gray-400">推奨価格</p>
            </div>
            <FaChartLine className="text-gray-400 text-2xl" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">価格ポジション</p>
              <p className={`text-2xl font-bold ${getPositionColor(competitorAnalysis?.pricePosition || 'average')}`}>
                {competitorAnalysis?.pricePosition === 'below' ? '低価格' :
                 competitorAnalysis?.pricePosition === 'above' ? '高価格' : '平均的'}
              </p>
              <p className="text-xs text-gray-400">
                競合比 {competitorAnalysis?.recommendedAdjustment || 0}%
              </p>
            </div>
            <FaLightbulb className="text-gray-400 text-2xl" />
          </div>
        </Card>
      </div>

      {/* Revenue Forecast Chart */}
      <Card className="mb-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">収益予測</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value, name) => {
                if (name === 'revenue' || name === 'adr') {
                  return formatCurrency(Number(value));
                }
                return `${value}%`;
              }} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                name="収益"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="occupancy"
                stroke="#10B981"
                name="稼働率"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Occupancy Distribution */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">稼働率分布</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={occupancyDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {occupancyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Competitor Analysis */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">競合分析</h3>
            {competitorAnalysis && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">競合平均価格</span>
                  <span className="font-semibold">
                    {formatCurrency(competitorAnalysis.averagePrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">最低価格</span>
                  <span>{formatCurrency(competitorAnalysis.minPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">最高価格</span>
                  <span>{formatCurrency(competitorAnalysis.maxPrice)}</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">推奨価格調整</span>
                    <span className={`font-bold text-lg ${competitorAnalysis.recommendedAdjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {competitorAnalysis.recommendedAdjustment > 0 ? '+' : ''}
                      {competitorAnalysis.recommendedAdjustment}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Yield Management Recommendations */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">収益最適化の推奨事項</h3>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority === 'high' ? '優先度高' :
                         rec.priority === 'medium' ? '優先度中' : '優先度低'}
                      </span>
                      <span className="text-sm text-gray-500 capitalize">{rec.type}</span>
                    </div>
                    <p className="text-gray-800 font-medium">{rec.recommendation}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      期待される効果: {rec.potentialImpact}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" className="ml-4">
                    実施する
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};