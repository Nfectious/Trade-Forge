"""
Contest model for trading competitions
Maps to: contests table in init.sql
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
    description: Optional[str] = Field(default=None)
    type: str = Field(max_length=50)  # contest_type enum: free, paid, sponsored
    status: str = Field(default="upcoming", max_length=50)
    entry_fee: float = Field(default=0)  # DECIMAL(10,2)
    max_participants: Optional[int] = Field(default=None, ge=1)
    current_participants: int = Field(default=0, ge=0)
    start_time: datetime
    end_time: datetime
    starting_balance: int = Field(default=10000000)  # BIGINT (cents)
    allowed_assets: Optional[str] = None  # TEXT[]
    max_trades_per_day: Optional[int] = None
    created_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ContestResponse(SQLModel):
    """Contest response model"""
    id: UUID
    name: str
    description: Optional[str] = None
    type: str
    status: str
    entry_fee: float
    max_participants: Optional[int] = None
    current_participants: int
    start_time: datetime
    end_time: datetime
    starting_balance: int
    created_at: datetime
    updated_at: datetime


class ContestCreate(SQLModel):
    """Contest creation model"""
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    type: str = Field(max_length=50)
    start_time: datetime
    end_time: datetime
    entry_fee: float = Field(default=0, ge=0)
    starting_balance: int = Field(default=10000000)
    max_participants: Optional[int] = Field(default=None, ge=1)
