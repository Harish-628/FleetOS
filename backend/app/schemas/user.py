from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class DriverLoginRequest(BaseModel):
    username: str = Field(..., description="Driver username e.g. senthilraja")
    password: str = Field(..., description="Driver password")


class DriverTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    username: str
    full_name: str
    is_owner_driver: bool


import re
from pydantic import field_validator


class DriverCreateRequest(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_\-\.]+$",
        description="Driver username (alphanumeric, dots, dashes, underscores)",
    )
    password: str = Field(..., min_length=6, max_length=128, description="Driver password")
    full_name: str = Field(..., min_length=1, max_length=100, description="Driver full name")
    is_owner_driver: bool = Field(default=False, description="Whether driver is owner-driver (bata = 0)")

    @field_validator("full_name", mode="before")
    @classmethod
    def clean_name(cls, v: str) -> str:
        if isinstance(v, str):
            cleaned = v.replace("\x00", "").strip()
            return re.sub(r"<[^>]*>", "", cleaned)
        return v


class DriverRead(BaseModel):
    id: str
    username: str
    full_name: str
    is_owner_driver: bool
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
