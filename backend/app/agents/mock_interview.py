"""Mock Interview Agent: Stateful multi-turn simulation with STAR rubric, dynamic evaluation, and company intelligence."""

import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from backend.app.core.llm_factory import get_llm

logger = logging.getLogger(__name__)


class InterviewTurnResponse(BaseModel):
    micro_feedback: str = Field(..., description="Immediate constructive feedback on the candidate's previous response")
    next_question: str = Field(..., description="The next natural interview question or follow-up")
    star_score: Optional[Dict[str, int]] = Field(
        None, description="STAR ratings (1-5) for Situation, Task, Action, Result if in Behavioral mode"
    )


class FinalInterviewScorecard(BaseModel):
    overall_score: int = Field(..., description="Overall interview score 0 to 100")
    strengths: List[str] = Field(..., description="Key strengths demonstrated")
    areas_for_improvement: List[str] = Field(..., description="Areas to refine")
    star_method_assessment: str = Field(..., description="Evaluation of candidate's STAR structure and clarity")
    technical_depth_assessment: str = Field(..., description="Evaluation of technical accuracy and problem solving")
    hiring_recommendation: str = Field(..., description="Strong Hire, Hire, Leaning Hire, or Needs Improvement")


OPENING_QUESTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an experienced, welcoming, and professional hiring manager at {company_name} conducting a {interview_type} mock interview for the {job_title} role.

INTERVIEW CONTEXT:
Target Job Description:
{job_description}

Company Insights & Culture:
{company_insights}

Candidate Profile & Skills:
{candidate_summary}

TASK:
Craft a realistic, personalized, and engaging opening interview question (Turn 1).
- If Technical Mode: Welcome the candidate to {company_name} for the {job_title} role. Referencing key technical requirements from the job description or their background (e.g. system architecture, frameworks, scalability, data pipelines), ask a focused, practical opening technical question about their hands-on design or problem-solving experience.
- If Behavioral Mode: Welcome the candidate to {company_name}. Reference {company_name}'s values or the day-to-day collaborative environment of the {job_title} position, and ask a STAR-focused behavioral question (Situation, Task, Action, Result) regarding real-world challenges (e.g., cross-functional leadership, resolving ambiguity, or recovering from setbacks).
- If General Mode: Welcome the candidate and ask an insightful question exploring their domain focus and alignment with {job_title}.

Keep the question concise, natural, and directly targeted to {job_title} at {company_name}. Do NOT output headers, bullets, or meta-commentary outside the interviewer's direct spoken message.
"""),
    ("human", "Generate the personalized opening question for Turn 1.")
])


TURN_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an experienced, professional hiring manager conducting a realistic {interview_type} mock interview.

INTERVIEW CONTEXT:
Job Title / Domain: {job_title}
Company / Organization: {company_name}
Company Culture & Intelligence: {company_insights}
Candidate Profile & Experience: {candidate_summary}
Target Job Requirements / Focus: {job_description}

INTERVIEW TYPE SPECIFICS:
- General Mode: Probe domain knowledge, career aspirations, and communication skills in {job_title}.
- Technical Mode: Probe architectural decisions, coding patterns, system design, and technical tradeoffs for {job_title} based on the candidate's CV, target JD, and company tech culture.
- Behavioral Mode: Rigorously evaluate behavioral responses against the STAR framework (Situation, Task, Action, Result) in the context of {company_name}'s culture and {job_title}.

GUIDELINES:
1. Provide concise, constructive micro-feedback on the candidate's last answer.
2. Ask ONE clear, focused question for Turn {turn_number} of {total_turns}.
3. Anchor questions in the candidate's actual CV experience and company values when relevant.
"""),
    ("human", """Conversation History:
{conversation_history}

Candidate's Latest Response:
{user_response}
""")
])


FINAL_EVAL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a senior interview board evaluator.
Review the complete mock interview transcript and generate an in-depth scorecard with rubric ratings and actionable recommendations.
"""),
    ("human", """Interview Type: {interview_type}
Job Title / Domain: {job_title}
Full Interview Transcript:
{transcript}
""")
])


class MockInterviewAgent:
    def __init__(self):
        self.llm = get_llm(temperature=0.3)

    async def generate_first_question(
        self,
        interview_type: str,
        job_title: str,
        company_name: str,
        candidate_summary: str,
        job_description: Optional[str] = None,
        domain: Optional[str] = None,
        company_insights: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generate a personalized opening interview question dynamically tailored to the specific job and candidate."""
        effective_title = domain if (interview_type.lower() == "general" and domain) else (job_title or "Software Engineer")
        effective_company = company_name or "Target Company"
        effective_desc = job_description or f"Core competencies, system architecture, and responsibilities for {effective_title}."
        
        insights_str = "None specified"
        if company_insights:
            culture = company_insights.get("culture_values", [])
            tech_stack = company_insights.get("tech_stack", [])
            summary = company_insights.get("summary", "")
            insights_str = f"Culture: {', '.join(culture)}. Tech Stack: {', '.join(tech_stack)}. Overview: {summary}"

        try:
            chain = OPENING_QUESTION_PROMPT | self.llm
            res = await chain.ainvoke({
                "interview_type": interview_type,
                "job_title": effective_title,
                "company_name": effective_company,
                "job_description": effective_desc,
                "company_insights": insights_str,
                "candidate_summary": candidate_summary or "Experienced technical professional",
            })
            content = res.content if hasattr(res, "content") else str(res)
            if content and len(content.strip()) > 20:
                return content.strip()
        except Exception as e:
            logger.warning(f"Dynamic opening question generation fallback: {e}")

        # Fallback if LLM is unavailable
        if interview_type.lower() == "behavioral":
            return f"Welcome! We're conducting a behavioral interview for the {effective_title} role at {effective_company}. To begin, could you tell me about a high-stakes project from your past experience where you had to overcome a major unexpected obstacle, and walk me through your actions and the outcome?"
        elif interview_type.lower() == "technical":
            return f"Hello! We're excited to dive into your technical background for the {effective_title} position at {effective_company}. Could you walk me through the architecture of a complex system or technical project you built, explaining the core technologies you selected and the key engineering tradeoffs you made?"
        else:
            return f"Hi! Welcome to your {effective_title} interview. Could you introduce yourself, highlight your core background in {effective_title}, and share what challenges you're most excited to tackle in this domain?"

    async def evaluate_turn(
        self,
        interview_type: str,
        job_title: str,
        company_name: str,
        candidate_summary: str,
        job_description: str,
        conversation_history: List[Dict[str, str]],
        user_response: str,
        current_turn: int,
        total_turns: int = 999,
        company_insights: Optional[Dict[str, Any]] = None,
    ) -> InterviewTurnResponse:
        """Evaluate the candidate's answer and generate the next question."""
        formatted_history = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in conversation_history[-6:]])

        insights_str = "No specific company dossier."
        if company_insights:
            summary = company_insights.get("summary", "")
            values = ", ".join(company_insights.get("culture_values", []))
            insights_str = f"Summary: {summary} | Values: {values}"

        structured_llm = self.llm.with_structured_output(InterviewTurnResponse)
        chain = TURN_PROMPT | structured_llm

        result: InterviewTurnResponse = await chain.ainvoke({
            "interview_type": interview_type,
            "job_title": job_title,
            "company_name": company_name,
            "company_insights": insights_str,
            "candidate_summary": candidate_summary,
            "job_description": job_description[:800],
            "conversation_history": formatted_history or "No previous turns.",
            "user_response": user_response,
            "turn_number": current_turn,
            "total_turns": total_turns,
        })
        return result

    async def generate_final_scorecard(
        self,
        interview_type: str,
        job_title: str,
        conversation_history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Compile the final comprehensive interview scorecard."""
        transcript = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in conversation_history])

        structured_llm = self.llm.with_structured_output(FinalInterviewScorecard)
        chain = FINAL_EVAL_PROMPT | structured_llm

        scorecard: FinalInterviewScorecard = await chain.ainvoke({
            "interview_type": interview_type,
            "job_title": job_title,
            "transcript": transcript,
        })
        return scorecard.model_dump()


mock_interview_agent = MockInterviewAgent()
