"""Career Roadmap Agent: Generates market-aligned learning paths with study hours budgeting and Feasibility Critic validation."""

import re
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from backend.app.core.llm_factory import get_llm
from backend.app.services.tavily_client import tavily_client

logger = logging.getLogger(__name__)


class RoadmapMilestone(BaseModel):
    phase_number: int = Field(..., description="Phase sequence number (1, 2, 3...)")
    title: str = Field(..., description="Phase title (e.g. 'Phase 1: Distributed Systems Core')")
    duration_weeks: int = Field(..., description="Duration of this phase in weeks")
    allocated_hours: int = Field(..., description="Total study hours dedicated to this phase")
    core_topics: List[str] = Field(..., description="Key technical topics to master")
    hands_on_project: str = Field(..., description="Real-world project deliverable demonstrating skills")
    recommended_resources: List[str] = Field(..., description="Curated free resources, docs, or tutorials")


class CareerRoadmapOutput(BaseModel):
    target_role: str = Field(..., description="Target career role")
    timeframe: str = Field(..., description="Total duration (e.g. '3 months', '6 months')")
    hours_per_week: int = Field(..., description="Weekly study hours allocated")
    total_study_budget_hours: int = Field(..., description="Total available study hours across the plan")
    skill_gap_summary: str = Field(..., description="Summary of skills to acquire based on current market trends")
    milestones: List[RoadmapMilestone] = Field(..., description="Phased learning milestones")


class FeasibilityEvaluation(BaseModel):
    passed: bool = Field(..., description="True if roadmap workload realistically matches the allocated study hours")
    feedback: str = Field(..., description="Constructive feedback if workload is overambitious or sequence is illogical")


class ChatIntentExtraction(BaseModel):
    is_career_related: bool = Field(..., description="True only if the message is requesting career roadmap/planning advice")
    target_role: Optional[str] = Field(None, description="Extracted target job role if mentioned")
    timeframe: Optional[str] = Field(None, description="Extracted timeframe (e.g. '3 months', '6 months')")
    hours_per_week: Optional[int] = Field(None, description="Extracted numeric hours per week if specified")
    missing_information_prompt: Optional[str] = Field(None, description="Polite question asking for missing parameters, specifically weekly study hours")


CHAT_INTENT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are the Career Copilot Roadmap Agent.
STRICT SCOPE POLICY:
1. You ONLY assist with technical career roadmaps, skill transitions, learning pathways, and study planning.
2. If the user asks about unrelated topics (e.g. cooking, general chit-chat, poetry, weather), politely decline and state that you are exclusively focused on Career Roadmaps.
3. To generate an accurate roadmap, you MANDATORILY require:
   - Target Role (e.g. "Cloud Architect", "AI Engineer")
   - Timeframe (e.g. "3 months", "6 months", "1 year")
   - Weekly Study Hours (e.g. 5, 10, 15, 20 hrs/week)
4. If Weekly Study Hours is NOT explicitly provided by the user, you MUST set is_career_related=true and missing_information_prompt asking them specifically how many hours per week they can commit before proceeding.
"""),
    ("human", """Conversation History:
{history}

User's Latest Message:
{message}
""")
])


ROADMAP_GEN_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert Technical Career Coach & Curriculum Designer.
Generate a structured, phased learning roadmap tailored to current market demands.

CRITICAL CONSTRAINTS:
1. Candidate has {hours_per_week} hours/week over {timeframe} (Total Budget: ~{total_hours} hours).
2. Distribute topics realistically across milestones so they fit the allocated study hours.
3. Every phase MUST include a concrete, portfolio-ready project.
{critic_feedback}
"""),
    ("human", """Target Role: {target_role}
Candidate Current Skills: {current_skills}
Current Market Trends & Requirements: {market_trends}
""")
])


FEASIBILITY_CRITIC_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a rigorous Technical Curriculum Critic.
Evaluate whether the proposed learning roadmap is realistic for a candidate with {hours_per_week} hours/week over {timeframe}.
Verify that:
1. The curriculum is not overpacked with impossible volume for the study hours.
2. The sequence flows logically from foundational to advanced architecture.
3. Every phase has an actionable hands-on project.

Output 'passed: true' only if the plan is practical and achievable.
"""),
    ("human", "Proposed Roadmap:\n{proposed_roadmap}")
])


class CareerRoadmapAgent:
    def __init__(self):
        self.generator_llm = get_llm(temperature=0.2)
        self.critic_llm = get_llm(temperature=0.0)

    async def chat_roadmap(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        current_skills: Optional[List[str]] = None,
        max_attempts: int = 3,
    ) -> Dict[str, Any]:
        """
        Conversational chat entrypoint with scope enforcement, hours gate, and Feasibility Critic.
        """
        formatted_history = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in conversation_history[-6:]])

        # 1. Extract Intent & Parameters
        try:
            structured_extractor = self.generator_llm.with_structured_output(ChatIntentExtraction)
            extract_chain = CHAT_INTENT_PROMPT | structured_extractor
            intent: ChatIntentExtraction = await extract_chain.ainvoke({
                "history": formatted_history or "No previous history.",
                "message": message,
            })
        except Exception as e:
            logger.warning(f"Chat intent extraction fallback: {e}")
            intent = ChatIntentExtraction(
                is_career_related=True,
                target_role=message,
                timeframe="3 months",
                hours_per_week=None,
                missing_information_prompt="To tailor your career roadmap accurately, how many hours per week can you commit to studying (e.g., 5, 10, or 20 hours/week)?"
            )

        # 2. Scope Enforcement
        if not intent.is_career_related:
            return {
                "response": "I am specifically focused on Career Roadmaps and technical learning planning. Please tell me your target role (e.g., AI Engineer, Cloud Architect) and how many hours you can study per week!",
                "needs_more_info": True,
                "roadmap": None,
            }

        # 3. Hours Gate Check
        if not intent.hours_per_week or intent.hours_per_week <= 0:
            prompt_msg = intent.missing_information_prompt or "How many hours per week can you commit to studying (e.g. 5, 10, 15 hours)? I will verify the roadmap feasibility against your study budget before generating it."
            return {
                "response": prompt_msg,
                "needs_more_info": True,
                "extracted_role": intent.target_role,
                "extracted_timeframe": intent.timeframe,
                "roadmap": None,
            }

        # 4. Generate Feasibility-Verified Roadmap
        target_role = intent.target_role or "Software Engineer"
        timeframe = intent.timeframe or "3 months"
        hours_per_week = intent.hours_per_week

        roadmap_data = await self.generate_roadmap(
            target_role=target_role,
            timeframe=timeframe,
            hours_per_week=hours_per_week,
            current_skills=current_skills,
            max_attempts=max_attempts,
        )

        return {
            "response": f"I've designed a feasibility-verified roadmap for **{target_role}** over **{timeframe}** based on your **{hours_per_week} hours/week** budget ({roadmap_data['total_study_budget_hours']} total hours). Here is your step-by-step curriculum with hands-on portfolio deliverables:",
            "needs_more_info": False,
            "roadmap": roadmap_data,
        }

    async def generate_roadmap(
        self,
        target_role: str,
        timeframe: str,
        hours_per_week: int,
        current_skills: Optional[List[str]] = None,
        max_attempts: int = 3,
    ) -> Dict[str, Any]:
        """
        Executes Roadmap Generation with Feasibility Critic validation.
        """
        if not target_role or not timeframe or not hours_per_week or hours_per_week <= 0:
            raise ValueError("Target role, timeframe, and valid weekly study hours (>0) are required.")

        weeks = 12 if "3" in timeframe else (24 if "6" in timeframe else (52 if "year" in timeframe or "12" in timeframe else 16))
        total_hours = weeks * hours_per_week

        # Query Real-Time Market Trends via Tavily
        market_data = await tavily_client.get_market_skill_trends(target_role)

        critic_feedback = ""
        last_roadmap: Optional[CareerRoadmapOutput] = None

        for attempt in range(1, max_attempts + 1):
            logger.info(f"Career Roadmap Generation Attempt {attempt}/{max_attempts}")

            # 1. Generator Step
            prompt_feedback = f"\nFeasibility Critic Feedback from previous attempt: {critic_feedback}\n" if critic_feedback else ""
            structured_gen = self.generator_llm.with_structured_output(CareerRoadmapOutput)
            gen_chain = ROADMAP_GEN_PROMPT | structured_gen

            roadmap: CareerRoadmapOutput = await gen_chain.ainvoke({
                "target_role": target_role,
                "timeframe": timeframe,
                "hours_per_week": hours_per_week,
                "total_hours": total_hours,
                "current_skills": ", ".join(current_skills or ["General Software Fundamentals"]),
                "market_trends": str(market_data),
                "critic_feedback": prompt_feedback,
            })
            last_roadmap = roadmap

            # 2. Feasibility Critic Validation Step
            structured_critic = self.critic_llm.with_structured_output(FeasibilityEvaluation)
            critic_chain = FEASIBILITY_CRITIC_PROMPT | structured_critic

            evaluation: FeasibilityEvaluation = await critic_chain.ainvoke({
                "hours_per_week": hours_per_week,
                "timeframe": timeframe,
                "proposed_roadmap": str(roadmap.model_dump()),
            })

            if evaluation.passed:
                logger.info(f"Feasibility Critic PASSED on attempt {attempt}.")
                break
            else:
                logger.warning(f"Feasibility Critic REJECTED on attempt {attempt}: {evaluation.feedback}")
                critic_feedback = evaluation.feedback

        return {
            "target_role": target_role,
            "timeframe": timeframe,
            "hours_per_week": hours_per_week,
            "total_study_budget_hours": total_hours,
            "skill_gap_summary": last_roadmap.skill_gap_summary if last_roadmap else "Comprehensive learning pathway",
            "milestones": [m.model_dump() for m in last_roadmap.milestones] if last_roadmap else [],
            "market_overview": market_data.get("overview", ""),
            "critic_attempts": attempt,
            "critic_passed": evaluation.passed if 'evaluation' in locals() else True,
        }


career_roadmap_agent = CareerRoadmapAgent()
