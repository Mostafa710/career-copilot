"""Application Tailoring, Mini-CRM, and Document Export API Routes."""

import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import User, Job, Application, CVVersion
from backend.app.agents.application_tailor import application_tailor_agent
from backend.app.services.doc_exporter import document_exporter
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/application", tags=["Application Studio & Mini-CRM"])


class TailorRequest(BaseModel):
    job_id: uuid.UUID


class SaveApplicationRequest(BaseModel):
    job_id: uuid.UUID
    status: Optional[str] = "Tailored"
    tailored_cv_data: Optional[Dict[str, Any]] = None
    cover_letter: Optional[str] = None
    cold_email: Optional[str] = None
    ats_score_before: Optional[float] = None
    ats_score_after: Optional[float] = None
    notes: Optional[str] = None
    source_cv_version_id: Optional[uuid.UUID] = None


class SaveJobRequest(BaseModel):
    job_id: uuid.UUID
    status: Optional[str] = "Saved"
    notes: Optional[str] = None


class StatusUpdateRequest(BaseModel):
    status: str  # 'Saved', 'Tailored', 'Applied', 'Interviewing', 'Offered', 'Rejected'
    notes: Optional[str] = None


class ExportCVRequest(BaseModel):
    tailored_cv_data: Dict[str, Any]
    candidate_name: Optional[str] = "Candidate"


class ExportCoverLetterRequest(BaseModel):
    cover_letter: str
    candidate_name: Optional[str] = "Candidate"
    job_title: Optional[str] = ""
    company_name: Optional[str] = ""


class ExportEmailRequest(BaseModel):
    cold_email: str
    job_title: Optional[str] = ""
    company_name: Optional[str] = ""


@router.post("/tailor")
async def tailor_application_for_job(
    req: TailorRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate complete tailored CV, personalized cover letter, and cold outreach email.
    Executes Fact-Check Critic reflection loop to eliminate hallucinations.
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

    # Retrieve cached company insights or auto-fetch from Tavily if not yet cached
    company_insights = job.company_insights
    if not company_insights and job.company:
        try:
            from backend.app.services.tavily_client import tavily_client
            company_insights = await tavily_client.get_company_insights(
                company_name=job.company,
                job_title=job.title,
            )
            job.company_insights = company_insights
            db.commit()
        except Exception:
            company_insights = None

    result = await application_tailor_agent.tailor_application(
        parsed_cv=user.profile.parsed_data,
        job=job_dict,
        company_insights=company_insights,
        max_attempts=3,
    )

    if not result["critic_passed"]:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "TAILORING_FACT_CHECK_FAILED",
                "message": "The generated application could not be verified after three attempts. No unverified content was returned or exported.",
                "critic_attempts": result["critic_attempts"],
                "issues": result.get("hallucinations_found", []),
                "feedback": result.get("critic_feedback", ""),
            },
        )

    source_version = (
        db.query(CVVersion)
        .filter(CVVersion.user_id == user.id, CVVersion.is_current.is_(True))
        .order_by(CVVersion.version_number.desc())
        .first()
    )

    return {
        "status": "success",
        "job_id": str(job.id),
        "job_title": job.title,
        "company": job.company,
        "source_cv_version_id": str(source_version.id) if source_version else None,
        "tailored_cv_data": result["tailored_cv_data"],
        "cover_letter": result["cover_letter"],
        "cold_email": result["cold_email"],
        "ats_score_before": result["ats_score_before"],
        "ats_score_after": result["ats_score_after"],
        "critic_attempts": result["critic_attempts"],
        "critic_passed": result["critic_passed"],
        "export_allowed": result["export_allowed"],
        "match_details_before": result["match_details_before"],
        "match_details_after": result["match_details_after"],
    }


@router.post("/save-job")
def save_job_to_crm(
    req: SaveJobRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a job listing from Job Matcher directly into the Mini-CRM (Saved column)."""
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
            status=req.status or "Saved",
            notes=req.notes,
        )
        db.add(app)
    else:
        app.status = req.status or app.status
        if req.notes:
            app.notes = req.notes

    db.commit()
    db.refresh(app)

    return {
        "status": "success",
        "application_id": str(app.id),
        "crm_status": app.status,
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
    if req.tailored_cv_data is not None:
        app.tailored_cv_data = req.tailored_cv_data
    if req.cover_letter is not None:
        app.cover_letter = req.cover_letter
    if req.cold_email is not None:
        app.cold_email = req.cold_email
    if req.ats_score_before is not None:
        app.ats_score_before = req.ats_score_before
    if req.ats_score_after is not None:
        app.ats_score_after = req.ats_score_after
    if req.notes is not None:
        app.notes = req.notes

    source_version_query = db.query(CVVersion).filter(CVVersion.user_id == user.id)
    if req.source_cv_version_id is not None:
        source_version = source_version_query.filter(CVVersion.id == req.source_cv_version_id).first()
        if source_version is None:
            raise HTTPException(status_code=400, detail="The source CV version does not belong to this user.")
    else:
        source_version = (
            source_version_query
            .filter(CVVersion.is_current.is_(True))
            .order_by(CVVersion.version_number.desc())
            .first()
        )
    if source_version is not None:
        app.source_cv_version_id = source_version.id
        app.source_evidence_snapshot = {
            "cv_version_id": str(source_version.id),
            "content_hash": source_version.content_hash,
            "parsed_data": source_version.parsed_data,
            "scoring_engine_version": source_version.scoring_engine_version,
        }

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
            "description": job.description if job else "",
            "redirect_url": job.redirect_url if job else "",
            "status": a.status,
            "notes": a.notes,
            "ats_score_before": a.ats_score_before,
            "ats_score_after": a.ats_score_after,
            "has_tailored_cv": bool(a.tailored_cv_data),
            "has_cover_letter": bool(a.cover_letter),
            "has_cold_email": bool(a.cold_email),
            "tailored_cv_data": a.tailored_cv_data,
            "cover_letter": a.cover_letter,
            "cold_email": a.cold_email,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None,
            "source_cv_version_id": str(a.source_cv_version_id) if a.source_cv_version_id else None,
        })
    return {"status": "success", "count": len(results), "applications": results}


@router.get("/crm/{app_id}")
def get_crm_application_details(
    app_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full details of a specific application from Mini-CRM."""
    app = db.query(Application).filter(
        Application.id == app_id,
        Application.user_id == user.id,
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    job = app.job
    return {
        "id": str(app.id),
        "job_id": str(app.job_id),
        "title": job.title if job else "",
        "company": job.company if job else "",
        "location": job.location if job else "",
        "description": job.description if job else "",
        "status": app.status,
        "notes": app.notes,
        "ats_score_before": app.ats_score_before,
        "ats_score_after": app.ats_score_after,
        "tailored_cv_data": app.tailored_cv_data,
        "cover_letter": app.cover_letter,
        "cold_email": app.cold_email,
        "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        "source_cv_version_id": str(app.source_cv_version_id) if app.source_cv_version_id else None,
    }


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


@router.delete("/crm/{app_id}")
def delete_crm_application(
    app_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an application entry from the Mini-CRM."""
    app = db.query(Application).filter(
        Application.id == app_id,
        Application.user_id == user.id,
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Application record not found.")

    db.delete(app)
    db.commit()
    return {"status": "success", "message": "Application removed from CRM."}


@router.post("/export/cv/docx")
def export_tailored_cv_docx(
    req: ExportCVRequest,
    user: User = Depends(get_current_user),
):
    """Export tailored CV as downloadable Microsoft Word (.docx) file."""
    candidate_name = req.candidate_name or (user.profile.parsed_data.get("contact_info", {}).get("name") if user.profile else "Candidate")
    docx_bytes = document_exporter.generate_docx_cv(
        tailored_data=req.tailored_cv_data,
        candidate_name=candidate_name,
    )
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=Tailored_CV_{candidate_name.replace(' ', '_')}.docx"},
    )


@router.post("/export/cover-letter/docx")
def export_cover_letter_docx(
    req: ExportCoverLetterRequest,
    user: User = Depends(get_current_user),
):
    """Export cover letter as downloadable Microsoft Word (.docx) file."""
    candidate_name = req.candidate_name or (user.profile.parsed_data.get("contact_info", {}).get("name") if user.profile else "Candidate")
    docx_bytes = document_exporter.generate_docx_cover_letter(
        cover_letter_text=req.cover_letter,
        candidate_name=candidate_name,
        job_title=req.job_title or "",
        company_name=req.company_name or "",
    )
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=Cover_Letter_{req.company_name.replace(' ', '_') if req.company_name else 'Job'}.docx"},
    )


@router.post("/export/email/txt")
def export_cold_email_txt(
    req: ExportEmailRequest,
):
    """Export cold outreach email as a plain text (.txt) file."""
    text_content = req.cold_email.strip()
    return Response(
        content=text_content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=Cold_Outreach_Email_{req.company_name.replace(' ', '_') if req.company_name else 'Hiring_Manager'}.txt"},
    )


@router.post("/export/html")
def export_tailored_html(
    req: ExportCVRequest,
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
