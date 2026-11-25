import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


def sanitize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.replace("\x00", "").strip()
    # Remove script and style tags and their contents
    cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    # Strip any remaining HTML tags
    cleaned = re.sub(r"<[^>]*>", "", cleaned)
    # Strip javascript: URI schemes
    cleaned = re.sub(r"javascript:\s*", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


class TripBase(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100, description="Customer or group booking name")
    destination: str = Field(..., min_length=1, max_length=200, description="Destination or route")
    start_km: float = Field(..., ge=0, description="Odometer reading at trip start")
    calendar_event_id: Optional[str] = Field(None, max_length=100, description="Linked Google Calendar Slot ID")
    driver_username: Optional[str] = Field(None, max_length=50, description="Username of assigned driver")

    @field_validator("customer_name", "destination", "calendar_event_id", "driver_username", mode="before")
    @classmethod
    def clean_inputs(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class TripCreate(TripBase):
    client_event_id: str = Field(..., description="Client UUIDv4 for idempotency")
    vehicle_id: Optional[str] = "BUS-14-23STR"
    start_time: Optional[datetime] = None


class TripEndRequest(BaseModel):
    end_km: float = Field(..., ge=0, description="Odometer reading at trip end")
    cash_received_inr: float = Field(default=0.0, ge=0, description="Total cash collected")
    tolls_and_extras_inr: float = Field(default=0.0, ge=0, description="Tolls, parking, and permit fees")
    toll_amount_inr: float = Field(default=0.0, ge=0, description="Toll gate charges")
    rto_amount_inr: float = Field(default=0.0, ge=0, description="RTO permit fees & checkpost taxes")
    parking_amount_inr: float = Field(default=0.0, ge=0, description="Parking fees")
    other_expenses_inr: float = Field(default=0.0, ge=0, description="Miscellaneous extras")
    driver_bata_inr: float = Field(default=0.0, ge=0, description="Driver bata allowance (enforced 0 for owner senthilraja)")
    end_time: Optional[datetime] = None


class TripRead(TripBase):
    id: str
    client_event_id: str
    vehicle_id: str
    end_km: Optional[float] = None
    total_km: Optional[float] = None
    cash_received_inr: float
    tolls_and_extras_inr: float
    toll_amount_inr: float = 0.0
    rto_amount_inr: float = 0.0
    parking_amount_inr: float = 0.0
    other_expenses_inr: float = 0.0
    driver_bata_inr: float = 0.0
    driver_username: Optional[str] = None
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Computed metrics
    total_fuel_amount_inr: Optional[float] = 0.0
    total_fuel_liters: Optional[float] = 0.0
    net_profit_inr: Optional[float] = 0.0
    mileage_kmpl: Optional[float] = 0.0

    model_config = ConfigDict(from_attributes=True)
