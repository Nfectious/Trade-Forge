"""
Users API routes
Handles user profile management and user-related operations
"""

from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_active_user
from app.models.user import User, UserProfileResponse

router = APIRouter()


@router.get("/me/profile", response_model=UserProfileResponse)
async def get_my_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user's profile"""
    return {
        "user_id": current_user.id,
        "nickname": None,
        "display_name": None,
        "avatar_url": None,
        "bio": None,
        "trader_type": None,
        "trading_goal": None,
        "experience_level": None,
        "xp_points": 0,
        "level": 1,
        "profile_public": True
    }
