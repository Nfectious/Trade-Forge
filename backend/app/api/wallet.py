"""
Wallet API routes
Handles virtual wallet balance and transaction history.
"""

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.wallet import VirtualWallet
from app.models.portfolio import Portfolio

router = APIRouter()


@router.get("/balance")
async def get_balance(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    """Get current wallet balance from virtual_wallets table."""
    result = await session.execute(
        select(VirtualWallet).where(VirtualWallet.user_id == current_user.id)
    )
    wallet = result.scalar_one_or_none()

    if not wallet:
        # Fallback: check portfolio cash_balance
        result = await session.execute(
            select(Portfolio).where(Portfolio.user_id == current_user.id)
        )
        portfolio = result.scalar_one_or_none()

        if portfolio:
            balance_cents = portfolio.cash_balance
        else:
            balance_cents = 0
    else:
        balance_cents = wallet.balance

    balance_usd = balance_cents / 100

    return {
        "balance": balance_cents,
        "currency": "USD",
        "formatted": f"${balance_usd:,.2f}",
    }
