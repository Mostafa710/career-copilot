"""Unit tests for Deterministic ATS Scoring Engine."""

import pytest
from backend.app.services.ats_engine import compute_general_ats_score, compute_job_specific_ats_match


def test_general_ats_score_high_quality_cv():
    sample_cv = {
        "contact_info": {
            "name": "Jane Doe",
            "email": "jane.doe@example.com",
            "phone": "+44 7123 456789",
            "linkedin_url": "https://linkedin.com/in/janedoe",
            "github_url": "https://github.com/janedoe",
        },
        "sections_present": ["Professional Experience", "Education", "Skills", "Projects"],
        "experience_bullets": [
            "Architected high-throughput microservices in FastAPI reducing latency by 45%.",
            "Spearheaded cloud migration to AWS saving $120k annually across 5 engineering teams.",
            "Optimized PostgreSQL queries boosting database throughput by 3.5x for 2M daily active users.",
            "Developed automated CI/CD pipelines increasing deployment frequency by 80% from weekly to daily.",
        ],
        "skills_inventory": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "Kubernetes", "Redis", "Git", "Terraform", "CI/CD"],
    }
    raw_text = "Jane Doe jane.doe@example.com +44 7123 456789 Architected high-throughput microservices in FastAPI reducing latency by 45%. Spearheaded cloud migration to AWS saving $120k annually. Optimized PostgreSQL queries boosting database throughput by 3.5x for 2M daily active users. Skills: Python, FastAPI, PostgreSQL, Docker, AWS, Kubernetes, Redis, Git, Terraform, CI/CD"

    result = compute_general_ats_score(sample_cv, raw_text)

    assert "overall_score" in result
    assert result["overall_score"] >= 80
    assert result["category_scores"]["contact_and_sections"] == 25
    assert result["category_scores"]["action_verbs"] == 25  # All 4 start with strong action verbs
    assert result["category_scores"]["quantifiable_impact"] == 25  # All 4 have %, $, 3.5x, 2M metrics


def test_general_ats_score_missing_contact_and_weak_verbs():
    weak_cv = {
        "contact_info": {},  # Missing email and phone
        "sections_present": [],
        "experience_bullets": [
            "Responsible for writing code and bug fixes.",
            "Helped the team with meetings and daily tasks.",
        ],
        "skills_inventory": ["Python"],
    }
    raw_text = "Responsible for writing code and bug fixes. Helped the team with meetings and daily tasks."

    result = compute_general_ats_score(weak_cv, raw_text)

    assert result["overall_score"] < 50
    assert len(result["feedback_checklist"]) > 0
    assert any("email" in f.lower() for f in result["feedback_checklist"])


def test_job_specific_ats_match():
    cv_skills = ["Python", "FastAPI", "PostgreSQL", "Docker"]
    job_required = ["python", "fastapi", "postgresql", "docker", "kubernetes", "aws"]
    cv_bullets = ["Built FastAPI backends with PostgreSQL and Docker."]
    jd = "Looking for a Python Engineer with FastAPI, PostgreSQL, Docker, Kubernetes, and AWS experience."

    match_result = compute_job_specific_ats_match(
        cv_skills=cv_skills,
        job_required_skills=job_required,
        cv_bullets=cv_bullets,
        job_description=jd,
    )

    assert match_result["match_score"] == pytest.approx(66.7, 0.5)  # 4 out of 6 matched
    assert "docker" in match_result["matched_skills"]
    assert "kubernetes" in match_result["missing_skills"]
    assert "aws" in match_result["missing_skills"]
