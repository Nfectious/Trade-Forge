"""
Wallet API routes
Handles virtual wallet and transaction operations
"""

from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter()


@router.get("/balance")
async def get_balance(current_user: User = Depends(get_current_active_user)):
    """Get current wallet balance"""
    return {
        "balance": 1000000,  # $10,000 default
        "currency": "USD",
        "formatted": "$10,000.00"
    }
