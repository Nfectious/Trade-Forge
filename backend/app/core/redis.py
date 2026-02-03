"""
Shared Redis client accessor.

Breaks the circular import: market.py was importing redis_client from main.py,
but main.py imports market.py. Now everyone imports from here instead.
"""

import redis.asyncio as aioredis
from typing import Optional
import logging

logger = logging.getLogger(__name__)

_redis_client: Optional[aioredis.Redis] = None


async def init_redis(url: str) -> aioredis.Redis:
    """Initialize the shared Redis connection. Called once during app lifespan startup."""
    global _redis_client
    _redis_client = aioredis.from_url(url, encoding="utf-8", decode_responses=False)
    return _redis_client


def get_redis_client() -> Optional[aioredis.Redis]:
    """Get the shared Redis client. Returns None if not initialized."""
    return _redis_client


async def close_redis() -> None:
    """Close the shared Redis connection. Called during app lifespan shutdown."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
