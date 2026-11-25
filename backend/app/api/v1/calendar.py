from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    get_current_admin,
    get_current_admin_or_owner_driver,
    verify_driver_key,
)
from app.models.calendar import BookingCalendarEvent
from app.schemas.calendar import (
    AdvanceTourAlert,
    BookingCalendarEventCreate,
    BookingCalendarEventRead,
    DriverSlotRead,
    TodayBookingSuggestion,
)
from app.services.calendar_service import CalendarService

router = APIRouter(prefix="/calendar", tags=["Fleet Calendar"])


@router.get("", response_model=list[BookingCalendarEventRead])
async def list_calendar_events(
    auth: str = Depends(verify_driver_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns calendar bookings adhering to Google Calendar API color codes:
    - 🟢 Green ("10"): Confirmed Trip
    - 🟡 Yellow ("5"): Pending Inquiry / Quote
    - 🔴 Red ("11"): Scheduled Maintenance / FC Renewal
    Synchronizes with Google Calendar API when Service Account is configured.
    Accessible to both Admin and Driver views.
    """
    # 1. Sync live from Google Calendar if configured
    events = await CalendarService.sync_google_calendar_events(db)

    # 2. If completely empty, check if any records exist in database
    if not events:
        existing_stmt = select(BookingCalendarEvent).order_by(BookingCalendarEvent.start_time.asc())
        existing_res = await db.execute(existing_stmt)
        existing_all = list(existing_res.scalars().all())
        if existing_all:
            return [BookingCalendarEventRead.model_validate(e) for e in existing_all]

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=5, minute=30, second=0, microsecond=0)
        
        sample_events = [
            BookingCalendarEvent(
                google_calendar_event_id="gcal_conf_01",
                title="Infosys Corp Outing - Bangalore to Coorg",
                customer_name="Infosys Technologies Ltd (Rajesh Sharma)",
                destination="Bangalore to Coorg (Madikeri)",
                phone="+91 98450 12345",
                start_time=today_start,
                end_time=today_start + timedelta(days=2),
                color_id="10",
                status="CONFIRMED",
            ),
            BookingCalendarEvent(
                google_calendar_event_id="gcal_inq_02",
                title="Wipro Tech Team Outing - Ooty & Conoor",
                customer_name="Wipro Digital (Ananya Roy)",
                destination="Bangalore to Ooty",
                phone="+91 98411 67890",
                start_time=today_start + timedelta(days=4),
                end_time=today_start + timedelta(days=6),
                color_id="5",
                status="INQUIRY",
            ),
            BookingCalendarEvent(
                google_calendar_event_id="gcal_maint_03",
                title="Brake Lining Overhaul & RTO FC Test Prep",
                customer_name="Sri Raghavendra Motors Workshop",
                destination="Authorized Heavy Vehicle RTO Test Track",
                phone="+91 94480 55443",
                start_time=today_start + timedelta(days=8),
                end_time=today_start + timedelta(days=9),
                color_id="11",
                status="MAINTENANCE",
            ),
        ]
        for se in sample_events:
            chk = await db.execute(
                select(BookingCalendarEvent).where(
                    BookingCalendarEvent.google_calendar_event_id == se.google_calendar_event_id
                )
            )
            if not chk.scalars().first():
                db.add(se)
        await db.commit()
        
        refetched = await db.execute(select(BookingCalendarEvent).order_by(BookingCalendarEvent.start_time.asc()))
        return [BookingCalendarEventRead.model_validate(e) for e in refetched.scalars().all()]

    return [BookingCalendarEventRead.model_validate(e) for e in events]


@router.get("/today", response_model=Optional[TodayBookingSuggestion])
async def get_today_booking_for_driver(
    driver_key: str = Depends(verify_driver_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns today's confirmed trip for the driver's one-click smart auto-fill.
    Protected by X-Driver-Key header.
    """
    return await CalendarService.get_today_confirmed_booking(db)


@router.get("/today-bookings", response_model=Optional[TodayBookingSuggestion])
async def get_today_booking_suggestion_alias(
    driver_key: str = Depends(verify_driver_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Backward-compatible alias for /today.
    """
    return await CalendarService.get_today_confirmed_booking(db)


@router.get("/driver-slots", response_model=list[DriverSlotRead])
async def get_driver_calendar_slots(
    driver_key: str = Depends(verify_driver_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Queries events from 24 hours ago through +7 days ahead for driver slot picking.
    Protected by X-Driver-Key header.
    """
    return await CalendarService.get_driver_slots(db)


@router.post("/events", response_model=BookingCalendarEventRead, status_code=201)
async def create_calendar_booking(
    body: BookingCalendarEventCreate,
    auth_user: dict = Depends(get_current_admin_or_owner_driver),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new tour booking event in database and syncs with Google Calendar.
    Authorized for Admin and Owner-Driver (senthilraja).
    """
    event = await CalendarService.create_event(db, body)
    return BookingCalendarEventRead.model_validate(event)


@router.get("/advance-alerts", response_model=list[AdvanceTourAlert])
async def get_advance_tour_alerts(
    driver_key: str = Depends(verify_driver_key),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns upcoming tour bookings starting within the next 5 days.
    Powers in-app notification bell, warning banner, and PWA system notifications.
    """
    return await CalendarService.get_advance_alerts(db, days_ahead=5)

