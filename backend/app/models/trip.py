from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Trip(Base):
    __tablename__ = "trips"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_event_id = Column(String(36), unique=True, index=True, nullable=False)
    vehicle_id = Column(String(50), default="BUS-14-23STR", nullable=False)
    customer_name = Column(String(255), nullable=False, index=True)
    destination = Column(String(255), nullable=False)
    calendar_event_id = Column(String(100), nullable=True, index=True)
    
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=True)
    total_km = Column(Float, nullable=True)
    
    cash_received_inr = Column(Float, default=0.0, nullable=False)
    tolls_and_extras_inr = Column(Float, default=0.0, nullable=False)
    toll_amount_inr = Column(Float, default=0.0, nullable=False)
    rto_amount_inr = Column(Float, default=0.0, nullable=False)
    parking_amount_inr = Column(Float, default=0.0, nullable=False)
    other_expenses_inr = Column(Float, default=0.0, nullable=False)
    driver_bata_inr = Column(Float, default=0.0, nullable=False)
    driver_username = Column(String(50), nullable=True, index=True)
    
    status = Column(String(20), default="IN_PROGRESS", nullable=False)  # IN_PROGRESS, COMPLETED
    
    start_time = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    fuel_receipts = relationship("FuelReceipt", back_populates="trip", cascade="all, delete-orphan")
