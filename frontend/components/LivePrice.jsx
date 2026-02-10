'use client';

import { usePriceStream } from '../hooks/usePriceStream';

const LivePrice = ({ symbol = 'BTCUSDT', exchanges = ['binance', 'bybit', 'kraken'] }) => {
  const { prices, isConnected } = usePriceStream();

  const formatPrice = (price) => {
    if (!price) return '---';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatVolume = (volume) => {
    if (!volume) return '---';
    return volume.toFixed(4);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{symbol}</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Price Grid */}
      <div className="space-y-3">
        {exchanges.map(exchange => {
          const priceData = prices[`${exchange}:${symbol}`];
          
          return (
            <div key={exchange} className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-300 capitalize">
                  {exchange}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-400">
                  {formatPrice(priceData?.price)}
                </div>
                <div className="text-xs text-gray-500">
                  Vol: {formatVolume(priceData?.volume)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Last Update */}
      {Object.keys(prices).length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-500 text-center">
          Last update: {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default LivePrice;
