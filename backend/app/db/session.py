"""Database session and engine management."""

import logging
import hashlib
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

logger = logging.getLogger(__name__)

# Base Model
Base = declarative_base()

# SQLAlchemy Engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialize pgvector extension and create all database tables."""
    try:
        with engine.connect() as connection:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            connection.commit()
            logger.info("pgvector extension verified or created.")
        
        # Import models so Base metadata is populated
        import backend.app.db.models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        # Compatibility migration for databases created before CV versioning.
        # New tables are handled by create_all; existing tables need additive columns.
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE applications ADD COLUMN IF NOT EXISTS source_cv_version_id UUID NULL"
            ))
            connection.execute(text(
                "ALTER TABLE applications ADD COLUMN IF NOT EXISTS source_evidence_snapshot JSONB NULL"
            ))
            connection.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_applications_source_cv_version_id "
                "ON applications (source_cv_version_id)"
            ))
            connection.execute(text(
                "DO $$ BEGIN "
                "ALTER TABLE applications ADD CONSTRAINT fk_applications_source_cv_version "
                "FOREIGN KEY (source_cv_version_id) REFERENCES cv_versions(id) ON DELETE SET NULL; "
                "EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
            ))
        _migrate_legacy_cv_profiles()
        logger.info("All database tables created successfully.")
    except Exception as e:
        logger.warning(f"Database initialization note (make sure Postgres is running): {e}")


def _migrate_legacy_cv_profiles():
    """Create Version 1 for pre-versioning profiles without changing their active data."""
    from backend.app.db.models import CVVersion, UserProfile

    db = SessionLocal()
    try:
        profiles = db.query(UserProfile).filter(UserProfile.raw_text.is_not(None)).all()
        for profile in profiles:
            has_version = db.query(CVVersion.id).filter(CVVersion.user_id == profile.user_id).first()
            if has_version:
                continue
            score = profile.general_ats_score or {}
            raw_text = profile.raw_text or ""
            db.add(CVVersion(
                user_id=profile.user_id,
                version_number=1,
                source_type="legacy",
                raw_storage_key=profile.raw_storage_key,
                raw_file_name=profile.raw_file_name,
                raw_text=raw_text,
                content_hash=hashlib.sha256(raw_text.encode("utf-8")).hexdigest(),
                parsed_data=profile.parsed_data or {},
                parse_confidence="unknown",
                document_readiness_result=score,
                resume_quality_result=score,
                embedding=profile.embedding,
                scoring_engine_version=score.get("scoring_engine_version", "legacy"),
                change_summary={"kind": "initial", "message": "Migrated active CV"},
                is_current=True,
            ))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db():
    """FastAPI dependency for yielding database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
