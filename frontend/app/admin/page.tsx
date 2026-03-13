'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  tier: string;
}

interface Contest {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  entry_fee: number;
  status: string;
  current_participants: number;
  max_participants?: number;
}

export default function AdminPanel() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setAuthChecked(true);
          setLoading(false);
          return;
        }
        const response = await api.get('/auth/me');
        setCurrentUser(response.data);
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  // Load admin data when user is confirmed admin
  useEffect(() => {
    if (authChecked && currentUser?.role === 'admin') {
      loadData();
    } else if (authChecked) {
      setLoading(false);
    }
  }, [authChecked, currentUser]);

  const loadData = async () => {
    try {
      const [usersRes, contestsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/contests')
      ]);
      setUsers(usersRes.data);
      setContests(contestsRes.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (userId: string, currentStatus: string) => {
    try {
      const endpoint = currentStatus === 'banned' ? 'unban' : 'ban';
      await api.patch(`/admin/users/${userId}/${endpoint}`);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle ban status:', error);
      alert('Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-red-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Users Section */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Users Management</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-gray-400">No users found</p>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="flex justify-between items-center p-3 bg-gray-900 rounded hover:bg-gray-800 transition"
                >
                  <div className="flex-1">
                    <p className="font-medium">{u.email}</p>
                    <p className="text-sm text-gray-400">
                      Status: <span className={u.status === 'banned' ? 'text-red-500' : 'text-green-500'}>
                        {u.status}
                      </span> | Role: {u.role} | Tier: {u.tier}
                    </p>
                  </div>
                  <button
                    onClick={() => handleBanToggle(u.id, u.status)}
                    className={`px-4 py-2 rounded font-medium transition ${
                      u.status === 'banned'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {u.status === 'banned' ? 'Unban' : 'Ban'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contests Section */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Contests Management</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {contests.length === 0 ? (
              <p className="text-gray-400">No contests found</p>
            ) : (
              contests.map((c) => (
                <div key={c.id} className="p-4 bg-gray-900 rounded hover:bg-gray-800 transition">
                  <h3 className="font-semibold text-lg">{c.name}</h3>
                  {c.description && (
                    <p className="text-sm text-gray-400 mb-2">{c.description}</p>
                  )}
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Dates:</span>{' '}
                      {new Date(c.start_time).toLocaleDateString()} →{' '}
                      {new Date(c.end_time).toLocaleDateString()}
                    </p>
                    <p>
                      <span className="font-medium">Entry Fee:</span> ${c.entry_fee.toFixed(2)}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{' '}
                      <span className="capitalize">{c.status}</span>
                    </p>
                    <p>
                      <span className="font-medium">Participants:</span> {c.current_participants}
                      {c.max_participants && ` / ${c.max_participants}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
