"""Regression coverage for the targeted-review, job-quality, and adaptive-roadmap upgrade."""

import os

os.environ["DEBUG"] = "false"

from backend.app.agents.career_roadmap import CareerRoadmapAgent
from backend.app.agents.job_matching import extract_skills_from_jd
from backend.app.services.cv_review import build_review_suggestions
from backend.app.services.job_quality import assess_job_posting, keep_actual_job_postings


def test_cv_review_links_original_text_to_safe_correction():
    suggestions = build_review_suggestions({
        "experience_bullets": ["Responsible for building Python APIs for internal reporting teams"],
        "skills_inventory": ["Python"],
    })

    action = next(item for item in suggestions if item["category"] == "Action language")
    metric = next(item for item in suggestions if item["category"] == "Verified impact")
    assert action["source_text"].startswith("Responsible for")
    assert action["suggested_text"].startswith("Built Python APIs")
    assert action["requires_confirmation"] is False
    assert "[add a verified metric" in metric["suggested_text"]
    assert metric["requires_confirmation"] is True


def test_foundational_jd_skill_becomes_confirmation_not_invented_fact():
    jd = "The engineer needs strong foundations in linear algebra and statistics for machine learning systems."
    skills = extract_skills_from_jd(jd)
    suggestions = build_review_suggestions(
        {"experience_bullets": [], "skills_inventory": ["Python"]},
        missing_skills=skills,
        job_title="AI Engineer",
    )

    assert {skill.lower() for skill in skills} >= {"linear algebra", "statistics", "machine learning"}
    assert suggestions
    assert all(item["requires_confirmation"] for item in suggestions)
    assert all("If accurate" in item["suggested_text"] for item in suggestions)


def test_job_quality_rejects_search_pages_and_keeps_specific_postings():
    aggregate = {
        "title": "114 AI machine learning engineer jobs in United Arab Emirates",
        "company": "LinkedIn",
        "description": "Browse job search results and company ratings for many roles across the United Arab Emirates.",
        "redirect_url": "https://linkedin.com/jobs",
    }
    posting = {
        "title": "Machine Learning Engineer",
        "company": "Example Technologies",
        "description": "Build, deploy, and monitor production machine-learning services with Python, Docker, and cloud infrastructure while partnering with product engineering.",
        "redirect_url": "https://example.com/careers/jobs/ml-engineer-421",
    }

    assert assess_job_posting(aggregate)[0] is False
    assert assess_job_posting(posting)[0] is True
    accepted, rejected = keep_actual_job_postings([aggregate, posting])
    assert len(accepted) == 1
    assert accepted[0]["listing_quality"] == "individual_posting"
    assert len(rejected) == 1


def test_uae_job_goal_asks_application_timing_using_cv_role():
    agent = CareerRoadmapAgent.__new__(CareerRoadmapAgent)
    result = agent._job_search_conversation(
        "I want a job in UAE",
        [],
        {"experience": [{"title": "AI Engineer"}]},
    )

    assert result["goal_type"] == "job_search"
    assert result["needs_more_info"] is True
    assert "AI Engineer" in result["response"]
    assert "start applying" in result["response"]
    assert result["suggested_replies"] == ["Immediately", "Within 1 month", "In 3 months"]
