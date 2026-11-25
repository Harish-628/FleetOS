import io
from unittest.mock import MagicMock, patch
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token
from app.services.calendar_service import CalendarService
from app.services.storage_service import StorageService


@pytest.fixture
def admin_token() -> str:
    return create_access_token(data={"sub": settings.ADMIN_USERNAME, "role": "admin"})


@pytest.mark.asyncio
async def test_unauthenticated_admin_endpoints_blocked(client: AsyncClient):
    """
    Security Invariant Test:
    All /admin data routes MUST return 401 Unauthorized when requested
    without an Authorization: Bearer <token> header.
    """
    # 1. Trips
    r_trips = await client.get("/api/v1/trips")
    assert r_trips.status_code == 401
    assert "WWW-Authenticate" in r_trips.headers

    # 2. Compliance
    r_comp = await client.get("/api/v1/compliance")
    assert r_comp.status_code == 401

    # 3. Fuel receipts
    r_fuel = await client.get("/api/v1/fuel")
    assert r_fuel.status_code == 401

    # 4. Admin Calendar
    r_cal = await client.get("/api/v1/calendar")
    assert r_cal.status_code == 401


@pytest.mark.asyncio
async def test_admin_login_and_jwt_verification(client: AsyncClient):
    """
    Tests Argon2 password verification and JWT access token workflow.
    """
    # 1. Invalid credentials -> 401
    bad_login = await client.post("/api/v1/auth/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": "wrong_password_123",
    })
    assert bad_login.status_code == 401

    # 2. Valid credentials -> 200 with JWT
    good_login = await client.post("/api/v1/auth/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": settings.ADMIN_PASSWORD,
    })
    assert good_login.status_code == 200
    token_data = good_login.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    token = token_data["access_token"]

    # 3. Use issued JWT to unlock protected admin endpoints
    headers = {"Authorization": f"Bearer {token}"}
    r_trips = await client.get("/api/v1/trips", headers=headers)
    assert r_trips.status_code == 200

    r_comp = await client.get("/api/v1/compliance", headers=headers)
    assert r_comp.status_code == 200
    assert "items" in r_comp.json()


@pytest.mark.asyncio
async def test_driver_key_authentication(client: AsyncClient):
    """
    Driver-facing endpoints MUST reject missing/invalid X-Driver-Key (401)
    and accept valid X-Driver-Key (200).
    """
    # 1. /api/v1/calendar/today without key -> 401
    r_cal_no_key = await client.get("/api/v1/calendar/today")
    assert r_cal_no_key.status_code == 401

    # 2. /api/v1/calendar/today with wrong key -> 401
    r_cal_bad_key = await client.get(
        "/api/v1/calendar/today",
        headers={"X-Driver-Key": "invalid-secret-key"},
    )
    assert r_cal_bad_key.status_code == 401

    # 3. /api/v1/calendar/today with correct driver key -> 200
    r_cal_good_key = await client.get(
        "/api/v1/calendar/today",
        headers={"X-Driver-Key": settings.DRIVER_QR_SECRET},
    )
    assert r_cal_good_key.status_code == 200

    # 4. /api/v1/calendar/driver-slots without key -> 401
    r_slots_no_key = await client.get("/api/v1/calendar/driver-slots")
    assert r_slots_no_key.status_code == 401

    # 5. /api/v1/calendar/driver-slots with valid key -> 200 list
    r_slots_good_key = await client.get(
        "/api/v1/calendar/driver-slots",
        headers={"X-Driver-Key": settings.DRIVER_QR_SECRET},
    )
    assert r_slots_good_key.status_code == 200
    assert isinstance(r_slots_good_key.json(), list)

    # 6. /api/v1/sync/batch without key -> 401
    r_sync_no_key = await client.post("/api/v1/sync/batch", json={
        "client_device_id": "test",
        "batch_id": str(uuid.uuid4()),
        "sent_at": "2026-11-23T14:00:00Z",
        "events": [],
    })
    assert r_sync_no_key.status_code == 401


@pytest.mark.asyncio
async def test_trip_start_persists_calendar_event_id(client: AsyncClient, db_session: AsyncSession):
    """
    Verifies that POST /api/v1/sync/batch persists calendar_event_id for trip_start events.
    """
    from sqlalchemy import select
    from app.models.trip import Trip

    client_id = str(uuid.uuid4())
    cal_event_id = "gcal_slot_conf_99"

    sync_payload = {
        "client_device_id": "driver-test-device",
        "batch_id": str(uuid.uuid4()),
        "sent_at": "2026-11-23T14:00:00Z",
        "events": [
            {
                "client_event_id": client_id,
                "event_type": "TRIP_START",
                "recorded_at": "2026-11-23T14:00:00Z",
                "payload": {
                    "vehicle_id": "BUS-14-23STR",
                    "customer_name": "TCS Team Outing",
                    "destination": "Bangalore to Chikmagalur",
                    "calendar_event_id": cal_event_id,
                    "start_km": 150000.0,
                },
            }
        ],
    }

    resp = await client.post(
        "/api/v1/sync/batch",
        json=sync_payload,
        headers={"X-Driver-Key": settings.DRIVER_QR_SECRET},
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert res_data["processed_count"] == 1

    # Verify trip in DB has calendar_event_id
    stmt = select(Trip).where(Trip.client_event_id == client_id)
    trip_res = await db_session.execute(stmt)
    saved_trip = trip_res.scalars().first()
    assert saved_trip is not None
    assert saved_trip.customer_name == "TCS Team Outing"
    assert saved_trip.calendar_event_id == cal_event_id



@pytest.mark.asyncio
async def test_upload_file_magic_bytes_and_size_limits(client: AsyncClient):
    """
    Tests upload hardening:
    - 400 Bad Request for disguised scripts/text
    - 413 Payload Too Large for > 1 MB
    - 200 for valid JPEG/WebP
    """
    driver_headers = {"X-Driver-Key": settings.DRIVER_QR_SECRET}

    # 1. Disguised executable/script as .jpg
    fake_jpg = b"echo 'Malicious Script Payload'"
    files_fake = {"file": ("malicious.jpg", fake_jpg, "image/jpeg")}
    r_fake = await client.post("/api/v1/uploads/receipt", files=files_fake, headers=driver_headers)
    assert r_fake.status_code == 400
    assert "Disguised or unsupported file format" in r_fake.json()["detail"]

    # 2. Payload Too Large (> 1 MB)
    large_payload = b"\xff\xd8\xff\xe0" + b"X" * (1024 * 1024 + 50)
    files_large = {"file": ("huge_receipt.jpg", large_payload, "image/jpeg")}
    r_large = await client.post("/api/v1/uploads/receipt", files=files_large, headers=driver_headers)
    assert r_large.status_code == 413
    assert "exceeds 1 MB limit" in r_large.json()["detail"]

    # 3. Valid JPEG Magic Bytes (FF D8 FF)
    valid_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 200
    files_valid = {"file": ("valid_diesel_bill.jpg", valid_jpg, "image/jpeg")}
    with patch.object(settings, "STORAGE_BACKEND", "local"):
        r_valid = await client.post("/api/v1/uploads/receipt", files=files_valid, headers=driver_headers)
    assert r_valid.status_code == 200
    res_data = r_valid.json()
    assert "url" in res_data
    assert res_data["url"].endswith(".jpg")



def test_storage_service_s3_upload_mock():
    """
    Verifies generic S3-compatible (Supabase / R2 / AWS) upload logic using mocked boto3.
    """
    valid_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 100

    # 1. Test generic S3 backend (e.g., Supabase Storage)
    with patch.object(settings, "STORAGE_BACKEND", "s3"), \
         patch.object(settings, "S3_ENDPOINT_URL", "https://xyzcompany.storage.supabase.co/storage/v1/s3"), \
         patch.object(settings, "S3_REGION", "ap-southeast-1"), \
         patch.object(settings, "S3_ACCESS_KEY_ID", "key_12345"), \
         patch.object(settings, "S3_SECRET_ACCESS_KEY", "sec_12345"), \
         patch.object(settings, "S3_BUCKET_NAME", "fleetos-receipts"), \
         patch.object(settings, "S3_PUBLIC_URL", "https://xyzcompany.supabase.co/storage/v1/object/public/fleetos-receipts"), \
         patch("boto3.client") as mock_boto:

        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3

        result = StorageService.save_image(valid_jpg, "diesel.jpg")

        assert result["backend"] == "s3"
        assert result["url"].startswith("https://xyzcompany.supabase.co/storage/v1/object/public/fleetos-receipts/")
        assert mock_s3.upload_fileobj.called
        mock_boto.assert_called_once()
        _, kwargs = mock_boto.call_args
        assert kwargs["endpoint_url"] == "https://xyzcompany.storage.supabase.co/storage/v1/s3"
        assert kwargs["region_name"] == "ap-southeast-1"
        assert kwargs["aws_access_key_id"] == "key_12345"
        assert kwargs["aws_secret_access_key"] == "sec_12345"

    # 2. Test R2 alias compatibility
    with patch.object(settings, "STORAGE_BACKEND", "r2"), \
         patch.object(settings, "S3_ENDPOINT_URL", "https://acc123.r2.cloudflarestorage.com"), \
         patch.object(settings, "S3_REGION", "auto"), \
         patch.object(settings, "S3_ACCESS_KEY_ID", "r2_key"), \
         patch.object(settings, "S3_SECRET_ACCESS_KEY", "r2_sec"), \
         patch.object(settings, "S3_BUCKET_NAME", "fleetos-receipts"), \
         patch.object(settings, "S3_PUBLIC_URL", "https://receipts.fleetos.com"), \
         patch("boto3.client") as mock_boto_r2:

        mock_s3_r2 = MagicMock()
        mock_boto_r2.return_value = mock_s3_r2

        result_r2 = StorageService.save_image(valid_jpg, "toll.jpg")
        assert result_r2["backend"] == "r2"
        assert result_r2["url"].startswith("https://receipts.fleetos.com/")
        assert mock_s3_r2.upload_fileobj.called


@pytest.mark.asyncio
async def test_google_calendar_service_sync_and_color_mapping(db_session: AsyncSession):
    """
    Verifies that Google Calendar sync correctly maps colorId:
    - 10 -> CONFIRMED
    - 5 -> INQUIRY
    - 11 -> MAINTENANCE
    """
    mock_items = [
        {
            "id": "gcal_sync_01",
            "summary": "Infosys Corporate Outing",
            "description": "Infosys Group",
            "location": "Bangalore to Coorg",
            "colorId": "10",
            "start": {"dateTime": "2026-11-23T06:00:00Z"},
            "end": {"dateTime": "2026-11-25T18:00:00Z"},
        },
        {
            "id": "gcal_sync_02",
            "summary": "Wipro Weekend Tour Quote",
            "description": "Wipro Inquiry",
            "location": "Bangalore to Ooty",
            "colorId": "5",
            "start": {"dateTime": "2026-11-27T06:00:00Z"},
            "end": {"dateTime": "2026-11-29T18:00:00Z"},
        },
        {
            "id": "gcal_sync_03",
            "summary": "FC Inspection & Brake Lining",
            "description": "Workshop",
            "location": "RTO Track",
            "colorId": "11",
            "start": {"dateTime": "2026-12-01T08:00:00Z"},
            "end": {"dateTime": "2026-12-01T17:00:00Z"},
        },
    ]

    mock_service = MagicMock()
    mock_events_resource = MagicMock()
    mock_list_request = MagicMock()
    mock_list_request.execute.return_value = {"items": mock_items}
    mock_events_resource.list.return_value = mock_list_request
    mock_service.events.return_value = mock_events_resource

    with patch.object(CalendarService, "_get_google_calendar_service", return_value=mock_service):
        events = await CalendarService.sync_google_calendar_events(db_session)

        assert len(events) == 3
        e10 = next(e for e in events if e.google_calendar_event_id == "gcal_sync_01")
        assert e10.status == "CONFIRMED"
        assert e10.color_id == "10"

        e5 = next(e for e in events if e.google_calendar_event_id == "gcal_sync_02")
        assert e5.status == "INQUIRY"
        assert e5.color_id == "5"

        e11 = next(e for e in events if e.google_calendar_event_id == "gcal_sync_03")
        assert e11.status == "MAINTENANCE"
        assert e11.color_id == "11"


@pytest.mark.asyncio
async def test_driver_login_and_bata_enforcement(client: AsyncClient, admin_token: str):
    """
    Tests:
    1. Driver login with senthilraja / senthilraja123
    2. Owner-Driver Bata Rule:
       - senthilraja trip completion enforces driver_bata_inr = 0.0 in P&L
       - hired driver trip completion preserves driver_bata_inr in P&L
    """
    # 1. Driver Login
    login_res = await client.post("/api/v1/auth/driver-login", json={
        "username": "senthilraja",
        "password": "senthilraja123",
    })
    assert login_res.status_code == 200
    driver_data = login_res.json()
    assert driver_data["username"] == "senthilraja"
    assert driver_data["is_owner_driver"] is True
    driver_token = driver_data["access_token"]

    # 2. Start Trip with senthilraja via sync/batch
    trip_event_id = str(uuid.uuid4())
    sync_res = await client.post(
        "/api/v1/sync/batch",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={
            "client_device_id": "phone-senthilraja-01",
            "batch_id": str(uuid.uuid4()),
            "sent_at": "2026-11-25T10:00:00Z",
            "events": [
                {
                    "client_event_id": trip_event_id,
                    "event_type": "TRIP_START",
                    "recorded_at": "2026-11-25T10:00:00Z",
                    "payload": {
                        "customer_name": "TCS Family Outing",
                        "destination": "Mysore Palace",
                        "start_km": 150000,
                        "driver_username": "senthilraja",
                    },
                }
            ],
        },
    )
    assert sync_res.status_code == 200

    # 3. Complete Trip trying to pass bata 1500 -> Rule MUST force to 0.0
    end_event_id = str(uuid.uuid4())
    sync_end = await client.post(
        "/api/v1/sync/batch",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={
            "client_device_id": "phone-senthilraja-01",
            "batch_id": str(uuid.uuid4()),
            "sent_at": "2026-11-25T20:00:00Z",
            "events": [
                {
                    "client_event_id": end_event_id,
                    "event_type": "TRIP_END",
                    "recorded_at": "2026-11-25T20:00:00Z",
                    "payload": {
                        "trip_id": trip_event_id,
                        "end_km": 150350,
                        "cash_received_inr": 25000,
                        "tolls_and_extras_inr": 1500,
                        "driver_bata_inr": 2000,  # Should be zeroed out for senthilraja
                        "driver_username": "senthilraja",
                        "is_owner_driver": True,
                    },
                }
            ],
        },
    )
    assert sync_end.status_code == 200

    # 4. Fetch trip via Admin API and verify P&L calculation
    trips_res = await client.get("/api/v1/trips", headers={"Authorization": f"Bearer {admin_token}"})
    assert trips_res.status_code == 200
    trips = trips_res.json()
    owner_trip = next(t for t in trips if t["client_event_id"] == trip_event_id)
    assert owner_trip["driver_bata_inr"] == 0.0
    # Net profit = 25000 - 1500 - 0 = 23500
    assert owner_trip["net_profit_inr"] == 23500.0


@pytest.mark.asyncio
async def test_admin_create_driver_and_hired_driver_bata(client: AsyncClient, admin_token: str):
    """
    Tests:
    1. Admin creates a hired driver (is_owner_driver=False)
    2. Hired driver completes a trip and driver_bata_inr is included in P&L expenses.
    """
    # 1. Admin creates driver
    driver_uname = f"driver_{uuid.uuid4().hex[:6]}"
    create_res = await client.post(
        "/api/v1/auth/drivers",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "username": driver_uname,
            "password": "driverpassword123",
            "full_name": "Murugan Driver",
            "is_owner_driver": False,
        },
    )
    assert create_res.status_code == 201

    # 2. Login as hired driver
    hired_login = await client.post("/api/v1/auth/driver-login", json={
        "username": driver_uname,
        "password": "driverpassword123",
    })
    assert hired_login.status_code == 200
    hired_token = hired_login.json()["access_token"]

    # 3. Start & Complete Trip with Bata = 1200
    trip_id = str(uuid.uuid4())
    end_id = str(uuid.uuid4())
    await client.post(
        "/api/v1/sync/batch",
        headers={"Authorization": f"Bearer {hired_token}"},
        json={
            "client_device_id": "phone-hired-01",
            "batch_id": str(uuid.uuid4()),
            "sent_at": "2026-11-25T10:00:00Z",
            "events": [
                {
                    "client_event_id": trip_id,
                    "event_type": "TRIP_START",
                    "recorded_at": "2026-11-25T10:00:00Z",
                    "payload": {
                        "customer_name": "Apollo Hospitals Trip",
                        "destination": "Chennai to Pondicherry",
                        "start_km": 160000,
                        "driver_username": driver_uname,
                    },
                },
                {
                    "client_event_id": end_id,
                    "event_type": "TRIP_END",
                    "recorded_at": "2026-11-25T20:00:00Z",
                    "payload": {
                        "trip_id": trip_id,
                        "end_km": 160300,
                        "cash_received_inr": 20000,
                        "tolls_and_extras_inr": 1000,
                        "driver_bata_inr": 1200,
                        "driver_username": driver_uname,
                        "is_owner_driver": False,
                    },
                },
            ],
        },
    )

    # Check P&L
    trips_res = await client.get("/api/v1/trips", headers={"Authorization": f"Bearer {admin_token}"})
    hired_trip = next(t for t in trips_res.json() if t["client_event_id"] == trip_id)
    assert hired_trip["driver_bata_inr"] == 1200.0
    # Net profit = 20000 - 1000 - 1200 = 17800
    assert hired_trip["net_profit_inr"] == 17800.0


@pytest.mark.asyncio
async def test_calendar_events_creation_and_advance_alerts(client: AsyncClient, admin_token: str):
    """
    Tests:
    1. POST /api/v1/calendar/events creates a new booking.
    2. GET /api/v1/calendar/advance-alerts returns upcoming tours within 5 days.
    """
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    tour_start = now + timedelta(days=2)
    tour_end = tour_start + timedelta(days=2)

    create_res = await client.post(
        "/api/v1/calendar/events",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Tirupati Balaji Pilgrimage Tour",
            "customer_name": "Ramanathan Family",
            "destination": "Bangalore to Tirupati",
            "phone": "+91 94440 98765",
            "start_time": tour_start.isoformat(),
            "end_time": tour_end.isoformat(),
            "color_id": "10",
            "status": "CONFIRMED",
        },
    )
    assert create_res.status_code == 201
    created_event = create_res.json()
    assert created_event["title"] == "Tirupati Balaji Pilgrimage Tour"

    # Get Advance Alerts
    alerts_res = await client.get(
        "/api/v1/calendar/advance-alerts",
        headers={"X-Driver-Key": settings.DRIVER_QR_SECRET},
    )
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    alert_event = next((a for a in alerts if a["title"] == "Tirupati Balaji Pilgrimage Tour"), None)
    assert alert_event is not None
    assert alert_event["days_until_tour"] <= 3


@pytest.mark.asyncio
async def test_multiday_duration_tour_booking(client: AsyncClient, admin_token: str):
    """
    Tests creating a 5-day tour and a 10-day tour duration on the calendar
    and verifying date ranges and availability.
    """
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    
    # 5-day Kerala tour
    kerala_start = now + timedelta(days=7)
    kerala_end = kerala_start + timedelta(days=5)

    res_5d = await client.post(
        "/api/v1/calendar/events",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "5-Day Kerala Backwaters & Munnar Tour",
            "customer_name": "TCS Recreation Club",
            "destination": "Bangalore - Munnar - Thekkady - Alleppey",
            "phone": "+91 98451 11223",
            "start_time": kerala_start.isoformat(),
            "end_time": kerala_end.isoformat(),
            "color_id": "10",
            "status": "CONFIRMED",
        },
    )
    assert res_5d.status_code == 201
    evt_5d = res_5d.json()
    assert evt_5d["title"] == "5-Day Kerala Backwaters & Munnar Tour"
    start_dt = datetime.fromisoformat(evt_5d["start_time"])
    end_dt = datetime.fromisoformat(evt_5d["end_time"])
    duration_days = (end_dt - start_dt).days
    assert duration_days == 5

    # 10-day South India Grand Tour
    south_start = now + timedelta(days=15)
    south_end = south_start + timedelta(days=10)

    res_10d = await client.post(
        "/api/v1/calendar/events",
        headers={"X-Driver-Key": settings.DRIVER_QR_SECRET},
        json={
            "title": "10-Day South India Grand Heritage Tour",
            "customer_name": "Sri Krishna Pilgrimage Group",
            "destination": "Rameswaram - Madurai - Kanyakumari - Trivandrum",
            "phone": "+91 94433 88776",
            "start_time": south_start.isoformat(),
            "end_time": south_end.isoformat(),
            "color_id": "10",
            "status": "CONFIRMED",
        },
    )
    assert res_10d.status_code == 201
    evt_10d = res_10d.json()
    assert evt_10d["title"] == "10-Day South India Grand Heritage Tour"
    duration_10d = (datetime.fromisoformat(evt_10d["end_time"]) - datetime.fromisoformat(evt_10d["start_time"])).days
    assert duration_10d == 10

