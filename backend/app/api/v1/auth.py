from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_driver_access_token,
    get_current_admin,
    hash_password,
    verify_admin_credentials,
    verify_password,
)
from app.models.user import DriverUser
from app.schemas.user import (
    DriverCreateRequest,
    DriverLoginRequest,
    DriverRead,
    DriverTokenResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str = Field(..., description="Admin username")
    password: str = Field(..., description="Admin password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def admin_login(request: Request, body: LoginRequest):
    """
    Admin authentication endpoint:
    Verifies Argon2 hashed password and issues a signed HS256 JWT access token.
    Rate limited to 10 attempts per minute.
    """
    is_valid = verify_admin_credentials(body.username, body.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": body.username, "role": "admin"})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )


@router.post("/driver-login", response_model=DriverTokenResponse)
@limiter.limit("20/minute")
async def driver_login(
    request: Request,
    body: DriverLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Driver authentication endpoint:
    Validates driver credentials (e.g. senthilraja / senthilraja123).
    Auto-seeds senthilraja as owner-driver if not yet present in DB.
    Issues 30-day JWT for offline field operations.
    """
    uname = body.username.strip().lower()
    stmt = select(DriverUser).where(DriverUser.username == uname)
    res = await db.execute(stmt)
    user = res.scalars().first()

    # Auto-seed senthilraja if missing
    if not user and uname == settings.DEFAULT_DRIVER_USERNAME.lower():
        if body.password == settings.DEFAULT_DRIVER_PASSWORD:
            user = DriverUser(
                username=settings.DEFAULT_DRIVER_USERNAME,
                full_name=settings.DEFAULT_DRIVER_FULL_NAME,
                password_hash=hash_password(settings.DEFAULT_DRIVER_PASSWORD),
                is_owner_driver=True,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid driver username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Driver account is inactive",
        )

    token = create_driver_access_token(
        data={
            "sub": user.username,
            "role": "owner_driver" if user.is_owner_driver else "driver",
            "full_name": user.full_name,
            "is_owner_driver": user.is_owner_driver,
        }
    )

    return DriverTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.DRIVER_JWT_EXPIRE_MINUTES * 60,
        username=user.username,
        full_name=user.full_name,
        is_owner_driver=user.is_owner_driver,
    )


@router.get("/drivers", response_model=list[DriverRead])
async def list_drivers(
    admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin endpoint: List all registered drivers.
    """
    stmt = select(DriverUser).order_by(DriverUser.created_at.asc())
    res = await db.execute(stmt)
    drivers = res.scalars().all()
    return drivers


@router.post("/drivers", response_model=DriverRead, status_code=status.HTTP_201_CREATED)
async def create_driver(
    body: DriverCreateRequest,
    admin: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin endpoint: Create new driver account with assigned username & password.
    """
    uname = body.username.strip().lower()
    stmt = select(DriverUser).where(DriverUser.username == uname)
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver with username '{body.username}' already exists",
        )

    new_driver = DriverUser(
        username=uname,
        full_name=body.full_name.strip(),
        password_hash=hash_password(body.password),
        is_owner_driver=body.is_owner_driver,
        is_active=True,
    )
    db.add(new_driver)
    await db.commit()
    await db.refresh(new_driver)
    return new_driver
