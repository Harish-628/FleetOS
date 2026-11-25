from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel


class ComplianceItem(BaseModel):
    name: str
    code: str
    expiry_date: date
    days_remaining: int
    status: Literal["GREEN", "AMBER", "RED"]
    status_label: str


class VehicleComplianceResponse(BaseModel):
    vehicle_id: str
    items: list[ComplianceItem]
    has_expired: bool
    requires_attention: bool
