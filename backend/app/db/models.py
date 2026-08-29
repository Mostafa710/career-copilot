"""SQLAlchemy database models for Career Copilot."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from backend.app.db.session import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    preferences = Column(
        JSONB,
        nullable=False,
        default=lambda: {
            "theme": "system",
            "default_country": "gb",
            "default_export_format": "pdf",
            "default_template": "modern",
        },
    )
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    cv_versions = relationship("CVVersion", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    interview_sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    career_roadmaps = relationship("CareerRoadmap", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    """Single Active CV Profile per user."""
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    raw_storage_key = Column(String(512), nullable=True)
    raw_file_name = Column(String(255), nullable=True)
    raw_text = Column(Text, nullable=True)
    parsed_data = Column(JSONB, nullable=False, default=dict)
    general_ats_score = Column(JSONB, nullable=False, default=dict)
    embedding = Column(Vector(384), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    user = relationship("User", back_populates="profile")


class CVVersion(Base):
    """Immutable CV snapshot; one current version and up to three normal archives per user."""
    __tablename__ = "cv_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    source_type = Column(String(32), nullable=False, default="unknown")
    raw_storage_key = Column(String(512), nullable=True)
    raw_file_name = Column(String(255), nullable=True)
    raw_text = Column(Text, nullable=True)
    content_hash = Column(String(64), nullable=False, index=True)
    parsed_data = Column(JSONB, nullable=False, default=dict)
    parse_confidence = Column(String(20), nullable=False, default="unknown")
    document_readiness_result = Column(JSONB, nullable=False, default=dict)
    resume_quality_result = Column(JSONB, nullable=False, default=dict)
    embedding = Column(Vector(384), nullable=True)
    scoring_engine_version = Column(String(64), nullable=False, default="legacy")
    change_summary = Column(JSONB, nullable=False, default=dict)
    is_current = Column(Boolean, nullable=False, default=False, index=True)
    is_pinned = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "version_number", name="uq_cv_version_user_number"),
    )

    user = relationship("User", back_populates="cv_versions")
    applications = relationship("Application", back_populates="source_cv_version")


class Job(Base):
    """Catalog of fetched and deduplicated jobs with cached company insights."""
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(255), unique=True, nullable=True, index=True)
    content_hash = Column(String(64), nullable=True, index=True)
    source = Column(String(50), default="adzuna")
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    redirect_url = Column(Text, nullable=True)
    description = Column(Text, nullable=False)
    extracted_skills = Column(JSONB, nullable=True, default=dict)
    company_insights = Column(JSONB, nullable=True)
    embedding = Column(Vector(384), nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    # Relationships
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")


class Application(Base):
    """Mini-CRM state tracking and tailored application assets."""
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="Saved", nullable=False)  # 'Saved', 'Tailored', 'Applied', 'Interviewing', 'Offered', 'Rejected'
    tailored_cv_data = Column(JSONB, nullable=True)
    cover_letter = Column(Text, nullable=True)
    cold_email = Column(Text, nullable=True)
    ats_score_before = Column(Float, nullable=True)
    ats_score_after = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    source_cv_version_id = Column(UUID(as_uuid=True), ForeignKey("cv_versions.id", ondelete="SET NULL"), nullable=True, index=True)
    source_evidence_snapshot = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_user_job_application"),
    )

    # Relationships
    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    source_cv_version = relationship("CVVersion", back_populates="applications")


class InterviewSession(Base):
    """Mock interview conversation history, state checkpoints, and scorecards."""
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    interview_type = Column(String(50), nullable=False)  # 'General', 'Technical', 'Behavioral'
    conversation_history = Column(JSONB, nullable=False, default=list)
    current_turn = Column(Integer, default=0)
    total_turns = Column(Integer, default=5)
    final_evaluation = Column(JSONB, nullable=True)
    is_completed = Column(Integer, default=0)  # 0 for ongoing, 1 for finished
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    user = relationship("User", back_populates="interview_sessions")
    job = relationship("Job")


class CareerRoadmap(Base):
    """Market-aware career learning milestones with study budget."""
    __tablename__ = "career_roadmaps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_role = Column(String(255), nullable=False)
    timeframe = Column(String(50), nullable=False)
    hours_per_week = Column(Integer, nullable=False, default=10)
    milestones = Column(JSONB, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    # Relationships
    user = relationship("User", back_populates="career_roadmaps")
