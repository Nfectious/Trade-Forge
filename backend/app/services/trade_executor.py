"""
Trade Execution Service
Operation Phoenix | Trading Forge
For Madison

Handles all trade execution logic with atomic database transactions,
balance validation, and real-time price integration from Redis.
"""

from decimal import Decimal, ROUND_DOWN
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timezone
import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.models.trade import Trade, TradeStatus, TradeSide
from app.models.portfolio import Portfolio, PortfolioHolding
from app.models.wallet import WalletTransaction, TransactionType
from app.core.config import settings
from app.core.database import get_session
from app.core.redis import get_redis_client

logger = logging.getLogger(__name__)


class TradeExecutionError(Exception):
    """Base exception for trade execution failures"""
    pass


class InsufficientBalanceError(TradeExecutionError):
    """Raised when user lacks sufficient funds or holdings"""
    pass


class PriceUnavailableError(TradeExecutionError):
    """Raised when market price data is unavailable"""
    pass


class InvalidQuantityError(TradeExecutionError):
    """Raised for invalid trade quantities"""
    pass


class TradeExecutor:
    """
    Core trading engine for executing simulated trades.
    
    CRITICAL OPERATIONS:
    1. Fetch real-time price from Redis (WebSocket cache)
    2. Validate user balance/holdings
    3. Execute atomic database transaction
    4. Update portfolio state
    """
    
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis
        
    async def execute_trade(
        self,
        user_id: UUID,
        symbol: str,
        side: str,
        quantity: Decimal,
        order_type: str = "market"
    ) -> Dict[str, Any]:
        """
        Execute a simulated market order.
        
        Args:
            user_id: UUID of the user executing trade
            symbol: Trading pair (e.g., 'BTCUSDT')
            side: 'buy' or 'sell'
            quantity: Amount of asset to trade
            order_type: Order type (only 'market' supported)
            
        Returns:
            Dict containing trade details and updated balances
            
        Raises:
            InvalidQuantityError: If quantity is invalid
            InsufficientBalanceError: If user lacks funds/holdings
            PriceUnavailableError: If price data unavailable
            TradeExecutionError: For other execution failures
        """
        
        # Validate inputs
        self._validate_trade_params(symbol, side, quantity, order_type)
        
        # Get current market price from Redis
        current_price = await self._get_current_price(symbol)
        
        # Calculate trade value
        total_value = self._calculate_trade_value(quantity, current_price, side)
        
        # Get user's portfolio
        portfolio = await self._get_portfolio(user_id)
        
        # Validate sufficient balance/holdings
        await self._validate_balance(portfolio, symbol, side, quantity, total_value)
        
        # Execute trade within database transaction
        try:
            async with self.db.begin():
                # Create trade record
                trade = await self._create_trade_record(
                    user_id, symbol, side, quantity, current_price, total_value
                )
                
                # Update wallet (cash balance)
                await self._update_wallet(
                    user_id, portfolio.id, side, total_value, trade.id
                )
                
                # Update portfolio cash balance
                await self._update_portfolio_cash(portfolio, side, total_value)
                
                # Update holdings (asset quantity)
                await self._update_holdings(
                    user_id, portfolio.id, symbol, side, quantity, current_price
                )
                
                # Commit transaction
                await self.db.commit()
                
            # Fetch updated portfolio state
            updated_portfolio = await self._get_portfolio(user_id)
            
            return {
                "trade_id": str(trade.id),
                "symbol": symbol,
                "side": side,
                "quantity": float(quantity),
                "price": float(current_price),
                "total_value": float(total_value),
                "new_balance": float(updated_portfolio.cash_balance),
                "executed_at": trade.executed_at.isoformat(),
                "status": "success"
            }
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Trade execution failed: {str(e)}")
            raise TradeExecutionError(f"Failed to execute trade: {str(e)}")
    
    def _validate_trade_params(
        self, symbol: str, side: str, quantity: Decimal, order_type: str
    ) -> None:
        """Validate trade parameters"""
        
        if order_type != "market":
            raise TradeExecutionError("Only market orders are supported")
        
        if side not in ["buy", "sell"]:
            raise TradeExecutionError(f"Invalid side: {side}. Must be 'buy' or 'sell'")
        
        if quantity <= 0:
            raise InvalidQuantityError("Quantity must be greater than zero")
        
        if not symbol or len(symbol) < 3:
            raise TradeExecutionError(f"Invalid symbol: {symbol}")
    
    async def _get_current_price(self, symbol: str) -> Decimal:
        """
        Fetch current price from Redis cache (populated by WebSocket).
        
        Tries multiple exchange keys for redundancy.
        """
        
        # Try Binance first (primary exchange)
        redis_key = f"price:binance:{symbol.upper()}"
        price_str = await self.redis.get(redis_key)
        
        if not price_str:
            # Fallback to Kraken
            redis_key = f"price:kraken:{symbol.upper()}"
            price_str = await self.redis.get(redis_key)
        
        if not price_str:
            # Fallback to Bybit
            redis_key = f"price:bybit:{symbol.upper()}"
            price_str = await self.redis.get(redis_key)
        
        if not price_str:
            logger.error(f"Price unavailable for {symbol} in Redis")
            raise PriceUnavailableError(
                f"Market price for {symbol} is currently unavailable. "
                "WebSocket may be disconnected."
            )
        
        try:
            return Decimal(price_str.decode('utf-8'))
        except (ValueError, AttributeError) as e:
            logger.error(f"Invalid price format in Redis: {price_str}")
            raise PriceUnavailableError(f"Invalid price data: {str(e)}")
    
    def _calculate_trade_value(
        self, quantity: Decimal, price: Decimal, side: str
    ) -> Decimal:
        """Calculate total trade value with proper decimal precision"""
        
        total = quantity * price
        
        # Round to 2 decimal places for USD
        return total.quantize(Decimal('0.01'), rounding=ROUND_DOWN)
    
    async def _get_portfolio(self, user_id: UUID) -> Portfolio:
        """Fetch user's portfolio"""
        
        stmt = select(Portfolio).where(Portfolio.user_id == user_id)
        result = await self.db.execute(stmt)
        portfolio = result.scalar_one_or_none()
        
        if not portfolio:
            raise TradeExecutionError("Portfolio not found for user")
        
        return portfolio
    
    async def _validate_balance(
        self,
        portfolio: Portfolio,
        symbol: str,
        side: str,
        quantity: Decimal,
        total_value: Decimal
    ) -> None:
        """Validate user has sufficient balance or holdings"""
        
        if side == "buy":
            # Check cash balance
            if portfolio.cash_balance < total_value:
                raise InsufficientBalanceError(
                    f"Insufficient balance. Required: ${total_value:.2f}, "
                    f"Available: ${portfolio.cash_balance:.2f}"
                )
        
        elif side == "sell":
            # Check holdings
            stmt = select(PortfolioHolding).where(
                PortfolioHolding.portfolio_id == portfolio.id,
                PortfolioHolding.symbol == symbol
            )
            result = await self.db.execute(stmt)
            holding = result.scalar_one_or_none()
            
            if not holding or holding.quantity < quantity:
                available = holding.quantity if holding else Decimal('0')
                raise InsufficientBalanceError(
                    f"Insufficient holdings. Required: {quantity} {symbol}, "
                    f"Available: {available} {symbol}"
                )
    
    async def _create_trade_record(
        self,
        user_id: UUID,
        symbol: str,
        side: str,
        quantity: Decimal,
        price: Decimal,
        total_value: Decimal
    ) -> Trade:
        """Create trade database record"""
        
        trade = Trade(
            user_id=user_id,
            symbol=symbol,
            side=TradeSide.BUY if side == "buy" else TradeSide.SELL,
            quantity=quantity,
            price=price,
            total_value=total_value,
            order_type="market",
            status=TradeStatus.EXECUTED,
            executed_at=datetime.now(timezone.utc)
        )
        
        self.db.add(trade)
        await self.db.flush()  # Get trade ID without committing
        
        return trade
    
    async def _update_wallet(
        self,
        user_id: UUID,
        portfolio_id: UUID,
        side: str,
        total_value: Decimal,
        trade_id: UUID
    ) -> None:
        """Create wallet transaction record"""
        
        transaction_type = (
            TransactionType.TRADE_BUY if side == "buy" 
            else TransactionType.TRADE_SELL
        )
        
        # Debit for buy, credit for sell
        amount = -total_value if side == "buy" else total_value
        
        wallet_tx = WalletTransaction(
            user_id=user_id,
            portfolio_id=portfolio_id,
            transaction_type=transaction_type,
            amount=amount,
            reference_id=trade_id,
            description=f"Trade {side.upper()}: {trade_id}"
        )
        
        self.db.add(wallet_tx)
    
    async def _update_portfolio_cash(
        self, portfolio: Portfolio, side: str, total_value: Decimal
    ) -> None:
        """Update portfolio cash balance"""
        
        if side == "buy":
            portfolio.cash_balance -= total_value
        else:
            portfolio.cash_balance += total_value
        
        # Ensure no negative balance (should be caught earlier)
        if portfolio.cash_balance < 0:
            raise TradeExecutionError("Negative balance detected")
    
    async def _update_holdings(
        self,
        user_id: UUID,
        portfolio_id: UUID,
        symbol: str,
        side: str,
        quantity: Decimal,
        price: Decimal
    ) -> None:
        """Update or create portfolio holdings"""
        
        # Fetch existing holding
        stmt = select(PortfolioHolding).where(
            PortfolioHolding.portfolio_id == portfolio_id,
            PortfolioHolding.symbol == symbol
        )
        result = await self.db.execute(stmt)
        holding = result.scalar_one_or_none()
        
        if side == "buy":
            if holding:
                # Update existing holding (calculate new average price)
                total_invested = holding.total_invested + (quantity * price)
                new_quantity = holding.quantity + quantity
                
                holding.quantity = new_quantity
                holding.average_price = total_invested / new_quantity
                holding.total_invested = total_invested
            else:
                # Create new holding
                holding = PortfolioHolding(
                    portfolio_id=portfolio_id,
                    symbol=symbol,
                    quantity=quantity,
                    average_price=price,
                    total_invested=quantity * price
                )
                self.db.add(holding)
        
        elif side == "sell":
            if not holding:
                raise TradeExecutionError("Cannot sell asset not owned")
            
            # Reduce holding quantity
            holding.quantity -= quantity
            
            # Reduce total invested proportionally
            sold_ratio = quantity / (holding.quantity + quantity)
            holding.total_invested -= holding.total_invested * sold_ratio
            
            # If fully sold, delete holding
            if holding.quantity <= Decimal('0.00000001'):
                await self.db.delete(holding)


# Dependency injection helper
async def get_trade_executor(
    db: AsyncSession = None,
    redis: Redis = None
) -> TradeExecutor:
    """Factory function for dependency injection"""
    
    if db is None:
        db = await get_session().__anext__()

    if redis is None:
        redis = get_redis_client()

    return TradeExecutor(db, redis)
