from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.main import redis_client
import json

router = APIRouter()

@router.websocket("/ws/prices")
async def price_stream(websocket: WebSocket):
    """
    WebSocket endpoint for live price streaming.
    """
    await websocket.accept()

    pubsub = redis_client.pubsub()
    await pubsub.subscribe("price_updates")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"].decode())
    except WebSocketDisconnect:
        await pubsub.unsubscribe("price_updates")
        await pubsub.close()


@router.get("/prices/{symbol}")
async def get_latest_price(symbol: str):
    """Get cached price for a symbol across all exchanges."""
    prices = {}

    for exchange in ["binance", "bybit", "kraken"]:
        key = f"price:{exchange}:{symbol.upper()}"
        data = await redis_client.get(key)
        if data:
            prices[exchange] = json.loads(data.decode())

    return prices
