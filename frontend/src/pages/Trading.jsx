import { LivePrice } from '../components/LivePrice';
import { usePriceStream } from '../hooks/usePriceStream';

export default function Trading() {
  const { prices, isConnected, getPrice } = usePriceStream();

  // Get specific prices for display
  const btcPrice = getPrice('binance', 'BTCUSDT');
  const ethPrice = getPrice('binance', 'ETHUSDT');
  const solPrice = getPrice('binance', 'SOLUSDT');

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header with connection status */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Trading Simulator</h1>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected 
                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                : 'bg-red-500/20 text-red-400 border border-red-500/50'
            }`}>
              {isConnected ? '🟢 Live Data' : '🔴 Disconnected'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Live Price Cards */}
          <div className="lg:col-span-1 space-y-4">
            <LivePrice symbol="BTCUSDT" exchanges={['binance', 'bybit', 'kraken']} />
            <LivePrice symbol="ETHUSDT" exchanges={['binance', 'bybit']} />
            <LivePrice symbol="SOLUSDT" exchanges={['binance']} />
          </div>

          {/* Trading Chart Area */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Price Chart</h2>
            
            {/* Quick price display */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-sm text-gray-400">BTC/USDT</div>
                <div className="text-2xl font-bold text-white">
                  ${btcPrice?.toLocaleString() || '---'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">ETH/USDT</div>
                <div className="text-2xl font-bold text-white">
                  ${ethPrice?.toLocaleString() || '---'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-400">SOL/USDT</div>
                <div className="text-2xl font-bold text-white">
                  ${solPrice?.toLocaleString() || '---'}
                </div>
              </div>
            </div>

            {/* Placeholder for TradingView chart */}
            <div className="bg-gray-900 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <div>TradingView Chart Widget</div>
                <div className="text-sm mt-2">Integration coming soon</div>
              </div>
            </div>
          </div>

        </div>

        {/* Trading Controls */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Execute Trade</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Symbol</label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                <option>BTC/USDT</option>
                <option>ETH/USDT</option>
                <option>SOL/USDT</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Type</label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white">
                <option>Market</option>
                <option>Limit</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount</label>
              <input 
                type="number" 
                placeholder="0.00"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            
            <div className="flex items-end gap-2">
              <button className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium">
                Buy
              </button>
              <button className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium">
                Sell
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}