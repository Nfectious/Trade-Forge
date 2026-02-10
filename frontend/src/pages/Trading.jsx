import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Head from 'next/head';

const Trading = () => {
  const router = useRouter();
  const [user, setUser] = useState({});
  const [assets, setAssets] = useState([]);
  const [prices, setPrices] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(response => setUser(response.data))
      .catch(() => router.push('/login'));

      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/portfolio`)
      .then(response => setAssets(response.data.assets))
      .catch(error => console.error('Error fetching portfolio:', error));

      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/market/prices?symbols=BTC,ETH,SOL`)
      .then(response => setPrices(response.data))
      .catch(error => console.error('Error fetching market prices:', error));
    }
  }, []);

  const handleOrder = (symbol, type, quantity, price) => {
    axios.post(`${process.env.NEXT_PUBLIC_API_URL}/trading/order`, { symbol, type, quantity, price })
      .then(response => console.log('Order:', response.data))
      .catch(error => console.error('Error placing order:', error));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <Head>
        <title>Crypto Trading Simulator</title>
        <meta name="description" content="A professional crypto paper trading simulator" />
      </Head>

      <main className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-4">Welcome, {user.username}!</h1>
        <div className="mb-4">
          <p>Your balance: ${user.balance_usd}</p>
        </div>

        <section>
          <h2 className="text-xl font-bold mb-2">Portfolio</h2>
          {assets.map(asset => (
            <div key={asset.symbol} className="mb-4 p-2 bg-gray-800 rounded flex justify-between items-center">
              <span>{asset.symbol}: {asset.quantity}</span>
              <span>${asset.current_value}</span>
              <button onClick={() => handleOrder(asset.symbol, 'sell', asset.quantity)} className="ml-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded">Sell All</button>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-xl font-bold mb-2">Market Prices</h2>
          {Object.entries(prices).map(([symbol, priceData]) => (
            <div key={symbol} className="mb-4 p-2 bg-gray-800 rounded flex justify-between items-center">
              <span>{symbol}: ${priceData.price}</span>
              <span>{priceData.change_24h}%</span>
              <button onClick={() => handleOrder(symbol, 'buy', 1)} className="ml-2 bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded">Buy 1 {symbol}</button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Trading;
