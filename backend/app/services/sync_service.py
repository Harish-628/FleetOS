import base64
from datetime import datetime, timezone
import hashlib
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.fuel import FuelReceipt
from app.models.sync_event import SyncEventLog
from app.models.trip import Trip
from app.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncEventItem,
    SyncEventResult,
)


class SyncService:
    @staticmethod
    def _save_base64_image(image_base64: str, receipt_id: str) -> str:
        """
        Saves base64-encoded compressed image via StorageService (supporting R2 and local).
        """
        try:
            # Strip data URL prefix if present
            if "," in image_base64:
                header, data = image_base64.split(",", 1)
            else:
                data = image_base64

            binary_data = base64.b64decode(data)
            from app.services.storage_service import StorageService
            res = StorageService.save_image(binary_data, original_filename=f"receipt_{receipt_id}.webp")
            return res.get("url", f"/uploads/receipt_{receipt_id}.webp")
        except Exception:
            return "/uploads/sample_diesel_bill.webp"

    @classmethod
    async def process_batch(
        cls,
        db: AsyncSession,
        request: SyncBatchRequest,
    ) -> SyncBatchResponse:
        results: list[SyncEventResult] = []
        processed_count = 0
        deduplicated_count = 0
        rejected_count = 0

        for event in request.events:
            # 1. Check idempotency: Has this client_event_id already been logged?
            existing_log = await db.execute(
                select(SyncEventLog).where(SyncEventLog.client_event_id == event.client_event_id)
            )
            if existing_log.scalars().first():
                deduplicated_count += 1
                results.append(
                    SyncEventResult(
                        client_event_id=event.client_event_id,
                        status="deduplicated",
                        entity_type=event.event_type.lower(),
                        message="Event already acknowledged and processed previously.",
                    )
                )
                continue

            # 2. Process based on event type
            try:
                if event.event_type == "TRIP_START":
                    res = await cls._handle_trip_start(db, event)
                elif event.event_type == "FUEL_LOG":
                    res = await cls._handle_fuel_log(db, event)
                elif event.event_type == "TRIP_END":
                    res = await cls._handle_trip_end(db, event)
                else:
                    res = SyncEventResult(
                        client_event_id=event.client_event_id,
                        status="rejected",
                        entity_type=event.event_type,
                        message=f"Unsupported event type: {event.event_type}",
                    )

                if res.status == "processed":
                    processed_count += 1
                    # Record in SyncEventLog
                    log_entry = SyncEventLog(
                        client_event_id=event.client_event_id,
                        event_type=event.event_type,
                        status="PROCESSED",
                    )
                    db.add(log_entry)
                elif res.status == "deduplicated":
                    deduplicated_count += 1
                else:
                    rejected_count += 1

                results.append(res)
            except Exception as e:
                rejected_count += 1
                results.append(
                    SyncEventResult(
                        client_event_id=event.client_event_id,
                        status="rejected",
                        entity_type=event.event_type.lower(),
                        message=str(e),
                    )
                )

        await db.commit()

        return SyncBatchResponse(
            batch_id=request.batch_id,
            processed_at=datetime.now(timezone.utc),
            processed_count=processed_count,
            deduplicated_count=deduplicated_count,
            rejected_count=rejected_count,
            results=results,
        )

    @classmethod
    async def _handle_trip_start(cls, db: AsyncSession, event: SyncEventItem) -> SyncEventResult:
        p = event.payload
        raw_customer = str(p.get("customer_name", "Corporate Outing"))
        raw_dest = str(p.get("destination", "Hill Station Route"))
        # Sanitize text (strip script blocks, style blocks, HTML tags, and javascript: protocols)
        import re
        c_clean = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", raw_customer.replace("\x00", ""), flags=re.DOTALL | re.IGNORECASE)
        c_clean = re.sub(r"<[^>]*>", "", c_clean)
        customer_name = re.sub(r"javascript:\s*", "", c_clean, flags=re.IGNORECASE).strip()[:100]

        d_clean = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", raw_dest.replace("\x00", ""), flags=re.DOTALL | re.IGNORECASE)
        d_clean = re.sub(r"<[^>]*>", "", d_clean)
        destination = re.sub(r"javascript:\s*", "", d_clean, flags=re.IGNORECASE).strip()[:200]
        start_km = float(p.get("start_km", 0.0))

        # Check if trip with this client_event_id exists
        existing_trip = await db.execute(
            select(Trip).where(Trip.client_event_id == event.client_event_id)
        )
        trip = existing_trip.scalars().first()
        if trip:
            return SyncEventResult(
                client_event_id=event.client_event_id,
                status="deduplicated",
                entity_type="trip",
                server_id=trip.id,
                message="Trip already exists",
            )

        new_trip = Trip(
            client_event_id=event.client_event_id,
            vehicle_id=p.get("vehicle_id", "BUS-14-23STR"),
            customer_name=customer_name,
            destination=destination,
            calendar_event_id=p.get("calendar_event_id"),
            driver_username=p.get("driver_username"),
            start_km=start_km,
            status="IN_PROGRESS",
            start_time=event.recorded_at,
        )
        db.add(new_trip)
        await db.flush()

        return SyncEventResult(
            client_event_id=event.client_event_id,
            status="processed",
            entity_type="trip",
            server_id=new_trip.id,
            message="Trip started successfully",
        )

    @classmethod
    async def _handle_fuel_log(cls, db: AsyncSession, event: SyncEventItem) -> SyncEventResult:
        p = event.payload
        trip_ref = p.get("trip_id")
        amount_inr = float(p.get("amount_inr", 0.0))
        liters = float(p.get("liters")) if p.get("liters") is not None else None
        image_base64 = p.get("receipt_image_base64")
        receipt_url = p.get("receipt_image_url")

        # Resolve trip by ID or client_event_id
        trip_stmt = select(Trip).where((Trip.id == trip_ref) | (Trip.client_event_id == trip_ref))
        trip_res = await db.execute(trip_stmt)
        trip = trip_res.scalars().first()

        if not trip:
            # Fallback: get the latest active trip if ref is generic
            latest_trip_stmt = select(Trip).order_by(Trip.created_at.desc()).limit(1)
            lt_res = await db.execute(latest_trip_stmt)
            trip = lt_res.scalars().first()

        if not trip:
            return SyncEventResult(
                client_event_id=event.client_event_id,
                status="rejected",
                entity_type="fuel_receipt",
                message=f"Trip reference {trip_ref} not found",
            )

        # Handle image upload if base64 provided
        if image_base64 and not receipt_url:
            receipt_url = cls._save_base64_image(image_base64, event.client_event_id)

        # Check existing fuel receipt
        existing_receipt = await db.execute(
            select(FuelReceipt).where(FuelReceipt.client_event_id == event.client_event_id)
        )
        receipt = existing_receipt.scalars().first()
        if receipt:
            return SyncEventResult(
                client_event_id=event.client_event_id,
                status="deduplicated",
                entity_type="fuel_receipt",
                server_id=receipt.id,
                message="Fuel receipt already logged",
            )

        new_receipt = FuelReceipt(
            client_event_id=event.client_event_id,
            trip_id=trip.id,
            amount_inr=amount_inr,
            liters=liters,
            receipt_image_url=receipt_url,
            recorded_at=event.recorded_at,
        )
        db.add(new_receipt)
        await db.flush()

        return SyncEventResult(
            client_event_id=event.client_event_id,
            status="processed",
            entity_type="fuel_receipt",
            server_id=new_receipt.id,
            message="Fuel receipt stored and linked",
        )

    @classmethod
    async def _handle_trip_end(cls, db: AsyncSession, event: SyncEventItem) -> SyncEventResult:
        p = event.payload
        trip_ref = p.get("trip_id")
        end_km = float(p.get("end_km", 0.0))
        cash_received_inr = float(p.get("cash_received_inr", 0.0))
        tolls_and_extras_inr = float(p.get("tolls_and_extras_inr", 0.0))

        # Find Trip
        trip_stmt = select(Trip).where((Trip.id == trip_ref) | (Trip.client_event_id == trip_ref))
        trip_res = await db.execute(trip_stmt)
        trip = trip_res.scalars().first()

        if not trip:
            # Fallback to current in-progress trip
            latest_trip_stmt = select(Trip).where(Trip.status == "IN_PROGRESS").order_by(Trip.created_at.desc()).limit(1)
            lt_res = await db.execute(latest_trip_stmt)
            trip = lt_res.scalars().first()

        if not trip:
            return SyncEventResult(
                client_event_id=event.client_event_id,
                status="rejected",
                entity_type="trip_end",
                message=f"Active trip {trip_ref} not found to complete",
            )

        # STRICT VALIDATION: end_km > start_km
        if end_km <= trip.start_km:
            return SyncEventResult(
                client_event_id=event.client_event_id,
                status="rejected",
                entity_type="trip_end",
                server_id=trip.id,
                message=f"Validation failed: end_km ({end_km}) must be strictly greater than start_km ({trip.start_km})",
            )

        # Enforce Owner-Driver Bata Rule: senthilraja or is_owner_driver is strictly 0.0
        raw_bata = float(p.get("driver_bata_inr", 0.0))
        driver_user = p.get("driver_username") or trip.driver_username
        is_owner = bool(p.get("is_owner_driver", False))
        if is_owner or (driver_user and driver_user.strip().lower() == "senthilraja"):
            effective_bata = 0.0
        else:
            effective_bata = max(0.0, raw_bata)

        # Parse Itemized Road Expenses
        toll_amount_inr = float(p.get("toll_amount_inr", 0.0))
        rto_amount_inr = float(p.get("rto_amount_inr", 0.0))
        parking_amount_inr = float(p.get("parking_amount_inr", 0.0))
        other_expenses_inr = float(p.get("other_expenses_inr", 0.0))
        itemized_total = round(toll_amount_inr + rto_amount_inr + parking_amount_inr + other_expenses_inr, 2)
        effective_tolls_extras = itemized_total if itemized_total > 0 else tolls_and_extras_inr

        # Update Trip
        trip.end_km = end_km
        trip.total_km = round(end_km - trip.start_km, 2)
        trip.cash_received_inr = cash_received_inr
        trip.toll_amount_inr = toll_amount_inr
        trip.rto_amount_inr = rto_amount_inr
        trip.parking_amount_inr = parking_amount_inr
        trip.other_expenses_inr = other_expenses_inr
        trip.tolls_and_extras_inr = effective_tolls_extras
        trip.driver_bata_inr = effective_bata
        trip.status = "COMPLETED"
        trip.end_time = event.recorded_at

        await db.flush()

        return SyncEventResult(
            client_event_id=event.client_event_id,
            status="processed",
            entity_type="trip_end",
            server_id=trip.id,
            message="Trip successfully completed and P&L finalized",
        )
