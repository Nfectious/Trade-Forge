"""
Portfolio Calculator Service
Operation Phoenix | Trading Forge
For Madison

Calculates real-time portfolio value, P&L, and holdings breakdown
using current market prices from Redis.
"""

from decimal import Decimal, ROUND_DOWN
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.models.portfolio import Portfolio, PortfolioHolding
from app.core.database import get_session
from app.core.redis import get_redis_client

logger = logging.getLogger(__name__)


class PortfolioCalculator:
    """
    Real-time portfolio valuation engine.
    
    CRITICAL OPERATIONS:
    1. Fetch all user holdings from database
    2. Get current prices from Redis (WebSocket cache)
    3. Calculate real-time value and P&L
    4. Return comprehensive portfolio snapshot
    """
    
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis
    
    async def get_current_value(self, user_id: UUID) -> Dict[str, Any]:
        """
        Calculate current portfolio value with real-time prices.
        
        Args:
            user_id: UUID of the user
            
        Returns:
            Complete portfolio snapshot with total value, cash, P&L
        """
        
        # Get portfolio
        portfolio = await self._get_portfolio(user_id)
        
        if not portfolio:
            return self._empty_portfolio_response()
        
        # Get all holdings
        holdings = await self._get_holdings(portfolio.id)
        
        # Calculate total invested value
        total_invested = sum(h.total_invested for h in holdings)
        
        # Calculate current value of holdings
        holdings_value = Decimal('0')
        holdings_breakdown = []
        
        for holding in holdings:
            if holding.quantity > 0:
                current_price = await self._get_current_price(holding.symbol)
                
                if current_price:
                    current_value = holding.quantity * current_price
                    unrealized_pnl = current_value - holding.total_invested
                    pnl_percent = (
                        (unrealized_pnl / holding.total_invested * 100)
                        if holding.total_invested > 0 else Decimal('0')
                    )
                    
                    holdings_value += current_value
                    
                    holdings_breakdown.append({
                        "symbol": holding.symbol,
                        "quantity": float(holding.quantity),
                        "average_price": float(holding.average_price),
                        "current_price": float(current_price),
                        "total_invested": float(holding.total_invested),
                        "current_value": float(current_value),
                        "unrealized_pnl": float(unrealized_pnl),
                        "pnl_percent": float(pnl_percent.quantize(Decimal('0.01')))
                    })
        
        # Calculate total portfolio value
        total_value = portfolio.cash_balance + holdings_value
        
        # Calculate overall P&L
        starting_balance = portfolio.starting_balance or Decimal('1000000')
        total_pnl = total_value - starting_balance
        pnl_percent = (
            (total_pnl / starting_balance * 100)
            if starting_balance > 0 else Decimal('0')
        )
        
        return {
            "user_id": str(user_id),
            "total_value": float(total_value),
            "cash_balance": float(portfolio.cash_balance),
            "holdings_value": float(holdings_value),
            "total_invested": float(total_invested),
            "starting_balance": float(starting_balance),
            "total_pnl": float(total_pnl),
            "pnl_percent": float(pnl_percent.quantize(Decimal('0.01'))),
            "holdings_count": len(holdings_breakdown),
            "holdings": holdings_breakdown,
            "updated_at": datetime.utcnow().isoformat()
        }
    
    async def get_holdings_breakdown(self, user_id: UUID) -> List[Dict[str, Any]]:
        """
        Get detailed breakdown of all holdings with current prices.
        
        Args:
            user_id: UUID of the user
            
        Returns:
            List of holdings with real-time valuation
        """
        
        portfolio = await self._get_portfolio(user_id)
        
        if not portfolio:
            return []
        
        holdings = await self._get_holdings(portfolio.id)
        breakdown = []
        
        for holding in holdings:
            if holding.quantity > 0:
                current_price = await self._get_current_price(holding.symbol)
                
                if current_price:
                    current_value = holding.quantity * current_price
                    unrealized_pnl = current_value - holding.total_invested
                    pnl_percent = (
                        (unrealized_pnl / holding.total_invested * 100)
                        if holding.total_invested > 0 else Decimal('0')
                    )
                    
                    breakdown.append({
                        "symbol": holding.symbol,
                        "quantity": float(holding.quantity),
                        "average_price": float(holding.average_price),
                        "current_price": float(current_price),
                        "total_invested": float(holding.total_invested),
                        "current_value": float(current_value),
                        "unrealized_pnl": float(unrealized_pnl),
                        "pnl_percent": float(pnl_percent.quantize(Decimal('0.01'))),
                        "allocation_percent": 0.0  # Calculated after totals
                    })
        
        # Calculate allocation percentages
        if breakdown:
            total_holdings_value = sum(h["current_value"] for h in breakdown)
            
            if total_holdings_value > 0:
                for holding in breakdown:
                    holding["allocation_percent"] = round(
                        (holding["current_value"] / total_holdings_value) * 100, 2
                    )
        
        # Sort by current value descending
        breakdown.sort(key=lambda x: x["current_value"], reverse=True)
        
        return breakdown
    
    async def get_performance_metrics(self, user_id: UUID) -> Dict[str, Any]:
        """
        Calculate advanced performance metrics.
        
        Returns:
            Daily P&L, win rate, best/worst trades, etc.
        """
        
        portfolio_data = await self.get_current_value(user_id)
        
        # Basic metrics from portfolio data
        return {
            "total_pnl": portfolio_data["total_pnl"],
            "pnl_percent": portfolio_data["pnl_percent"],
            "total_value": portfolio_data["total_value"],
            "starting_balance": portfolio_data["starting_balance"],
            "cash_balance": portfolio_data["cash_balance"],
            "holdings_value": portfolio_data["holdings_value"],
            "holdings_count": portfolio_data["holdings_count"],
            # These would require trade history analysis
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "win_rate": 0.0,
            "best_trade_pnl": 0.0,
            "worst_trade_pnl": 0.0,
            "average_trade_pnl": 0.0
        }
    
    async def _get_portfolio(self, user_id: UUID) -> Optional[Portfolio]:
        """Fetch user's portfolio"""
        
        stmt = select(Portfolio).where(Portfolio.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def _get_holdings(self, portfolio_id: UUID) -> List[PortfolioHolding]:
        """Fetch all holdings for a portfolio"""
        
        stmt = select(PortfolioHolding).where(
            PortfolioHolding.portfolio_id == portfolio_id,
            PortfolioHolding.quantity > 0
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def _get_current_price(self, symbol: str) -> Optional[Decimal]:
        """
        Get current price from Redis (WebSocket cache).
        Returns None if price unavailable.
        """
        
        # Try multiple exchanges for redundancy
        exchanges = ["binance", "kraken", "bybit"]
        
        for exchange in exchanges:
            redis_key = f"price:{exchange}:{symbol.upper()}"
            price_str = await self.redis.get(redis_key)
            
            if price_str:
                try:
                    return Decimal(price_str.decode('utf-8'))
                except (ValueError, AttributeError) as e:
                    logger.warning(f"Invalid price format for {symbol}: {e}")
                    continue
        
        # Price unavailable from all exchanges
        logger.warning(f"Price unavailable for {symbol} in Redis")
        return None
    
    def _empty_portfolio_response(self) -> Dict[str, Any]:
        """Return empty portfolio structure"""
        
        return {
            "total_value": 0.0,
            "cash_balance": 0.0,
            "holdings_value": 0.0,
            "total_invested": 0.0,
            "starting_balance": 0.0,
            "total_pnl": 0.0,
            "pnl_percent": 0.0,
            "holdings_count": 0,
            "holdings": [],
            "updated_at": datetime.utcnow().isoformat()
        }


# Dependency injection helper
async def get_portfolio_calculator(
    db: AsyncSession = None,
    redis: Redis = None
) -> PortfolioCalculator:
    """Factory function for dependency injection"""
    
    if db is None:
        db = await get_session().__anext__()

    if redis is None:
        redis = get_redis_client()

    return PortfolioCalculator(db, redis)
