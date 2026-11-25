from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class FuelReceipt(Base):
    __tablename__ = "fuel_receipts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_event_id = Column(String(36), unique=True, index=True, nullable=False)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    
    amount_inr = Column(Float, nullable=False)
    liters = Column(Float, nullable=True)  # Optional fuel quantity
    receipt_image_url = Column(Text, nullable=True)
    
    recorded_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationship
    trip = relationship("Trip", back_populates="fuel_receipts")
