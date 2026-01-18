import asyncio
import json
import logging
from typing import Dict, Set, Callable
from datetime import datetime
import websockets
from aioredis import Redis

logger = logging.getLogger(__name__)

class WebSocketManager:
    """
    Multi-exchange WebSocket manager with auto-reconnect.
    Handles Binance, Bybit, Kraken price feeds.
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
        
        # Exchange WebSocket URLs
        self.endpoints = {
            "binance": "wss://stream.binance.com:9443/ws",
            "bybit": "wss://stream.bybit.com/v5/public/spot",
            "kraken": "wss://ws.kraken.com"
        }
    
    async def connect(self):
        """Initialize all exchange connections."""
        self.running = True
        logger.info("🚀 Starting WebSocket connections...")
        
        # Start connection tasks for each exchange
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
            except:
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
                # Subscribe to all tracked symbols
                streams = [f"{s.lower()}@trade" for s in self.subscriptions["binance"]]
                if not streams:
                    streams = ["btcusdt@trade", "ethusdt@trade"]  # Default symbols
                
                url = f"{self.endpoints['binance']}/{'/'.join(streams)}"
                
                async with websockets.connect(url) as ws:
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
                async with websockets.connect(self.endpoints["bybit"]) as ws:
                    self.connections["bybit"] = ws
                    
                    # Subscribe to symbols
                    subscribe_msg = {
                        "op": "subscribe",
                        "args": [f"publicTrade.{s}" for s in self.subscriptions["bybit"]] or ["publicTrade.BTCUSDT"]
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
                async with websockets.connect(self.endpoints["kraken"]) as ws:
                    self.connections["kraken"] = ws
                    
                    # Subscribe to ticker
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
        """Process Binance trade data and cache to Redis."""
        if "e" not in data or data["e"] != "trade":
            return
        
        price_data = {
            "exchange": "binance",
            "symbol": data["s"],
            "price": float(data["p"]),
            "volume": float(data["q"]),
            "timestamp": data["T"]
        }
        
        # Cache to Redis with 60s TTL
        await self.redis.setex(
            f"price:binance:{data['s']}",
            60,
            json.dumps(price_data)
        )
        
        # Publish to pub/sub for live subscribers
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
                
                await self.redis.setex(
                    f"price:bybit:{trade['s']}",
                    60,
                    json.dumps(price_data)
                )
                await self.redis.publish("price_updates", json.dumps(price_data))
    
    async def _process_kraken(self, data: dict):
        """Process Kraken trade data."""
        if isinstance(data, list) and len(data) > 3:
            if data[2] == "trade":
                for trade in data[1]:
                    price_data = {
                        "exchange": "kraken",
                        "symbol": data[3],
                        "price": float(trade[0]),
                        "volume": float(trade[1]),
                        "timestamp": int(float(trade[2]) * 1000)
                    }
                    
                    await self.redis.setex(
                        f"price:kraken:{data[3]}",
                        60,
                        json.dumps(price_data)
                    )
                    await self.redis.publish("price_updates", json.dumps(price_data))