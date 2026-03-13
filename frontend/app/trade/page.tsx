'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePriceStream } from '@/hooks/usePriceStream';
import api from '@/lib/api';
import TradeHistoryTable from '@/components/TradeHistoryTable';
import { ALL_SYMBOLS, useSelectedSymbols } from '@/hooks/useSelectedSymbols';
import CandlestickChart from '@/components/CandlestickChart';

const Trading = () => {
  const { prices, isConnected } = usePriceStream();
  const { selectedSymbols } = useSelectedSymbols();
  const SYMBOLS = selectedSymbols.length > 0 ? selectedSymbols : ALL_SYMBOLS.slice(0, 10);
  const router = useRouter();
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [type, setType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await api.post('/trading/order', { symbol, side: type, quantity: Number(quantity) });
      setSuccess(res.data.message || 'Order placed!');
      setQuantity('');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentPrice = prices[symbol];
  const estimatedTotal = currentPrice && quantity ? currentPrice * parseFloat(quantity) : null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Trading Simulator</h1>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            {isConnected ? 'Live' : 'Delayed'}
          </span>
        </div>
        <Link href="/dashboard" className="text-sm text-crypto-dark-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>

      {/* Live Chart */}
      <div className="mb-6">
        <CandlestickChart symbol={symbol} currentPrice={currentPrice ?? null} />
      </div>

      {/* Price + Trade Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Current price */}
        <div className="space-y-4">
          <div className="bg-crypto-dark-surface rounded-lg p-4 border border-crypto-dark-border">
            <h3 className="text-xs text-crypto-dark-text/50 mb-1">{symbol}</h3>
            <p className="text-2xl font-bold text-white font-mono">
              {currentPrice ? `$${currentPrice.toLocaleString()}` : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Trade form */}
        <div className="lg:col-span-2 bg-crypto-dark-surface rounded-lg p-6 border border-crypto-dark-border">
          <h2 className="text-lg font-semibold text-white mb-4">Execute Trade</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-crypto-dark-text/60 mb-2">Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-crypto-dark-bg border border-crypto-dark-border rounded-md px-3 py-2 text-white text-sm"
                >
                  {SYMBOLS.map((s: any) => (
                    <option key={s.key} value={s.key}>{s.label} — {s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-crypto-dark-text/60 mb-2">Side</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-crypto-dark-bg border border-crypto-dark-border rounded-md px-3 py-2 text-white text-sm"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-crypto-dark-text/60 mb-2">Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-crypto-dark-bg border border-crypto-dark-border rounded-md px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={loading || !quantity}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium text-sm disabled:opacity-50"
                >
                  {loading ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </div>
            {estimatedTotal != null && estimatedTotal > 0 && (
              <p className="text-sm text-crypto-dark-text/60 mt-3">
                Estimated total:{' '}
                <span className="text-white font-mono">
                  ${estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
            )}
            {error   && <p className="text-red-400 mt-2 text-sm">{error}</p>}
            {success && <p className="text-green-400 mt-2 text-sm">{success}</p>}
          </form>
        </div>
      </div>

      {/* Trade History */}
      <div className="bg-crypto-dark-surface rounded-lg p-6 border border-crypto-dark-border">
        <h2 className="text-lg font-semibold text-white mb-4">Trade History</h2>
        <TradeHistoryTable key={refreshKey} />
      </div>
    </div>
  );
};

export default Trading;
