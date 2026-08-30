"""Application Tailoring Agent: Crafts full tailored CVs, cover letters, and emails with Fact-Check Critic reflection loop."""

import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, field_validator
from langchain_core.prompts import ChatPromptTemplate
from backend.app.core.llm_factory import get_llm
from backend.app.services.ats_engine import compute_job_specific_ats_match

logger = logging.getLogger(__name__)


class TailoredApplicationOutput(BaseModel):
    tailored_professional_summary: str = Field(..., description="Compelling 2-3 sentence professional summary tailored specifically to the target role without inventing facts")
    highlighted_skills: Optional[List[str]] = Field(default_factory=list, description="Candidate's verified skills prioritized and aligned with target JD requirements")
    tailored_experience: List[Dict[str, Any]] = Field(default_factory=list, description="Tailored experience entries with rephrased bullets emphasizing target JD keywords")
    cover_letter: str = Field(..., description="Professional, personalized cover letter referencing company context")
    cold_email: str = Field(..., description="Concise, high-impact 3-paragraph cold outreach email for hiring manager")

    @field_validator("highlighted_skills", "tailored_experience", mode="before")
    @classmethod
    def convert_null_to_list(cls, v):
        return v if v is not None else []


class CriticEvaluation(BaseModel):
    passed: bool = Field(..., description="True if output is 100% factual and hallucination-free")
    hallucinations_found: Optional[List[str]] = Field(default_factory=list, description="Any invented technologies, roles, or claims not in original CV")
    feedback: str = Field(..., description="Actionable feedback for the generator if rejected")

    @field_validator("hallucinations_found", mode="before")
    @classmethod
    def convert_null_to_list(cls, v):
        return v if v is not None else []


GENERATOR_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an elite Career Copilot & Resume Strategist.
Your goal is to tailor the candidate's full resume, cover letter, and cold outreach email to match the target Job Description (JD).

CRITICAL RULES:
1. NEVER invent or hallucinate new skills, companies, tools, degrees, or metrics absent from the Original CV.
2. Formulate a strong, targeted Professional Summary based only on verified experience.
3. Prioritize existing candidate skills that match the JD.
4. Rephrase, reorder, and emphasize existing experience bullets to highlight relevance to the target JD.
5. Craft a compelling cover letter and a concise, 3-paragraph cold outreach email.
{critic_feedback}
"""),
    ("human", """Candidate Original Profile:
Skills: {candidate_skills}
Experience: {candidate_experience}
Education: {candidate_education}

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
1. The tailored experience and summary do NOT invent technologies, tools, or metrics that were absent from the original CV.
2. The candidate's job titles and company names remain strictly accurate.
3. Highlighted skills contain only skills supported by the original CV.
4. The cover letter does not claim unverified degrees, credentials, employers, metrics, or responsibilities.
5. The cold outreach email does not contain unsupported skills, achievements, credentials, or metrics.

Output 'passed: true' ONLY if it is 100% truthful to the original CV.
"""),
    ("human", """Original CV Skills & Experience:
{original_cv}

Generated Tailored Summary & Experience:
Summary: {tailored_summary}
Highlighted Skills: {highlighted_skills}
Experience: {tailored_experience}

Generated Cover Letter:
{cover_letter}

Generated Cold Outreach Email:
{cold_email}
""")
])


import json
import re

def _extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    return None


class ApplicationTailorAgent:
    def __init__(self):
        self.generator_llm = get_llm(temperature=0.2)
        self.critic_llm = get_llm(temperature=0.0)

    def _fallback_tailored_output(
        self,
        candidate_skills: List[str],
        candidate_exp: List[Dict[str, Any]],
        job_title: str,
        company_name: str,
        job_desc: str,
    ) -> TailoredApplicationOutput:
        summary = (
            f"Results-driven technical professional specializing in {job_title} responsibilities. "
            f"Equipped with proven expertise in {', '.join(candidate_skills[:5]) if candidate_skills else 'core engineering domains'} "
            f"to deliver scalable solutions and business value for {company_name}."
        )
        cover_letter = (
            f"Dear Hiring Team at {company_name},\n\n"
            f"I am writing to express my strong interest in the {job_title} position. "
            f"With a solid background in {', '.join(candidate_skills[:4]) if candidate_skills else 'technical engineering'}, "
            f"I have successfully designed and delivered production-grade systems that align closely with the responsibilities described for {company_name}.\n\n"
            f"My practical experience in model development, software engineering, and collaborative team delivery has prepared me to immediately contribute to your high-impact initiatives. "
            f"I look forward to discussing how my skills and background will support your team's goals.\n\n"
            f"Sincerely,\nCandidate"
        )
        cold_email = (
            f"Subject: Application for {job_title} at {company_name}\n\n"
            f"Hi Hiring Team,\n\n"
            f"I am reaching out regarding the open {job_title} role at {company_name}. "
            f"With hands-on experience in {', '.join(candidate_skills[:3]) if candidate_skills else 'software and AI engineering'}, "
            f"I would love to explore how my background aligns with your current priorities.\n\n"
            f"Are you available for a brief conversation in the coming days?\n\n"
            f"Best regards,\nCandidate"
        )
        return TailoredApplicationOutput(
            tailored_professional_summary=summary,
            highlighted_skills=candidate_skills[:12] if candidate_skills else [],
            tailored_experience=candidate_exp,
            cover_letter=cover_letter,
            cold_email=cold_email,
        )

    async def _generate_output(self, input_dict: Dict[str, Any]) -> Optional[TailoredApplicationOutput]:
        try:
            structured_gen = self.generator_llm.with_structured_output(TailoredApplicationOutput)
            gen_chain = GENERATOR_PROMPT | structured_gen
            return await gen_chain.ainvoke(input_dict)
        except Exception as e:
            err_str = str(e)
            logger.warning(f"Structured generator tool-call failed ({e}), attempting fallback extraction...")
            if "failed_generation" in err_str:
                match = re.search(r'"arguments":\s*(\{[\s\S]*\}|"[^"]+")', err_str)
                if match:
                    raw_args = match.group(1)
                    if raw_args.startswith('"') and raw_args.endswith('"'):
                        try:
                            raw_args = json.loads(raw_args)
                        except Exception:
                            pass
                    parsed = _extract_json_from_text(raw_args) if isinstance(raw_args, str) else raw_args
                    if isinstance(parsed, dict):
                        return TailoredApplicationOutput(**parsed)
            try:
                raw_res = await (GENERATOR_PROMPT | self.generator_llm).ainvoke(input_dict)
                content = raw_res.content if hasattr(raw_res, 'content') else str(raw_res)
                parsed = _extract_json_from_text(content)
                if isinstance(parsed, dict):
                    return TailoredApplicationOutput(**parsed)
            except Exception as direct_err:
                logger.warning(f"Direct generator prompt fallback failed: {direct_err}")
            return None

    async def _evaluate_critic(self, input_dict: Dict[str, Any]) -> CriticEvaluation:
        try:
            structured_critic = self.critic_llm.with_structured_output(CriticEvaluation)
            critic_chain = CRITIC_PROMPT | structured_critic
            return await critic_chain.ainvoke(input_dict)
        except Exception as e:
            err_str = str(e)
            logger.warning(f"Structured critic tool-call failed ({e}), attempting fallback extraction...")
            if "failed_generation" in err_str:
                match = re.search(r'"arguments":\s*(\{[\s\S]*\}|"[^"]+")', err_str)
                if match:
                    raw_args = match.group(1)
                    if raw_args.startswith('"') and raw_args.endswith('"'):
                        try:
                            raw_args = json.loads(raw_args)
                        except Exception:
                            pass
                    parsed = _extract_json_from_text(raw_args) if isinstance(raw_args, str) else raw_args
                    if isinstance(parsed, dict):
                        return CriticEvaluation(**parsed)
            try:
                raw_res = await (CRITIC_PROMPT | self.critic_llm).ainvoke(input_dict)
                content = raw_res.content if hasattr(raw_res, 'content') else str(raw_res)
                parsed = _extract_json_from_text(content)
                if isinstance(parsed, dict):
                    return CriticEvaluation(**parsed)
            except Exception as direct_err:
                logger.warning(f"Direct critic prompt fallback failed: {direct_err}")
            return CriticEvaluation(
                passed=False,
                feedback="Automated fact verification encountered formatting anomaly.",
                hallucinations_found=["Transient model formatting anomaly"],
            )

    async def tailor_application(
        self,
        parsed_cv: Dict[str, Any],
        job: Dict[str, Any],
        company_insights: Optional[Dict[str, Any]] = None,
        max_attempts: int = 3,
    ) -> Dict[str, Any]:
        """
        Executes the Generator-Critic reflection loop to guarantee a truthful, high-match full application.
        """
        candidate_skills = parsed_cv.get("skills_inventory", [])
        candidate_exp = parsed_cv.get("experience", [])
        candidate_edu = parsed_cv.get("education", [])
        candidate_contact = parsed_cv.get("contact_info", {})
        candidate_certs = parsed_cv.get("certifications", [])

        job_title = job.get("title", "")
        company_name = job.get("company", "")
        job_desc = job.get("description", "")
        insights_str = company_insights.get("summary", "") if company_insights else "High growth tech company"

        critic_feedback = ""
        last_generated: Optional[TailoredApplicationOutput] = None
        final_evaluation: Optional[CriticEvaluation] = None
        attempt_count = 0

        for attempt in range(1, max_attempts + 1):
            attempt_count = attempt
            logger.info(f"Application Tailoring Attempt {attempt}/{max_attempts}")

            # 1. Generator Step
            prompt_feedback = f"\nCritic Feedback from previous attempt: {critic_feedback}\n" if critic_feedback else ""
            generated = await self._generate_output({
                "candidate_skills": ", ".join(candidate_skills),
                "candidate_experience": str(candidate_exp),
                "candidate_education": str(candidate_edu),
                "job_title": job_title,
                "company_name": company_name,
                "job_description": job_desc,
                "company_insights": insights_str,
                "critic_feedback": prompt_feedback,
            })

            if not generated:
                logger.warning(f"Generator attempt {attempt} failed to produce output.")
                if attempt == max_attempts and not last_generated:
                    last_generated = self._fallback_tailored_output(
                        candidate_skills, candidate_exp, job_title, company_name, job_desc
                    )
                continue

            last_generated = generated

            # 2. Critic Validation Step
            evaluation = await self._evaluate_critic({
                "original_cv": str(parsed_cv),
                "tailored_summary": generated.tailored_professional_summary,
                "highlighted_skills": ", ".join(generated.highlighted_skills or []),
                "tailored_experience": str(generated.tailored_experience),
                "cover_letter": generated.cover_letter,
                "cold_email": generated.cold_email,
            })
            final_evaluation = evaluation

            if evaluation.passed:
                logger.info(f"Fact Critic PASSED on attempt {attempt}.")
                break
            else:
                logger.warning(f"Fact Critic REJECTED on attempt {attempt}: {evaluation.feedback}")
                critic_feedback = f"Fix hallucinations: {', '.join(evaluation.hallucinations_found or [])}. {evaluation.feedback}"

        if not last_generated:
            last_generated = self._fallback_tailored_output(
                candidate_skills, candidate_exp, job_title, company_name, job_desc
            )

        # Calculate Before vs After ATS Match Score using Standard 5-Factor Model
        required_skills = job.get("extracted_skills", [])
        original_match = compute_job_specific_ats_match(
            cv_skills=candidate_skills,
            job_required_skills=required_skills,
            cv_bullets=parsed_cv.get("experience_bullets", []),
            job_description=job_desc,
            cv_experience=candidate_exp,
            target_job_title=job_title,
        )

        tailored_bullets = []
        tailored_exp = last_generated.tailored_experience if last_generated else candidate_exp
        for exp in tailored_exp:
            tailored_bullets.extend(exp.get("bullets", []))

        tailored_match = compute_job_specific_ats_match(
            cv_skills=(last_generated.highlighted_skills if last_generated and last_generated.highlighted_skills else candidate_skills),
            job_required_skills=required_skills,
            cv_bullets=tailored_bullets,
            job_description=job_desc,
            cv_experience=tailored_exp,
            target_job_title=job_title,
        )

        # Full Tailored CV Object
        full_tailored_cv = {
            "contact_info": candidate_contact,
            "professional_summary": last_generated.tailored_professional_summary if last_generated else f"Targeted candidate for {job_title} at {company_name}.",
            "skills": last_generated.highlighted_skills if last_generated and last_generated.highlighted_skills else candidate_skills,
            "experience": tailored_exp,
            "education": candidate_edu,
            "certifications": candidate_certs,
        }

        critic_passed = final_evaluation.passed if final_evaluation else False

        return {
            "tailored_cv_data": full_tailored_cv,
            "cover_letter": last_generated.cover_letter if last_generated else "",
            "cold_email": last_generated.cold_email if last_generated else "",
            "ats_score_before": original_match["match_score"],
            "ats_score_after": tailored_match["match_score"],
            "match_details_before": original_match,
            "match_details_after": tailored_match,
            "critic_attempts": attempt_count,
            "critic_passed": critic_passed,
            "critic_feedback": final_evaluation.feedback if final_evaluation else "Fact verification did not complete.",
            "hallucinations_found": final_evaluation.hallucinations_found if final_evaluation else [],
            "export_allowed": critic_passed,
        }


application_tailor_agent = ApplicationTailorAgent()
