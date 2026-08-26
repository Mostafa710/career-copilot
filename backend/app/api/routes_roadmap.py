"""Career Roadmap API Routes with Input Validation Gate and Feasibility Critic."""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import User, CareerRoadmap
from backend.app.agents.career_roadmap import career_roadmap_agent
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/roadmap", tags=["Career Roadmap Planner"])


class GenerateRoadmapRequest(BaseModel):
    target_role: str = Field(..., min_length=2, description="Target career role (e.g. 'Cloud Architect')")
    timeframe: str = Field(..., description="Duration (e.g. '3 months', '6 months', '1 year')")
    hours_per_week: int = Field(..., gt=0, le=80, description="Dedicated study hours per week (e.g. 5, 10, 20)")


class ChatRoadmapRequest(BaseModel):
    message: str
    conversation_history: Optional[list] = []


@router.post("/chat")
async def chat_career_roadmap(
    req: ChatRoadmapRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Interactive conversational career roadmap assistant.
    Strictly restricted to career roadmaps and verifies weekly study hours before generating.
    """
    candidate_skills = []
    if user.profile and user.profile.parsed_data:
        candidate_skills = user.profile.parsed_data.get("skills_inventory", [])

    result = await career_roadmap_agent.chat_roadmap(
        message=req.message,
        conversation_history=req.conversation_history or [],
        current_skills=candidate_skills,
        max_attempts=3,
    )

    # If a full roadmap was generated, save it to DB
    if result.get("roadmap"):
        roadmap_data = result["roadmap"]
        roadmap_db = CareerRoadmap(
            user_id=user.id,
            target_role=roadmap_data.get("target_role", "Career Roadmap"),
            timeframe=roadmap_data.get("timeframe", "3 months"),
            hours_per_week=roadmap_data.get("hours_per_week", 10),
            milestones=roadmap_data.get("milestones", []),
        )
        db.add(roadmap_db)
        db.commit()
        db.refresh(roadmap_db)
        result["roadmap"]["id"] = str(roadmap_db.id)

    return result


@router.post("/generate")
async def generate_career_roadmap(
    req: GenerateRoadmapRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a market-aware, feasibility-verified career roadmap.
    Enforces the Input Gate: requires Target Role, Timeframe, AND Study Hours/Week.
    """
    # 1. Input Gate Validation
    if not req.target_role.strip():
        raise HTTPException(status_code=400, detail="Please provide a target role.")
    if req.hours_per_week <= 0:
        raise HTTPException(status_code=400, detail="Please specify valid weekly study hours (>0).")

    candidate_skills = []
    if user.profile and user.profile.parsed_data:
        candidate_skills = user.profile.parsed_data.get("skills_inventory", [])

    # 2. Execute Generator + Feasibility Critic Reflection Loop
    try:
        roadmap_data = await career_roadmap_agent.generate_roadmap(
            target_role=req.target_role.strip(),
            timeframe=req.timeframe,
            hours_per_week=req.hours_per_week,
            current_skills=candidate_skills,
            max_attempts=3,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))

    # 3. Save roadmap to database
    roadmap_db = CareerRoadmap(
        user_id=user.id,
        target_role=req.target_role.strip(),
        timeframe=req.timeframe,
        hours_per_week=req.hours_per_week,
        milestones=roadmap_data["milestones"],
    )
    db.add(roadmap_db)
    db.commit()
    db.refresh(roadmap_db)

    roadmap_data["id"] = str(roadmap_db.id)
    return {
        "status": "success",
        "roadmap": roadmap_data,
    }


@router.get("/list")
def list_user_roadmaps(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all saved career roadmaps for the active user."""
    roadmaps = db.query(CareerRoadmap).filter(
        CareerRoadmap.user_id == user.id
    ).order_by(CareerRoadmap.created_at.desc()).all()

    return {
        "status": "success",
        "count": len(roadmaps),
        "roadmaps": [
            {
                "id": str(r.id),
                "target_role": r.target_role,
                "timeframe": r.timeframe,
                "hours_per_week": r.hours_per_week,
                "milestones_count": len(r.milestones),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in roadmaps
        ],
    }


@router.get("/{roadmap_id}")
def get_roadmap_details(
    roadmap_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full details and phased milestones of a specific career roadmap."""
    roadmap = db.query(CareerRoadmap).filter(
        CareerRoadmap.id == roadmap_id,
        CareerRoadmap.user_id == user.id,
    ).first()

    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found.")

    return {
        "id": str(roadmap.id),
        "target_role": roadmap.target_role,
        "timeframe": roadmap.timeframe,
        "hours_per_week": roadmap.hours_per_week,
        "milestones": roadmap.milestones,
        "created_at": roadmap.created_at.isoformat() if roadmap.created_at else None,
    }
