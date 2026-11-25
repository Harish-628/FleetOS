# FleetOS API Specification & Idempotent Sync Contract

## 1. Idempotent Offline Sync Protocol

### Endpoint: `POST /api/v1/sync/batch`
Flushes offline queued events from mobile drivers to the backend.

#### Request Body Schema
```json
{
  "client_device_id": "bus-14-samsung-tab-01",
  "batch_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "sent_at": "2026-11-23T13:40:00Z",
  "events": [
    {
      "client_event_id": "c1f7a852-6b94-4d2d-87e3-0972b9a7c3e1",
      "event_type": "TRIP_START",
      "recorded_at": "2026-11-23T06:00:00Z",
      "payload": {
        "customer_name": "Infosys Corp Outing",
        "destination": "Bangalore to Coorg",
        "start_km": 142380.0
      }
    },
    {
      "client_event_id": "e2a8b963-7c05-4e3e-98f4-1083ca08d4f2",
      "event_type": "FUEL_LOG",
      "recorded_at": "2026-11-23T09:15:00Z",
      "payload": {
        "trip_id": "c1f7a852-6b94-4d2d-87e3-0972b9a7c3e1",
        "amount_inr": 6311.0,
        "liters": 65.4,
        "receipt_image_base64": "data:image/jpeg;base64,..."
      }
    },
    {
      "client_event_id": "f3b9ca74-8d16-4f4f-09a5-2194db19e5a3",
      "event_type": "TRIP_END",
      "recorded_at": "2026-11-23T13:30:00Z",
      "payload": {
        "trip_id": "c1f7a852-6b94-4d2d-87e3-0972b9a7c3e1",
        "end_km": 142645.0,
        "cash_received_inr": 35000.0,
        "tolls_and_extras_inr": 2850.0
      }
    }
  ]
}
```

#### Idempotency Behavior
- The backend matches `client_event_id` against the `sync_event_logs` and respective entity tables (`trips`, `fuel_receipts`).
- If `client_event_id` was already processed, the backend responds with `status: "deduplicated"` and returns the existing entity without re-applying mutations or calculating costs.
- If not processed, the backend inserts the record, validates domain rules (`end_km > start_km`), and responds with `status: "processed"`.

#### Response Body Schema
```json
{
  "batch_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "processed_at": "2026-11-23T13:40:02Z",
  "results": [
    {
      "client_event_id": "c1f7a852-6b94-4d2d-87e3-0972b9a7c3e1",
      "status": "processed",
      "entity_type": "trip",
      "server_id": "c1f7a852-6b94-4d2d-87e3-0972b9a7c3e1"
    },
    {
      "client_event_id": "e2a8b963-7c05-4e3e-98f4-1083ca08d4f2",
      "status": "processed",
      "entity_type": "fuel_receipt",
      "server_id": "e2a8b963-7c05-4e3e-98f4-1083ca08d4f2"
    },
    {
      "client_event_id": "f3b9ca74-8d16-4f4f-09a5-2194db19e5a3",
      "status": "processed",
      "entity_type": "trip_completion",
      "server_id": "c1f7a852-6b94-4d2d-87e3-0972b9a7c3e1"
    }
  ]
}
```

---

## 2. Admin & Telemetry Endpoints

- `GET /api/v1/trips`: List all trips with computed metrics (`total_km`, `net_profit`, `mileage_kmpl`). Filterable by `customer_name`, `status`, `start_date`, `end_date`.
- `GET /api/v1/trips/{trip_id}`: Single trip detail with associated fuel receipts and calculation breakdown.
- `GET /api/v1/fuel`: Digital bill binder listing all fuel receipts with image URLs, liters, costs, and customer mapping.
- `POST /api/v1/uploads/receipt`: Multipart upload endpoint for receipts with `<= 250 KB` validation.
- `GET /api/v1/compliance`: Expiry status for RTO Permit, Fitness Certificate, Comprehensive Insurance, Emission (PUC) with remaining days and alert level (`GREEN`, `AMBER`, `RED`).
- `GET /api/v1/calendar`: Fleet availability calendar with Google Calendar color mappings (`10` Confirmed, `5` Inquiry, `11` Maintenance).
- `GET /api/v1/calendar/today-bookings`: Quick auto-fill suggestions for driver trip creation.
