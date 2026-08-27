"""Job Search, Matching, and On-Demand Company Insights API Routes."""

import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import User, UserProfile, Job, Application
from backend.app.agents.market_research import market_research_agent
from backend.app.agents.job_matching import job_matching_agent
from backend.app.services.tavily_client import tavily_client
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/jobs", tags=["Job Search & Matching"])


class JobSearchRequest(BaseModel):
    query: Optional[str] = "Software Engineer"
    location: Optional[str] = None


@router.post("/search")
async def search_jobs(
    req: JobSearchRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Search for jobs with dynamic backfill pagination (15–20 distinct jobs).
    Excludes previously applied/saved jobs and caches new listings in the database.
    """
    # 1. Fetch user's existing application IDs to filter duplicates
    existing_apps = db.query(Application.job_id).filter(Application.user_id == user.id).all()
    existing_job_uuids = [app[0] for app in existing_apps]

    existing_ext_ids = set()
    if existing_job_uuids:
        records = db.query(Job.external_id).filter(Job.id.in_(existing_job_uuids)).all()
        existing_ext_ids = {r[0] for r in records if r[0]}

    # 2. Extract Candidate skills for smart infilling
    skills = []
    if user.profile and user.profile.parsed_data:
        skills = user.profile.parsed_data.get("skills_inventory", [])

    # 3. Query Market Research Agent (Dynamic Backfill Loop)
    raw_jobs = await market_research_agent.search_jobs(
        query=req.query or "Find jobs for me",
        user_preferences=user.preferences,
        candidate_skills=skills,
        existing_external_ids=existing_ext_ids,
    )

    # 4. Upsert jobs into database & retain UUIDs
    saved_jobs = []
    for job_data in raw_jobs:
        ext_id = job_data.get("external_id")
        existing_db_job = db.query(Job).filter(Job.external_id == ext_id).first() if ext_id else None

        if not existing_db_job:
            db_job = Job(
                external_id=ext_id,
                content_hash=job_data.get("content_hash"),
                source=job_data.get("source", "adzuna"),
                title=job_data.get("title", ""),
                company=job_data.get("company", ""),
                location=job_data.get("location", ""),
                salary_min=job_data.get("salary_min"),
                salary_max=job_data.get("salary_max"),
                redirect_url=job_data.get("redirect_url"),
                description=job_data.get("description", ""),
                extracted_skills=job_data.get("extracted_skills"),
            )
            db.add(db_job)
            db.commit()
            db.refresh(db_job)
            job_dict = dict(job_data)
            job_dict["id"] = str(db_job.id)
            saved_jobs.append(job_dict)
        else:
            job_dict = dict(job_data)
            job_dict["id"] = str(existing_db_job.id)
            saved_jobs.append(job_dict)

    # 5. Automatically compute Match Scores if active CV exists (takes top 15-20 highest matching across ALL fetched jobs)
    if user.profile and user.profile.parsed_data:
        ranked_jobs = job_matching_agent.match_and_rank_jobs(
            parsed_cv=user.profile.parsed_data,
            jobs=saved_jobs,
            cv_embedding=user.profile.embedding,
        )
        final_jobs = ranked_jobs[:20]
        return {
            "status": "success",
            "count": len(final_jobs),
            "jobs": final_jobs,
        }

    # If no CV uploaded: return top 15-20 in prioritized source order (RapidAPI -> Wuzzuf -> Bayt -> Tavily)
    final_unmatched = saved_jobs[:20]
    return {"status": "success", "count": len(final_unmatched), "jobs": final_unmatched}


@router.get("/{job_id}/insights")
async def get_job_company_insights(
    job_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    On-Demand Company Insights with Database Caching:
    Checks if insights are already cached in PostgreSQL; calls Tavily only if null.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    # 1. DB Cache Check (Zero Tavily Calls if cached)
    if job.company_insights:
        return {
            "cached": True,
            "company": job.company,
            "insights": job.company_insights,
        }

    # 2. Fetch via Tavily
    insights_data = await tavily_client.get_company_insights(
        company_name=job.company,
        job_title=job.title,
    )

    # 3. Save to database for instant future reuse
    job.company_insights = insights_data
    db.commit()

    return {
        "cached": False,
        "company": job.company,
        "insights": insights_data,
    }
