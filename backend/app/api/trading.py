"""
Trading API Endpoints
Operation Phoenix | Trading Forge
For Madison

REST API for trade execution and portfolio management.
"""

from typing import Dict, Any
from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from pydantic import BaseModel, Field, validator

from ..core.database import get_db
from ..core.redis import get_redis
from ..core.auth import get_current_user
from ..models.user import User
from ..services.trade_executor import (
    TradeExecutor,
    TradeExecutionError,
    InsufficientBalanceError,
    PriceUnavailableError,
    InvalidQuantityError
)
from ..services.portfolio_calculator import PortfolioCalculator

router = APIRouter(prefix="/api/trading", tags=["trading"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class ExecuteTradeRequest(BaseModel):
    """Trade execution request schema"""
    
    symbol: str = Field(..., description="Trading pair (e.g., BTCUSDT)")
    side: str = Field(..., description="Trade side: 'buy' or 'sell'")
    quantity: Decimal = Field(..., gt=0, description="Quantity to trade")
    order_type: str = Field(default="market", description="Order type (market only)")
    
    @validator('side')
    def validate_side(cls, v):
        if v not in ['buy', 'sell']:
            raise ValueError("Side must be 'buy' or 'sell'")
        return v.lower()
    
    @validator('order_type')
    def validate_order_type(cls, v):
        if v != 'market':
            raise ValueError("Only market orders are supported")
        return v.lower()
    
    @validator('symbol')
    def validate_symbol(cls, v):
        return v.upper().strip()


class TradeResponse(BaseModel):
    """Trade execution response schema"""
    
    trade_id: str
    symbol: str
    side: str
    quantity: float
    price: float
    total_value: float
    new_balance: float
    executed_at: str
    status: str


class PortfolioResponse(BaseModel):
    """Portfolio summary response schema"""
    
    user_id: str
    total_value: float
    cash_balance: float
    holdings_value: float
    total_invested: float
    starting_balance: float
    total_pnl: float
    pnl_percent: float
    holdings_count: int
    holdings: list
    updated_at: str


class HoldingDetail(BaseModel):
    """Individual holding details"""
    
    symbol: str
    quantity: float
    average_price: float
    current_price: float
    total_invested: float
    current_value: float
    unrealized_pnl: float
    pnl_percent: float
    allocation_percent: float


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/execute", response_model=TradeResponse, status_code=status.HTTP_201_CREATED)
async def execute_trade(
    trade_request: ExecuteTradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
) -> Dict[str, Any]:
    """
    Execute a market order (buy or sell).
    
    ## Request Body
    - **symbol**: Trading pair (e.g., BTCUSDT, ETHUSDT)
    - **side**: 'buy' or 'sell'
    - **quantity**: Amount to trade (must be > 0)
    - **order_type**: Order type (only 'market' supported)
    
    ## Response
    Returns trade details including execution price, total cost, and updated balance.
    
    ## Error Codes
    - **400**: Invalid request (bad quantity, unknown symbol)
    - **402**: Insufficient balance or holdings
    - **503**: Price data unavailable (WebSocket disconnected)
    - **500**: Internal execution error
    """
    
    try:
        executor = TradeExecutor(db, redis)
        
        trade_result = await executor.execute_trade(
            user_id=current_user.id,
            symbol=trade_request.symbol,
            side=trade_request.side,
            quantity=trade_request.quantity,
            order_type=trade_request.order_type
        )
        
        return trade_result
        
    except InvalidQuantityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    except InsufficientBalanceError as e:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=str(e)
        )
    
    except PriceUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    
    except TradeExecutionError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


@router.get("/portfolio", response_model=PortfolioResponse)
async def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
) -> Dict[str, Any]:
    """
    Get current portfolio value and holdings with real-time prices.
    
    ## Response
    Returns complete portfolio snapshot including:
    - Total value (cash + holdings)
    - Cash balance
    - Holdings breakdown with current prices
    - Overall P&L and percentage
    - Individual holding P&L
    
    ## Notes
    Prices are fetched from Redis (WebSocket cache) for real-time accuracy.
    """
    
    try:
        calculator = PortfolioCalculator(db, redis)
        
        portfolio_data = await calculator.get_current_value(current_user.id)
        
        return portfolio_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch portfolio: {str(e)}"
        )


@router.get("/holdings", response_model=list[HoldingDetail])
async def get_holdings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
) -> list:
    """
    Get detailed breakdown of all holdings.
    
    ## Response
    Returns array of holdings sorted by current value (descending).
    Each holding includes:
    - Symbol and quantity
    - Average buy price vs current price
    - Total invested vs current value
    - Unrealized P&L and percentage
    - Portfolio allocation percentage
    """
    
    try:
        calculator = PortfolioCalculator(db, redis)
        
        holdings = await calculator.get_holdings_breakdown(current_user.id)
        
        return holdings
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch holdings: {str(e)}"
        )


@router.get("/performance")
async def get_performance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
) -> Dict[str, Any]:
    """
    Get advanced performance metrics.
    
    ## Response
    Returns trading performance statistics including:
    - Total P&L and percentage
    - Win rate
    - Best and worst trades
    - Average trade P&L
    """
    
    try:
        calculator = PortfolioCalculator(db, redis)
        
        metrics = await calculator.get_performance_metrics(current_user.id)
        
        return metrics
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch performance: {str(e)}"
        )


@router.get("/balance")
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get current cash balance (quick endpoint).
    
    ## Response
    Returns only cash balance for fast queries.
    Use /portfolio for complete portfolio data.
    """
    
    try:
        from ..models.portfolio import Portfolio
        from sqlalchemy import select
        
        stmt = select(Portfolio).where(Portfolio.user_id == current_user.id)
        result = await db.execute(stmt)
        portfolio = result.scalar_one_or_none()
        
        if not portfolio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio not found"
            )
        
        return {
            "user_id": str(current_user.id),
            "cash_balance": float(portfolio.cash_balance),
            "starting_balance": float(portfolio.starting_balance or 1000000)
        }
        
    except HTTPException:
        raise
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch balance: {str(e)}"
        )


# Health check endpoint
@router.get("/health")
async def health_check(
    redis: Redis = Depends(get_redis)
) -> Dict[str, str]:
    """
    Check trading system health.
    
    Verifies:
    - Redis connection (price data availability)
    - Database connectivity (via dependency)
    """
    
    try:
        # Test Redis connection
        await redis.ping()
        
        return {
            "status": "healthy",
            "redis": "connected",
            "message": "Trading system operational"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"System unhealthy: {str(e)}"
        )
