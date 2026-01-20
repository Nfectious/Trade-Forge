# backend/app/api/trading.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal, ROUND_DOWN
from .models import User, Portfolio, Trade
from .dependencies import get_current_user, get_db
# from .utils import get_current_price  # future real price fetch

router = APIRouter(prefix="/trading", tags=["trading"])

# Mock prices – replace with real Kraken/CoinGecko fetch later
MOCK_PRICES = {
    "BTC": Decimal("65000.00"),
    "ETH": Decimal("3200.00"),
    "SOL": Decimal("180.00"),
    # Add more symbols as needed
}

class PortfolioAsset(BaseModel):
    symbol: str
    quantity: float
    avg_price: float
    current_price: float
    current_value: float
    pnl_percent: float

class PortfolioResponse(BaseModel):
    assets: List[PortfolioAsset]
    total_value: float
    updated_at: datetime

class OrderCreate(BaseModel):
    symbol: str
    type: str  # "buy" or "sell"
    quantity: float
    price: float | None = None  # None = market order

class OrderResponse(BaseModel):
    success: bool
    message: str
    trade_id: int | None = None
    updated_portfolio: dict | None = None

@router.get("/portfolio", response_model=PortfolioResponse)
def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's portfolio with calculated current value and PNL."""
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()

    if not portfolios:
        return PortfolioResponse(assets=[], total_value=0.0, updated_at=datetime.utcnow())

    assets = []
    total_value = Decimal("0.0")

    for p in portfolios:
        current_price = MOCK_PRICES.get(p.asset_symbol.upper(), Decimal("0.00"))
        current_value = p.quantity * current_price
        cost_basis = p.quantity * p.avg_buy_price

        pnl_percent = Decimal("0.0")
        if cost_basis != 0:
            pnl_percent = ((current_value - cost_basis) / cost_basis) * Decimal("100")

        assets.append(PortfolioAsset(
            symbol=p.asset_symbol,
            quantity=float(p.quantity),
            avg_price=float(p.avg_buy_price),
            current_price=float(current_price),
            current_value=float(current_value),
            pnl_percent=float(pnl_percent.quantize(Decimal("0.01"), rounding=ROUND_DOWN))
        ))

        total_value += current_value

    return PortfolioResponse(
        assets=assets,
        total_value=float(total_value),
        updated_at=datetime.utcnow()
    )

@router.post("/order", response_model=OrderResponse)
def place_order(
    order: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Place a buy or sell order (market or limit)."""
    if order.type not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="Type must be 'buy' or 'sell'")

    if order.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    symbol = order.symbol.upper()
    if symbol not in MOCK_PRICES:
        raise HTTPException(status_code=400, detail=f"Unsupported symbol: {symbol}")

    current_price = MOCK_PRICES[symbol]

    # Use provided limit price or current market price
    executed_price = order.price if order.price is not None else float(current_price)

    # Get current portfolio entry or create new one
    portfolio_entry = db.query(Portfolio).filter(
        Portfolio.user_id == current_user.id,
        Portfolio.asset_symbol == symbol
    ).first()

    # Get current USD balance
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=500, detail="User not found")

    total_cost = Decimal(str(executed_price)) * Decimal(str(order.quantity))

    if order.type == "buy":
        if user.balance_usd < total_cost:
            raise HTTPException(status_code=400, detail="Insufficient USD balance")

        if portfolio_entry:
            # Update average price (weighted average)
            old_cost = portfolio_entry.quantity * portfolio_entry.avg_buy_price
            new_cost = old_cost + total_cost
            new_quantity = portfolio_entry.quantity + Decimal(str(order.quantity))
            portfolio_entry.avg_buy_price = new_cost / new_quantity
            portfolio_entry.quantity = new_quantity
        else:
            # New position
            portfolio_entry = Portfolio(
                user_id=current_user.id,
                asset_symbol=symbol,
                quantity=Decimal(str(order.quantity)),
                avg_buy_price=Decimal(str(executed_price))
            )
            db.add(portfolio_entry)

        user.balance_usd -= total_cost

    else:  # sell
        if not portfolio_entry or portfolio_entry.quantity < Decimal(str(order.quantity)):
            raise HTTPException(status_code=400, detail="Insufficient holdings")

        portfolio_entry.quantity -= Decimal(str(order.quantity))
        user.balance_usd += total_cost

        # If quantity reaches zero, optionally delete entry (or keep with 0)
        if portfolio_entry.quantity <= 0:
            db.delete(portfolio_entry)

    # Record the trade
    trade = Trade(
        user_id=current_user.id,
        symbol=symbol,
        type=order.type,
        quantity=Decimal(str(order.quantity)),
        price=Decimal(str(executed_price)),
        executed_at=datetime.utcnow()
    )
    db.add(trade)

    db.commit()
    db.refresh(trade)

    return OrderResponse(
        success=True,
        message=f"{order.type.capitalize()} order executed at ${executed_price:.2f}",
        trade_id=trade.id,
        updated_portfolio={"balance_usd": float(user.balance_usd)}
    )

@router.get("/trades/history", response_model=List[dict])
def get_trade_history(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent trades for the current user."""
    trades = (
        db.query(Trade)
        .filter(Trade.user_id == current_user.id)
        .order_by(desc(Trade.executed_at))
        .limit(limit)
        .all()
    )

    return [
        {
            "id": t.id,
            "symbol": t.symbol,
            "type": t.type.capitalize(),
            "quantity": float(t.quantity),
            "price": float(t.price),
            "total": float(t.quantity * t.price),
            "executed_at": t.executed_at.isoformat()
        }
        for t in trades
    ]
