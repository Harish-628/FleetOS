from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class BookingCalendarEventBase(BaseModel):
    title: str
    customer_name: str
    destination: Optional[str] = None
    phone: Optional[str] = None
    start_time: datetime
    end_time: datetime
    color_id: str  # "10" Green, "5" Yellow, "11" Red
    status: str


class BookingCalendarEventRead(BookingCalendarEventBase):
    id: str
    google_calendar_event_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TodayBookingSuggestion(BaseModel):
    customer_name: str
    destination: str
    phone: Optional[str] = None
    start_time: datetime
    color_id: str
    slot_id: Optional[str] = None


class DriverSlotRead(BaseModel):
    id: str
    summary: str
    customer_name: str
    destination: Optional[str] = None
    phone: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: str  # "confirmed", "pending", "maintenance"
    color_id: str  # "10", "5", "11"


import re

def sanitize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.replace("\x00", "").strip()
    cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r"<[^>]*>", "", cleaned)
    cleaned = re.sub(r"javascript:\s*", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


class BookingCalendarEventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    customer_name: str = Field(..., min_length=1, max_length=100)
    destination: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=25)
    start_time: datetime
    end_time: datetime
    color_id: str = Field(default="10", max_length=10)
    status: str = Field(default="CONFIRMED", max_length=30)

    @field_validator("title", "customer_name", "destination", "phone", mode="before")
    @classmethod
    def clean_inputs(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_text(v)


class AdvanceTourAlert(BaseModel):
    id: str
    title: str
    customer_name: str
    destination: str
    phone: Optional[str] = None
    start_time: datetime
    end_time: datetime
    days_until_tour: int
    color_id: str
    status: str

    model_config = ConfigDict(from_attributes=True)

