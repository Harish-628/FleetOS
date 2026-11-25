from datetime import datetime, timedelta, timezone
import secrets
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, APIKeyHeader
import jwt
from pwdlib import PasswordHash

from app.core.config import settings

# Argon2 Password Hasher
pwd_context = PasswordHash.recommended()

# Initialize Admin password hash if not explicitly provided
_computed_admin_hash = settings.ADMIN_PASSWORD_HASH
if not _computed_admin_hash and settings.ADMIN_PASSWORD:
    _computed_admin_hash = pwd_context.hash(settings.ADMIN_PASSWORD)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def verify_admin_credentials(username: str, password: str) -> bool:
    if not secrets.compare_digest(username, settings.ADMIN_USERNAME):
        return False
    return verify_password(password, _computed_admin_hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


# Security Schemes
bearer_scheme = HTTPBearer(auto_error=False)
driver_key_header = APIKeyHeader(name="X-Driver-Key", auto_error=False)


def create_driver_access_token(data: dict) -> str:
    return create_access_token(
        data=data,
        expires_delta=timedelta(minutes=settings.DRIVER_JWT_EXPIRE_MINUTES),
    )


async def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> str:
    """
    FastAPI dependency that enforces valid Admin JWT authentication.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    username: str = payload.get("sub", "")
    role: str = payload.get("role", "")
    if not username or (role != "admin" and username != settings.ADMIN_USERNAME):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token subject or role",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return username


async def get_current_driver(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    key: Optional[str] = Security(driver_key_header),
) -> dict:
    """
    FastAPI dependency that validates Driver JWT or fallback X-Driver-Key.
    Returns driver context dict: {"username": ..., "full_name": ..., "is_owner_driver": ...}
    """
    # 1. Check Bearer token first
    if credentials and credentials.credentials:
        try:
            payload = decode_access_token(credentials.credentials)
            role = payload.get("role")
            if role in ("driver", "owner_driver", "admin"):
                return {
                    "username": payload.get("sub", settings.DEFAULT_DRIVER_USERNAME),
                    "full_name": payload.get("full_name", settings.DEFAULT_DRIVER_FULL_NAME),
                    "is_owner_driver": bool(payload.get("is_owner_driver", payload.get("sub") == settings.DEFAULT_DRIVER_USERNAME)),
                    "role": role,
                }
        except HTTPException:
            pass  # Fall through to check driver key

    # 2. Check X-Driver-Key fallback
    if key and secrets.compare_digest(key, settings.DRIVER_QR_SECRET):
        return {
            "username": settings.DEFAULT_DRIVER_USERNAME,
            "full_name": settings.DEFAULT_DRIVER_FULL_NAME,
            "is_owner_driver": True,
            "role": "owner_driver",
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized. Missing or invalid driver token or X-Driver-Key header.",
    )


async def get_current_admin_or_owner_driver(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    key: Optional[str] = Security(driver_key_header),
) -> dict:
    """
    FastAPI dependency allowing Admin or Owner-Driver (senthilraja).
    Used to protect booking calendar creation and scheduling.
    """
    # Check Bearer JWT
    if credentials and credentials.credentials:
        try:
            payload = decode_access_token(credentials.credentials)
            role = payload.get("role")
            username = payload.get("sub", "")
            is_owner = payload.get("is_owner_driver", False)
            if role == "admin" or username == settings.ADMIN_USERNAME:
                return {"user": username, "role": "admin", "is_owner_driver": True}
            if is_owner or username.lower() == settings.DEFAULT_DRIVER_USERNAME.lower():
                return {"user": username, "role": "owner_driver", "is_owner_driver": True}
        except HTTPException:
            pass

    # Check X-Driver-Key (represents owner-driver senthilraja)
    if key and secrets.compare_digest(key, settings.DRIVER_QR_SECRET):
        return {"user": settings.DEFAULT_DRIVER_USERNAME, "role": "owner_driver", "is_owner_driver": True}

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Operation permitted only for Admin or Owner-Driver (senthilraja).",
    )


async def verify_driver_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    key: Optional[str] = Security(driver_key_header),
) -> str:
    """
    FastAPI dependency that validates the driver's secret QR key or driver JWT.
    Provides backwards compatibility for endpoints currently using verify_driver_key.
    """
    if key and secrets.compare_digest(key, settings.DRIVER_QR_SECRET):
        return key

    if credentials and credentials.credentials:
        try:
            payload = decode_access_token(credentials.credentials)
            if payload.get("sub"):
                return f"driver:{payload.get('sub')}"
        except HTTPException:
            pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized. Missing or invalid X-Driver-Key header or Bearer token.",
    )
