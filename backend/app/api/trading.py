from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from pydantic import BaseModel
from datetime import datetime
from .models import User, Portfolio, Trade  # adjust imports as needed
from .dependencies import get_current_user, get_db  # assume you have these

router = APIRouter(prefix="/trading", tags=["trading"])

# Mock prices for MVP (replace with real API later)
MOCK_PRICES = {
    "BTC": 65000.0,
    "ETH": 3200.0,
    "SOL": 180.0,
    # Add more symbols as needed
}

class PortfolioAsset(BaseModel):
    symbol: str
    quantity: float
    avg_price: float
    current_price: float
    current_value: float
    pnl: float  # percentage

class PortfolioResponse(BaseModel):
    assets: List[PortfolioAsset]
    total_value: float
    updated_at: datetime

@router.get("/portfolio", response_model=PortfolioResponse)
def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()
    
    if not portfolios:
        return PortfolioResponse(assets=[], total_value=0.0, updated_at=datetime.utcnow())

    assets = []
    total_value = 0.0

    for p in portfolios:
        current_price = MOCK_PRICES.get(p.asset_symbol, 0.0)  # fallback 0 if unknown
        current_value = p.quantity * current_price
        cost_basis = p.quantity * p.avg_buy_price
        
        pnl = 0.0
        if cost_basis > 0:
            pnl = ((current_value - cost_basis) / cost_basis) * 100

        assets.append(PortfolioAsset(
            symbol=p.asset_symbol,
            quantity=p.quantity,
            avg_price=p.avg_buy_price,
            current_price=current_price,
            current_value=current_value,
            pnl=pnl
        ))

        total_value += current_value

    return PortfolioResponse(
        assets=assets,
        total_value=total_value,
        updated_at=datetime.utcnow()
    )
