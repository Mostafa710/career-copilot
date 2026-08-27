"""
Job Matching & Ranking Agent: Evaluates Candidate CV against target jobs using the Standardized 5-Factor Model:
1. Hard Skills & Keywords (40%)
2. Semantic NLP & Embeddings (25%)
3. Title & Seniority Alignment (15%)
4. Experience Duration & Recency (10%)
5. Soft Skills & Competencies (10%)
"""

import re
import logging
from typing import List, Dict, Any, Optional
from backend.app.services.ats_engine import compute_job_specific_ats_match

logger = logging.getLogger(__name__)

# Common technical skill tokens for rapid extraction
COMMON_TECH_KEYWORDS = {
    "python", "javascript", "typescript", "react", "next.js", "node.js", "fastapi",
    "django", "flask", "postgresql", "mysql", "mongodb", "redis", "docker",
    "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd", "git", "linux",
    "graphql", "rest api", "pytorch", "tensorflow", "langchain", "langgraph",
    "llm", "rag", "sql", "tailwind", "pandas", "spark", "kafka", "microservices",
    "system design", "html", "css", "c++", "c#", "java", "golang", "rust"
}


def extract_skills_from_jd(description: str) -> List[str]:
    """Fast, deterministic skill extraction from Job Description."""
    desc_lower = description.lower()
    found = []
    for skill in COMMON_TECH_KEYWORDS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, desc_lower):
            found.append(skill.capitalize())
    return found


class JobMatchingAgent:
    @staticmethod
    def match_and_rank_jobs(
        parsed_cv: Dict[str, Any],
        jobs: List[Dict[str, Any]],
        cv_embedding: Optional[List[float]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Computes the Standardized 5-Factor JD Match Score for all candidate jobs and ranks them descending.
        """
        cv_skills = parsed_cv.get("skills_inventory", [])
        cv_bullets = parsed_cv.get("experience_bullets", [])
        cv_experience = parsed_cv.get("experience", [])

        ranked_results = []
        for job in jobs:
            jd_text = job.get("description", "")
            required_skills = job.get("extracted_skills") or extract_skills_from_jd(jd_text)
            job_title = job.get("title", "")
            job_embedding = job.get("embedding")

            # Standardized 5-Factor Match Engine
            ats_match = compute_job_specific_ats_match(
                cv_skills=cv_skills,
                job_required_skills=required_skills,
                cv_bullets=cv_bullets,
                job_description=jd_text,
                cv_embedding=cv_embedding,
                job_embedding=job_embedding,
                cv_experience=cv_experience,
                target_job_title=job_title,
            )

            job_card = dict(job)
            job_card["match_score"] = ats_match["match_score"]
            job_card["overall_score"] = ats_match["overall_score"]
            job_card["rating_tier"] = ats_match["rating_tier"]
            job_card["match_level"] = ats_match["match_level"]
            job_card["sub_scores"] = ats_match["sub_scores"]
            job_card["matched_skills"] = ats_match["matched_skills"]
            job_card["missing_skills"] = ats_match["missing_skills"]
            job_card["keyword_analysis"] = ats_match.get("keyword_analysis", {})
            job_card["extracted_skills"] = required_skills
            job_card["actionable_recommendations"] = ats_match.get("actionable_recommendations", [])
            ranked_results.append(job_card)

        # Sort descending by weighted match score
        ranked_results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        return ranked_results


job_matching_agent = JobMatchingAgent()
