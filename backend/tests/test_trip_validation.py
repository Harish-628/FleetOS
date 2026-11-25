import uuid
import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_trip_end_km_validation_via_batch_sync(client: AsyncClient):
    """
    Validation Rule: end_km must strictly exceed start_km.
    Submitting end_km <= start_km must result in rejected event.
    """
    trip_id = str(uuid.uuid4())
    driver_headers = {"X-Driver-Key": settings.DRIVER_QR_SECRET}

    # Start trip at 142000 KM
    start_payload = {
        "client_device_id": "bus-14-tab",
        "batch_id": str(uuid.uuid4()),
        "sent_at": "2026-11-23T14:00:00Z",
        "events": [
            {
                "client_event_id": trip_id,
                "event_type": "TRIP_START",
                "recorded_at": "2026-11-23T06:00:00Z",
                "payload": {
                    "customer_name": "Test Customer",
                    "destination": "Test Route",
                    "start_km": 142000.0,
                },
            }
        ],
    }
    r1 = await client.post("/api/v1/sync/batch", json=start_payload, headers=driver_headers)
    assert r1.status_code == 200

    # End trip with invalid end_km (141500 < 142000)
    end_payload_invalid = {
        "client_device_id": "bus-14-tab",
        "batch_id": str(uuid.uuid4()),
        "sent_at": "2026-11-23T14:10:00Z",
        "events": [
            {
                "client_event_id": str(uuid.uuid4()),
                "event_type": "TRIP_END",
                "recorded_at": "2026-11-23T14:05:00Z",
                "payload": {
                    "trip_id": trip_id,
                    "end_km": 141500.0,  # Invalid! Lower than start_km
                    "cash_received_inr": 10000.0,
                    "tolls_and_extras_inr": 500.0,
                },
            }
        ],
    }
    r2 = await client.post("/api/v1/sync/batch", json=end_payload_invalid, headers=driver_headers)
    assert r2.status_code == 200
    res2 = r2.json()
    assert res2["rejected_count"] == 1
    assert "must be strictly greater than start_km" in res2["results"][0]["message"]


@pytest.mark.asyncio
async def test_itemized_road_expenses_persistence(client: AsyncClient):
    """
    Test that separate toll, rto, parking, and other expenses are parsed,
    summed into tolls_and_extras_inr, and persisted on the Trip entity.
    """
    trip_id = str(uuid.uuid4())
    driver_headers = {"X-Driver-Key": settings.DRIVER_QR_SECRET}

    start_payload = {
        "client_device_id": "bus-14-tab",
        "batch_id": str(uuid.uuid4()),
        "sent_at": "2026-11-23T15:00:00Z",
        "events": [
            {
                "client_event_id": trip_id,
                "event_type": "TRIP_START",
                "recorded_at": "2026-11-23T07:00:00Z",
                "payload": {
                    "customer_name": "Vinoth Travels Group",
                    "destination": "Ooty Tour",
                    "start_km": 150000.0,
                },
            }
        ],
    }
    r1 = await client.post("/api/v1/sync/batch", json=start_payload, headers=driver_headers)
    assert r1.status_code == 200

    # End trip with separate road expense boxes
    end_payload = {
        "client_device_id": "bus-14-tab",
        "batch_id": str(uuid.uuid4()),
        "sent_at": "2026-11-23T18:00:00Z",
        "events": [
            {
                "client_event_id": str(uuid.uuid4()),
                "event_type": "TRIP_END",
                "recorded_at": "2026-11-23T18:00:00Z",
                "payload": {
                    "trip_id": trip_id,
                    "end_km": 150450.0,
                    "cash_received_inr": 25000.0,
                    "toll_amount_inr": 850.0,
                    "rto_amount_inr": 400.0,
                    "parking_amount_inr": 150.0,
                    "other_expenses_inr": 200.0,
                },
            }
        ],
    }
    r2 = await client.post("/api/v1/sync/batch", json=end_payload, headers=driver_headers)
    assert r2.status_code == 200
    res2 = r2.json()
    assert res2["processed_count"] == 1

    # Verify via Admin trips list
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_PASSWORD},
    )
    assert login_res.status_code == 200
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    trips_res = await client.get("/api/v1/trips", headers=admin_headers)
    assert trips_res.status_code == 200
    saved_trip = next((t for t in trips_res.json() if t["client_event_id"] == trip_id), None)
    assert saved_trip is not None
    assert saved_trip["toll_amount_inr"] == 850.0
    assert saved_trip["rto_amount_inr"] == 400.0
    assert saved_trip["parking_amount_inr"] == 150.0
    assert saved_trip["other_expenses_inr"] == 200.0
    # Total sum should be 850 + 400 + 150 + 200 = 1600.0
    assert saved_trip["tolls_and_extras_inr"] == 1600.0

