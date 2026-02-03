"""
Trading API routes
Portfolio viewing, order placement, and trade history.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from datetime import datetime, UTC
from decimal import Decimal
import json
import logging

from app.core.database import get_session
from app.core.dependencies import get_current_user
from app.core.redis import get_redis_client
from app.core.security import limiter
from app.models.user import User
from app.models.portfolio import Portfolio, PortfolioHolding
from app.models.trade import (
    TradingPair, Order, Trade,
    OrderCreate, OrderResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Fallback prices when Redis is unavailable
FALLBACK_PRICES = {
    "BTCUSDT": Decimal("65000.00"),
    "ETHUSDT": Decimal("3200.00"),
    "SOLUSDT": Decimal("180.00"),
}


async def get_price(symbol: str) -> Decimal | None:
    """Get price from Redis cache, fall back to static prices."""
    redis = get_redis_client()
    if redis:
        for exchange in ("binance", "bybit", "kraken"):
            key = f"price:{exchange}:{symbol}"
            try:
                data = await redis.get(key)
                if data:
                    parsed = json.loads(data)
                    price = parsed.get("price") or parsed.get("p")
                    if price:
                        return Decimal(str(price))
            except Exception as e:
                logger.debug(f"Redis price lookup failed for {key}: {e}")

    return FALLBACK_PRICES.get(symbol)


# ============================================================================
# PORTFOLIO
# ============================================================================

@router.get("/portfolio")
@limiter.limit("60/minute")
async def get_portfolio(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get user's portfolio with current holdings and P&L."""
    # Get portfolio (cash balance)
    result = await session.execute(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    )
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        return {
            "cash_balance": 0,
            "assets": [],
            "total_value": 0,
            "updated_at": datetime.now(UTC).isoformat(),
        }

    # Get holdings joined with trading pair for symbol
    result = await session.execute(
        select(PortfolioHolding, TradingPair.symbol)
        .join(TradingPair, PortfolioHolding.trading_pair_id == TradingPair.id)
        .where(PortfolioHolding.user_id == current_user.id)
    )
    rows = result.all()

    assets = []
    holdings_value = Decimal("0")

    for holding, symbol in rows:
        current_price = await get_price(symbol.upper()) or Decimal("0")
        current_value = Decimal(str(holding.quantity)) * current_price
        cost_basis = Decimal(str(holding.quantity)) * Decimal(str(holding.avg_entry_price))

        pnl_percent = Decimal("0")
        if cost_basis != 0:
            pnl_percent = ((current_value - cost_basis) / cost_basis) * Decimal("100")

        assets.append({
            "symbol": symbol,
            "quantity": holding.quantity,
            "avg_price": holding.avg_entry_price,
            "current_price": float(current_price),
            "current_value": float(current_value),
            "pnl_percent": float(pnl_percent),
        })

        holdings_value += current_value

    # cash_balance is stored in cents (BIGINT)
    cash_usd = Decimal(str(portfolio.cash_balance)) / Decimal("100")
    total_value = cash_usd + holdings_value

    return {
        "cash_balance": float(cash_usd),
        "assets": assets,
        "total_value": float(total_value),
        "updated_at": portfolio.updated_at.isoformat() if portfolio.updated_at else None,
    }


# ============================================================================
# ORDER PLACEMENT
# ============================================================================

@router.post("/order", response_model=OrderResponse)
@limiter.limit("30/minute")
async def place_order(
    request: Request,
    order: OrderCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Place a buy or sell market order."""
    if order.side not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="Side must be 'buy' or 'sell'")

    symbol = order.symbol.upper()

    # Get price from Redis cache or fallback
    live_price = await get_price(symbol)
    if live_price is None:
        raise HTTPException(status_code=400, detail=f"No price available for: {symbol}")

    executed_price = live_price
    if order.price is not None:
        executed_price = Decimal(str(order.price))

    quantity = Decimal(str(order.quantity))
    total_cost = executed_price * quantity

    # Look up or create trading pair
    result = await session.execute(
        select(TradingPair).where(TradingPair.symbol == symbol)
    )
    trading_pair = result.scalar_one_or_none()

    if not trading_pair:
        base = symbol.replace("USDT", "").replace("USD", "")
        trading_pair = TradingPair(
            symbol=symbol,
            base_asset=base,
            quote_asset="USDT",
            name=f"{base}/USDT",
        )
        session.add(trading_pair)
        await session.flush()

    # Get portfolio WITH ROW LOCK to prevent race condition (TOCTOU).
    # Two concurrent buys both reading the same balance would both pass
    # the check and overdraw. FOR UPDATE blocks the second until the first commits.
    result = await session.execute(
        select(Portfolio)
        .where(Portfolio.user_id == current_user.id)
        .with_for_update()
    )
    portfolio = result.scalar_one_or_none()

    if not portfolio:
        raise HTTPException(status_code=400, detail="Portfolio not found")

    # cash_balance is in cents
    total_cost_cents = int(total_cost * 100)

    # Get existing holding WITH ROW LOCK
    result = await session.execute(
        select(PortfolioHolding)
        .where(
            PortfolioHolding.user_id == current_user.id,
            PortfolioHolding.trading_pair_id == trading_pair.id,
        )
        .with_for_update()
    )
    holding = result.scalar_one_or_none()

    if order.side == "buy":
        if portfolio.cash_balance < total_cost_cents:
            raise HTTPException(status_code=400, detail="Insufficient USD balance")

        if holding:
            old_cost = Decimal(str(holding.quantity)) * Decimal(str(holding.avg_entry_price))
            new_qty = Decimal(str(holding.quantity)) + quantity
            new_avg = (old_cost + total_cost) / new_qty
            holding.quantity = float(new_qty)
            holding.avg_entry_price = float(new_avg)
        else:
            holding = PortfolioHolding(
                user_id=current_user.id,
                trading_pair_id=trading_pair.id,
                quantity=float(quantity),
                avg_entry_price=float(executed_price),
            )
            session.add(holding)

        portfolio.cash_balance -= total_cost_cents

    else:  # sell
        if not holding or holding.quantity < float(quantity):
            raise HTTPException(status_code=400, detail="Insufficient holdings")

        remaining = Decimal(str(holding.quantity)) - quantity
        if remaining <= Decimal("0.00000001"):
            await session.delete(holding)
        else:
            holding.quantity = float(remaining)

        portfolio.cash_balance += total_cost_cents

    # Create Order record
    order_record = Order(
        user_id=current_user.id,
        trading_pair_id=trading_pair.id,
        order_type="market",
        side=order.side,
        status="filled",
        quantity=float(quantity),
        price=float(executed_price),
        filled_quantity=float(quantity),
        filled_avg_price=float(executed_price),
        total_cost=total_cost_cents,
        filled_at=datetime.now(UTC),
    )
    session.add(order_record)
    await session.flush()

    # Create Trade record
    trade = Trade(
        order_id=order_record.id,
        user_id=current_user.id,
        trading_pair_id=trading_pair.id,
        side=order.side,
        quantity=float(quantity),
        price=float(executed_price),
        total_value=total_cost_cents,
        executed_at=datetime.now(UTC),
    )
    session.add(trade)

    portfolio.total_trades = (portfolio.total_trades or 0) + 1

    await session.commit()

    return OrderResponse(
        success=True,
        message=f"{order.side.capitalize()} {quantity} {symbol} at ${float(executed_price):,.2f}",
        trade_id=str(trade.id),
    )


# ============================================================================
# TRADE HISTORY
# ============================================================================

@router.get("/trades/history")
@limiter.limit("60/minute")
async def get_trade_history(
    request: Request,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get recent trades for the current user."""
    if limit > 100:
        limit = 100

    result = await session.execute(
        select(Trade, TradingPair.symbol)
        .join(TradingPair, Trade.trading_pair_id == TradingPair.id)
        .where(Trade.user_id == current_user.id)
        .order_by(Trade.executed_at.desc())
        .limit(limit)
    )
    rows = result.all()

    return [
        {
            "id": str(t.id),
            "symbol": symbol,
            "side": t.side,
            "quantity": t.quantity,
            "price": t.price,
            "total_value": t.total_value / 100,  # cents to dollars
            "executed_at": t.executed_at.isoformat(),
        }
        for t, symbol in rows
    ]
