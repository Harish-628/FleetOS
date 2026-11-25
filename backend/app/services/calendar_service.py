import base64
from datetime import datetime, time, timezone
import json
from pathlib import Path
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.calendar import BookingCalendarEvent
from app.schemas.calendar import TodayBookingSuggestion


class CalendarService:
    @staticmethod
    def _get_google_calendar_service():
        """
        Initializes Google Calendar API v3 service from service account credentials.
        Supports:
        1. base64-encoded JSON string
        2. raw JSON string
        3. file path to service_account.json
        Returns None if not configured.
        """
        raw_config = settings.GOOGLE_SERVICE_ACCOUNT_JSON or settings.GOOGLE_SERVICE_ACCOUNT_FILE
        if not raw_config:
            return None

        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build

            creds_data = None
            # Check if file path
            if Path(raw_config).is_file():
                creds_data = json.loads(Path(raw_config).read_text(encoding="utf-8"))
            else:
                # Try raw JSON first
                try:
                    creds_data = json.loads(raw_config)
                except Exception:
                    # Try base64 decoded
                    decoded = base64.b64decode(raw_config).decode("utf-8")
                    creds_data = json.loads(decoded)

            if not creds_data:
                return None

            scopes = ["https://www.googleapis.com/auth/calendar.readonly"]
            credentials = service_account.Credentials.from_service_account_info(
                creds_data,
                scopes=scopes,
            )
            return build("calendar", "v3", credentials=credentials, cache_discovery=False)
        except Exception as e:
            print(f"Warning: Could not initialize Google Calendar client: {e}")
            return None

    @classmethod
    async def sync_google_calendar_events(cls, db: AsyncSession) -> list[BookingCalendarEvent]:
        """
        Fetches events from live Google Calendar API if credentials are present,
        maps colors (10=Confirmed, 5=Inquiry, 11=Maintenance), and syncs to database.
        Falls back to local database entries if credentials are not configured.
        """
        service = cls._get_google_calendar_service()
        if not service:
            # Fallback to local DB records
            stmt = select(BookingCalendarEvent).order_by(BookingCalendarEvent.start_time.asc())
            res = await db.execute(stmt)
            return list(res.scalars().all())

        try:
            now = datetime.now(timezone.utc).isoformat()
            events_result = (
                service.events()
                .list(
                    calendarId=settings.GOOGLE_CALENDAR_ID,
                    timeMin=now,
                    maxResults=50,
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )
            items = events_result.get("items", [])
            if not items:
                stmt = select(BookingCalendarEvent).order_by(BookingCalendarEvent.start_time.asc())
                res = await db.execute(stmt)
                return list(res.scalars().all())

            synced_events: list[BookingCalendarEvent] = []
            for item in items:
                g_id = item.get("id")
                title = item.get("summary", "Tour Booking")
                color_id = item.get("colorId", "10")

                start_raw = item.get("start", {}).get("dateTime") or item.get("start", {}).get("date")
                end_raw = item.get("end", {}).get("dateTime") or item.get("end", {}).get("date")

                start_dt = datetime.fromisoformat(start_raw.replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat(end_raw.replace("Z", "+00:00"))

                # Determine status by colorId
                status = "CONFIRMED"
                if color_id == "5":
                    status = "INQUIRY"
                elif color_id == "11":
                    status = "MAINTENANCE"

                customer_name = item.get("description") or title.split("-")[0].strip()
                destination = item.get("location") or "Commercial Outstation Tour"

                # Check if exists in DB
                existing = await db.execute(
                    select(BookingCalendarEvent).where(
                        BookingCalendarEvent.google_calendar_event_id == g_id
                    )
                )
                db_event = existing.scalars().first()

                if db_event:
                    db_event.title = title
                    db_event.color_id = color_id
                    db_event.status = status
                    db_event.start_time = start_dt
                    db_event.end_time = end_dt
                    db_event.customer_name = customer_name
                    db_event.destination = destination
                else:
                    db_event = BookingCalendarEvent(
                        google_calendar_event_id=g_id,
                        title=title,
                        customer_name=customer_name,
                        destination=destination,
                        start_time=start_dt,
                        end_time=end_dt,
                        color_id=color_id,
                        status=status,
                    )
                    db.add(db_event)

                synced_events.append(db_event)

            await db.commit()
            return synced_events
        except Exception as e:
            print(f"Google Calendar sync error: {e}. Falling back to database cache.")
            stmt = select(BookingCalendarEvent).order_by(BookingCalendarEvent.start_time.asc())
            res = await db.execute(stmt)
            return list(res.scalars().all())

    @staticmethod
    async def get_today_confirmed_booking(
        db: AsyncSession,
        target_date: Optional[datetime] = None,
    ) -> Optional[TodayBookingSuggestion]:
        """
        Finds today's confirmed booking (colorId: 10) to auto-fill the driver's trip start form.
        """
        ref_dt = target_date or datetime.now(timezone.utc)
        start_of_day = datetime.combine(ref_dt.date(), time.min).replace(tzinfo=timezone.utc)
        end_of_day = datetime.combine(ref_dt.date(), time.max).replace(tzinfo=timezone.utc)

        stmt = (
            select(BookingCalendarEvent)
            .where(
                BookingCalendarEvent.color_id == "10",
                BookingCalendarEvent.start_time >= start_of_day,
                BookingCalendarEvent.start_time <= end_of_day,
            )
            .order_by(BookingCalendarEvent.start_time.asc())
        )
        result = await db.execute(stmt)
        booking = result.scalars().first()

        if booking:
            return TodayBookingSuggestion(
                customer_name=booking.customer_name,
                destination=booking.destination or "Outstation Tour",
                phone=booking.phone,
                start_time=booking.start_time,
                color_id=booking.color_id,
                slot_id=booking.google_calendar_event_id or booking.id,
            )

        # Fallback to the latest confirmed upcoming booking if none today
        fallback_stmt = (
            select(BookingCalendarEvent)
            .where(BookingCalendarEvent.color_id == "10")
            .order_by(BookingCalendarEvent.start_time.desc())
        )
        fb_result = await db.execute(fallback_stmt)
        fb_booking = fb_result.scalars().first()
        if fb_booking:
            return TodayBookingSuggestion(
                customer_name=fb_booking.customer_name,
                destination=fb_booking.destination or "Bangalore to Coorg (265 KM)",
                phone=fb_booking.phone,
                start_time=fb_booking.start_time,
                color_id=fb_booking.color_id,
                slot_id=fb_booking.google_calendar_event_id or fb_booking.id,
            )

        return None

    @classmethod
    async def get_driver_slots(cls, db: AsyncSession):
        """
        Returns events from 24 hours ago through +7 days ahead for driver slot picking.
        Syncs with Google Calendar API if available, falling back to local database.
        Status is mapped to:
        - "confirmed" (colorId: "10")
        - "pending" (colorId: "5")
        - "maintenance" (colorId: "11")
        """
        from datetime import timedelta
        # Sync latest if possible
        await cls.sync_google_calendar_events(db)

        now = datetime.now(timezone.utc)
        start_window = now - timedelta(hours=24)
        end_window = now + timedelta(days=7)

        stmt = (
            select(BookingCalendarEvent)
            .where(
                BookingCalendarEvent.start_time >= start_window,
                BookingCalendarEvent.start_time <= end_window,
            )
            .order_by(BookingCalendarEvent.start_time.asc())
        )
        result = await db.execute(stmt)
        events = result.scalars().all()

        slots = []
        for e in events:
            # Map status
            status = "confirmed"
            if e.color_id == "5":
                status = "pending"
            elif e.color_id == "11":
                status = "maintenance"

            slots.append({
                "id": e.google_calendar_event_id or e.id,
                "summary": e.title,
                "customer_name": e.customer_name,
                "destination": e.destination or "Commercial Tour",
                "phone": e.phone,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "status": status,
                "color_id": e.color_id,
            })
        return slots

    @classmethod
    async def create_event(cls, db: AsyncSession, event_in) -> BookingCalendarEvent:
        """
        Creates a new booking event in database and syncs with Google Calendar API if active.
        """
        google_id = None
        service = cls._get_google_calendar_service()
        if service:
            try:
                gcal_body = {
                    "summary": event_in.title,
                    "description": f"Customer: {event_in.customer_name}\nPhone: {event_in.phone or 'N/A'}",
                    "location": event_in.destination or "",
                    "colorId": event_in.color_id,
                    "start": {"dateTime": event_in.start_time.isoformat()},
                    "end": {"dateTime": event_in.end_time.isoformat()},
                }
                g_res = service.events().insert(
                    calendarId=settings.GOOGLE_CALENDAR_ID,
                    body=gcal_body,
                ).execute()
                google_id = g_res.get("id")
            except Exception as e:
                print(f"Google Calendar insert error: {e}")

        new_event = BookingCalendarEvent(
            google_calendar_event_id=google_id,
            title=event_in.title,
            customer_name=event_in.customer_name,
            destination=event_in.destination,
            phone=event_in.phone,
            start_time=event_in.start_time,
            end_time=event_in.end_time,
            color_id=event_in.color_id,
            status=event_in.status,
        )
        db.add(new_event)
        await db.commit()
        await db.refresh(new_event)
        return new_event

    @classmethod
    async def get_advance_alerts(cls, db: AsyncSession, days_ahead: int = 5):
        """
        Returns tours starting between now and +days_ahead (5 days).
        """
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        future_limit = now + timedelta(days=days_ahead)

        stmt = (
            select(BookingCalendarEvent)
            .where(
                BookingCalendarEvent.start_time >= now,
                BookingCalendarEvent.start_time <= future_limit,
            )
            .order_by(BookingCalendarEvent.start_time.asc())
        )
        result = await db.execute(stmt)
        events = result.scalars().all()

        alerts = []
        for e in events:
            event_start = e.start_time
            if event_start.tzinfo is None:
                event_start = event_start.replace(tzinfo=timezone.utc)
            delta = event_start - now
            days_until = max(0, delta.days)

            alerts.append({
                "id": e.id,
                "title": e.title,
                "customer_name": e.customer_name,
                "destination": e.destination or "Outstation Tour",
                "phone": e.phone,
                "start_time": event_start,
                "end_time": e.end_time,
                "days_until_tour": days_until,
                "color_id": e.color_id,
                "status": e.status,
            })
        return alerts

