"""
Unit tests for Standardized Dual-Mode ATS Scoring Engine.
Validates Feature 1 (Standalone Resume Health Score) and Feature 2 (JD Target Match Score).
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from backend.app.services.ats_engine import (
    compute_general_ats_score,
    compute_job_specific_ats_match,
    map_rating_tier,
)


def test_standalone_ats_score_high_quality_cv():
    """Verify high-quality CV achieves 85+ Excellent score across all 5 sub-metrics."""
    sample_cv = {
        "contact_info": {
            "name": "Jane Doe",
            "email": "jane.doe@example.com",
            "phone": "+20 100 123 4567",
            "location": "Cairo, Egypt",
            "linkedin_url": "https://linkedin.com/in/janedoe",
            "github_url": "https://github.com/janedoe",
        },
        "sections_present": ["Professional Experience", "Education", "Skills", "Projects", "Certifications"],
        "experience_bullets": [
            "Architected high-throughput microservices in FastAPI reducing latency by 45%.",
            "Spearheaded cloud migration to AWS saving $120k annually across 5 engineering teams.",
            "Optimized PostgreSQL queries boosting database throughput by 3.5x for 2M daily active users.",
            "Developed automated CI/CD pipelines increasing deployment frequency by 80% from weekly to daily.",
        ],
        "skills_inventory": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "Kubernetes", "Redis", "Git", "Terraform", "CI/CD"],
    }
    # 400 words raw text for optimal brevity score
    raw_text = (
        "Jane Doe jane.doe@example.com +20 100 123 4567 Cairo, Egypt https://linkedin.com/in/janedoe "
        "Professional Experience Architected high-throughput microservices in FastAPI reducing latency by 45%. "
        "Spearheaded cloud migration to AWS saving $120k annually across 5 engineering teams. "
        "Optimized PostgreSQL queries boosting database throughput by 3.5x for 2M daily active users. "
        "Developed automated CI/CD pipelines increasing deployment frequency by 80% from weekly to daily. "
        "Education Bachelor of Computer Science University of Cairo. "
        "Skills: Python, FastAPI, PostgreSQL, Docker, AWS, Kubernetes, Redis, Git, Terraform, CI/CD. "
    ) * 8  # ~450 words

    result = compute_general_ats_score(sample_cv, raw_text)

    assert result["mode"] == "STANDALONE_HEALTH_SCORE"
    assert result["overall_score"] >= 85.0
    assert result["rating_tier"] in ["Excellent", "Good"]

    cat = result["category_scores"]
    assert cat["parseability"] == 100.0  # All core sections present, clean text
    assert cat["action_impact"] == 100.0  # 100% strong verbs, 0 passive phrases
    assert cat["quantification"] == 100.0  # 100% metrics (> 40% ratio)
    assert cat["contact_hygiene"] == 100.0  # Email, phone, location, links present
    assert cat["brevity_formatting"] == 100.0  # Optimal word count and bullet lengths


def test_standalone_ats_score_passive_and_buzzword_penalties():
    """Verify passive starters (-5 pts) and cliché buzzwords (-3 pts) incur strict deductions."""
    cv_with_penalties = {
        "contact_info": {
            "email": "dev@example.com",
            "phone": "+20 111 222 3333",
            "location": "Giza, Egypt",
        },
        "sections_present": ["Experience", "Skills"],  # Missing Education (-10 parseability)
        "experience_bullets": [
            "Responsible for building features and bug fixing.",  # Passive (-5)
            "Worked on database queries and meetings.",  # Passive (-5)
            "Tasked with assisting the team on daily tasks.",  # Passive (-5)
            "Helped with code reviews.",  # Passive (-5)
        ],
        "skills_inventory": ["Python"],
    }
    raw_text = (
        "dev@example.com +20 111 222 3333 Giza, Egypt "
        "Responsible for building features as a hardworking results-driven team player with synergy. "
        "Worked on database queries and meetings as a dynamic go-getter. "
        "Tasked with assisting the team on daily tasks with a strong work ethic. "
        "Helped with code reviews as a fast learner."
    )

    result = compute_general_ats_score(cv_with_penalties, raw_text)

    cat = result["category_scores"]
    assert cat["parseability"] <= 90.0  # Missing Education
    assert cat["action_impact"] <= 35.0  # 0 strong verbs (0/4) - passive penalties - buzzword penalties
    assert cat["quantification"] == 25.0  # 0 metrics (< 10% ratio)
    assert result["overall_score"] < 55.0
    assert result["rating_tier"] == "Poor"


def test_job_specific_ats_match_5_factors():
    """Verify Feature 2 calculates the 5-factor weighted model correctly."""
    cv_skills = ["Python", "FastAPI", "PostgreSQL", "Docker", "Git"]
    job_required = ["python", "fastapi", "postgresql", "docker", "kubernetes", "aws"]
    cv_bullets = [
        "Architected scalable backend APIs with FastAPI and PostgreSQL.",
        "Collaborated with cross-functional engineering teams in an agile scrum environment to solve complex distributed problems."
    ]
    cv_experience = [
        {"role": "Senior Backend Engineer", "company": "Tech Corp", "bullets": cv_bullets},
        {"role": "Software Developer", "company": "Startup", "bullets": cv_bullets}
    ]
    jd = (
        "Seeking a Senior Backend Engineer with 3+ years experience. "
        "Must have Python and FastAPI. Required: PostgreSQL, Docker, Kubernetes, AWS. "
        "Strong cross-functional collaboration and agile problem-solving skills required."
    )

    match = compute_job_specific_ats_match(
        cv_skills=cv_skills,
        job_required_skills=job_required,
        cv_bullets=cv_bullets,
        job_description=jd,
        cv_experience=cv_experience,
        target_job_title="Senior Backend Engineer",
    )

    assert match["mode"] == "MATCH_SCORE"
    assert "overall_score" in match
    # With no JD embedding, the engine must use the real sparse score rather
    # than the legacy favorable 70% cosine default.
    assert match["rating_tier"] in ["Average", "Good", "Excellent"]
    assert match["score_confidence"] == "Medium"
    assert match["semantic_components"]["cosine_similarity"] is None

    sub = match["sub_scores"]
    assert "hard_skills" in sub
    assert "semantic_nlp" in sub
    assert "title_alignment" in sub
    assert "experience_years" in sub
    assert "soft_skills" in sub

    assert sub["title_alignment"] >= 95.0  # Exact match on Senior Backend Engineer
    assert sub["soft_skills"] >= 80.0  # Matched collaboration, agile, problem-solving
    assert sub["experience_years"] is None  # Position count is no longer converted into fake years
    assert "kubernetes" in match["missing_skills"]
    assert "aws" in match["missing_skills"]
    assert "docker" in match["matched_skills"]


def test_synonym_and_parent_child_matching():
    """Verify ReactJS matches React (100%) and Deep Learning matches PyTorch (75%)."""
    cv_skills = ["ReactJS", "PyTorch", "K8s", "Postgres"]
    job_required = ["react", "deep learning", "kubernetes", "postgresql"]
    cv_bullets = ["Developed web frontends with ReactJS and PyTorch."]
    jd = "Requires React, Deep Learning, Kubernetes, and PostgreSQL."

    match = compute_job_specific_ats_match(
        cv_skills=cv_skills,
        job_required_skills=job_required,
        cv_bullets=cv_bullets,
        job_description=jd,
    )

    # All skills matched via synonym (ReactJS->React, K8s->Kubernetes, Postgres->PostgreSQL)
    # and parent-child (PyTorch matches Deep Learning with 75% credit)
    assert match["sub_scores"]["hard_skills"] >= 90.0
    assert len(match["missing_skills"]) == 0
    assert any(syn["resume_term"] == "ReactJS" for syn in match["keyword_analysis"]["synonym_matches"])


if __name__ == "__main__":
    test_standalone_ats_score_high_quality_cv()
    print("[PASS] test_standalone_ats_score_high_quality_cv passed")
    test_standalone_ats_score_passive_and_buzzword_penalties()
    print("[PASS] test_standalone_ats_score_passive_and_buzzword_penalties passed")
    test_job_specific_ats_match_5_factors()
    print("[PASS] test_job_specific_ats_match_5_factors passed")
    test_synonym_and_parent_child_matching()
    print("[PASS] test_synonym_and_parent_child_matching passed")
    print("ALL ATS ENGINE TESTS PASSED!")
