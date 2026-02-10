'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePriceStream } from '@/hooks/usePriceStream';
import LivePrice from '@/components/LivePrice';
import api from '@/lib/api';

const Trading = () => {
  const { prices, isConnected } = usePriceStream();
  const router = useRouter();
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [type, setType] = useState('buy');
  const [quantity, setQuantity] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/trading/order', { symbol, side: type, quantity: Number(quantity) });
      setLoading(false);
      alert('Order placed!');
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Trading Simulator</h1>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {isConnected ? '🟢 Live Data' : '🔴 Disconnected'}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <LivePrice symbol={symbol} exchanges={['binance', 'bybit', 'kraken']} />
          </div>
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Execute Trade</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Symbol</label>
                  <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                    <option>BTCUSDT</option>
                    <option>ETHUSDT</option>
                    <option>SOLUSDT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                    <option>buy</option>
                    <option>sell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Quantity</label>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
                    {loading ? 'Loading...' : 'Place Order'}
                  </button>
                </div>
              </div>
              {error && <p className="text-red-500 mt-2">{error}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trading;
