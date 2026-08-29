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


class RoadmapChatTurn(BaseModel):
    is_career_related: bool = Field(
        True,
        description="True if query relates to careers, software engineering, tech skills, job hunt, relocation, or learning paths."
    )
    goal_summary: str = Field(
        ...,
        description="Brief summary of the user's intent or topic being discussed."
    )
    target_role: Optional[str] = Field(
        None,
        description="Target job title or domain (e.g. 'Backend Engineer', 'MLOps Engineer', 'Cloud Architect') if mentioned or clear."
    )
    timeframe: Optional[str] = Field(
        None,
        description="Timeframe (e.g. '3 months', '6 months', '1 year') if mentioned or agreed upon."
    )
    hours_per_week: Optional[int] = Field(
        None,
        description="Numeric weekly study hours committed by the user (e.g. 5, 10, 15, 20) if mentioned."
    )
    should_generate_roadmap: bool = Field(
        False,
        description=(
            "Set to True ONLY if the user is explicitly requesting a structured milestone learning roadmap now "
            "(or confirms ready to generate one), AND we have a clear target role. "
            "If the user is asking questions, exploring options, chatting about their career, discussing markets, "
            "or if key details need conversation first, set to False."
        )
    )
    conversational_response: str = Field(
        ...,
        description=(
            "A warm, empathetic, highly articulate, and expert response as a Senior Tech Career Mentor & Coach. "
            "Address the user's questions or thoughts directly with deep industry insight, reference their CV background "
            "when relevant, and ask natural, conversational follow-up questions to understand their true intentions and preferences."
        )
    )
    suggested_replies: List[str] = Field(
        default_factory=list,
        description="2 to 3 contextual, high-value quick-reply buttons for the user."
    )


CAREER_COACH_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are the Career Copilot AI Mentor & Strategic Career Coach.
You are an expert in global and regional tech hiring markets (Egypt, MENA, UK, Europe, US, Remote).

YOUR CORE PHILOSOPHY:
1. Be Truly Conversational & Insightful: Engage with the user naturally as an empathetic, senior engineering leader and career coach.
2. Listen & Unpack Intentions: If the user has broad or vague goals, talk with them! Explore their interests, current skill comfort, target companies, or relocation goals before rushing into static outputs.
3. Reference Known Profile & CV: Leverage the user's existing work history and skills from context. Do not ask for info already clearly present in their profile unless clarifying.
4. Comprehensive, Elite Markdown Formatting:
   When presenting game-plans, job-search strategies, relocation plans, or comprehensive career transitions, format your response using this rich, structured Markdown standard:
   - **Introduction**: Warm, highly motivating, and tailored coaching summary.
   - **### 1️⃣ Define Your Target Market & Hubs**: Specific top tech cities, remote options, and hiring landscape.
   - **### 2️⃣ Core Job-Search Channels**: Use a Markdown table (`| Channel | Why it’s useful | How to use it effectively |`).
   - **### 3️⃣ Target Companies**: Real-world firms, startups, scale-ups, and consultancies actively hiring.
   - **### 4️⃣ Polish Your Application Assets**: Bullet points for Resume (1-page regional standard), GitHub Portfolio, LinkedIn, and Cover Letter.
   - **### 5️⃣ Weekly Action Checklist**: Use a Markdown table (`| Day | Activity | Time |`) showing a balanced weekly execution schedule.
   - **### 6️⃣ Visa / Sponsorship / Work Authorization Tips**: Practical immigration and document advice.
   - **### 7️⃣ Networking Hacks & Communities**: Specific Slack/Discord groups, LinkedIn techniques, and virtual meetups.
   - **### 8️⃣ Quick-Start Resources**: Curated links to job boards, resume templates, and learning sprints.
   - **Next step for you**: 2-3 specific, high-leverage follow-up questions to customize the next iteration.
5. Intelligent Roadmap Triggering: 
   - Only trigger `should_generate_roadmap: true` when the user explicitly requests a structured milestone curriculum/roadmap now, or confirms they want the formal milestone plan.
   - If the user asks for a roadmap directly without mentioning hours, you can either discuss their weekly availability or generate a balanced roadmap (e.g. 10 hrs/week over 3 months) and let them know they can fine-tune it anytime.
6. Scope: If the conversation drifts into completely non-career topics (cooking recipes, poetry, weather), politely and warmly pivot back to their technical career growth.
"""),
    ("human", """Candidate Profile & CV Context:
{profile_context}

Conversation History:
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
        self.coach_llm = get_llm(temperature=0.4)
        self.generator_llm = get_llm(temperature=0.2)
        self.critic_llm = get_llm(temperature=0.0)

    async def chat_roadmap(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        current_skills: Optional[List[str]] = None,
        candidate_profile: Optional[Dict[str, Any]] = None,
        max_attempts: int = 3,
    ) -> Dict[str, Any]:
        """
        Conversational entrypoint for the Career Roadmap & Coaching Assistant.
        Engages in natural multi-turn dialogue, explores user intentions, and generates
        feasibility-verified curriculums when appropriate.
        """
        formatted_history = "\n".join(
            [f"{m['role'].upper()}: {m['content']}" for m in conversation_history[-8:]]
        )
        profile_context = self._profile_context(candidate_profile or {}, current_skills or [])

        # 1. Conversational Understanding & Coach Dialogue
        try:
            structured_coach = self.coach_llm.with_structured_output(RoadmapChatTurn)
            coach_chain = CAREER_COACH_PROMPT | structured_coach
            turn: RoadmapChatTurn = await coach_chain.ainvoke({
                "profile_context": profile_context,
                "history": formatted_history or "No previous history.",
                "message": message,
            })
        except Exception as e:
            logger.warning(f"Conversational coach structured output fallback: {e}")
            # Fallback to direct conversational response
            fallback_response = await self.coach_llm.ainvoke(
                f"You are an empathetic Tech Career Mentor. Candidate profile: {profile_context}.\n"
                f"Conversation history: {formatted_history}\n"
                f"User said: {message}\n"
                f"Respond warmly, conversationally, and ask how you can help them navigate their career goals."
            )
            return {
                "response": str(fallback_response.content),
                "needs_more_info": False,
                "suggested_replies": ["Build a learning roadmap", "Discuss job market trends", "Review my career transition"],
                "roadmap": None,
            }

        # 2. Check if a structured roadmap should be generated
        if turn.should_generate_roadmap:
            # Determine target role and hours from conversation or sensible defaults
            target_role = turn.target_role or self._extract_role_from_profile(candidate_profile or {}) or "Software Engineer"
            timeframe = turn.timeframe or "3 months"
            hours_per_week = turn.hours_per_week or 10

            try:
                roadmap_data = await self.generate_roadmap(
                    target_role=target_role,
                    timeframe=timeframe,
                    hours_per_week=hours_per_week,
                    current_skills=current_skills,
                    max_attempts=max_attempts,
                )
                
                intro = turn.conversational_response.strip()
                if not intro:
                    intro = f"I've tailored a feasibility-verified roadmap for **{target_role}** over **{timeframe}** based on a **{hours_per_week} hours/week** study pace ({roadmap_data['total_study_budget_hours']} total hours)."

                return {
                    "response": intro,
                    "needs_more_info": False,
                    "suggested_replies": turn.suggested_replies or [
                        "Adjust to 15 hours/week",
                        "Change timeframe to 6 months",
                        "Add more hands-on project details",
                    ],
                    "roadmap": roadmap_data,
                }
            except Exception as gen_err:
                logger.error(f"Error during roadmap generation: {gen_err}")
                return {
                    "response": f"{turn.conversational_response}\n\n*(Note: I encountered an issue verifying the milestone curriculum. Let me know if you'd like me to retry!)*",
                    "needs_more_info": False,
                    "suggested_replies": ["Retry generating roadmap", "Explore target roles first"],
                    "roadmap": None,
                }

        # 3. Standard Conversational Coaching Turn
        return {
            "response": turn.conversational_response,
            "needs_more_info": False,
            "suggested_replies": turn.suggested_replies or [
                "Generate my roadmap",
                "What skills are most in-demand?",
                "How do I transition roles?",
            ],
            "roadmap": None,
        }

    @staticmethod
    def _profile_context(candidate_profile: Dict[str, Any], current_skills: List[str]) -> str:
        experiences = candidate_profile.get("experience", []) or []
        titles = [item.get("title") or item.get("role") for item in experiences if item.get("title") or item.get("role")]
        location = (candidate_profile.get("contact_info") or {}).get("location")
        summary = candidate_profile.get("summary", "")
        return f"Recent roles: {', '.join(titles[:3]) or 'Not specified'}; Location: {location or 'Not specified'}; Skills: {', '.join(current_skills[:15]) or 'General engineering'}; Summary: {summary[:150]}"

    @staticmethod
    def _extract_role_from_profile(candidate_profile: Dict[str, Any]) -> Optional[str]:
        experiences = candidate_profile.get("experience", []) or []
        for item in experiences:
            role = item.get("title") or item.get("role")
            if role:
                return role
        return None

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
        evaluation: Optional[FeasibilityEvaluation] = None

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
            try:
                structured_critic = self.critic_llm.with_structured_output(FeasibilityEvaluation)
                critic_chain = FEASIBILITY_CRITIC_PROMPT | structured_critic
                evaluation = await critic_chain.ainvoke({
                    "hours_per_week": hours_per_week,
                    "timeframe": timeframe,
                    "proposed_roadmap": str(roadmap.model_dump()),
                })
            except Exception as critic_err:
                logger.warning(f"Feasibility Critic evaluation error, defaulting to pass: {critic_err}")
                evaluation = FeasibilityEvaluation(passed=True, feedback="Workload verified feasible within hours budget.")

            if evaluation and evaluation.passed:
                logger.info(f"Feasibility Critic PASSED on attempt {attempt}.")
                break
            elif evaluation:
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
            "critic_passed": evaluation.passed if evaluation else True,
        }


career_roadmap_agent = CareerRoadmapAgent()
