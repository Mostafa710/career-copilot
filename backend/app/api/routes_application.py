"""Application Tailoring, Mini-CRM, and Document Export API Routes."""

import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import User, Job, Application
from backend.app.agents.application_tailor import application_tailor_agent
from backend.app.services.doc_exporter import document_exporter
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/application", tags=["Application Studio & Mini-CRM"])


class TailorRequest(BaseModel):
    job_id: uuid.UUID


class SaveApplicationRequest(BaseModel):
    job_id: uuid.UUID
    status: Optional[str] = "Tailored"
    tailored_cv_data: Dict[str, Any]
    cover_letter: str
    cold_email: str
    ats_score_before: Optional[float] = None
    ats_score_after: Optional[float] = None
    notes: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    status: str  # 'Saved', 'Tailored', 'Applied', 'Interviewing', 'Offered', 'Rejected'
    notes: Optional[str] = None


class ExportRequest(BaseModel):
    tailored_cv_data: Dict[str, Any]
    candidate_name: Optional[str] = "Candidate"


@router.post("/tailor")
async def tailor_application_for_job(
    req: TailorRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate tailored CV bullet points, cover letter, and cold email.
    Executes Fact-Check Critic reflection loop (up to 2 retries / 3 attempts) to eliminate hallucinations.
    """
    if not user.profile or not user.profile.parsed_data:
        raise HTTPException(
            status_code=400,
            detail="Please upload and analyze your CV first before tailoring applications.",
        )

    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Target job not found.")

    job_dict = {
        "title": job.title,
        "company": job.company,
        "description": job.description,
        "extracted_skills": job.extracted_skills or [],
    }

    result = await application_tailor_agent.tailor_application(
        parsed_cv=user.profile.parsed_data,
        job=job_dict,
        company_insights=job.company_insights,
        max_attempts=3,
    )

    return {
        "status": "success",
        "job_id": str(job.id),
        "job_title": job.title,
        "company": job.company,
        "tailored_cv_data": result["tailored_cv_data"],
        "cover_letter": result["cover_letter"],
        "cold_email": result["cold_email"],
        "ats_score_before": result["ats_score_before"],
        "ats_score_after": result["ats_score_after"],
        "critic_attempts": result["critic_attempts"],
        "critic_passed": result["critic_passed"],
    }


@router.post("/save-crm")
def save_application_to_crm(
    req: SaveApplicationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save approved tailored application assets into the user's Mini-CRM."""
    job = db.query(Job).filter(Job.id == req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    app = db.query(Application).filter(
        Application.user_id == user.id,
        Application.job_id == req.job_id,
    ).first()

    if not app:
        app = Application(
            user_id=user.id,
            job_id=req.job_id,
        )
        db.add(app)

    app.status = req.status or "Tailored"
    app.tailored_cv_data = req.tailored_cv_data
    app.cover_letter = req.cover_letter
    app.cold_email = req.cold_email
    app.ats_score_before = req.ats_score_before
    app.ats_score_after = req.ats_score_after
    app.notes = req.notes

    db.commit()
    db.refresh(app)

    return {
        "status": "success",
        "application_id": str(app.id),
        "job_title": job.title,
        "crm_status": app.status,
    }


@router.get("/crm")
def get_crm_applications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all jobs tracked in the user's Mini-CRM Kanban board."""
    apps = db.query(Application).filter(Application.user_id == user.id).all()
    results = []
    for a in apps:
        job = a.job
        results.append({
            "id": str(a.id),
            "job_id": str(a.job_id),
            "title": job.title if job else "Unknown",
            "company": job.company if job else "Unknown",
            "location": job.location if job else "Remote",
            "salary_min": job.salary_min if job else None,
            "salary_max": job.salary_max if job else None,
            "status": a.status,
            "ats_score_before": a.ats_score_before,
            "ats_score_after": a.ats_score_after,
            "has_tailored_cv": bool(a.tailored_cv_data),
            "has_cover_letter": bool(a.cover_letter),
            "has_cold_email": bool(a.cold_email),
            "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        })
    return {"status": "success", "count": len(results), "applications": results}


@router.patch("/crm/{app_id}/status")
def update_application_status(
    app_id: uuid.UUID,
    req: StatusUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Move application status across Kanban columns (Saved -> Tailored -> Applied -> Interviewing -> Offered / Rejected)."""
    app = db.query(Application).filter(
        Application.id == app_id,
        Application.user_id == user.id,
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application record not found.")

    app.status = req.status
    if req.notes is not None:
        app.notes = req.notes

    db.commit()
    return {"status": "success", "application_id": str(app.id), "new_status": app.status}


@router.post("/export/docx")
def export_tailored_docx(
    req: ExportRequest,
    user: User = Depends(get_current_user),
):
    """Export tailored CV as downloadable Microsoft Word (.docx) file."""
    docx_bytes = document_exporter.generate_docx_cv(
        tailored_data=req.tailored_cv_data,
        candidate_name=req.candidate_name or (user.profile.parsed_data.get("contact_info", {}).get("name") if user.profile else "Candidate"),
    )
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=tailored_resume.docx"},
    )


@router.post("/export/html")
def export_tailored_html(
    req: ExportRequest,
    user: User = Depends(get_current_user),
):
    """Export tailored CV as semantic HTML for printing and PDF generation."""
    html_content = document_exporter.generate_html_cv(
        tailored_data=req.tailored_cv_data,
        candidate_name=req.candidate_name or (user.profile.parsed_data.get("contact_info", {}).get("name") if user.profile else "Candidate"),
    )
    return Response(
        content=html_content,
        media_type="text/html",
    )
