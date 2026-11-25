from datetime import datetime, timezone
import uuid
from sqlalchemy import Boolean, Column, DateTime, String

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class DriverUser(Base):
    __tablename__ = "driver_users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_owner_driver = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
