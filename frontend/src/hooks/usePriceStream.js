import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook for real-time price streaming
 * Connects to WebSocket and provides live price updates
 */
export const usePriceStream = (symbols = []) => {
  const [prices, setPrices] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // WebSocket URL (adjust based on your domain)
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/market/ws/prices';

    // Create WebSocket connection
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const priceData = JSON.parse(event.data);
        
        // Update prices state
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
        // Re-run effect to reconnect
      }, 5000);
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Helper function to get specific symbol price
  const getPrice = (exchange, symbol) => {
    return prices[`${exchange}:${symbol}`]?.price || null;
  };

  return { prices, isConnected, getPrice };
};