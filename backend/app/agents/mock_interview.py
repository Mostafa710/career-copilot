"""Mock Interview Agent: Stateful multi-turn simulation with STAR rubric and dynamic evaluation."""

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


TURN_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an experienced, professional hiring manager conducting a realistic {interview_type} mock interview.

INTERVIEW CONTEXT:
Job Title / Domain: {job_title}
Company / Organization: {company_name}
Candidate Profile & Experience: {candidate_summary}
Target Job Requirements / Focus: {job_description}

INTERVIEW TYPE SPECIFICS:
- General Mode: Probe domain knowledge, career aspirations, and communication skills in {job_title}.
- Technical Mode: Probe architectural decisions, coding patterns, system design, and technical tradeoffs for {job_title} based on the candidate's CV and target JD.
- Behavioral Mode: Rigorously evaluate behavioral responses against the STAR framework (Situation, Task, Action, Result) in the context of {company_name} and {job_title}.

GUIDELINES:
1. Provide concise, constructive micro-feedback on the candidate's last answer.
2. Ask ONE clear, focused question for Turn {turn_number} of {total_turns}.
3. Anchor questions in the candidate's actual CV experience when relevant.
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
        domain: Optional[str] = None,
    ) -> str:
        """Generate a personalized opening interview question."""
        if interview_type.lower() == "behavioral":
            return f"Welcome! We're conducting a behavioral interview for the {job_title} role at {company_name}. To begin, could you tell me about a high-stakes project from your past experience where you had to overcome a major unexpected obstacle, and walk me through your actions and the outcome?"
        elif interview_type.lower() == "technical":
            return f"Hello! We're excited to dive into your technical background for the {job_title} position at {company_name}. Could you walk me through the architecture of a complex system or technical project you built, explaining the core technologies you selected and the key engineering tradeoffs you made?"
        else:
            focus = domain or job_title
            return f"Hi! Welcome to your {focus} interview. Could you introduce yourself, highlight your core background in {focus}, and share what challenges you're most excited to tackle in this domain?"

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
    ) -> InterviewTurnResponse:
        """Evaluate the candidate's answer and generate the next question."""
        formatted_history = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in conversation_history[-6:]])

        structured_llm = self.llm.with_structured_output(InterviewTurnResponse)
        chain = TURN_PROMPT | structured_llm

        result: InterviewTurnResponse = await chain.ainvoke({
            "interview_type": interview_type,
            "job_title": job_title,
            "company_name": company_name,
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
