from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import verify_driver_key
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse
from app.services.sync_service import SyncService

router = APIRouter(prefix="/sync", tags=["Offline Sync"])


@router.post("/batch", response_model=SyncBatchResponse)
@limiter.limit("60/minute")
async def sync_batch(
    request: Request,
    body: SyncBatchRequest,
    driver_key: str = Depends(verify_driver_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Idempotent batch sync endpoint:
    - Protected by X-Driver-Key header
    - Rate limited to 60/minute
    - Enforces unique constraint on client_event_id to deduplicate retried submissions
    """
    return await SyncService.process_batch(db, body)
