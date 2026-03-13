'use client';

import { useEffect, useState, useRef } from 'react';
import { useSelectedSymbols, ALL_SYMBOLS } from '@/hooks/useSelectedSymbols';

// Keep exporting SYMBOLS for backwards compat with trade/page.tsx and QuickTrade
export const SYMBOLS = ALL_SYMBOLS;

// Symbols streamed live by the backend WebSocket
const WS_SUBSCRIBED = new Set([
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'DOGEUSDT',
]);

const formatPrice = (price) => {
  if (!price && price !== 0) return '---';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: price < 1 ? 6 : 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  }).format(price);
};

// ── Symbol selector modal ──────────────────────────────────────────────────
function SymbolSelectorModal({ allSymbols, selectedKeys, onToggle, onAdd, onRemove, onClose }) {
  const [search, setSearch] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const filtered = allSymbols.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.key.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    setAddLoading(true);
    setAddError('');
    const err = await onAdd(customInput);
    setAddLoading(false);
    if (err) {
      setAddError(err);
    } else {
      setCustomInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-crypto-dark-surface border border-crypto-dark-border rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-crypto-dark-border">
          <h2 className="text-base font-semibold text-white">Customize Market Prices</h2>
          <button onClick={onClose} className="text-crypto-dark-text/50 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4">
          <input
            type="text"
            placeholder="Search symbols..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-crypto-dark-bg border border-crypto-dark-border rounded-md px-3 py-2 text-sm text-white placeholder-crypto-dark-text/30 focus:outline-none focus:border-crypto-dark-primary/50"
          />
        </div>

        {/* Symbol list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
          {filtered.map(sym => {
            const active = selectedKeys.includes(sym.key);
            return (
              <div key={sym.key} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-white/5 group">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggle(sym.key)}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                      active
                        ? 'bg-crypto-dark-primary border-crypto-dark-primary'
                        : 'border-crypto-dark-border bg-transparent'
                    }`}
                  >
                    {active && (
                      <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div>
                    <span className="text-sm font-medium text-white">{sym.label}</span>
                    <span className="text-xs text-crypto-dark-text/50 ml-2">{sym.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!WS_SUBSCRIBED.has(sym.key) && (
                    <span className="text-[10px] text-yellow-400/60">30s refresh</span>
                  )}
                  {sym.custom && (
                    <button
                      onClick={() => onRemove(sym.key)}
                      className="text-xs text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove custom symbol"
                    >
                      remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-crypto-dark-text/40 text-center py-4">No symbols match "{search}"</p>
          )}
        </div>

        {/* Add custom symbol */}
        <div className="px-5 pb-5 pt-3 border-t border-crypto-dark-border">
          <p className="text-xs text-crypto-dark-text/40 mb-2">Add any Binance symbol</p>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. PEPE or PEPEUSDT"
              value={customInput}
              onChange={e => { setCustomInput(e.target.value); setAddError(''); }}
              className="flex-1 bg-crypto-dark-bg border border-crypto-dark-border rounded-md px-3 py-2 text-sm text-white placeholder-crypto-dark-text/30 focus:outline-none focus:border-crypto-dark-primary/50"
            />
            <button
              type="submit"
              disabled={addLoading || !customInput.trim()}
              className="px-4 py-2 bg-crypto-dark-primary/20 text-crypto-dark-primary text-sm rounded-md hover:bg-crypto-dark-primary/30 disabled:opacity-40 transition-colors"
            >
              {addLoading ? '...' : 'Add'}
            </button>
          </form>
          {addError && <p className="text-xs text-red-400 mt-1">{addError}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Single price tile ──────────────────────────────────────────────────────
const LivePriceTile = ({ symbol, wsPrice, restPrice }) => {
  const price = wsPrice ?? restPrice;
  const isLive = wsPrice != null;

  return (
    <div className="bg-crypto-dark-surface rounded-lg p-4 border border-crypto-dark-border hover:border-crypto-dark-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{symbol.label}</span>
          <span className="text-xs text-crypto-dark-text/50 truncate">{symbol.name}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
          isLive
            ? 'bg-green-500/20 text-green-400'
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {isLive ? 'Live' : 'Delayed'}
        </span>
      </div>
      <p className="text-xl font-bold text-white font-mono">{formatPrice(price)}</p>
    </div>
  );
};

// ── Main grid component ────────────────────────────────────────────────────
export default function LivePriceGrid({ wsPrices = {}, compact = false }) {
  const { allSymbols, selectedSymbols, selectedKeys, toggle, addCustomSymbol, removeCustomSymbol } = useSelectedSymbols();
  const [restPrices, setRestPrices] = useState({});
  const [showModal, setShowModal] = useState(false);
  const fetchingRef = useRef(false);

  // Fetch REST prices from Binance for symbols not covered by WS,
  // and as a catch-all to fill any gaps. Runs on mount and every 30s.
  useEffect(() => {
    const fetchAll = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const keys = allSymbols.map(s => s.key);
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(keys)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const prices = {};
        data.forEach(item => { prices[item.symbol] = parseFloat(item.price); });
        setRestPrices(prices);
      } catch {
        // silently ignore — wsPrices still work
      } finally {
        fetchingRef.current = false;
      }
    };

    fetchAll();
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [allSymbols]);

  const displayed = compact ? selectedSymbols.slice(0, 5) : selectedSymbols;

  return (
    <>
      {/* Gear button sits above the grid — rendered by the parent via the
          "onOpenCustomize" prop pattern would require prop drilling; instead
          we render it inline here so the component stays self-contained. */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-crypto-dark-text/40">
          {selectedSymbols.length} pair{selectedSymbols.length !== 1 ? 's' : ''} selected
        </span>
        {!compact && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-xs text-crypto-dark-text/50 hover:text-crypto-dark-primary transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Customize
          </button>
        )}
      </div>

      <div className={`grid gap-3 ${
        compact
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
      }`}>
        {displayed.map(sym => (
          <LivePriceTile
            key={sym.key}
            symbol={sym}
            wsPrice={wsPrices[sym.key] ?? null}
            restPrice={restPrices[sym.key] ?? null}
          />
        ))}
      </div>

      {showModal && (
        <SymbolSelectorModal
          allSymbols={allSymbols}
          selectedKeys={selectedKeys}
          onToggle={toggle}
          onAdd={addCustomSymbol}
          onRemove={removeCustomSymbol}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
