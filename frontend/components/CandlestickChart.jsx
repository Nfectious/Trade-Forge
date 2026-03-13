'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

const INTERVALS = [
  { key: '1m',  label: '1M'  },
  { key: '5m',  label: '5M'  },
  { key: '15m', label: '15M' },
  { key: '1h',  label: '1H'  },
  { key: '4h',  label: '4H'  },
  { key: '1d',  label: '1D'  },
];

const INTERVAL_SECONDS = {
  '1m':  60,
  '5m':  300,
  '15m': 900,
  '1h':  3600,
  '4h':  14400,
  '1d':  86400,
};

// BNB is not listed on Kraken
const KRAKEN_UNSUPPORTED = new Set(['BNBUSDT']);

export default function CandlestickChart({ symbol, currentPrice }) {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  const seriesRef     = useRef(null);
  const liveCandle    = useRef(null);

  const [chartReady, setChartReady] = useState(false);
  const [timeframe,  setTimeframe]  = useState('1m');
  const [exchange,   setExchange]   = useState('binance');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  // ── 1. Initialize chart once on mount ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    let chart, resizeObserver, destroyed = false;

    import('lightweight-charts').then(({ createChart, ColorType, CrosshairMode, CandlestickSeries }) => {
      if (destroyed || !containerRef.current) return;

      // clientWidth can be 0 on first paint — fall back to offsetWidth then a safe default
      const initWidth = containerRef.current.clientWidth
        || containerRef.current.offsetWidth
        || 800;

      chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(156, 163, 175, 0.9)',
        },
        grid: {
          vertLines: { color: 'rgba(31, 41, 55, 0.5)' },
          horzLines: { color: 'rgba(31, 41, 55, 0.5)' },
        },
        width:  initWidth,
        height: 360,
        timeScale: {
          borderColor:    'rgba(55, 65, 81, 0.8)',
          timeVisible:    true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: 'rgba(55, 65, 81, 0.8)',
        },
        crosshair: {
          mode: CrosshairMode.Magnet,
        },
      });

      // lightweight-charts v5: addCandlestickSeries() was removed.
      // Must use addSeries(CandlestickSeries, options) instead.
      const series = chart.addSeries(CandlestickSeries, {
        upColor:        '#00ff88',
        downColor:      '#ef4444',
        borderUpColor:  '#00ff88',
        borderDownColor:'#ef4444',
        wickUpColor:    '#00ff88',
        wickDownColor:  '#ef4444',
      });

      chartRef.current  = chart;
      seriesRef.current = series;

      resizeObserver = new ResizeObserver(entries => {
        if (entries[0] && chartRef.current) {
          chartRef.current.applyOptions({ width: entries[0].contentRect.width });
        }
      });
      resizeObserver.observe(containerRef.current);

      setChartReady(true);
    });

    return () => {
      destroyed = true;
      resizeObserver?.disconnect();
      chart?.remove();
      chartRef.current  = null;
      seriesRef.current = null;
      setChartReady(false);
    };
  }, []);

  // ── 2. Load OHLC history when symbol / timeframe / exchange changes ────────
  useEffect(() => {
    if (!chartReady || !symbol) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      liveCandle.current = null;

      try {
        // Proxy through backend — avoids Binance geo-restrictions in the browser
        const res = await api.get(`/market/klines/${symbol}`, {
          params: { interval: timeframe, limit: 200, exchange },
        });
        const candles = res.data;

        if (cancelled || !seriesRef.current) return;

        if (candles.length > 0) {
          seriesRef.current.setData(candles);
          liveCandle.current = { ...candles[candles.length - 1] };
          chartRef.current?.timeScale().fitContent();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load chart data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [symbol, timeframe, exchange, chartReady]);

  // ── 3. Update live (current) candle from WebSocket price stream ────────────
  useEffect(() => {
    if (!seriesRef.current || currentPrice == null || !liveCandle.current) return;

    const now          = Math.floor(Date.now() / 1000);
    const intervalSecs = INTERVAL_SECONDS[timeframe] ?? 60;
    const candleTime   = Math.floor(now / intervalSecs) * intervalSecs;
    const prev         = liveCandle.current;

    const updated =
      prev.time < candleTime
        ? { time: candleTime, open: currentPrice, high: currentPrice, low: currentPrice, close: currentPrice }
        : { ...prev, high: Math.max(prev.high, currentPrice), low: Math.min(prev.low, currentPrice), close: currentPrice };

    liveCandle.current = updated;
    seriesRef.current.update(updated);
  }, [currentPrice, timeframe]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const krakenUnavailable = exchange === 'kraken' && KRAKEN_UNSUPPORTED.has(symbol);

  return (
    <div className="bg-crypto-dark-surface rounded-lg border border-crypto-dark-border p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">{symbol} Chart</span>
          {loading && (
            <span className="text-xs text-crypto-dark-text/40 animate-pulse">Loading…</span>
          )}
          {currentPrice != null && !loading && (
            <span className="text-xs font-mono text-crypto-dark-primary">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: currentPrice < 1 ? 4 : 2 })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Exchange toggle */}
          <div className="flex rounded overflow-hidden border border-crypto-dark-border text-xs">
            {['binance', 'kraken'].map(ex => (
              <button
                key={ex}
                onClick={() => setExchange(ex)}
                className={`px-2.5 py-1 capitalize transition-colors ${
                  exchange === ex
                    ? 'bg-crypto-dark-primary text-black font-semibold'
                    : 'bg-crypto-dark-bg text-crypto-dark-text/50 hover:text-white'
                }`}
              >
                {ex.charAt(0).toUpperCase() + ex.slice(1)}
              </button>
            ))}
          </div>

          {/* Interval selector */}
          <div className="flex rounded overflow-hidden border border-crypto-dark-border text-xs">
            {INTERVALS.map(iv => (
              <button
                key={iv.key}
                onClick={() => setTimeframe(iv.key)}
                className={`px-2.5 py-1 transition-colors ${
                  timeframe === iv.key
                    ? 'bg-crypto-dark-primary text-black font-semibold'
                    : 'bg-crypto-dark-bg text-crypto-dark-text/50 hover:text-white'
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {(error || krakenUnavailable) && (
        <div className="text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2 mb-3">
          {krakenUnavailable
            ? `${symbol.replace('USDT', '')} is not listed on Kraken. Switch to Binance.`
            : error}
        </div>
      )}

      {/* Chart container */}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
