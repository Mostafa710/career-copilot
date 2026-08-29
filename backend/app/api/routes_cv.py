"""CV ingestion, version history, parsing, and resume-quality API routes."""

import uuid
from typing import Literal, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import Application, CVVersion, User, UserProfile
from backend.app.core.storage import storage_service
from backend.app.services.cv_parser import parse_cv_file, sanitize_text
from backend.app.agents.cv_analysis_agent import cv_analysis_agent
from backend.app.api.deps import get_current_user
from backend.app.services.cv_versions import compare_versions, create_version, serialize_version
from backend.app.services.cv_review import build_review_suggestions
from backend.app.services.ats_engine import compute_job_specific_ats_match
from backend.app.agents.job_matching import extract_skills_from_jd
from backend.app.core.llm_factory import compute_text_embedding

router = APIRouter(prefix="/cv", tags=["CV Analysis & ATS Audit"])


class RawTextPasteRequest(BaseModel):
    raw_text: str


class CVReviewRequest(BaseModel):
    mode: Literal["general", "targeted"] = "targeted"
    target_role: Optional[str] = None
    job_description: Optional[str] = None
    version_id: Optional[uuid.UUID] = None


@router.post("/review")
def review_cv(
    req: CVReviewRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Review the current/versioned CV generally or against one specific job."""
    if req.version_id:
        source = db.query(CVVersion).filter(
            CVVersion.id == req.version_id,
            CVVersion.user_id == user.id,
        ).first()
        if source is None:
            raise HTTPException(status_code=404, detail="CV version not found.")
        parsed_cv = source.parsed_data or {}
        raw_text = source.raw_text or ""
        general_score = source.resume_quality_result or {}
        cv_embedding = source.embedding
        source_version_id = str(source.id)
    else:
        profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
        if profile is None or not profile.raw_text:
            raise HTTPException(status_code=409, detail="Upload or paste a CV before starting a review.")
        parsed_cv = profile.parsed_data or {}
        raw_text = profile.raw_text or ""
        general_score = profile.general_ats_score or {}
        cv_embedding = profile.embedding
        current = db.query(CVVersion).filter(
            CVVersion.user_id == user.id,
            CVVersion.is_current.is_(True),
        ).first()
        source_version_id = str(current.id) if current else None

    if req.mode == "general":
        suggestions = build_review_suggestions(parsed_cv)
        return {
            "status": "success",
            "mode": "general",
            "scope_label": "General CV health — not measured against a specific vacancy",
            "source_version_id": source_version_id,
            "general_score": general_score,
            "target_match": None,
            "suggestions": suggestions,
            "disclaimer": "This review checks structure, clarity, and evidence quality. It does not predict performance for a particular job.",
        }

    role = (req.target_role or "").strip()
    jd = (req.job_description or "").strip()
    if len(role) < 2:
        raise HTTPException(status_code=422, detail="Enter the specific job role.")
    if len(jd) < 80:
        raise HTTPException(status_code=422, detail="Paste a specific job description of at least 80 characters.")

    required_skills = extract_skills_from_jd(jd)
    target_match = compute_job_specific_ats_match(
        cv_skills=parsed_cv.get("skills_inventory", []),
        job_required_skills=required_skills,
        cv_bullets=parsed_cv.get("experience_bullets", []),
        job_description=jd,
        cv_embedding=cv_embedding,
        job_embedding=compute_text_embedding(jd),
        cv_experience=parsed_cv.get("experience", []),
        target_job_title=role,
    )
    suggestions = build_review_suggestions(
        parsed_cv,
        missing_skills=target_match.get("missing_skills", []),
        job_title=role,
    )
    return {
        "status": "success",
        "mode": "targeted",
        "scope_label": f"Targeted match for {role}",
        "source_version_id": source_version_id,
        "general_score": general_score,
        "target_match": target_match,
        "required_skills": required_skills,
        "suggestions": suggestions,
        "disclaimer": "This is an evidence-based match estimate for this JD, not a score from the employer's private ATS.",
        "raw_text_length": len(raw_text),
    }


@router.post("/upload")
async def upload_cv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a new CV (PDF, DOCX, or scanned image).
    Enforces Single Active CV Policy: hard deletes previous stored files and overwrites DB records.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 1. Parse text with OCR fallback
    extracted_text, used_ocr = parse_cv_file(file.filename, content)
    if not extracted_text or len(extracted_text.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail="Unable to extract readable text from document. Please ensure the document is clear or use text paste.",
        )

    # 2. Save an immutable version; retention runs only after the DB snapshot exists.
    version_id = uuid.uuid4()
    storage_key, safe_filename = storage_service.save_cv_version(
        user_id=user.id,
        version_id=version_id,
        filename=file.filename,
        content=content,
    )

    # 3. Analyze CV: Structured Extraction + 100-Point General ATS Audit + Embedding
    analysis_result = await cv_analysis_agent.analyze_cv(extracted_text)

    # 4. Create current version and maintain the backward-compatible profile mirror.
    try:
        version, pruned_files = create_version(
            db,
            user=user,
            version_id=version_id,
            source_type=file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "unknown",
            storage_key=storage_key,
            file_name=safe_filename,
            raw_text=extracted_text,
            parsed_data=analysis_result["parsed_data"],
            general_score=analysis_result["general_ats_score"],
            embedding=analysis_result["embedding"],
        )
        db.commit()
        db.refresh(version)
    except Exception:
        db.rollback()
        storage_service.delete_cv_version_file(storage_key)
        raise

    for old_storage_key in pruned_files:
        storage_service.delete_cv_version_file(old_storage_key)

    return {
        "status": "success",
        "version": serialize_version(version),
        "filename": safe_filename,
        "used_ocr_fallback": used_ocr,
        "general_ats_score": version.resume_quality_result,
        "parsed_profile": version.parsed_data,
    }


@router.post("/paste")
async def paste_cv_text(
    req: RawTextPasteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Directly paste CV text to update active profile and generate ATS score."""
    cleaned_text = sanitize_text(req.raw_text)
    if len(cleaned_text) < 30:
        raise HTTPException(status_code=400, detail="Pasted text is too brief to analyze.")

    # Save text as an immutable virtual-file version.
    version_id = uuid.uuid4()
    storage_key, safe_filename = storage_service.save_cv_version(
        user_id=user.id,
        version_id=version_id,
        filename="pasted_resume.txt",
        content=cleaned_text.encode("utf-8"),
    )

    # Run Analysis
    analysis_result = await cv_analysis_agent.analyze_cv(cleaned_text)

    try:
        version, pruned_files = create_version(
            db,
            user=user,
            version_id=version_id,
            source_type="pasted_text",
            storage_key=storage_key,
            file_name=safe_filename,
            raw_text=cleaned_text,
            parsed_data=analysis_result["parsed_data"],
            general_score=analysis_result["general_ats_score"],
            embedding=analysis_result["embedding"],
        )
        db.commit()
        db.refresh(version)
    except Exception:
        db.rollback()
        storage_service.delete_cv_version_file(storage_key)
        raise

    for old_storage_key in pruned_files:
        storage_service.delete_cv_version_file(old_storage_key)

    return {
        "status": "success",
        "version": serialize_version(version),
        "filename": safe_filename,
        "general_ats_score": version.resume_quality_result,
        "parsed_profile": version.parsed_data,
    }


@router.get("/active")
def get_active_cv(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the current active CV profile and General ATS Audit."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile or not profile.raw_text:
        return {
            "has_active_cv": False,
            "message": "No active CV uploaded yet. Upload a PDF/DOCX or paste text to get started.",
        }

    return {
        "has_active_cv": True,
        "filename": profile.raw_file_name,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        "general_ats_score": profile.general_ats_score,
        "parsed_profile": profile.parsed_data,
        "raw_text_preview": profile.raw_text[:400] + "...",
    }


@router.get("/versions")
def list_cv_versions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    versions = (
        db.query(CVVersion)
        .filter(CVVersion.user_id == user.id)
        .order_by(CVVersion.version_number.desc())
        .all()
    )
    return {"status": "success", "count": len(versions), "versions": [serialize_version(v) for v in versions]}


@router.get("/versions/compare")
def compare_cv_versions(
    from_version: uuid.UUID,
    to_version: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    versions = (
        db.query(CVVersion)
        .filter(CVVersion.user_id == user.id, CVVersion.id.in_([from_version, to_version]))
        .all()
    )
    by_id = {v.id: v for v in versions}
    if from_version not in by_id or to_version not in by_id:
        raise HTTPException(status_code=404, detail="One or both CV versions were not found.")
    return compare_versions(by_id[from_version], by_id[to_version])


@router.get("/versions/{version_id}")
def get_cv_version(
    version_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    version = db.query(CVVersion).filter(CVVersion.id == version_id, CVVersion.user_id == user.id).first()
    if version is None:
        raise HTTPException(status_code=404, detail="CV version not found.")
    return serialize_version(version, include_profile=True)


@router.post("/versions/{version_id}/activate")
def activate_cv_version(
    version_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    version = db.query(CVVersion).filter(CVVersion.id == version_id, CVVersion.user_id == user.id).first()
    if version is None:
        raise HTTPException(status_code=404, detail="CV version not found.")

    db.query(CVVersion).filter(CVVersion.user_id == user.id, CVVersion.is_current.is_(True)).update(
        {CVVersion.is_current: False}, synchronize_session=False
    )
    version.is_current = True

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if profile is None:
        profile = UserProfile(user_id=user.id)
        db.add(profile)
    profile.raw_storage_key = version.raw_storage_key
    profile.raw_file_name = version.raw_file_name
    profile.raw_text = version.raw_text
    profile.parsed_data = version.parsed_data
    profile.general_ats_score = version.resume_quality_result
    profile.embedding = version.embedding
    db.commit()
    return {"status": "success", "version": serialize_version(version)}


@router.delete("/versions/{version_id}")
def delete_cv_version(
    version_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    version = db.query(CVVersion).filter(CVVersion.id == version_id, CVVersion.user_id == user.id).first()
    if version is None:
        raise HTTPException(status_code=404, detail="CV version not found.")
    if version.is_current:
        raise HTTPException(status_code=409, detail="The current CV version cannot be deleted.")
    if version.is_pinned:
        raise HTTPException(status_code=409, detail="This CV version is pinned and cannot be deleted.")
    is_referenced = db.query(Application.id).filter(Application.source_cv_version_id == version.id).first() is not None
    if is_referenced:
        raise HTTPException(status_code=409, detail="This CV version is referenced by an application and cannot be deleted.")

    storage_key = version.raw_storage_key
    db.delete(version)
    db.commit()
    storage_service.delete_cv_version_file(storage_key)
    return {"status": "success", "message": "CV version deleted."}
