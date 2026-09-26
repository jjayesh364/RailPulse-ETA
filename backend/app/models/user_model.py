"""User model for authentication."""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime
from app.database.db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # PASSENGER or RAILWAY_STAFF
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
