from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class FuelReceiptBase(BaseModel):
    amount_inr: float = Field(..., gt=0, description="Fuel cost in INR")
    liters: Optional[float] = Field(default=None, ge=0, description="Fuel quantity in liters")


class FuelReceiptCreate(FuelReceiptBase):
    client_event_id: str = Field(..., description="Client UUIDv4 for idempotency")
    trip_id: str = Field(..., description="Associated trip ID")
    receipt_image_base64: Optional[str] = Field(default=None, description="Base64 encoded compressed receipt image")
    receipt_image_url: Optional[str] = Field(default=None, description="Pre-uploaded receipt image URL")
    recorded_at: Optional[datetime] = None


class FuelReceiptRead(FuelReceiptBase):
    id: str
    client_event_id: str
    trip_id: str
    customer_name: Optional[str] = None
    receipt_image_url: Optional[str] = None
    recorded_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
