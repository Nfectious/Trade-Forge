"""
Portfolio models: Portfolio, PortfolioHolding
Maps to: portfolios, portfolio_holdings tables in init.sql
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4


# ============================================================================
# PORTFOLIO MODEL
# ============================================================================

class Portfolio(SQLModel, table=True):
    """
    User portfolio summary.
    DB PK is user_id (one portfolio per user, auto-created by DB trigger).
    """
    __tablename__ = "portfolios"

    user_id: UUID = Field(foreign_key="users.id", primary_key=True)
    total_value: int = Field(default=0)       # BIGINT (cents)
    cash_balance: int = Field(default=0)      # BIGINT (cents)
    invested_value: int = Field(default=0)    # BIGINT (cents)
    unrealized_pnl: int = Field(default=0)    # BIGINT (cents)
    realized_pnl: int = Field(default=0)      # BIGINT (cents)
    total_trades: int = Field(default=0)
    winning_trades: int = Field(default=0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# PORTFOLIO HOLDING MODEL
# ============================================================================

class PortfolioHolding(SQLModel, table=True):
    """
    Individual asset position within a portfolio.
    References trading_pairs for the symbol.
    """
    __tablename__ = "portfolio_holdings"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")
    trading_pair_id: UUID = Field(foreign_key="trading_pairs.id")

    quantity: float      # DECIMAL(20,8) in DB
    avg_entry_price: float  # DECIMAL(20,8) in DB
    current_price: Optional[float] = None
    total_value: Optional[int] = None       # BIGINT (cents)
    unrealized_pnl: Optional[int] = None    # BIGINT (cents)

    updated_at: datetime = Field(default_factory=datetime.utcnow)
