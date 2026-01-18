import { LivePrice } from '../components/LivePrice';
import { PriceTicker } from '../components/PriceTicker';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-900">
      
      {/* Price Ticker at top */}
      <PriceTicker />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          
          <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Portfolio Overview */}
            <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Portfolio</h2>
              {/* Your existing portfolio content */}
            </div>

            {/* Live Market Prices */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Live Prices</h2>
              <LivePrice symbol="BTCUSDT" exchanges={['binance', 'bybit']} />
              <LivePrice symbol="ETHUSDT" exchanges={['binance']} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📁 **Complete File Structure After Updates**
```
frontend/
├── src/
│   ├── hooks/
│   │   └── usePriceStream.js        ← NEW
│   ├── components/
│   │   ├── LivePrice.jsx            ← NEW
│   │   └── PriceTicker.jsx          ← NEW
│   ├── pages/
│   │   ├── Dashboard.jsx            ← UPDATED
│   │   └── Trading.jsx              ← UPDATED
│   ├── styles/
│   │   └── index.css                ← UPDATED (add animation)
│   └── ...
├── .env                              ← UPDATED
└── ...