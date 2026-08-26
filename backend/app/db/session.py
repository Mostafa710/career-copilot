"""Database session and engine management."""

import logging
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
        logger.info("All database tables created successfully.")
    except Exception as e:
        logger.warning(f"Database initialization note (make sure Postgres is running): {e}")


def get_db():
    """FastAPI dependency for yielding database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
