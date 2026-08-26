"""Job Matching & Ranking Agent: Hybrid mathematical scoring combining Skill Overlap (50%), Vector Cosine Similarity (30%), and Experience Alignment (20%)."""

import re
import math
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


def compute_cosine_similarity(vec1: Optional[List[float]], vec2: Optional[List[float]]) -> float:
    """Compute cosine similarity between two dense embedding vectors (returns 0.0 - 1.0)."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.75  # Default baseline similarity if vector is pending
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    similarity = dot_product / (norm_a * norm_b)
    return max(0.0, min(1.0, (similarity + 1.0) / 2.0 if similarity < 0 else similarity))


def compute_experience_alignment(cv_experience: List[Dict[str, Any]], jd_text: str) -> float:
    """
    Evaluates candidate years of experience against JD seniority requirement (returns 0.0 - 100.0).
    """
    total_exp_entries = len(cv_experience)
    desc_lower = jd_text.lower()
    
    is_senior = bool(re.search(r"\b(senior|lead|principal|staff|architect|5\+\s*years?)\b", desc_lower))
    is_mid = bool(re.search(r"\b(mid|intermediate|3\+\s*years?|2-4\s*years?)\b", desc_lower))
    is_junior = bool(re.search(r"\b(junior|entry|associate|graduate|intern|0-2\s*years?)\b", desc_lower))

    if total_exp_entries >= 4:  # Senior profile
        if is_senior:
            return 100.0
        elif is_mid:
            return 85.0
        else:
            return 70.0
    elif 2 <= total_exp_entries < 4:  # Mid profile
        if is_mid:
            return 100.0
        elif is_junior or is_senior:
            return 80.0
        else:
            return 90.0
    else:  # Entry / Junior profile
        if is_junior:
            return 100.0
        elif is_mid:
            return 75.0
        else:
            return 60.0


class JobMatchingAgent:
    @staticmethod
    def match_and_rank_jobs(
        parsed_cv: Dict[str, Any],
        jobs: List[Dict[str, Any]],
        cv_embedding: Optional[List[float]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Calculates the Multi-Factor Weighted Total Match Score:
        -------------------------------------------------------------
        1. Skill Overlap Score (50%): Keyword & skill coverage against JD
        2. Vector Dense Cosine Similarity (30%): Semantic context match
        3. Experience Level Alignment (20%): Seniority & tenure fit
        -------------------------------------------------------------
        Total Match Score = (0.50 * Skills) + (0.30 * Vector) + (0.20 * Experience)
        """
        cv_skills = parsed_cv.get("skills_inventory", [])
        cv_bullets = parsed_cv.get("experience_bullets", [])
        cv_experience = parsed_cv.get("experience", [])

        ranked_results = []
        for job in jobs:
            jd_text = job.get("description", "")
            required_skills = job.get("extracted_skills") or extract_skills_from_jd(jd_text)

            # 1. Skill Overlap Score (50% Weight)
            ats_match = compute_job_specific_ats_match(
                cv_skills=cv_skills,
                job_required_skills=required_skills,
                cv_bullets=cv_bullets,
                job_description=jd_text,
            )
            skill_score = ats_match["match_score"]  # 0.0 - 100.0

            # 2. Vector Cosine Similarity (30% Weight)
            job_embedding = job.get("embedding")
            vector_sim_ratio = compute_cosine_similarity(cv_embedding, job_embedding)
            vector_score = vector_sim_ratio * 100.0  # 0.0 - 100.0

            # 3. Experience Level Alignment (20% Weight)
            experience_score = compute_experience_alignment(cv_experience, jd_text)  # 0.0 - 100.0

            # Weighted Hybrid Total Score
            weighted_total = round(
                (0.50 * skill_score) + (0.30 * vector_score) + (0.20 * experience_score),
                1
            )

            job_card = dict(job)
            job_card["match_score"] = weighted_total
            job_card["skill_match_score"] = skill_score
            job_card["vector_similarity_score"] = round(vector_score, 1)
            job_card["experience_alignment_score"] = round(experience_score, 1)
            job_card["match_level"] = "Excellent" if weighted_total >= 80 else ("Strong" if weighted_total >= 60 else ("Moderate" if weighted_total >= 40 else "Low"))
            job_card["matched_skills"] = ats_match["matched_skills"]
            job_card["missing_skills"] = ats_match["missing_skills"]
            job_card["extracted_skills"] = required_skills
            ranked_results.append(job_card)

        # Sort descending by weighted total match score
        ranked_results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        return ranked_results


job_matching_agent = JobMatchingAgent()
