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

    def save_active_cv(
        self,
        user_id: uuid.UUID,
        filename: str,
        content: bytes,
    ) -> Tuple[str, str]:
        """
        Save the new active CV and delete previous stored files for this user.
        Returns (storage_key, filename).
        """
        user_folder = self.resumes_dir / str(user_id)
        user_folder.mkdir(parents=True, exist_ok=True)

        # Single Active CV Policy: Delete any previous files in user folder
        for existing_file in user_folder.glob("*"):
            try:
                if existing_file.is_file():
                    existing_file.unlink()
                    logger.info(f"Deleted old resume file: {existing_file.name}")
            except Exception as e:
                logger.warning(f"Error removing old CV file {existing_file}: {e}")

        # Save new file
        safe_filename = filename.replace(" ", "_")
        target_path = user_folder / safe_filename
        with open(target_path, "wb") as f:
            f.write(content)

        storage_key = str(target_path)
        logger.info(f"Saved new active CV: {storage_key}")
        return storage_key, safe_filename

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
