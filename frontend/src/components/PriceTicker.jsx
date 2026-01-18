import { usePriceStream } from '../hooks/usePriceStream';

/**
 * Scrolling price ticker for navbar/header
 */
export const PriceTicker = () => {
  const { prices } = usePriceStream();

  const tickerSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

  return (
    <div className="bg-gray-800 border-b border-gray-700 py-2 overflow-hidden">
      <div className="flex gap-8 animate-scroll">
        {tickerSymbols.map(symbol => {
          const price = prices[`binance:${symbol}`];
          return (
            <div key={symbol} className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-300">{symbol.replace('USDT', '')}</span>
              <span className="text-green-400 font-bold">
                ${price?.price?.toFixed(2) || '---'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};