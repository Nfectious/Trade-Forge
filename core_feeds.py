# core_feeds.py - drop this in and you're 100% connected
import asyncio
import json
import websockets
from collections import defaultdict
import time

class ForgeFeeds:
    def __init__(self):
        self.price = defaultdict(float)          # symbol -> latest price
        self.callbacks = []                      # push updates to sim engine
        self.binance_ws = None
        self.bybit_ws = None

    async def binance_handler(self):
        uri = "wss://stream.binance.com:9443/stream?streams="
        streams = [
            "btcusdt@miniTicker", "ethusdt@miniTicker", "solusdt@miniTicker",
            "xrpusdt@miniTicker", "adausdt@miniTicker", "dogeusdt@miniTicker",
            # add the rest of your top 30 here, or do all with !miniTicker@arr
            "!miniTicker@arr"  # this one line gets EVERY pair on Binance (yes, really)
        ]
        uri += "/".join(streams)

        while True:
            try:
                async with websockets.connect(uri, ping_interval=20, ping_timeout=60) as ws:
                    self.binance_ws = ws
                    print("🔥 Binance feed LIVE")
                    async for message in ws:
                        data = json.loads(message)
                        if "stream" in data and data["stream"].endswith("@miniTicker"):
                            tick = data["data"]
                            symbol = tick["s"]
                            price = float(tick["c"])
                            self.price[symbol] = price
                            for cb in self.callbacks:
                                await cb(symbol, price, "binance")
            except Exception as e:
                print(f"Binance dropped: {e} — reconnecting in 3s...")
                await asyncio.sleep(3)

    async def bybit_handler(self):
        uri = "wss://stream.bybit.com/v5/public/linear"
        subscribe_msg = {
            "op": "subscribe",
            "args": ["publicTrade.BTCUSDT", "publicTrade.ETHUSDT", "publicTrade.SOLUSDT"]
            # add whatever futures you want here
        }

        while True:
            try:
                async with websockets.connect(uri, ping_interval=15) as ws:
                    self.bybit_ws = ws
                    await ws.send(json.dumps(subscribe_msg))
                    print("🔥 Bybit futures feed LIVE")
                    async for message in ws:
                        data = json.loads(message)
                        if data.get("topic", "").startswith("publicTrade"):
                            trade = data["data"][0]
                            symbol = trade["symbol"]
                            price = float(trade["price"])
                            self.price[symbol] = price
                            for cb in self.callbacks:
                                await cb(symbol, price, "bybit")
            except Exception as e:
                print(f"Bybit dropped: {e} — reconnecting in 3s...")
                await asyncio.sleep(3)

    async def start(self, callback):
        self.callbacks.append(callback)
        await asyncio.gather(
            self.binance_handler(),
            self.bybit_handler()
        )

# How you fire it from main.py
async def price_update(symbol, price, source):
    print(f"{symbol}: ${price} ({source})")
    # plug this straight into your sim engine / leaderboard refresh

feeds = ForgeFeeds()
asyncio.run(feeds.start(price_update))