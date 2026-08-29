"""CV version lifecycle, retention, comparison, and legacy migration helpers."""

import hashlib
import uuid
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.db.models import Application, CVVersion, User, UserProfile
from backend.app.services.ats_engine import SCORING_ENGINE_VERSION


MAX_ARCHIVED_VERSIONS = 3


def content_hash(raw_text: str) -> str:
    return hashlib.sha256((raw_text or "").encode("utf-8")).hexdigest()


def select_prunable_versions(
    archived_versions: List[CVVersion],
    protected_ids: set,
    keep_unprotected: int = MAX_ARCHIVED_VERSIONS,
) -> List[CVVersion]:
    """Select oldest unprotected archives beyond the rolling retention window."""
    removable = [item for item in archived_versions if item.id not in protected_ids and not item.is_pinned]
    return removable[keep_unprotected:]


def build_change_summary(previous: Optional[CVVersion], parsed_data: Dict[str, Any], score: Dict[str, Any]) -> Dict[str, Any]:
    if previous is None:
        return {"kind": "initial", "message": "Initial CV version"}

    old_skills = set(previous.parsed_data.get("skills_inventory", []))
    new_skills = set(parsed_data.get("skills_inventory", []))
    old_score = previous.resume_quality_result.get("overall_score")
    new_score = score.get("overall_score")
    delta = round(new_score - old_score, 1) if isinstance(old_score, (int, float)) and isinstance(new_score, (int, float)) else None
    return {
        "kind": "update",
        "score_delta": delta,
        "skills_added": sorted(new_skills - old_skills),
        "skills_removed": sorted(old_skills - new_skills),
        "previous_version_number": previous.version_number,
    }


def create_version(
    db: Session,
    *,
    user: User,
    version_id: uuid.UUID,
    source_type: str,
    storage_key: str,
    file_name: str,
    raw_text: str,
    parsed_data: Dict[str, Any],
    general_score: Dict[str, Any],
    embedding: Optional[List[float]],
) -> Tuple[CVVersion, List[str]]:
    previous = (
        db.query(CVVersion)
        .filter(CVVersion.user_id == user.id, CVVersion.is_current.is_(True))
        .order_by(CVVersion.version_number.desc())
        .first()
    )
    next_number = (db.query(func.max(CVVersion.version_number)).filter(CVVersion.user_id == user.id).scalar() or 0) + 1

    db.query(CVVersion).filter(CVVersion.user_id == user.id, CVVersion.is_current.is_(True)).update(
        {CVVersion.is_current: False}, synchronize_session=False
    )

    version = CVVersion(
        id=version_id,
        user_id=user.id,
        version_number=next_number,
        source_type=source_type,
        raw_storage_key=storage_key,
        raw_file_name=file_name,
        raw_text=raw_text,
        content_hash=content_hash(raw_text),
        parsed_data=parsed_data,
        parse_confidence="unknown",
        document_readiness_result=general_score,
        resume_quality_result=general_score,
        embedding=embedding,
        scoring_engine_version=general_score.get("scoring_engine_version", SCORING_ENGINE_VERSION),
        change_summary=build_change_summary(previous, parsed_data, general_score),
        is_current=True,
    )
    db.add(version)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if profile is None:
        profile = UserProfile(user_id=user.id)
        db.add(profile)
    profile.raw_storage_key = storage_key
    profile.raw_file_name = file_name
    profile.raw_text = raw_text
    profile.parsed_data = parsed_data
    profile.general_ats_score = general_score
    profile.embedding = embedding

    db.flush()

    protected_ids = {
        row[0]
        for row in db.query(Application.source_cv_version_id)
        .filter(Application.user_id == user.id, Application.source_cv_version_id.is_not(None))
        .all()
    }
    archived = (
        db.query(CVVersion)
        .filter(CVVersion.user_id == user.id, CVVersion.is_current.is_(False), CVVersion.is_pinned.is_(False))
        .order_by(CVVersion.version_number.desc())
        .all()
    )
    files_to_delete: List[str] = []
    for stale in select_prunable_versions(archived, protected_ids):
        if stale.raw_storage_key:
            files_to_delete.append(stale.raw_storage_key)
        db.delete(stale)

    return version, files_to_delete


def serialize_version(version: CVVersion, include_profile: bool = False) -> Dict[str, Any]:
    data = {
        "id": str(version.id),
        "version_number": version.version_number,
        "filename": version.raw_file_name,
        "source_type": version.source_type,
        "is_current": version.is_current,
        "is_pinned": version.is_pinned,
        "scoring_engine_version": version.scoring_engine_version,
        "resume_quality_result": version.resume_quality_result,
        "document_readiness_result": version.document_readiness_result,
        "change_summary": version.change_summary,
        "created_at": version.created_at.isoformat() if version.created_at else None,
    }
    if include_profile:
        data["parsed_profile"] = version.parsed_data
        data["raw_text"] = version.raw_text
    return data


def compare_versions(old: CVVersion, new: CVVersion) -> Dict[str, Any]:
    old_categories = old.resume_quality_result.get("category_scores", {})
    new_categories = new.resume_quality_result.get("category_scores", {})
    category_deltas = {}
    for key in sorted(set(old_categories) | set(new_categories)):
        old_value = old_categories.get(key)
        new_value = new_categories.get(key)
        category_deltas[key] = round(new_value - old_value, 1) if isinstance(old_value, (int, float)) and isinstance(new_value, (int, float)) else None

    old_skills = set(old.parsed_data.get("skills_inventory", []))
    new_skills = set(new.parsed_data.get("skills_inventory", []))
    return {
        "from_version": serialize_version(old),
        "to_version": serialize_version(new),
        "compatible_engine": old.scoring_engine_version == new.scoring_engine_version,
        "overall_score_delta": (
            round(new.resume_quality_result.get("overall_score") - old.resume_quality_result.get("overall_score"), 1)
            if isinstance(old.resume_quality_result.get("overall_score"), (int, float))
            and isinstance(new.resume_quality_result.get("overall_score"), (int, float))
            else None
        ),
        "category_deltas": category_deltas,
        "skills_added": sorted(new_skills - old_skills),
        "skills_removed": sorted(old_skills - new_skills),
    }
