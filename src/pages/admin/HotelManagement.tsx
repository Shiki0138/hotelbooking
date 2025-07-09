import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FaEdit, FaTrash, FaPlus, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface Hotel {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  status: string;
  category: string;
  rating: number;
  _count: {
    rooms: number;
    bookings: number;
    reviews: number;
  };
}

export const HotelManagement: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { token } = useAuth();

  useEffect(() => {
    fetchHotels();
  }, [page, search]);

  const fetchHotels = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
      });

      const response = await fetch(`/api/admin/hotels?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch hotels');

      const data = await response.json();
      setHotels(data.hotels);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error('Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  const updateHotelStatus = async (hotelId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/hotels/${hotelId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Hotel status updated');
      fetchHotels();
    } catch (error) {
      toast.error('Failed to update hotel status');
    }
  };

  const deleteHotel = async (hotelId: string) => {
    if (!confirm('Are you sure you want to delete this hotel?')) return;

    try {
      const response = await fetch(`/api/admin/hotels/${hotelId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete hotel');

      toast.success('Hotel deleted successfully');
      fetchHotels();
    } catch (error) {
      toast.error('Failed to delete hotel');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Hotel Management</h1>
        <Button
          onClick={() => window.location.href = '/admin/hotels/new'}
          variant="primary"
          className="flex items-center"
        >
          <FaPlus className="mr-2" /> Add New Hotel
        </Button>
      </div>

      <Card className="mb-6">
        <div className="p-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search hotels..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {hotels.map((hotel) => (
          <Card key={hotel.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{hotel.name}</h3>
                <p className="text-gray-600 mb-1">
                  {hotel.address}, {hotel.city}, {hotel.country}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                  <span>Category: {hotel.category}</span>
                  <span>Rating: {hotel.rating}/5</span>
                  <span>Rooms: {hotel._count.rooms}</span>
                  <span>Bookings: {hotel._count.bookings}</span>
                  <span>Reviews: {hotel._count.reviews}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={hotel.status}
                  onChange={(e) => updateHotelStatus(hotel.id, e.target.value)}
                  className={`px-3 py-1 rounded text-sm ${
                    hotel.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : hotel.status === 'INACTIVE'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <Button
                  onClick={() => window.location.href = `/admin/hotels/${hotel.id}`}
                  variant="secondary"
                  size="sm"
                >
                  <FaEdit />
                </Button>
                <Button
                  onClick={() => deleteHotel(hotel.id)}
                  variant="danger"
                  size="sm"
                >
                  <FaTrash />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-center mt-8">
        <div className="flex gap-2">
          <Button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            variant="secondary"
          >
            Previous
          </Button>
          <span className="px-4 py-2">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            variant="secondary"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};