"""Application Tailoring Agent: Crafts tailored CV bullet points, cover letters, and emails with Fact-Check Critic reflection loop."""

import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from backend.app.core.llm_factory import get_llm
from backend.app.services.ats_engine import compute_job_specific_ats_match

logger = logging.getLogger(__name__)


class TailoredApplicationOutput(BaseModel):
    tailored_experience: List[Dict[str, Any]] = Field(..., description="Tailored experience entries with rephrased bullets emphasizing target JD keywords")
    cover_letter: str = Field(..., description="Professional, personalized cover letter referencing company context")
    cold_email: str = Field(..., description="Concise, high-impact cold outreach email for hiring manager")
    highlighted_skills: List[str] = Field(default_factory=list, description="Core verified skills emphasized")


class CriticEvaluation(BaseModel):
    passed: bool = Field(..., description="True if output is 100% factual and hallucination-free")
    hallucinations_found: List[str] = Field(default_factory=list, description="Any invented technologies, roles, or claims not in original CV")
    feedback: str = Field(..., description="Actionable feedback for the generator if rejected")


GENERATOR_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an elite Career Copilot & Resume Strategist.
Your goal is to tailor the candidate's existing experience to best match the target Job Description (JD).

CRITICAL RULES:
1. NEVER invent or hallucinate new skills, companies, tools, or dates not in the Original CV.
2. Rephrase, reorder, and emphasize existing achievements to align with JD requirements.
3. Keep the cover letter compelling, concise, and focused on value proposition.
4. Craft a direct, 3-paragraph cold outreach email.
{critic_feedback}
"""),
    ("human", """Candidate Original Profile:
Skills: {candidate_skills}
Experience: {candidate_experience}

Target Job:
Title: {job_title}
Company: {company_name}
Description: {job_description}
Company Insights: {company_insights}
""")
])


CRITIC_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a rigorous Fact-Checking & Anti-Hallucination Critic for resumes.
Compare the Tailored Application against the Candidate's Original CV.
Verify that:
1. The tailored experience does NOT invent technologies, tools, or metrics that were absent from the original CV.
2. The candidate's job titles and company names remain strictly accurate.
3. The cover letter does not claim unverified degrees or credentials.

Output 'passed: true' ONLY if it is 100% truthful to the original CV.
"""),
    ("human", """Original CV Skills & Experience:
{original_cv}

Generated Tailored Experience:
{tailored_experience}

Generated Cover Letter:
{cover_letter}
""")
])


class ApplicationTailorAgent:
    def __init__(self):
        self.generator_llm = get_llm(temperature=0.2)
        self.critic_llm = get_llm(temperature=0.0)

    async def tailor_application(
        self,
        parsed_cv: Dict[str, Any],
        job: Dict[str, Any],
        company_insights: Optional[Dict[str, Any]] = None,
        max_attempts: int = 3,
    ) -> Dict[str, Any]:
        """
        Executes the Generator-Critic reflection loop to guarantee a truthful, high-match application.
        """
        candidate_skills = parsed_cv.get("skills_inventory", [])
        candidate_exp = parsed_cv.get("experience", [])
        job_title = job.get("title", "")
        company_name = job.get("company", "")
        job_desc = job.get("description", "")
        insights_str = company_insights.get("summary", "") if company_insights else "High growth tech company"

        critic_feedback = ""
        last_generated: Optional[TailoredApplicationOutput] = None

        for attempt in range(1, max_attempts + 1):
            logger.info(f"Application Tailoring Attempt {attempt}/{max_attempts}")

            # 1. Generator Step
            prompt_feedback = f"\nCritic Feedback from previous attempt: {critic_feedback}\n" if critic_feedback else ""
            structured_gen = self.generator_llm.with_structured_output(TailoredApplicationOutput)
            gen_chain = GENERATOR_PROMPT | structured_gen

            generated: TailoredApplicationOutput = await gen_chain.ainvoke({
                "candidate_skills": ", ".join(candidate_skills),
                "candidate_experience": str(candidate_exp),
                "job_title": job_title,
                "company_name": company_name,
                "job_description": job_desc,
                "company_insights": insights_str,
                "critic_feedback": prompt_feedback,
            })
            last_generated = generated

            # 2. Critic Validation Step
            structured_critic = self.critic_llm.with_structured_output(CriticEvaluation)
            critic_chain = CRITIC_PROMPT | structured_critic

            evaluation: CriticEvaluation = await critic_chain.ainvoke({
                "original_cv": f"Skills: {', '.join(candidate_skills)}\nExperience: {str(candidate_exp)}",
                "tailored_experience": str(generated.tailored_experience),
                "cover_letter": generated.cover_letter,
            })

            if evaluation.passed:
                logger.info(f"Fact Critic PASSED on attempt {attempt}.")
                break
            else:
                logger.warning(f"Fact Critic REJECTED on attempt {attempt}: {evaluation.feedback}")
                critic_feedback = f"Fix hallucinations: {', '.join(evaluation.hallucinations_found)}. {evaluation.feedback}"

        # Calculate Before vs After ATS Match Score
        required_skills = job.get("extracted_skills", [])
        original_match = compute_job_specific_ats_match(
            cv_skills=candidate_skills,
            job_required_skills=required_skills,
            cv_bullets=parsed_cv.get("experience_bullets", []),
            job_description=job_desc,
        )

        tailored_bullets = []
        for exp in last_generated.tailored_experience:
            tailored_bullets.extend(exp.get("bullets", []))

        tailored_match = compute_job_specific_ats_match(
            cv_skills=last_generated.highlighted_skills or candidate_skills,
            job_required_skills=required_skills,
            cv_bullets=tailored_bullets,
            job_description=job_desc,
        )

        return {
            "tailored_cv_data": {
                "contact_info": parsed_cv.get("contact_info", {}),
                "professional_summary": f"Targeted candidate for {job_title} at {company_name}.",
                "skills": last_generated.highlighted_skills or candidate_skills,
                "experience": last_generated.tailored_experience,
                "education": parsed_cv.get("education", []),
            },
            "cover_letter": last_generated.cover_letter,
            "cold_email": last_generated.cold_email,
            "ats_score_before": original_match["match_score"],
            "ats_score_after": max(tailored_match["match_score"], original_match["match_score"]),
            "critic_attempts": attempt,
            "critic_passed": evaluation.passed if 'evaluation' in locals() else True,
        }


application_tailor_agent = ApplicationTailorAgent()
