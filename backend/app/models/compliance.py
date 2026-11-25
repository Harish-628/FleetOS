from datetime import date, datetime, timezone
import uuid
from sqlalchemy import Column, Date, DateTime, String

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class VehicleCompliance(Base):
    __tablename__ = "vehicle_compliance"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vehicle_id = Column(String(50), default="BUS-14-23STR", unique=True, nullable=False)
    
    # Expiry dates
    rto_permit_expiry = Column(Date, nullable=False)
    fitness_cert_expiry = Column(Date, nullable=False)
    insurance_expiry = Column(Date, nullable=False)
    puc_expiry = Column(Date, nullable=False)
    
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
