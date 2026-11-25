import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token
from app.models.fuel import FuelReceipt
from app.models.trip import Trip


@pytest.mark.asyncio
async def test_idempotent_batch_sync_duplicate_acknowledgement(client: AsyncClient, db_session: AsyncSession):
    """
    Critical Requirement Test:
    Verify that if a network drop causes the driver's phone to retry a batch sync
    with identical client_event_id, the server:
    1. Acknowledges all events successfully
    2. Marks repeated events as 'deduplicated'
    3. Guarantees ZERO duplicate trips or duplicate fuel records
    4. Never double-counts expenses or KM
    """
    trip_event_id = str(uuid.uuid4())
    fuel_event_id = str(uuid.uuid4())
    trip_end_event_id = str(uuid.uuid4())

    driver_headers = {"X-Driver-Key": settings.DRIVER_QR_SECRET}
    admin_token = create_access_token({"sub": settings.ADMIN_USERNAME, "role": "admin"})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    payload = {
        "client_device_id": "bus-14-tab",
        "batch_id": str(uuid.uuid4()),
        "sent_at": "2026-11-23T14:00:00Z",
        "events": [
            {
                "client_event_id": trip_event_id,
                "event_type": "TRIP_START",
                "recorded_at": "2026-11-23T06:00:00Z",
                "payload": {
                    "customer_name": "Infosys Corp Outing",
                    "destination": "Bangalore to Coorg",
                    "start_km": 142000.0,
                },
            },
            {
                "client_event_id": fuel_event_id,
                "event_type": "FUEL_LOG",
                "recorded_at": "2026-11-23T09:30:00Z",
                "payload": {
                    "trip_id": trip_event_id,
                    "amount_inr": 5000.0,
                    "liters": 50.0,
                },
            },
            {
                "client_event_id": trip_end_event_id,
                "event_type": "TRIP_END",
                "recorded_at": "2026-11-23T18:00:00Z",
                "payload": {
                    "trip_id": trip_event_id,
                    "end_km": 142300.0,
                    "cash_received_inr": 20000.0,
                    "tolls_and_extras_inr": 1500.0,
                },
            },
        ],
    }

    # First Submission (Fresh Sync)
    resp1 = await client.post("/api/v1/sync/batch", json=payload, headers=driver_headers)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["processed_count"] == 3
    assert data1["deduplicated_count"] == 0
    assert all(r["status"] == "processed" for r in data1["results"])

    # Second Submission (Duplicate Retry due to dropped ACK)
    resp2 = await client.post("/api/v1/sync/batch", json=payload, headers=driver_headers)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["processed_count"] == 0
    assert data2["deduplicated_count"] == 3
    assert all(r["status"] == "deduplicated" for r in data2["results"])

    # Third Submission (Another retry)
    resp3 = await client.post("/api/v1/sync/batch", json=payload, headers=driver_headers)
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert data3["deduplicated_count"] == 3

    # Assert exactly 1 Trip and 1 FuelReceipt exist in Database
    trips_query = await db_session.execute(select(Trip))
    all_trips = trips_query.scalars().all()
    assert len(all_trips) == 1
    assert all_trips[0].client_event_id == trip_event_id
    assert all_trips[0].start_km == 142000.0
    assert all_trips[0].end_km == 142300.0
    assert all_trips[0].total_km == 300.0
    assert all_trips[0].cash_received_inr == 20000.0

    fuel_query = await db_session.execute(select(FuelReceipt))
    all_fuels = fuel_query.scalars().all()
    assert len(all_fuels) == 1
    assert all_fuels[0].amount_inr == 5000.0
    assert all_fuels[0].liters == 50.0

    # Query through the API to ensure P&L is not multiplied (with Admin Bearer header)
    trips_api = await client.get("/api/v1/trips", headers=admin_headers)
    assert trips_api.status_code == 200
    trips_list = trips_api.json()
    assert len(trips_list) == 1
    t = trips_list[0]
    # Net Profit = cash_received (20,000) - diesel (5,000) - tolls (1,500) = 13,500
    assert t["total_km"] == 300.0
    assert t["total_fuel_amount_inr"] == 5000.0
    assert t["total_fuel_liters"] == 50.0
    assert t["net_profit_inr"] == 13500.0
    # Mileage = 300 km / 50 L = 6.0 km/L
    assert t["mileage_kmpl"] == 6.0
