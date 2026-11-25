import io
from pathlib import Path
import uuid
import boto3
from botocore.config import Config
from fastapi import HTTPException, status

from app.core.config import settings


class StorageService:
    @staticmethod
    def validate_magic_bytes_and_size(contents: bytes) -> str:
        """
        Enforces:
        1. Max upload size <= 1 MB (1048576 bytes) -> raises 413
        2. Strict magic-byte inspection: JPEG, PNG, WebP only -> raises 400
        Returns the safe file extension (e.g. '.jpg', '.png', '.webp')
        """
        size = len(contents)
        if size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"Payload Too Large: File size ({round(size / 1024, 1)} KB) exceeds 1 MB limit.",
            )

        if len(contents) < 12:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bad Request: File is too small or corrupted to be a valid image.",
            )

        # Check JPEG: FF D8 FF
        if contents.startswith(b"\xff\xd8\xff"):
            return ".jpg"

        # Check PNG: 89 50 4E 47 0D 0A 1A 0A
        if contents.startswith(b"\x89PNG\r\n\x1a\n"):
            return ".png"

        # Check WebP: "RIFF" .... "WEBP"
        if contents.startswith(b"RIFF") and contents[8:12] == b"WEBP":
            return ".webp"

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bad Request: Disguised or unsupported file format. Allowed image types: JPEG, PNG, WebP.",
        )

    @classmethod
    def save_image(cls, contents: bytes, original_filename: str = "") -> dict:
        """
        Validates image and stores to either S3-compatible storage (Supabase, R2, AWS) or local disk.
        Returns: {"url": str, "filename": str, "size_bytes": int}
        """
        ext = cls.validate_magic_bytes_and_size(contents)
        safe_filename = f"{uuid.uuid4().hex}{ext}"

        # If S3 or R2 backend is enabled and configured
        if (
            settings.STORAGE_BACKEND in ("s3", "r2")
            and settings.S3_ACCESS_KEY_ID
            and settings.S3_SECRET_ACCESS_KEY
        ):
            return cls._upload_to_s3(contents, safe_filename, ext)

        # Default local storage
        return cls._save_to_local(contents, safe_filename)

    @classmethod
    def _save_to_local(cls, contents: bytes, filename: str) -> dict:
        upload_path = Path(settings.UPLOAD_DIR)
        upload_path.mkdir(parents=True, exist_ok=True)
        file_path = upload_path / filename
        file_path.write_bytes(contents)

        return {
            "url": f"/uploads/{filename}",
            "filename": filename,
            "size_bytes": len(contents),
            "backend": "local",
        }

    @classmethod
    def _upload_to_s3(cls, contents: bytes, filename: str, ext: str) -> dict:
        content_type = "image/jpeg"
        if ext == ".png":
            content_type = "image/png"
        elif ext == ".webp":
            content_type = "image/webp"

        client_kwargs = {
            "service_name": "s3",
            "region_name": settings.S3_REGION,
            "aws_access_key_id": settings.S3_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.S3_SECRET_ACCESS_KEY,
            "config": Config(signature_version="s3v4"),
        }
        if settings.S3_ENDPOINT_URL:
            client_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

        s3_client = boto3.client(**client_kwargs)

        s3_client.upload_fileobj(
            io.BytesIO(contents),
            settings.S3_BUCKET_NAME,
            filename,
            ExtraArgs={"ContentType": content_type},
        )

        public_base = settings.S3_PUBLIC_URL.rstrip("/") if settings.S3_PUBLIC_URL else ""
        if public_base:
            public_url = f"{public_base}/{filename}"
        elif settings.S3_ENDPOINT_URL:
            public_url = f"{settings.S3_ENDPOINT_URL.rstrip('/')}/{settings.S3_BUCKET_NAME}/{filename}"
        else:
            public_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.S3_REGION}.amazonaws.com/{filename}"

        backend_name = "s3" if settings.STORAGE_BACKEND == "s3" else "r2"

        return {
            "url": public_url,
            "filename": filename,
            "size_bytes": len(contents),
            "backend": backend_name,
        }
