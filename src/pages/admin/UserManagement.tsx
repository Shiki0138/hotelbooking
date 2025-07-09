import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FaEdit, FaTrash, FaSearch, FaKey } from 'react-icons/fa';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  _count: {
    bookings: number;
    reviews: number;
  };
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, [page, search, selectedRole]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        ...(selectedRole && { role: selectedRole }),
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      toast.success('User role updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user role');
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('User status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const resetUserPassword = async () => {
    if (!selectedUser || !newPassword) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) throw new Error('Failed to reset password');

      toast.success('Password reset successfully');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete user');

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800';
      case 'DELETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'HOTEL_MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'USER':
        return 'bg-gray-100 text-gray-800';
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
      <h1 className="text-3xl font-bold mb-6">User Management</h1>

      <Card className="mb-6">
        <div className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="HOTEL_MANAGER">Hotel Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h3 className="text-xl font-semibold">{user.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-1">{user.email}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                  <span>Bookings: {user._count.bookings}</span>
                  <span>Reviews: {user._count.reviews}</span>
                  <span>Joined: {format(new Date(user.createdAt), 'MMM dd, yyyy')}</span>
                  {user.lastLoginAt && (
                    <span>Last login: {format(new Date(user.lastLoginAt), 'MMM dd, yyyy HH:mm')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={user.role}
                  onChange={(e) => updateUserRole(user.id, e.target.value)}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value="USER">User</option>
                  <option value="HOTEL_MANAGER">Hotel Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <select
                  value={user.status}
                  onChange={(e) => updateUserStatus(user.id, e.target.value)}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <Button
                  onClick={() => {
                    setSelectedUser(user);
                    setShowPasswordModal(true);
                  }}
                  variant="secondary"
                  size="sm"
                  title="Reset Password"
                >
                  <FaKey />
                </Button>
                <Button
                  onClick={() => window.location.href = `/admin/users/${user.id}`}
                  variant="secondary"
                  size="sm"
                >
                  <FaEdit />
                </Button>
                <Button
                  onClick={() => deleteUser(user.id)}
                  variant="danger"
                  size="sm"
                  disabled={user.status === 'DELETED'}
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

      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
            <p className="mb-4">
              Reset password for {selectedUser.name} ({selectedUser.email})
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">New Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
                minLength={8}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedUser(null);
                  setNewPassword('');
                }}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={resetUserPassword}
                variant="primary"
                disabled={!newPassword || newPassword.length < 8}
              >
                Reset Password
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};