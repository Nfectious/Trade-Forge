"""
Market data API routes
Live price streaming via WebSocket and cached price lookups via Redis.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.core.redis import get_redis_client
import json

router = APIRouter()


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
                await websocket.send_text(message["data"])
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
