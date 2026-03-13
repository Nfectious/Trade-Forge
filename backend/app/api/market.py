"""
Market data API routes
Live price streaming via WebSocket and cached price lookups via Redis.
Includes OHLC klines endpoint proxying Binance and Kraken REST APIs.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from app.core.redis import get_redis_client
import httpx
import json

router = APIRouter()

# Kraken uses different pair naming conventions
KRAKEN_SYMBOL_MAP = {
    "BTCUSDT":  "XBT/USD",
    "ETHUSDT":  "ETH/USD",
    "SOLUSDT":  "SOL/USD",
    "XRPUSDT":  "XRP/USD",
    "ADAUSDT":  "ADA/USD",
    "AVAXUSDT": "AVAX/USD",
    "DOTUSDT":  "DOT/USD",
    "LINKUSDT": "LINK/USD",
    "DOGEUSDT": "DOGE/USD",
}

# Kraken interval values are in minutes
KRAKEN_INTERVAL_MAP = {
    "1m":  1,
    "5m":  5,
    "15m": 15,
    "1h":  60,
    "4h":  240,
    "1d":  1440,
}

BINANCE_VALID_INTERVALS = {
    "1m", "3m", "5m", "15m", "30m",
    "1h", "2h", "4h", "6h", "8h", "12h",
    "1d", "3d", "1w", "1M",
}


@router.websocket("/ws/prices")
async def price_stream(websocket: WebSocket):
    """
    WebSocket endpoint for live price streaming to frontend.
    Usage: ws://localhost:8000/market/ws/prices
    """
    redis = get_redis_client()
    if not redis:
        await websocket.close(code=1011, reason="Price feed unavailable")
        return

    await websocket.accept()

    pubsub = redis.pubsub()
    await pubsub.subscribe("price_updates")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode("utf-8")
                await websocket.send_text(data)
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe("price_updates")
        await pubsub.close()


@router.get("/prices/{symbol}")
async def get_latest_price(symbol: str):
    """Get latest cached prices for a symbol from all exchanges."""
    redis = get_redis_client()
    if not redis:
        raise HTTPException(status_code=503, detail="Price service unavailable")

    prices = {}

    for exchange in ["binance", "bybit", "kraken"]:
        key = f"price:{exchange}:{symbol.upper()}"
        data = await redis.get(key)
        if data:
            prices[exchange] = json.loads(data)

    return prices


@router.get("/klines/{symbol}")
async def get_klines(
    symbol: str,
    interval: str = Query("1m", description="Candlestick interval"),
    limit: int = Query(200, ge=1, le=1000, description="Number of candles"),
    exchange: str = Query("binance", description="Exchange: binance or kraken"),
):
    """
    Fetch OHLC candlestick data from Binance or Kraken.
    Returns a list of {time, open, high, low, close, volume} objects.
    time is a Unix timestamp in seconds.
    """
    symbol = symbol.upper()

    async with httpx.AsyncClient(timeout=15.0) as client:
        if exchange == "kraken":
            kraken_pair = KRAKEN_SYMBOL_MAP.get(symbol)
            if not kraken_pair:
                raise HTTPException(
                    status_code=400,
                    detail=f"{symbol} is not available on Kraken. Try Binance instead.",
                )

            kraken_interval = KRAKEN_INTERVAL_MAP.get(interval, 1)

            try:
                resp = await client.get(
                    "https://api.kraken.com/0/public/OHLC",
                    params={"pair": kraken_pair, "interval": kraken_interval},
                )
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise HTTPException(status_code=502, detail=f"Kraken API error: {e}")

            data = resp.json()
            if data.get("error"):
                raise HTTPException(status_code=400, detail=f"Kraken: {data['error']}")

            # Kraken returns result keyed by their internal pair name (e.g. "XXBTZUSD")
            pair_data = next(
                (v for k, v in data["result"].items() if k != "last"),
                None,
            )
            if not pair_data:
                raise HTTPException(status_code=404, detail="No OHLC data from Kraken")

            # Kraken row: [time, open, high, low, close, vwap, volume, count]
            candles = [
                {
                    "time":   int(c[0]),
                    "open":   float(c[1]),
                    "high":   float(c[2]),
                    "low":    float(c[3]),
                    "close":  float(c[4]),
                    "volume": float(c[6]),
                }
                for c in pair_data[-limit:]
            ]
            return candles

        else:  # binance (default)
            if interval not in BINANCE_VALID_INTERVALS:
                interval = "1m"

            try:
                resp = await client.get(
                    "https://api.binance.com/api/v3/klines",
                    params={"symbol": symbol, "interval": interval, "limit": limit},
                )
                resp.raise_for_status()
            except httpx.HTTPError as e:
                raise HTTPException(status_code=502, detail=f"Binance API error: {e}")

            data = resp.json()

            # Binance row: [open_time, open, high, low, close, volume, close_time, ...]
            candles = [
                {
                    "time":   int(c[0]) // 1000,  # ms → seconds
                    "open":   float(c[1]),
                    "high":   float(c[2]),
                    "low":    float(c[3]),
                    "close":  float(c[4]),
                    "volume": float(c[5]),
                }
                for c in data
            ]
            return candles
