'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import withAuth from '@/components/withAuth';
import LivePriceGrid from '@/components/LivePrice';
import QuickTrade from '@/components/QuickTrade';
import ContestCard from '@/components/ContestCard';
import { usePriceStream } from '@/hooks/usePriceStream';

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

const Dashboard = () => {
  const { prices: wsPrices } = usePriceStream();
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [trades, setTrades] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tipsDismissed, setTipsDismissed] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, portfolioRes, tradesRes] = await Promise.allSettled([
        api.get('/auth/me'),
        api.get('/trading/portfolio'),
        api.get('/trading/trades/history?limit=5'),
      ]);

      if (userRes.status === 'fulfilled') setUser(userRes.value.data);
      if (portfolioRes.status === 'fulfilled') setPortfolio(portfolioRes.value.data);
      if (tradesRes.status === 'fulfilled') setTrades(tradesRes.value.data || []);

      // Contests — non-critical, don't block
      api.get('/contests')
        .then(res => setContests(Array.isArray(res.data) ? res.data : []))
        .catch(() => {});

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-crypto-dark-text/60">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-lg text-red-400">Error: {error}</p>
      </div>
    );
  }

  const cashBalance = portfolio?.cash_balance ?? 0;
  const assets = portfolio?.assets ?? [];
  // Recalculate total_value using live WebSocket prices so stats update continuously
  const liveHoldingsValue = assets.reduce((sum, a) => {
    const price = wsPrices[a.symbol] ?? a.current_price;
    return sum + a.quantity * price;
  }, 0);
  const totalValue = cashBalance + liveHoldingsValue;
  const totalTrades = trades.length;
  const startingBalance = portfolio?.starting_balance ?? 10000;
  const pnl = totalValue - startingBalance;
  const pnlPct = startingBalance > 0 ? ((totalValue - startingBalance) / startingBalance) * 100 : 0;
  const isNewUser = totalTrades === 0 && assets.length === 0;

  return (
    <div className="container mx-auto px-4 py-6 space-y-8 max-w-7xl">

      {/* ======= Welcome Banner ======= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </h1>
          <p className="text-sm text-crypto-dark-text/50 mt-1">Your personal trading command center</p>
        </div>
        {user?.tier && (
          <span className="self-start sm:self-auto text-xs px-3 py-1 rounded-full bg-crypto-dark-primary/20 text-crypto-dark-primary capitalize font-semibold">
            {user.tier} Tier
          </span>
        )}
      </div>

      {/* ======= Quick Stats Row ======= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Value" value={formatCurrency(totalValue)} />
        <StatCard label="Cash Available" value={formatCurrency(cashBalance)} />
        <StatCard
          label="Total P&L"
          value={`${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)}`}
          sub={`${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`}
          color={pnl >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard label="Holdings" value={`${assets.length} assets`} />
      </div>

      {/* ======= Live Market Prices ======= */}
      <section>
        <h2 className="text-lg font-semibold text-white">Market Prices</h2>
        <LivePriceGrid wsPrices={wsPrices} />
      </section>

      {/* ======= Main Content Grid: Portfolio + Quick Trade ======= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Portfolio Holdings — 2 cols */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-3">Portfolio Holdings</h2>
          {assets.length > 0 ? (
            <div className="bg-crypto-dark-surface rounded-lg border border-crypto-dark-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-crypto-dark-border text-crypto-dark-text/50 text-xs uppercase">
                    <th className="text-left px-4 py-3">Symbol</th>
                    <th className="text-right px-4 py-3">Qty</th>
                    <th className="text-right px-4 py-3">Avg Price</th>
                    <th className="text-right px-4 py-3">Current</th>
                    <th className="text-right px-4 py-3">Value</th>
                    <th className="text-right px-4 py-3">P&L %</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => {
                    const livePrice = wsPrices[a.symbol] ?? a.current_price;
                    const liveValue = a.quantity * livePrice;
                    const costBasis = a.quantity * a.avg_price;
                    const livePnlPct = costBasis > 0 ? ((liveValue - costBasis) / costBasis) * 100 : 0;
                    return (
                      <tr key={a.symbol} className="border-b border-crypto-dark-border/50 last:border-0">
                        <td className="px-4 py-3 font-medium text-white">{a.symbol}</td>
                        <td className="px-4 py-3 text-right text-crypto-dark-text/80 font-mono">{a.quantity}</td>
                        <td className="px-4 py-3 text-right text-crypto-dark-text/80 font-mono">{formatCurrency(a.avg_price)}</td>
                        <td className="px-4 py-3 text-right text-white font-mono">{formatCurrency(livePrice)}</td>
                        <td className="px-4 py-3 text-right text-white font-mono">{formatCurrency(liveValue)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-medium ${livePnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {livePnlPct >= 0 ? '+' : ''}{livePnlPct.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-crypto-dark-surface rounded-lg p-8 border border-crypto-dark-border text-center">
              <p className="text-crypto-dark-text/50 mb-3">No holdings yet. Start building your portfolio!</p>
              <Link
                href="/trade"
                className="inline-block px-6 py-2 bg-crypto-dark-primary/20 text-crypto-dark-primary rounded-md font-medium hover:bg-crypto-dark-primary/30 transition-colors"
              >
                Make Your First Trade
              </Link>
            </div>
          )}
        </div>

        {/* Quick Trade — 1 col */}
        <div>
          <QuickTrade prices={wsPrices} onTradeComplete={fetchData} />
        </div>
      </div>

      {/* ======= Recent Trades ======= */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
          <Link href="/trade" className="text-sm text-crypto-dark-primary hover:underline">
            View All
          </Link>
        </div>
        {trades.length > 0 ? (
          <div className="bg-crypto-dark-surface rounded-lg border border-crypto-dark-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-crypto-dark-border text-crypto-dark-text/50 text-xs uppercase">
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Symbol</th>
                  <th className="text-left px-4 py-3">Side</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-b border-crypto-dark-border/50 last:border-0">
                    <td className="px-4 py-3 text-crypto-dark-text/70 text-xs">
                      {new Date(t.executed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{t.symbol}</td>
                    <td className={`px-4 py-3 font-medium capitalize ${t.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                      {t.side}
                    </td>
                    <td className="px-4 py-3 text-right text-crypto-dark-text/80 font-mono">{t.quantity}</td>
                    <td className="px-4 py-3 text-right text-white font-mono">{formatCurrency(t.price)}</td>
                    <td className="px-4 py-3 text-right text-white font-mono">{formatCurrency(t.total_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-crypto-dark-surface rounded-lg p-6 border border-crypto-dark-border text-center">
            <p className="text-crypto-dark-text/50">No trades yet. Use the Quick Trade panel above to get started.</p>
          </div>
        )}
      </section>

      {/* ======= Contests ======= */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Contests & Competitions</h2>
          <Link href="/contests" className="text-sm text-crypto-dark-primary hover:underline">
            View All
          </Link>
        </div>
        {contests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contests.slice(0, 3).map((c, i) => (
              <ContestCard key={c.id || i} contest={c} />
            ))}
          </div>
        ) : (
          <div className="bg-crypto-dark-surface rounded-lg p-6 border border-crypto-dark-border text-center">
            <p className="text-crypto-dark-text/50 mb-1">No active contests right now.</p>
            <p className="text-xs text-crypto-dark-text/30">Check back soon — competitions are coming!</p>
          </div>
        )}
      </section>

      {/* ======= Getting Started Tips (new users only) ======= */}
      {isNewUser && !tipsDismissed && (
        <section className="bg-crypto-dark-surface rounded-lg p-6 border border-crypto-dark-primary/30 relative">
          <button
            onClick={() => setTipsDismissed(true)}
            className="absolute top-3 right-3 text-crypto-dark-text/40 hover:text-crypto-dark-text text-lg"
          >
            &times;
          </button>
          <h2 className="text-lg font-semibold text-white mb-4">Getting Started</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StepCard step={1} title="Check Live Prices" desc="Monitor real-time crypto prices from top exchanges above." />
            <StepCard step={2} title="Make Your First Trade" desc="Use the Quick Trade widget to buy your first crypto." />
            <StepCard step={3} title="Track Your P&L" desc="Watch your portfolio grow in the holdings table." />
            <StepCard step={4} title="Join a Contest" desc="Compete against other traders in trading competitions." />
          </div>
        </section>
      )}
    </div>
  );
};

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-crypto-dark-surface rounded-lg p-4 border border-crypto-dark-border">
      <p className="text-xs text-crypto-dark-text/50 mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color || 'text-white'}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 font-mono ${color || 'text-crypto-dark-text/50'}`}>{sub}</p>}
    </div>
  );
}

function StepCard({ step, title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-crypto-dark-primary/20 text-crypto-dark-primary flex items-center justify-center text-sm font-bold">
        {step}
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-crypto-dark-text/50 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

export default withAuth(Dashboard);
