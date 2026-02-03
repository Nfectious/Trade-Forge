"""
Wallet models: VirtualWallet, WalletTransaction
Maps to: virtual_wallets, wallet_transactions tables in init.sql
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum


# ============================================================================
# ENUMS (match DB custom types)
# ============================================================================

class TransactionType(str, Enum):
    INITIAL_DEPOSIT = "initial_deposit"
    TIER_BONUS = "tier_bonus"
    CONTEST_PRIZE = "contest_prize"
    TRADE_PROFIT = "trade_profit"
    TRADE_LOSS = "trade_loss"
    ADMIN_ADJUSTMENT = "admin_adjustment"
    RESET = "reset"
    EDUCATION_REWARD = "education_reward"
    # Extended types used by trade_executor
    TRADE_BUY = "trade_profit"   # Alias: buys debit cash
    TRADE_SELL = "trade_profit"  # Alias: sells credit cash


# ============================================================================
# VIRTUAL WALLET MODEL
# ============================================================================

class VirtualWallet(SQLModel, table=True):
    """User's virtual wallet (auto-created by DB trigger on user registration)"""
    __tablename__ = "virtual_wallets"

    user_id: UUID = Field(foreign_key="users.id", primary_key=True)
    balance: int = Field(default=0)            # BIGINT (cents)
    total_earned: int = Field(default=0)       # BIGINT (cents)
    total_spent: int = Field(default=0)        # BIGINT (cents)
    all_time_high: int = Field(default=0)      # BIGINT (cents)
    all_time_low: Optional[int] = None         # BIGINT (cents)
    last_reset: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# WALLET TRANSACTION MODEL
# ============================================================================

class WalletTransaction(SQLModel, table=True):
    """Individual wallet transaction record"""
    __tablename__ = "wallet_transactions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id")

    type: str = Field(max_length=50)     # transaction_type DB enum
    amount: int                           # BIGINT (cents), non-zero
    balance_after: int                    # BIGINT (cents)

    description: Optional[str] = None
    reference_id: Optional[UUID] = None
    admin_id: Optional[UUID] = Field(default=None, foreign_key="users.id")

    created_at: datetime = Field(default_factory=datetime.utcnow)
