import asyncio
import json
import logging
from typing import Dict, Set
from datetime import datetime
import websockets
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

class WebSocketManager:
    """
    Multi-exchange WebSocket manager with auto-reconnect.
    Handles public trade streams from Binance, Bybit, and Kraken.
    Caches prices in Redis and publishes to pub/sub for frontend.
    """
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.connections: Dict[str, websockets.WebSocketClientProtocol] = {}
        self.subscriptions: Dict[str, Set[str]] = {
            "binance": set(),
            "bybit": set(),
            "kraken": set()
        }
        self.running = False
        self.tasks = []
        
        # Exchange WebSocket URLs (public trade streams)
        self.endpoints = {
            "binance": "wss://stream.binance.com:9443/ws",
            "bybit": "wss://stream.bybit.com/v5/public/spot",
            "kraken": "wss://ws.kraken.com"
        }
    
    async def connect(self):
        """Initialize all exchange connections."""
        self.running = True
        logger.info("🚀 Starting WebSocket connections...")
        
        self.tasks = [
            asyncio.create_task(self._binance_handler()),
            asyncio.create_task(self._bybit_handler()),
            asyncio.create_task(self._kraken_handler())
        ]
        
        logger.info("✅ All WebSocket feeds initialized")
    
    async def disconnect(self):
        """Gracefully shutdown all connections."""
        logger.info("🛑 Shutting down WebSocket connections...")
        self.running = False
        
        for task in self.tasks:
            task.cancel()
        
        for exchange, ws in self.connections.items():
            try:
                await ws.close()
                logger.info(f"Closed {exchange} connection")
            except Exception:
                pass
        
        logger.info("✅ All connections closed")
    
    async def subscribe(self, exchange: str, symbol: str):
        """Subscribe to a trading pair on an exchange."""
        if exchange not in self.subscriptions:
            logger.warning(f"Unknown exchange: {exchange}")
            return
        
        self.subscriptions[exchange].add(symbol.upper())
        logger.info(f"📡 Subscribed to {symbol} on {exchange}")
    
    async def _binance_handler(self):
        """Binance WebSocket handler with auto-reconnect."""
        while self.running:
            try:
                streams = [f"{s.lower()}@trade" for s in self.subscriptions["binance"]]
                if not streams:
                    streams = ["btcusdt@trade", "ethusdt@trade", "solusdt@trade"]  # Defaults
                
                url = f"{self.endpoints['binance']}/{'/'.join(streams)}"
                
                async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                    self.connections["binance"] = ws
                    logger.info("✅ Binance connected")
                    
                    while self.running:
                        message = await ws.recv()
                        await self._process_binance(json.loads(message))
                        
            except Exception as e:
                logger.error(f"Binance error: {e}")
                await asyncio.sleep(5)  # Reconnect delay
    
    async def _bybit_handler(self):
        """Bybit WebSocket handler with auto-reconnect."""
        while self.running:
            try:
                async with websockets.connect(self.endpoints["bybit"], ping_interval=20, ping_timeout=20) as ws:
                    self.connections["bybit"] = ws
                    
                    # Subscribe to symbols
                    subscribe_msg = {
                        "op": "subscribe",
                        "args": [f"publicTrade.{s.upper()}" for s in self.subscriptions["bybit"] or ["BTCUSDT", "ETHUSDT", "SOLUSDT"]]
                    }
                    await ws.send(json.dumps(subscribe_msg))
                    logger.info("✅ Bybit connected")
                    
                    while self.running:
                        message = await ws.recv()
                        await self._process_bybit(json.loads(message))
                        
            except Exception as e:
                logger.error(f"Bybit error: {e}")
                await asyncio.sleep(5)
    
    async def _kraken_handler(self):
        """Kraken WebSocket handler with auto-reconnect."""
        while self.running:
            try:
                async with websockets.connect(self.endpoints["kraken"], ping_interval=20, ping_timeout=20) as ws:
                    self.connections["kraken"] = ws
                    
                    subscribe_msg = {
                        "event": "subscribe",
                        "pair": list(self.subscriptions["kraken"]) or ["XBT/USD", "ETH/USD"],
                        "subscription": {"name": "trade"}
                    }
                    await ws.send(json.dumps(subscribe_msg))
                    logger.info("✅ Kraken connected")
                    
                    while self.running:
                        message = await ws.recv()
                        await self._process_kraken(json.loads(message))
                        
            except Exception as e:
                logger.error(f"Kraken error: {e}")
                await asyncio.sleep(5)
    
    async def _process_binance(self, data: dict):
        """Process Binance trade data and cache/publish to Redis."""
        if data.get("e") != "trade":
            return
        
        price_data = {
            "exchange": "binance",
            "symbol": data["s"],
            "price": float(data["p"]),
            "volume": float(data["q"]),
            "timestamp": data["T"]
        }
        
        key = f"price:binance:{data['s']}"
        await self.redis.setex(key, 60, json.dumps(price_data))
        await self.redis.publish("price_updates", json.dumps(price_data))
    
    async def _process_bybit(self, data: dict):
        """Process Bybit trade data."""
        if data.get("topic", "").startswith("publicTrade"):
            for trade in data.get("data", []):
                price_data = {
                    "exchange": "bybit",
                    "symbol": trade["s"],
                    "price": float(trade["p"]),
                    "volume": float(trade["v"]),
                    "timestamp": trade["T"]
                }
                key = f"price:bybit:{trade['s']}"
                await self.redis.setex(key, 60, json.dumps(price_data))
                await self.redis.publish("price_updates", json.dumps(price_data))
    
    async def _process_kraken(self, data: dict):
        """Process Kraken trade data."""
        if isinstance(data, list) and len(data) > 3 and data[2] == "trade":
            for trade in data[1]:
                price_data = {
                    "exchange": "kraken",
                    "symbol": data[3],
                    "price": float(trade[0]),
                    "volume": float(trade[1]),
                    "timestamp": int(float(trade[2]) * 1000)
                }
                key = f"price:kraken:{data[3]}"
                await self.redis.setex(key, 60, json.dumps(price_data))
                await self.redis.publish("price_updates", json.dumps(price_data))
