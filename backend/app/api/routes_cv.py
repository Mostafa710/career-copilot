"""CV Ingestion, Parsing, and General ATS Scoring API Routes."""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import User, UserProfile
from backend.app.core.storage import storage_service
from backend.app.services.cv_parser import parse_cv_file, sanitize_text
from backend.app.agents.cv_analysis_agent import cv_analysis_agent
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/cv", tags=["CV Analysis & ATS Audit"])


class RawTextPasteRequest(BaseModel):
    raw_text: str


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

    # 2. Single Active CV Policy: Save new file and purge old files
    storage_key, safe_filename = storage_service.save_active_cv(
        user_id=user.id,
        filename=file.filename,
        content=content,
    )

    # 3. Analyze CV: Structured Extraction + 100-Point General ATS Audit + Embedding
    analysis_result = await cv_analysis_agent.analyze_cv(extracted_text)

    # 4. Upsert UserProfile record
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    profile.raw_storage_key = storage_key
    profile.raw_file_name = safe_filename
    profile.raw_text = extracted_text
    profile.parsed_data = analysis_result["parsed_data"]
    profile.general_ats_score = analysis_result["general_ats_score"]
    profile.embedding = analysis_result["embedding"]

    db.commit()
    db.refresh(profile)

    return {
        "status": "success",
        "filename": safe_filename,
        "used_ocr_fallback": used_ocr,
        "general_ats_score": profile.general_ats_score,
        "parsed_profile": profile.parsed_data,
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

    # Save text as virtual file
    storage_key, safe_filename = storage_service.save_active_cv(
        user_id=user.id,
        filename="pasted_resume.txt",
        content=cleaned_text.encode("utf-8"),
    )

    # Run Analysis
    analysis_result = await cv_analysis_agent.analyze_cv(cleaned_text)

    # Upsert Profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    profile.raw_storage_key = storage_key
    profile.raw_file_name = safe_filename
    profile.raw_text = cleaned_text
    profile.parsed_data = analysis_result["parsed_data"]
    profile.general_ats_score = analysis_result["general_ats_score"]
    profile.embedding = analysis_result["embedding"]

    db.commit()
    db.refresh(profile)

    return {
        "status": "success",
        "filename": safe_filename,
        "general_ats_score": profile.general_ats_score,
        "parsed_profile": profile.parsed_data,
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
