"""Storage service abstraction for local disk and AWS S3."""

import os
import uuid
import logging
from pathlib import Path
from typing import Optional, Tuple
from backend.app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE
        self.local_base_dir = Path(settings.LOCAL_STORAGE_DIR)
        self.resumes_dir = self.local_base_dir / "resumes"
        self.exports_dir = self.local_base_dir / "exports"
        
        # Ensure directories exist
        self.resumes_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)

    def save_cv_version(
        self,
        user_id: uuid.UUID,
        version_id: uuid.UUID,
        filename: str,
        content: bytes,
    ) -> Tuple[str, str]:
        """Save an immutable CV file without deleting previous versions."""
        user_folder = self.resumes_dir / str(user_id)
        user_folder.mkdir(parents=True, exist_ok=True)

        safe_filename = Path(filename).name.replace(" ", "_")
        target_path = user_folder / f"{version_id}_{safe_filename}"
        with open(target_path, "wb") as f:
            f.write(content)

        storage_key = str(target_path)
        logger.info(f"Saved CV version: {storage_key}")
        return storage_key, safe_filename

    def delete_cv_version_file(self, storage_key: Optional[str]) -> bool:
        """Delete one version file only when it resolves inside the resumes directory."""
        if not storage_key:
            return False
        try:
            target = Path(storage_key).resolve()
            resumes_root = self.resumes_dir.resolve()
            target.relative_to(resumes_root)
            if target.is_file():
                target.unlink()
                logger.info(f"Deleted retained CV version file: {target.name}")
            return True
        except (OSError, ValueError) as exc:
            logger.warning(f"Refused or failed to delete CV version file {storage_key}: {exc}")
            return False

    def delete_user_files(self, user_id: uuid.UUID) -> bool:
        """Completely purge all files for a user upon account deletion."""
        user_folder = self.resumes_dir / str(user_id)
        if user_folder.exists() and user_folder.is_dir():
            for item in user_folder.glob("*"):
                try:
                    if item.is_file():
                        item.unlink()
                except Exception as e:
                    logger.warning(f"Error deleting file {item}: {e}")
            try:
                user_folder.rmdir()
                logger.info(f"Purged user folder: {user_folder}")
            except Exception as e:
                logger.warning(f"Error removing directory {user_folder}: {e}")
        return True

    def save_export_document(
        self,
        user_id: uuid.UUID,
        filename: str,
        content: bytes,
    ) -> str:
        """Save a generated PDF/DOCX exported document."""
        user_export_folder = self.exports_dir / str(user_id)
        user_export_folder.mkdir(parents=True, exist_ok=True)

        target_path = user_export_folder / filename
        with open(target_path, "wb") as f:
            f.write(content)

        return str(target_path)


storage_service = StorageService()
