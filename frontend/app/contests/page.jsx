'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import withAuth from '@/components/withAuth';
import ContestCard from '@/components/ContestCard';

const ContestsPage = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/contests')
      .then(res => {
        setContests(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        setError(err.response?.data?.detail || err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Contests & Competitions</h1>
        <Link href="/dashboard" className="text-sm text-crypto-dark-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-crypto-dark-text/60">Loading contests...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && contests.length === 0 && (
        <div className="bg-crypto-dark-surface rounded-lg p-12 border border-crypto-dark-border text-center">
          <h2 className="text-xl font-semibold text-white mb-2">No Contests Yet</h2>
          <p className="text-crypto-dark-text/50 mb-4 max-w-md mx-auto">
            Trading competitions are coming soon! Practice your strategies on the dashboard and be ready when contests launch.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2 bg-crypto-dark-primary/20 text-crypto-dark-primary rounded-md font-medium hover:bg-crypto-dark-primary/30 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      )}

      {!loading && !error && contests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contests.map((contest, i) => (
            <ContestCard key={contest.id || i} contest={contest} />
          ))}
        </div>
      )}
    </div>
  );
};

export default withAuth(ContestsPage);
