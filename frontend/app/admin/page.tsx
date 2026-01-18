'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

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
      await loadData(); // Reload data
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

  if (user?.role !== 'admin') {
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
        <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
          <h2 className="text-xl font-semibold mb-4">Users Management</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-muted-foreground">No users found</p>
            ) : (
              users.map((u: any) => (
                <div
                  key={u.id}
                  className="flex justify-between items-center p-3 bg-muted rounded hover:bg-muted/80 transition"
                >
                  <div className="flex-1">
                    <p className="font-medium">{u.email}</p>
                    <p className="text-sm text-muted-foreground">
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
        <div className="bg-card p-6 rounded-xl shadow-lg border border-border">
          <h2 className="text-xl font-semibold mb-4">Contests Management</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {contests.length === 0 ? (
              <p className="text-muted-foreground">No contests found</p>
            ) : (
              contests.map((c: any) => (
                <div key={c.id} className="p-4 bg-muted rounded hover:bg-muted/80 transition">
                  <h3 className="font-semibold text-lg">{c.name}</h3>
                  {c.description && (
                    <p className="text-sm text-muted-foreground mb-2">{c.description}</p>
                  )}
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="font-medium">Dates:</span>{' '}
                      {new Date(c.start_date).toLocaleDateString()} →{' '}
                      {new Date(c.end_date).toLocaleDateString()}
                    </p>
                    <p>
                      <span className="font-medium">Entry Fee:</span> ${(c.entry_fee_cents / 100).toFixed(2)}
                    </p>
                    <p>
                      <span className="font-medium">Prize Pool:</span> ${(c.prize_pool_cents / 100).toFixed(2)}
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
