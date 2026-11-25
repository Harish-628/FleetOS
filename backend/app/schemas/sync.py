from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


class SyncEventItem(BaseModel):
    client_event_id: str = Field(..., description="Unique client UUIDv4")
    event_type: Literal["TRIP_START", "FUEL_LOG", "TRIP_END"] = Field(..., description="Type of event")
    recorded_at: datetime = Field(..., description="ISO-8601 timestamp recorded by client")
    payload: dict[str, Any] = Field(..., description="Event payload matching event type")


class SyncBatchRequest(BaseModel):
    client_device_id: str = Field(..., max_length=100, description="Driver device identifier")
    batch_id: str = Field(..., max_length=100, description="Batch UUIDv4")
    sent_at: datetime = Field(..., description="Timestamp batch was sent")
    events: list[SyncEventItem] = Field(..., max_length=100, description="Ordered list of events (capped at 100 per batch for DoS defense)")


class SyncEventResult(BaseModel):
    client_event_id: str
    status: Literal["processed", "deduplicated", "rejected"]
    entity_type: str
    server_id: Optional[str] = None
    message: Optional[str] = None


class SyncBatchResponse(BaseModel):
    batch_id: str
    processed_at: datetime
    processed_count: int
    deduplicated_count: int
    rejected_count: int
    results: list[SyncEventResult]
