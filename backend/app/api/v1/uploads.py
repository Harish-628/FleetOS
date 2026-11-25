from fastapi import APIRouter, Depends, File, Request, UploadFile

from app.core.limiter import limiter
from app.core.security import verify_driver_key
from app.services.storage_service import StorageService

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("/receipt")
@limiter.limit("60/minute")
async def upload_receipt_image(
    request: Request,
    file: UploadFile = File(...),
    driver_key: str = Depends(verify_driver_key),
):
    """
    Driver receipt upload endpoint:
    - Protected by X-Driver-Key header
    - Rate limited to 60/minute
    - Enforces 1 MB maximum payload limit
    - Validates image magic bytes (JPEG, PNG, WebP)
    - Saves to Cloudflare R2 (production) or local disk (dev)
    """
    contents = await file.read()
    result = StorageService.save_image(contents, original_filename=file.filename or "receipt.jpg")
    return result
