from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, DateTime, String, Text

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class BookingCalendarEvent(Base):
    __tablename__ = "booking_calendar_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    google_calendar_event_id = Column(String(255), unique=True, index=True, nullable=True)
    title = Column(String(255), nullable=False)
    customer_name = Column(String(255), nullable=False, index=True)
    destination = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    
    # Google Calendar color coding:
    # 10: Confirmed (Green)
    # 5: Inquiry / Pending Quote (Yellow)
    # 11: Maintenance / FC Renewal (Red)
    color_id = Column(String(10), default="10", nullable=False)
    status = Column(String(50), default="CONFIRMED", nullable=False)  # CONFIRMED, INQUIRY, MAINTENANCE
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
