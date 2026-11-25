from collections.abc import AsyncGenerator
import re
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


def normalize_database_url(raw_url: str) -> tuple[str, dict]:
    """
    Normalizes database connection strings for Neon / PostgreSQL / SQLite.
    1. Normalizes postgres:// or postgresql:// to postgresql+asyncpg://
    2. Strips sslmode query parameters that asyncpg rejects
    3. Configures connect_args with ssl: True for remote PostgreSQL hosts (e.g. Neon)
    """
    connect_args: dict = {}

    if raw_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        return raw_url, connect_args

    # Normalize driver prefix
    url = raw_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Parse and sanitize query parameters for asyncpg
    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)

    is_remote = parsed.hostname not in ("localhost", "127.0.0.1", "postgres", None)
    requires_ssl = "sslmode" in query_params or is_remote

    # Unsupported asyncpg query parameters in connection strings
    unsupported_asyncpg_params = {"sslmode", "channel_binding", "endpoint"}
    for p in unsupported_asyncpg_params:
        query_params.pop(p, None)

    # Reconstruct clean URL without unsupported query parameters
    new_query = urlencode(query_params, doseq=True)
    clean_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment,
    ))

    if requires_ssl and "postgresql" in clean_url:
        connect_args["ssl"] = True

    return clean_url, connect_args


database_url, engine_connect_args = normalize_database_url(settings.DATABASE_URL)

engine = create_async_engine(
    database_url,
    echo=False,
    future=True,
    connect_args=engine_connect_args,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
