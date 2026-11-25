from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Vinoth Travels"
    API_V1_STR: str = "/api/v1"
    
    # Database (SQLite for dev/tests, Neon PostgreSQL for production)
    DATABASE_URL: str = "sqlite+aiosqlite:///./fleetos.db"
    
    # Security & Admin Authentication
    JWT_SECRET_KEY: str = "fleetos-jwt-secret-key-production-hardened-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "fleetadmin2026!"
    ADMIN_PASSWORD_HASH: str = ""
    
    # Driver QR Key Authentication & Driver Users
    DRIVER_QR_SECRET: str = "driver-cockpit-secret-key-2026"
    DEFAULT_DRIVER_USERNAME: str = "senthilraja"
    DEFAULT_DRIVER_PASSWORD: str = "senthilraja123"
    DEFAULT_DRIVER_FULL_NAME: str = "Senthilraja"
    DRIVER_JWT_EXPIRE_MINUTES: int = 43200  # 30 days for mobile driver offline convenience
    
    # Storage Backend & Limits ("local", "s3", or "r2" as alias)
    STORAGE_BACKEND: str = "local"
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 1024 * 1024  # 1 MB strict limit
    
    # Generic S3-Compatible Storage (Supabase Storage, Cloudflare R2, AWS S3)
    S3_ENDPOINT_URL: str = ""  # e.g. https://<project-ref>.storage.supabase.co/storage/v1/s3 or https://<account_id>.r2.cloudflarestorage.com
    S3_REGION: str = "ap-southeast-1"
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = "fleetos-receipts"
    S3_PUBLIC_URL: str = ""
    
    # Google Calendar
    GOOGLE_CALENDAR_ID: str = "primary"
    GOOGLE_SERVICE_ACCOUNT_JSON: str = ""  # Raw JSON string, base64 string, or path to service_account.json
    GOOGLE_SERVICE_ACCOUNT_FILE: str = ""

    # CORS
    ALLOWED_ORIGINS: str | list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://fleetos.vercel.app",
        "https://fleetos.pages.dev",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()

# Ensure uploads directory exists for local mode
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
