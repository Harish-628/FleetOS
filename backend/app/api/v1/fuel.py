from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.fuel import FuelReceipt
from app.models.trip import Trip
from app.schemas.fuel import FuelReceiptCreate, FuelReceiptRead

router = APIRouter(prefix="/fuel", tags=["Fuel Receipts"])


@router.get("", response_model=list[FuelReceiptRead])
async def list_fuel_receipts(
    admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all fuel receipts in the Digital Bill Binder, enriched with trip and customer details.
    Protected by Admin JWT Authentication.
    """
    stmt = (
        select(FuelReceipt)
        .options(selectinload(FuelReceipt.trip))
        .order_by(FuelReceipt.recorded_at.desc())
    )
    result = await db.execute(stmt)
    receipts = result.scalars().all()

    receipt_reads: list[FuelReceiptRead] = []
    for r in receipts:
        rr = FuelReceiptRead.model_validate(r)
        if r.trip:
            rr.customer_name = r.trip.customer_name
        receipt_reads.append(rr)

    return receipt_reads


@router.post("", response_model=FuelReceiptRead)
async def create_fuel_receipt(
    payload: FuelReceiptCreate,
    admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    # Check trip exists
    trip = await db.get(Trip, payload.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    new_receipt = FuelReceipt(
        client_event_id=payload.client_event_id,
        trip_id=payload.trip_id,
        amount_inr=payload.amount_inr,
        liters=payload.liters,
        receipt_image_url=payload.receipt_image_url,
        recorded_at=payload.recorded_at,
    )
    db.add(new_receipt)
    await db.commit()
    await db.refresh(new_receipt)

    res = FuelReceiptRead.model_validate(new_receipt)
    res.customer_name = trip.customer_name
    return res
