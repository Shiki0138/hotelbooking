import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';
import { FaEye, FaBan, FaUndo } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface Booking {
  id: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  hotel: {
    id: string;
    name: string;
    city: string;
  };
  room: {
    id: string;
    name: string;
    type: string;
  };
}

export const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, [page, selectedStatus]);

  const fetchBookings = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(selectedStatus && { status: selectedStatus }),
      });

      const response = await fetch(`/api/admin/bookings?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();
      setBookings(data.bookings);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Booking status updated');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to update booking status');
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: cancelReason,
          refundAmount: refundAmount ? parseFloat(refundAmount) : null,
          refundMethod: refundAmount ? 'ORIGINAL_METHOD' : null,
        }),
      });

      if (!response.ok) throw new Error('Failed to cancel booking');

      toast.success('Booking cancelled successfully');
      setShowCancelModal(false);
      setSelectedBooking(null);
      setCancelReason('');
      setRefundAmount('');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <h1 className="text-3xl font-bold mb-6">Booking Management</h1>

      <Card className="mb-6">
        <div className="p-4">
          <div className="flex gap-4 items-center">
            <select
              className="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h3 className="text-xl font-semibold">{booking.hotel.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-1">
                  Guest: {booking.user.name} ({booking.user.email})
                </p>
                <p className="text-gray-600 mb-1">
                  Room: {booking.room.name} - {booking.room.type}
                </p>
                <p className="text-gray-600 mb-1">
                  Check-in: {format(new Date(booking.checkInDate), 'MMM dd, yyyy')} - 
                  Check-out: {format(new Date(booking.checkOutDate), 'MMM dd, yyyy')}
                </p>
                <p className="text-lg font-semibold mt-2">
                  Total: {formatCurrency(booking.totalPrice)}
                </p>
                <p className="text-sm text-gray-500">
                  Booked on: {format(new Date(booking.createdAt), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.location.href = `/admin/bookings/${booking.id}`}
                  variant="secondary"
                  size="sm"
                >
                  <FaEye className="mr-1" /> View
                </Button>
                {booking.status === 'CONFIRMED' && (
                  <Button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowCancelModal(true);
                    }}
                    variant="danger"
                    size="sm"
                  >
                    <FaBan className="mr-1" /> Cancel
                  </Button>
                )}
                {booking.status === 'CANCELLED' && (
                  <Button
                    onClick={() => window.location.href = `/admin/bookings/${booking.id}/refund`}
                    variant="secondary"
                    size="sm"
                  >
                    <FaUndo className="mr-1" /> Process Refund
                  </Button>
                )}
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

      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Cancel Booking</h2>
            <p className="mb-4">
              Are you sure you want to cancel this booking for {selectedBooking.hotel.name}?
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Cancellation Reason</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Refund Amount (optional)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
                max={selectedBooking.totalPrice}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedBooking(null);
                  setCancelReason('');
                  setRefundAmount('');
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCancelBooking}
                variant="danger"
                disabled={!cancelReason}
              >
                Confirm Cancellation
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};