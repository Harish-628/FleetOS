import uuid
import pytest
from httpx import AsyncClient
from app.core.config import settings
from app.core.security import create_access_token


def admin_auth_headers() -> dict:
    token = create_access_token(data={"sub": settings.ADMIN_USERNAME, "role": "admin"})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_security_headers_enforcement(client: AsyncClient):
    """
    Penetration Test: OWASP A05 Security Misconfiguration.
    Verifies that all responses return hardened HTTP security headers.
    """
    res = await client.get("/health")
    assert res.status_code == 200

    # 1. Anti-Clickjacking
    assert res.headers.get("X-Frame-Options") == "DENY"

    # 2. Anti-MIME-sniffing
    assert res.headers.get("X-Content-Type-Options") == "nosniff"

    # 3. Content Security Policy
    csp = res.headers.get("Content-Security-Policy", "")
    assert "default-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp

    # 4. Strict-Transport-Security (HSTS)
    hsts = res.headers.get("Strict-Transport-Security", "")
    assert "max-age=31536000" in hsts

    # 5. Referrer Policy & Permissions Policy
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "microphone=(self)" in res.headers.get("Permissions-Policy", "")


@pytest.mark.asyncio
async def test_anti_xss_sanitization_on_trip_start(client: AsyncClient):
    """
    Penetration Test: OWASP A03 Stored XSS Injection.
    Injecting HTML/JavaScript tags in customer_name or destination MUST be stripped.
    """
    trip_id = str(uuid.uuid4())
    driver_headers = {"X-Driver-Key": settings.DRIVER_QR_SECRET}

    xss_payload = {
        "client_device_id": "bus-14-tab",
        "batch_id": str(uuid.uuid4()),
        "sent_at": "2026-11-25T10:00:00Z",
        "events": [
            {
                "client_event_id": trip_id,
                "event_type": "TRIP_START",
                "recorded_at": "2026-11-25T10:00:00Z",
                "payload": {
                    "customer_name": "<script>alert('XSS')</script>John Doe",
                    "destination": "<img src=x onerror=alert('PWNED')>Madurai to Ooty",
                    "start_km": 160000.0,
                },
            }
        ],
    }
    r = await client.post("/api/v1/sync/batch", json=xss_payload, headers=driver_headers)
    assert r.status_code == 200

    # Query back via Admin endpoint to verify stored data has stripped tags
    admin_res = await client.get("/api/v1/trips", headers=admin_auth_headers())
    assert admin_res.status_code == 200
    trips = admin_res.json()
    saved = next((t for t in trips if t["client_event_id"] == trip_id), None)
    assert saved is not None
    # Script and img tags must be absent
    assert "<script>" not in saved["customer_name"]
    assert "</script>" not in saved["customer_name"]
    assert "<img" not in saved["destination"]
    assert "alert" not in saved["customer_name"]
    assert "John Doe" in saved["customer_name"]
    assert "Madurai to Ooty" in saved["destination"]


@pytest.mark.asyncio
async def test_batch_bomb_dos_defense(client: AsyncClient):
    """
    Penetration Test: Denial-of-Service via Batch Bombing.
    Submitting more than 100 events in a single batch request MUST be rejected (HTTP 422).
    """
    driver_headers = {"X-Driver-Key": settings.DRIVER_QR_SECRET}
    # Create 105 events
    massive_events = [
        {
            "client_event_id": str(uuid.uuid4()),
            "event_type": "TRIP_START",
            "recorded_at": "2026-11-25T10:00:00Z",
            "payload": {"customer_name": f"Customer {i}", "destination": "Route", "start_km": 100.0},
        }
        for i in range(105)
    ]
    bomb_payload = {
        "client_device_id": "malicious-client",
        "batch_id": str(uuid.uuid4()),
        "sent_at": "2026-11-25T10:00:00Z",
        "events": massive_events,
    }
    res = await client.post("/api/v1/sync/batch", json=bomb_payload, headers=driver_headers)
    assert res.status_code == 422  # Validation error: exceeds max_length=100


@pytest.mark.asyncio
async def test_invalid_driver_username_characters_rejected(client: AsyncClient):
    """
    Penetration Test: Account Creation Injection.
    Usernames containing special characters or scripts MUST be rejected.
    """
    bad_payload = {
        "username": "<script>evil</script>",
        "password": "strongPassword123",
        "full_name": "Evil Driver",
        "is_owner_driver": False,
    }
    res = await client.post("/api/v1/auth/drivers", json=bad_payload, headers=admin_auth_headers())
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_sql_wildcard_search_safety(client: AsyncClient):
    """
    Penetration Test: SQL Wildcard & Quote Injection.
    Searching with %, _, ', \", and SQL payloads MUST execute safely without 500 error or syntax failure.
    """
    test_queries = ["%", "___", "' OR '1'='1", "'; DROP TABLE trips; --", "\\"]
    for q in test_queries:
        res = await client.get(f"/api/v1/trips?customer_name={q}", headers=admin_auth_headers())
        assert res.status_code == 200
        assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_cors_preflight_restricted(client: AsyncClient):
    """
    Penetration Test: CORS Configuration Audit.
    OPTIONS preflight check must only permit whitelisted methods and headers.
    """
    origin = settings.ALLOWED_ORIGINS[0] if isinstance(settings.ALLOWED_ORIGINS, list) else "http://localhost:5173"
    res = await client.options(
        "/api/v1/trips",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )
    assert res.status_code == 200
    allow_origin = res.headers.get("access-control-allow-origin")
    assert allow_origin == origin
    allow_methods = res.headers.get("access-control-allow-methods", "")
    assert "GET" in allow_methods
    assert "POST" in allow_methods
