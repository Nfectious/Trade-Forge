"""
Contest model for trading competitions
"""
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel


class Contest(SQLModel, table=True):
    """Trading contest/competition"""
    __tablename__ = "contests"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    start_date: datetime
    end_date: datetime
    entry_fee_cents: int = Field(default=0, ge=0)  # Entry fee in cents
    prize_pool_cents: int = Field(default=0, ge=0)  # Prize pool in cents
    status: str = Field(default="upcoming", max_length=50)  # upcoming, active, completed, cancelled
    max_participants: Optional[int] = Field(default=None, ge=1)
    current_participants: int = Field(default=0, ge=0)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ContestResponse(SQLModel):
    """Contest response model"""
    id: UUID
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    entry_fee_cents: int
    prize_pool_cents: int
    status: str
    max_participants: Optional[int] = None
    current_participants: int
    created_at: datetime
    updated_at: datetime


class ContestCreate(SQLModel):
    """Contest creation model"""
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    start_date: datetime
    end_date: datetime
    entry_fee_cents: int = Field(default=0, ge=0)
    prize_pool_cents: int = Field(default=0, ge=0)
    max_participants: Optional[int] = Field(default=None, ge=1)
