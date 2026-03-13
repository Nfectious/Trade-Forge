'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { ALL_SYMBOLS } from '@/hooks/useSelectedSymbols';
import { useSelectedSymbols } from '@/hooks/useSelectedSymbols';

export default function QuickTrade({ prices = {}, onTradeComplete }) {
  const { selectedSymbols } = useSelectedSymbols();
  const SYMBOLS = selectedSymbols.length > 0 ? selectedSymbols : ALL_SYMBOLS.slice(0, 10);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const currentPrice = prices[symbol];
  const estimatedTotal = currentPrice && quantity ? currentPrice * parseFloat(quantity) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || parseFloat(quantity) <= 0) {
      setFeedback({ type: 'error', message: 'Enter a valid quantity' });
      return;
    }

    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.post('/trading/order', {
        symbol,
        side,
        quantity: parseFloat(quantity),
      });
      setFeedback({ type: 'success', message: res.data.message || 'Order placed!' });
      setQuantity('');
      onTradeComplete?.();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || err.message || 'Order failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  return (
    <div className="bg-crypto-dark-surface rounded-lg p-5 border border-crypto-dark-border">
      <h3 className="text-lg font-semibold text-white mb-4">Quick Trade</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Symbol */}
        <div>
          <label className="block text-xs text-crypto-dark-text/60 mb-1">Symbol</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-crypto-dark-bg border border-crypto-dark-border rounded-md px-3 py-2 text-white text-sm"
          >
            {SYMBOLS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label} — {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Current Price */}
        {currentPrice != null && (
          <div className="text-sm text-crypto-dark-text/70">
            Current price: <span className="text-white font-mono">{formatCurrency(currentPrice)}</span>
          </div>
        )}

        {/* Side toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              side === 'buy'
                ? 'bg-green-600 text-white'
                : 'bg-crypto-dark-bg text-crypto-dark-text/60 border border-crypto-dark-border'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              side === 'sell'
                ? 'bg-red-600 text-white'
                : 'bg-crypto-dark-bg text-crypto-dark-text/60 border border-crypto-dark-border'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs text-crypto-dark-text/60 mb-1">Quantity</label>
          <input
            type="number"
            step="any"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            className="w-full bg-crypto-dark-bg border border-crypto-dark-border rounded-md px-3 py-2 text-white text-sm"
          />
        </div>

        {/* Estimated Total */}
        {estimatedTotal != null && estimatedTotal > 0 && (
          <div className="text-sm text-crypto-dark-text/70">
            Estimated total: <span className="text-white font-mono">{formatCurrency(estimatedTotal)}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !quantity}
          className={`w-full py-2.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${
            side === 'buy'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {loading ? 'Placing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${SYMBOLS.find(s => s.key === symbol)?.label}`}
        </button>

        {/* Feedback */}
        {feedback && (
          <div className={`text-sm rounded-md px-3 py-2 ${
            feedback.type === 'success'
              ? 'bg-green-500/10 text-green-400'
              : 'bg-red-500/10 text-red-400'
          }`}>
            {feedback.message}
          </div>
        )}
      </form>
    </div>
  );
}
