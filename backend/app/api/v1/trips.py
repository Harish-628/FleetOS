from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.trip import Trip
from app.schemas.trip import TripCreate, TripEndRequest, TripRead
from app.services.pnl_service import PnLService

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.get("", response_model=list[TripRead])
async def list_trips(
    customer_name: Optional[str] = Query(None, description="Search by customer name"),
    status: Optional[str] = Query(None, description="Filter by status: IN_PROGRESS or COMPLETED"),
    admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Trip).options(selectinload(Trip.fuel_receipts)).order_by(Trip.created_at.desc())

    if customer_name:
        # Prevent SQL wildcard injection by escaping special characters in LIKE/ILIKE
        safe_customer_name = customer_name.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_").strip()
        stmt = stmt.where(Trip.customer_name.ilike(f"%{safe_customer_name}%"))
    if status:
        stmt = stmt.where(Trip.status == status)

    result = await db.execute(stmt)
    trips = result.scalars().all()

    trip_reads: list[TripRead] = []
    for trip in trips:
        pnl = PnLService.calculate_trip_pnl(
            start_km=trip.start_km,
            end_km=trip.end_km,
            cash_received_inr=trip.cash_received_inr,
            tolls_and_extras_inr=trip.tolls_and_extras_inr,
            fuel_receipts=trip.fuel_receipts,
            driver_bata_inr=trip.driver_bata_inr or 0.0,
            driver_username=trip.driver_username,
        )

        tr = TripRead.model_validate(trip)
        tr.total_km = pnl.total_km
        tr.total_fuel_amount_inr = pnl.total_fuel_amount_inr
        tr.total_fuel_liters = pnl.total_fuel_liters
        tr.driver_bata_inr = pnl.driver_bata_inr
        tr.net_profit_inr = pnl.net_profit_inr
        tr.mileage_kmpl = pnl.mileage_kmpl
        trip_reads.append(tr)

    return trip_reads


@router.get("/active", response_model=Optional[TripRead])
async def get_active_trip(
    admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Trip)
        .options(selectinload(Trip.fuel_receipts))
        .where(Trip.status == "IN_PROGRESS")
        .order_by(Trip.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    trip = result.scalars().first()
    if not trip:
        return None

    pnl = PnLService.calculate_trip_pnl(
        start_km=trip.start_km,
        end_km=trip.end_km,
        cash_received_inr=trip.cash_received_inr,
        tolls_and_extras_inr=trip.tolls_and_extras_inr,
        fuel_receipts=trip.fuel_receipts,
        driver_bata_inr=trip.driver_bata_inr or 0.0,
        driver_username=trip.driver_username,
    )
    tr = TripRead.model_validate(trip)
    tr.total_km = pnl.total_km
    tr.total_fuel_amount_inr = pnl.total_fuel_amount_inr
    tr.total_fuel_liters = pnl.total_fuel_liters
    tr.driver_bata_inr = pnl.driver_bata_inr
    tr.net_profit_inr = pnl.net_profit_inr
    tr.mileage_kmpl = pnl.mileage_kmpl
    return tr


@router.get("/{trip_id}", response_model=TripRead)
async def get_trip(
    trip_id: str,
    admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Trip).options(selectinload(Trip.fuel_receipts)).where(Trip.id == trip_id)
    result = await db.execute(stmt)
    trip = result.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    pnl = PnLService.calculate_trip_pnl(
        start_km=trip.start_km,
        end_km=trip.end_km,
        cash_received_inr=trip.cash_received_inr,
        tolls_and_extras_inr=trip.tolls_and_extras_inr,
        fuel_receipts=trip.fuel_receipts,
        driver_bata_inr=trip.driver_bata_inr or 0.0,
        driver_username=trip.driver_username,
    )
    tr = TripRead.model_validate(trip)
    tr.total_km = pnl.total_km
    tr.total_fuel_amount_inr = pnl.total_fuel_amount_inr
    tr.total_fuel_liters = pnl.total_fuel_liters
    tr.driver_bata_inr = pnl.driver_bata_inr
    tr.net_profit_inr = pnl.net_profit_inr
    tr.mileage_kmpl = pnl.mileage_kmpl
    return tr


@router.post("/{trip_id}/end", response_model=TripRead)
async def end_trip(
    trip_id: str,
    payload: TripEndRequest,
    admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Trip).options(selectinload(Trip.fuel_receipts)).where(Trip.id == trip_id)
    result = await db.execute(stmt)
    trip = result.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if payload.end_km <= trip.start_km:
        raise HTTPException(
            status_code=400,
            detail=f"End KM ({payload.end_km}) must be greater than Start KM ({trip.start_km})",
        )

    trip.end_km = payload.end_km
    trip.total_km = round(payload.end_km - trip.start_km, 2)
    trip.cash_received_inr = payload.cash_received_inr
    
    # Itemized Road Expenses
    trip.toll_amount_inr = payload.toll_amount_inr
    trip.rto_amount_inr = payload.rto_amount_inr
    trip.parking_amount_inr = payload.parking_amount_inr
    trip.other_expenses_inr = payload.other_expenses_inr
    itemized_total = round(
        payload.toll_amount_inr + payload.rto_amount_inr + payload.parking_amount_inr + payload.other_expenses_inr, 2
    )
    trip.tolls_and_extras_inr = itemized_total if itemized_total > 0 else payload.tolls_and_extras_inr

    # Enforce Owner-Driver Bata Rule
    if trip.driver_username and trip.driver_username.strip().lower() == "senthilraja":
        trip.driver_bata_inr = 0.0
    else:
        trip.driver_bata_inr = payload.driver_bata_inr
    trip.status = "COMPLETED"
    if payload.end_time:
        trip.end_time = payload.end_time

    await db.commit()
    await db.refresh(trip)

    pnl = PnLService.calculate_trip_pnl(
        start_km=trip.start_km,
        end_km=trip.end_km,
        cash_received_inr=trip.cash_received_inr,
        tolls_and_extras_inr=trip.tolls_and_extras_inr,
        fuel_receipts=trip.fuel_receipts,
        driver_bata_inr=trip.driver_bata_inr or 0.0,
        driver_username=trip.driver_username,
    )
    tr = TripRead.model_validate(trip)
    tr.total_km = pnl.total_km
    tr.total_fuel_amount_inr = pnl.total_fuel_amount_inr
    tr.total_fuel_liters = pnl.total_fuel_liters
    tr.driver_bata_inr = pnl.driver_bata_inr
    tr.net_profit_inr = pnl.net_profit_inr
    tr.mileage_kmpl = pnl.mileage_kmpl
    return tr
