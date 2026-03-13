'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SymbolDef {
  key: string;    // e.g. "BTCUSDT"
  label: string;  // e.g. "BTC"
  name: string;   // e.g. "Bitcoin"
  custom?: boolean;
}

// Master list of available symbols
export const ALL_SYMBOLS: SymbolDef[] = [
  { key: 'BTCUSDT',  label: 'BTC',  name: 'Bitcoin' },
  { key: 'ETHUSDT',  label: 'ETH',  name: 'Ethereum' },
  { key: 'BNBUSDT',  label: 'BNB',  name: 'BNB' },
  { key: 'SOLUSDT',  label: 'SOL',  name: 'Solana' },
  { key: 'XRPUSDT',  label: 'XRP',  name: 'XRP' },
  { key: 'DOGEUSDT', label: 'DOGE', name: 'Dogecoin' },
  { key: 'ADAUSDT',  label: 'ADA',  name: 'Cardano' },
  { key: 'TRXUSDT',  label: 'TRX',  name: 'TRON' },
  { key: 'AVAXUSDT', label: 'AVAX', name: 'Avalanche' },
  { key: 'LINKUSDT', label: 'LINK', name: 'Chainlink' },
  { key: 'DOTUSDT',  label: 'DOT',  name: 'Polkadot' },
  { key: 'LTCUSDT',  label: 'LTC',  name: 'Litecoin' },
  { key: 'BCHUSDT',  label: 'BCH',  name: 'Bitcoin Cash' },
  { key: 'UNIUSDT',  label: 'UNI',  name: 'Uniswap' },
  { key: 'ATOMUSDT', label: 'ATOM', name: 'Cosmos' },
  { key: 'NEARUSDT', label: 'NEAR', name: 'NEAR Protocol' },
  { key: 'APTUSDT',  label: 'APT',  name: 'Aptos' },
  { key: 'ARBUSDT',  label: 'ARB',  name: 'Arbitrum' },
  { key: 'OPUSDT',   label: 'OP',   name: 'Optimism' },
  { key: 'SUIUSDT',  label: 'SUI',  name: 'Sui' },
  { key: 'INJUSDT',  label: 'INJ',  name: 'Injective' },
  { key: 'FETUSDT',  label: 'FET',  name: 'Fetch.ai' },
  { key: 'STXUSDT',  label: 'STX',  name: 'Stacks' },
  { key: 'FILUSDT',  label: 'FIL',  name: 'Filecoin' },
  { key: 'XLMUSDT',  label: 'XLM',  name: 'Stellar' },
  { key: 'VETUSDT',  label: 'VET',  name: 'VeChain' },
  { key: 'ALGOUSDT', label: 'ALGO', name: 'Algorand' },
  { key: 'AAVEUSDT', label: 'AAVE', name: 'Aave' },
  { key: 'MKRUSDT',  label: 'MKR',  name: 'Maker' },
  { key: 'GRTUSDT',  label: 'GRT',  name: 'The Graph' },
  { key: 'SHIBUSDT', label: 'SHIB', name: 'Shiba Inu' },
  { key: 'PEPEUSDT', label: 'PEPE', name: 'Pepe' },
  { key: 'WLDUSDT',  label: 'WLD',  name: 'Worldcoin' },
  { key: 'SANDUSDT', label: 'SAND', name: 'The Sandbox' },
  { key: 'MANAUSDT', label: 'MANA', name: 'Decentraland' },
];

const SELECTED_KEY = 'tf_selected_symbols';
const CUSTOM_KEY   = 'tf_custom_symbols';

const DEFAULT_SELECTED = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'DOGEUSDT',
];

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function useSelectedSymbols() {
  // Start with defaults so server and client initial render match (no hydration mismatch).
  // After mount, read localStorage and update if the user has saved preferences.
  const [selectedKeys, setSelectedKeys] = useState<string[]>(DEFAULT_SELECTED);
  const [customSymbols, setCustomSymbols] = useState<SymbolDef[]>([]);

  useEffect(() => {
    const savedKeys = readStorage<string[]>(SELECTED_KEY, DEFAULT_SELECTED);
    const savedCustom = readStorage<SymbolDef[]>(CUSTOM_KEY, []);
    setSelectedKeys(savedKeys);
    setCustomSymbols(savedCustom);
  }, []);

  // All symbols available to the user (built-ins + their custom additions)
  const allSymbols: SymbolDef[] = [
    ...ALL_SYMBOLS,
    ...customSymbols.filter(c => !ALL_SYMBOLS.find(s => s.key === c.key)),
  ];

  // The subset the user has switched on
  const selectedSymbols: SymbolDef[] = allSymbols.filter(s =>
    selectedKeys.includes(s.key)
  );

  const toggle = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key];
      if (next.length === 0) return prev; // require at least one
      localStorage.setItem(SELECTED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Validate a ticker against Binance, then add it if it exists
  const addCustomSymbol = useCallback(async (raw: string): Promise<string | null> => {
    const ticker = raw.trim().toUpperCase();
    const symbol = ticker.endsWith('USDT') ? ticker : `${ticker}USDT`;

    if (allSymbols.find(s => s.key === symbol)) {
      // Already in list — just select it
      setSelectedKeys(prev => {
        if (prev.includes(symbol)) return prev;
        const next = [...prev, symbol];
        localStorage.setItem(SELECTED_KEY, JSON.stringify(next));
        return next;
      });
      return null;
    }

    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
      );
      if (!res.ok) return `${symbol} not found on Binance`;
      const data = await res.json();
      if (!data.price) return `${symbol} not found on Binance`;

      const label = symbol.replace('USDT', '');
      const newSym: SymbolDef = { key: symbol, label, name: label, custom: true };

      setCustomSymbols(prev => {
        const next = [...prev, newSym];
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
        return next;
      });
      setSelectedKeys(prev => {
        const next = [...prev, symbol];
        localStorage.setItem(SELECTED_KEY, JSON.stringify(next));
        return next;
      });
      return null;
    } catch {
      return 'Failed to validate symbol';
    }
  }, [allSymbols]);

  const removeCustomSymbol = useCallback((key: string) => {
    setCustomSymbols(prev => {
      const next = prev.filter(s => s.key !== key);
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
      return next;
    });
    setSelectedKeys(prev => {
      const next = prev.filter(k => k !== key);
      localStorage.setItem(SELECTED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    allSymbols,
    selectedSymbols,
    selectedKeys,
    toggle,
    addCustomSymbol,
    removeCustomSymbol,
  };
}
