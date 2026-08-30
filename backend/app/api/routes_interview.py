"""Mock Interview Simulation and Evaluation API Routes."""

import uuid
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import User, Job, InterviewSession
from backend.app.agents.mock_interview import mock_interview_agent
from backend.app.services.tavily_client import tavily_client
from backend.app.api.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["Mock Interview Simulator"])


class StartInterviewRequest(BaseModel):
    interview_type: str = "General"  # 'General', 'Technical', 'Behavioral'
    job_id: Optional[uuid.UUID] = None
    domain: Optional[str] = None  # For General mode domain specification
    total_turns: Optional[int] = 999  # Open-ended by default


class SubmitAnswerRequest(BaseModel):
    session_id: uuid.UUID
    user_response: str


class EndInterviewRequest(BaseModel):
    session_id: uuid.UUID


@router.post("/start")
async def start_interview_session(
    req: StartInterviewRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Initialize an open-ended mock interview session.
    Generates customized opening question based on mode, domain, target JD, candidate CV, and company insights.
    """
    job_title = req.domain.strip() if req.domain else "Software Engineer"
    company_name = "Tech Organization"
    job_desc = f"Core competencies and problem solving in {job_title}."
    company_insights = None

    if req.job_id:
        job = db.query(Job).filter(Job.id == req.job_id).first()
        if job:
            job_title = job.title
            company_name = job.company
            job_desc = job.description

            # Retrieve cached company insights or auto-fetch from Tavily if not yet cached
            if job.company_insights:
                company_insights = job.company_insights
            elif job.company:
                try:
                    company_insights = await tavily_client.get_company_insights(
                        company_name=job.company,
                        job_title=job.title,
                    )
                    job.company_insights = company_insights
                    db.commit()
                except Exception as e:
                    logger.warning(f"Auto-fetch company insights in interview start failed: {e}")

    candidate_summary = ""
    if user.profile and user.profile.parsed_data:
        skills = user.profile.parsed_data.get("skills_inventory", [])
        candidate_summary = f"Skills: {', '.join(skills[:8])}"

    opening_question = await mock_interview_agent.generate_first_question(
        interview_type=req.interview_type,
        job_title=job_title,
        company_name=company_name,
        candidate_summary=candidate_summary,
        job_description=job_desc,
        domain=req.domain,
        company_insights=company_insights,
    )

    # Create new session in DB
    session = InterviewSession(
        user_id=user.id,
        job_id=req.job_id,
        interview_type=req.interview_type,
        total_turns=req.total_turns or 999,
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
    Returns immediate micro-feedback + next interview question informed by company intelligence.
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
    company_insights = None

    if session.job:
        if session.job.company_insights:
            company_insights = session.job.company_insights
        elif session.job.company:
            try:
                company_insights = await tavily_client.get_company_insights(
                    company_name=session.job.company,
                    job_title=session.job.title,
                )
                session.job.company_insights = company_insights
                db.commit()
            except Exception as e:
                logger.warning(f"Auto-fetch company insights in interview turn failed: {e}")

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
        company_insights=company_insights,
    )

    next_turn_number = session.current_turn + 1
    history.append({"role": "interviewer", "content": turn_eval.next_question})
    session.current_turn = next_turn_number
    session.conversation_history = history
    db.commit()

    return {
        "status": "success",
        "current_turn": session.current_turn,
        "micro_feedback": turn_eval.micro_feedback,
        "star_score": turn_eval.star_score,
        "next_question": turn_eval.next_question,
        "is_completed": False,
    }


@router.post("/end")
async def end_interview_session(
    req: EndInterviewRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    End the interview session upon candidate's request and generate comprehensive final scorecard.
    """
    session = db.query(InterviewSession).filter(
        InterviewSession.id == req.session_id,
        InterviewSession.user_id == user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if session.is_completed and session.final_evaluation:
        return {
            "status": "completed",
            "is_completed": True,
            "final_evaluation": session.final_evaluation,
        }

    job_title = session.job.title if session.job else "Software Engineer"
    history = list(session.conversation_history)
    candidate_responses = [msg for msg in history if msg.get("role") == "candidate"]

    if not candidate_responses:
        # Candidate concluded immediately without answering any questions: return graceful baseline
        fallback_evaluation = {
            "overall_score": 50,
            "strengths": ["Initialized session and reviewed opening question."],
            "areas_for_improvement": ["No interview answers were provided prior to conclusion. Submit responses for full STAR evaluation."],
            "star_method_assessment": "Session concluded before candidate answers were recorded.",
            "technical_depth_assessment": "Session concluded before candidate answers were recorded.",
            "hiring_recommendation": "Needs Improvement",
        }
        session.is_completed = True
        session.final_evaluation = fallback_evaluation
        db.commit()
        return {
            "status": "completed",
            "is_completed": True,
            "final_evaluation": fallback_evaluation,
        }

    # Generate final scorecard evaluation
    scorecard = await mock_interview_agent.generate_final_scorecard(
        interview_type=session.interview_type,
        job_title=job_title,
        conversation_history=history,
    )

    session.is_completed = True
    session.final_evaluation = scorecard
    db.commit()

    return {
        "status": "completed",
        "is_completed": True,
        "final_evaluation": scorecard,
    }
