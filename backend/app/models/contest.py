"""
Contest Models — Trade-Forge
Aligned to the init.sql database schema.
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    ForeignKey, Text, Enum as SAEnum, BigInteger,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid
from app.core.database import Base


class ContestStatus(str, enum.Enum):
    UPCOMING = "upcoming"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ContestType(str, enum.Enum):
    FREE = "free"
    PAID = "paid"


class Contest(Base):
    __tablename__ = "contests"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(
        SAEnum("free", "paid", name="contest_type", create_constraint=False, native_enum=True),
        nullable=False,
    )
    status = Column(
        SAEnum("upcoming", "active", "completed", "cancelled",
               name="contest_status", create_constraint=False, native_enum=True),
        default="upcoming",
        nullable=False,
        index=True,
    )

    entry_fee = Column(Float, default=0.0)
    max_participants = Column(Integer, nullable=True)
    current_participants = Column(Integer, default=0)

    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)

    starting_balance = Column(BigInteger, default=10000000)
    max_trades_per_day = Column(Integer, nullable=True)

    created_by = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    participants = relationship(
        "ContestParticipant", back_populates="contest", cascade="all, delete-orphan"
    )


class ContestParticipant(Base):
    __tablename__ = "contest_participants"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contest_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("contests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    starting_balance = Column(BigInteger, nullable=False)
    current_balance = Column(BigInteger, nullable=True)
    final_balance = Column(BigInteger, nullable=True)
    final_rank = Column(Integer, nullable=True)
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)

    disqualified = Column(String, default=False)
    disqualification_reason = Column(String(500), nullable=True)

    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    contest = relationship("Contest", back_populates="participants")


# --- Pydantic Schemas ---
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class ContestCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: ContestType = ContestType.FREE
    start_time: datetime
    end_time: datetime
    entry_fee: float = 0.0
    starting_balance: int = 10000000  # cents (= $100,000 virtual)
    max_participants: Optional[int] = None


class ContestResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    type: str
    status: str
    entry_fee: float
    max_participants: Optional[int] = None
    current_participants: int = 0
    start_time: datetime
    end_time: datetime
    starting_balance: int
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
