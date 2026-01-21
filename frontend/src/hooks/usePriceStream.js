import { useEffect, useState, useRef } from 'react';

export const usePriceStream = () => {
  const [prices, setPrices] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/market/ws/prices';
    
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const priceData = JSON.parse(event.data);
        setPrices(prev => ({
          ...prev,
          [`${priceData.exchange}:${priceData.symbol}`]: {
            price: priceData.price,
            volume: priceData.volume,
            timestamp: priceData.timestamp,
            exchange: priceData.exchange,
            symbol: priceData.symbol
          }
        }));
      } catch (err) {
        console.error('Failed to parse price data:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        console.log('🔄 Attempting reconnect...');
      }, 5000);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const getPrice = (exchange, symbol) => {
    return prices[`${exchange}:${symbol}`]?.price || null;
  };

  return { prices, isConnected, getPrice };
};
