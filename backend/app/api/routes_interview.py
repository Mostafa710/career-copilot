"""Mock Interview Simulation and Evaluation API Routes."""

import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import User, Job, InterviewSession
from backend.app.agents.mock_interview import mock_interview_agent
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/interview", tags=["Mock Interview Simulator"])


class StartInterviewRequest(BaseModel):
    interview_type: str = "General"  # 'General', 'Technical', 'Behavioral'
    job_id: Optional[uuid.UUID] = None
    total_turns: int = 5


class SubmitAnswerRequest(BaseModel):
    session_id: uuid.UUID
    user_response: str


@router.post("/start")
async def start_interview_session(
    req: StartInterviewRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Initialize a stateful mock interview session.
    Generates the customized opening question based on the selected mode and target JD.
    """
    job_title = "Software Engineer"
    company_name = "Innovative Tech Co"
    job_desc = "Building robust distributed software architectures."

    if req.job_id:
        job = db.query(Job).filter(Job.id == req.job_id).first()
        if job:
            job_title = job.title
            company_name = job.company
            job_desc = job.description

    candidate_summary = ""
    if user.profile and user.profile.parsed_data:
        skills = user.profile.parsed_data.get("skills_inventory", [])
        candidate_summary = f"Skills: {', '.join(skills[:8])}"

    opening_question = await mock_interview_agent.generate_first_question(
        interview_type=req.interview_type,
        job_title=job_title,
        company_name=company_name,
        candidate_summary=candidate_summary,
    )

    # Create new session in DB
    session = InterviewSession(
        user_id=user.id,
        job_id=req.job_id,
        interview_type=req.interview_type,
        total_turns=req.total_turns,
        current_turn=1,
        conversation_history=[
            {"role": "interviewer", "content": opening_question}
        ],
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "status": "success",
        "session_id": str(session.id),
        "interview_type": session.interview_type,
        "current_turn": 1,
        "total_turns": session.total_turns,
        "question": opening_question,
    }


@router.post("/turn")
async def submit_interview_turn(
    req: SubmitAnswerRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit answer for the current turn.
    Returns immediate micro-feedback + next question (or final scorecard on turn 5).
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == req.session_id,
        InterviewSession.user_id == user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if session.is_completed:
        return {
            "status": "completed",
            "is_completed": True,
            "final_evaluation": session.final_evaluation,
        }

    job_title = session.job.title if session.job else "Software Engineer"
    company_name = session.job.company if session.job else "Tech Company"
    job_desc = session.job.description if session.job else ""
    candidate_summary = f"Skills: {', '.join(user.profile.parsed_data.get('skills_inventory', []))}" if user.profile else ""

    history = list(session.conversation_history)
    history.append({"role": "candidate", "content": req.user_response})

    # Evaluate turn
    turn_eval = await mock_interview_agent.evaluate_turn(
        interview_type=session.interview_type,
        job_title=job_title,
        company_name=company_name,
        candidate_summary=candidate_summary,
        job_description=job_desc,
        conversation_history=history,
        user_response=req.user_response,
        current_turn=session.current_turn,
        total_turns=session.total_turns,
    )

    next_turn_number = session.current_turn + 1
    is_completed = next_turn_number > session.total_turns

    final_evaluation = None
    if is_completed:
        # Generate complete final scorecard
        final_evaluation = await mock_interview_agent.generate_final_scorecard(
            interview_type=session.interview_type,
            job_title=job_title,
            conversation_history=history,
        )
        session.is_completed = 1
        session.final_evaluation = final_evaluation
    else:
        history.append({"role": "interviewer", "content": turn_eval.next_question})
        session.current_turn = next_turn_number

    session.conversation_history = history
    db.commit()

    return {
        "status": "success",
        "current_turn": session.current_turn,
        "total_turns": session.total_turns,
        "micro_feedback": turn_eval.micro_feedback,
        "star_score": turn_eval.star_score,
        "next_question": turn_eval.next_question if not is_completed else None,
        "is_completed": bool(is_completed),
        "final_evaluation": final_evaluation,
    }


@router.get("/sessions")
def list_interview_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all previous mock interview sessions and scorecards for the user."""
    sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == user.id
    ).order_by(InterviewSession.created_at.desc()).all()

    return {
        "status": "success",
        "count": len(sessions),
        "sessions": [
            {
                "id": str(s.id),
                "interview_type": s.interview_type,
                "job_title": s.job.title if s.job else "General Role",
                "company": s.job.company if s.job else "General Company",
                "is_completed": bool(s.is_completed),
                "final_score": s.final_evaluation.get("overall_score") if s.final_evaluation else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sessions
        ],
    }
