"""
Public contests API routes
Read-only contest listing for authenticated users.
"""

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.core.database import get_session
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.contest import Contest, ContestResponse

router = APIRouter(prefix="/contests", tags=["Contests"])


@router.get("", response_model=list[ContestResponse])
async def list_contests(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all contests (available to any authenticated user)."""
    result = await session.execute(select(Contest).order_by(Contest.start_time.desc()))
    return result.scalars().all()
