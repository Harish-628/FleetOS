from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, DateTime, String, Text

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SyncEventLog(Base):
    __tablename__ = "sync_event_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_event_id = Column(String(36), unique=True, index=True, nullable=False)
    event_type = Column(String(50), nullable=False)  # TRIP_START, FUEL_LOG, TRIP_END
    payload_hash = Column(String(64), nullable=True)
    status = Column(String(20), default="PROCESSED", nullable=False)
    processed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
