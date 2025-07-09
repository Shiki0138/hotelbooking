import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  FaHotel,
  FaUsers,
  FaCalendarCheck,
  FaDollarSign,
  FaChartLine,
  FaChartBar,
} from 'react-icons/fa';
import { format } from 'date-fns';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface DashboardStats {
  overview: {
    totalUsers: number;
    totalHotels: number;
    totalBookings: number;
    totalRevenue: number;
    activeBookings: number;
  };
  bookings: {
    today: number;
    yesterday: number;
    last7Days: number;
    last30Days: number;
    growthRate: number;
  };
  revenue: {
    today: number;
    yesterday: number;
    last7Days: number;
    last30Days: number;
    growthRate: number;
  };
  topHotels: Array<{
    id: string;
    name: string;
    bookingCount: number;
  }>;
  recentBookings: Array<{
    id: string;
    hotelName: string;
    roomName: string;
    guestName: string;
    guestEmail: string;
    checkInDate: string;
    checkOutDate: string;
    totalPrice: number;
    status: string;
    createdAt: string;
  }>;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, token } = useAuth();

  useEffect(() => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'HOTEL_MANAGER')) {
      navigate('/admin/login');
      return;
    }

    fetchDashboardStats();
  }, [user, navigate]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>Error loading dashboard</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Admin Dashboard
              </h1>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <Button onClick={() => navigate('/admin/hotels')} variant="secondary">
                Manage Hotels
              </Button>
              <Button onClick={() => navigate('/admin/bookings')} variant="secondary">
                Manage Bookings
              </Button>
              {user?.role === 'ADMIN' && (
                <Button onClick={() => navigate('/admin/users')} variant="secondary">
                  Manage Users
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaUsers className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Users
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.overview.totalUsers.toLocaleString()}
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
                  <FaHotel className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Hotels
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.overview.totalHotels.toLocaleString()}
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
                  <FaCalendarCheck className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Bookings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.overview.totalBookings.toLocaleString()}
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
                      Total Revenue
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(stats.overview.totalRevenue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <FaChartLine className="mr-2" /> Booking Trends
              </h3>
              <div className="mt-5 grid grid-cols-2 gap-5">
                <div>
                  <p className="text-sm text-gray-500">Today</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {stats.bookings.today}
                  </p>
                  <p
                    className={`text-sm ${
                      stats.bookings.growthRate > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatPercentage(stats.bookings.growthRate)} from yesterday
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last 7 Days</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {stats.bookings.last7Days}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last 30 Days</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {stats.bookings.last30Days}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Bookings</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {stats.overview.activeBookings}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <FaChartBar className="mr-2" /> Revenue Overview
              </h3>
              <div className="mt-5 grid grid-cols-2 gap-5">
                <div>
                  <p className="text-sm text-gray-500">Today</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {formatCurrency(stats.revenue.today)}
                  </p>
                  <p
                    className={`text-sm ${
                      stats.revenue.growthRate > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatPercentage(stats.revenue.growthRate)} from yesterday
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last 7 Days</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {formatCurrency(stats.revenue.last7Days)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last 30 Days</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {formatCurrency(stats.revenue.last30Days)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Average Booking</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {formatCurrency(
                      stats.overview.totalRevenue / stats.overview.totalBookings || 0
                    )}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Top Performing Hotels
              </h3>
              <div className="mt-5">
                <ul className="divide-y divide-gray-200">
                  {stats.topHotels.map((hotel) => (
                    <li key={hotel.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {hotel.name}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {hotel.bookingCount} bookings
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Bookings
              </h3>
              <div className="mt-5">
                <ul className="divide-y divide-gray-200">
                  {stats.recentBookings.slice(0, 5).map((booking) => (
                    <li key={booking.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {booking.hotelName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {booking.guestName} - {format(new Date(booking.checkInDate), 'MMM dd')} to{' '}
                            {format(new Date(booking.checkOutDate), 'MMM dd')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(booking.totalPrice)}
                          </p>
                          <p className="text-sm text-gray-500">{booking.status}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};