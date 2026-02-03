"""
Trading models: TradingPair, Order, Trade
Maps to: trading_pairs, orders, trades tables in init.sql
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum


# ============================================================================
# ENUMS (match DB custom types)
# ============================================================================

class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP_LOSS = "stop_loss"
    TAKE_PROFIT = "take_profit"


class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


class OrderStatus(str, Enum):
    PENDING = "pending"
    FILLED = "filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


# Aliases used by trade_executor.py
TradeSide = OrderSide
TradeStatus = OrderStatus


# ============================================================================
# TRADING PAIR MODEL
# ============================================================================

class TradingPair(SQLModel, table=True):
    """Supported trading pairs (e.g., BTCUSDT)"""
    __tablename__ = "trading_pairs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    symbol: str = Field(unique=True, max_length=20)
    base_asset: str = Field(max_length=10)
    quote_asset: str = Field(max_length=10)
    name: str = Field(max_length=100)
    is_active: bool = Field(default=True)
    min_order_size: Optional[float] = None
    max_order_size: Optional[float] = None
    price_decimals: int = Field(default=2)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# ORDER MODEL
# ============================================================================

class Order(SQLModel, table=True):
    """Trade orders"""
    __tablename__ = "orders"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    trading_pair_id: UUID = Field(foreign_key="trading_pairs.id")

    order_type: str = Field(max_length=20)
    side: str = Field(max_length=10)
    status: str = Field(default="pending", max_length=20)

    quantity: float
    price: Optional[float] = None
    filled_quantity: float = Field(default=0)
    filled_avg_price: Optional[float] = None

    total_cost: Optional[int] = None  # BIGINT (cents)
    fee: int = Field(default=0)

    stop_price: Optional[float] = None
    take_profit_price: Optional[float] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    filled_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None


# ============================================================================
# TRADE MODEL (executed trades)
# ============================================================================

class Trade(SQLModel, table=True):
    """Executed trade records"""
    __tablename__ = "trades"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    order_id: UUID = Field(foreign_key="orders.id")
    user_id: UUID = Field(foreign_key="users.id")
    trading_pair_id: UUID = Field(foreign_key="trading_pairs.id")

    side: str = Field(max_length=10)
    quantity: float
    price: float
    total_value: int  # BIGINT (cents)
    fee: int = Field(default=0)

    pnl: Optional[int] = None  # BIGINT (cents)
    pnl_percent: Optional[float] = None

    executed_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# REQUEST/RESPONSE MODELS (Pydantic, not DB tables)
# ============================================================================

class OrderCreate(SQLModel):
    """Order placement request"""
    symbol: str = Field(max_length=20)
    side: str = Field(max_length=10)  # "buy" or "sell"
    quantity: float = Field(gt=0)
    price: Optional[float] = None  # None = market order


class OrderResponse(SQLModel):
    """Order placement response"""
    success: bool
    message: str
    trade_id: Optional[str] = None


class TradeHistoryItem(SQLModel):
    """Single trade in history response"""
    id: UUID
    symbol: str
    side: str
    quantity: float
    price: float
    total_value: float
    executed_at: datetime
