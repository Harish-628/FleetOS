from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.auth import router as auth_router
from app.api.v1.calendar import router as calendar_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.fuel import router as fuel_router
from app.api.v1.sync import router as sync_router
from app.api.v1.trips import router as trips_router
from app.api.v1.uploads import router as uploads_router
from app.core.config import settings
from app.core.database import Base, engine
from app.core.limiter import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe migration for trips columns on PostgreSQL/SQLite
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_username VARCHAR(50);"))
            await conn.execute(text("ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_bata_inr FLOAT DEFAULT 0.0;"))
            await conn.execute(text("ALTER TABLE trips ADD COLUMN IF NOT EXISTS toll_amount_inr FLOAT DEFAULT 0.0;"))
            await conn.execute(text("ALTER TABLE trips ADD COLUMN IF NOT EXISTS rto_amount_inr FLOAT DEFAULT 0.0;"))
            await conn.execute(text("ALTER TABLE trips ADD COLUMN IF NOT EXISTS parking_amount_inr FLOAT DEFAULT 0.0;"))
            await conn.execute(text("ALTER TABLE trips ADD COLUMN IF NOT EXISTS other_expenses_inr FLOAT DEFAULT 0.0;"))
        except Exception:
            pass

    # Seed default owner-driver senthilraja if not present
    try:
        from sqlalchemy import select
        from app.core.database import async_session_factory
        from app.core.security import hash_password
        from app.models.user import DriverUser
        async with async_session_factory() as session:
            stmt = select(DriverUser).where(DriverUser.username == settings.DEFAULT_DRIVER_USERNAME)
            res = await session.execute(stmt)
            if not res.scalars().first():
                owner = DriverUser(
                    username=settings.DEFAULT_DRIVER_USERNAME,
                    full_name=settings.DEFAULT_DRIVER_FULL_NAME,
                    password_hash=hash_password(settings.DEFAULT_DRIVER_PASSWORD),
                    is_owner_driver=True,
                    is_active=True,
                )
                session.add(owner)
                await session.commit()
    except Exception as e:
        print(f"Driver seeding note: {e}")

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="FleetOS Hardened Backend & Offline Sync Engine for 23-Seater Commercial Tourist Bus",
    lifespan=lifespan,
)

# Security Headers Middleware (OWASP Defense: Anti-Clickjacking, Anti-MIME sniffing, CSP, HSTS)
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=(), payment=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "img-src 'self' data: blob: https:; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' http: https: ws: wss:; "
        "frame-ancestors 'none';"
    )
    return response


# SlowAPI Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Hardening (Explicit allowed origins, methods, and headers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Driver-Key", "Accept", "Origin", "X-Requested-With"],
)

# Mount uploads directory for local development receipts
uploads_path = Path(settings.UPLOAD_DIR)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(sync_router, prefix=settings.API_V1_STR)
app.include_router(trips_router, prefix=settings.API_V1_STR)
app.include_router(fuel_router, prefix=settings.API_V1_STR)
app.include_router(compliance_router, prefix=settings.API_V1_STR)
app.include_router(calendar_router, prefix=settings.API_V1_STR)
app.include_router(uploads_router, prefix=settings.API_V1_STR)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "FleetOS Commercial Bus Telemetry API",
        "vehicle_id": "BUS-14-23STR",
        "storage_backend": settings.STORAGE_BACKEND,
    }
