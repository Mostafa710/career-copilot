"""Regression tests for the Phase 0 truthfulness and scoring-safety upgrade."""

import os

# The local developer .env may use a non-boolean deployment label for DEBUG.
# Tests need a valid Settings override before importing application modules.
os.environ["DEBUG"] = "false"

import pytest
from langchain_core.runnables import RunnableLambda

from backend.app.agents import application_tailor as tailor_module
from backend.app.agents.application_tailor import (
    ApplicationTailorAgent,
    CriticEvaluation,
    TailoredApplicationOutput,
)
from backend.app.agents.cv_analysis_agent import CVAnalysisAgent
from backend.app.services.ats_engine import compute_job_specific_ats_match


def test_fallback_parser_never_invents_candidate_facts():
    agent = CVAnalysisAgent.__new__(CVAnalysisAgent)

    parsed = agent._fallback_parse(
        "Candidate Name\ncandidate@example.com\nBuilt an internal reporting workflow."
    )

    assert parsed["experience"] == []
    assert parsed["education"] == []
    assert parsed["skills_inventory"] == []
    assert "Tech Org" not in str(parsed)
    assert "Bachelor Degree" not in str(parsed)


def test_missing_jd_skills_do_not_fall_back_to_candidate_skills():
    result = compute_job_specific_ats_match(
        cv_skills=["Python", "Docker"],
        job_required_skills=[],
        cv_bullets=["Built a Python service."],
        job_description="Build reliable services for a growing product team.",
    )

    assert result["sub_scores"]["hard_skills"] is None
    assert result["factor_availability"]["hard_skills"]["available"] is False
    assert result["matched_skills"] == []
    assert result["semantic_components"]["cosine_similarity"] is None
    assert result["sub_scores"]["experience_years"] is None
    assert result["sub_scores"]["soft_skills"] is None


def test_match_is_unavailable_when_no_factor_has_evidence():
    result = compute_job_specific_ats_match(
        cv_skills=[],
        job_required_skills=[],
        cv_bullets=[],
        job_description="",
    )

    assert result["score_available"] is False
    assert result["match_score"] is None
    assert result["overall_score"] is None
    assert result["rating_tier"] == "Unavailable"
    assert result["score_confidence"] == "Low"


class _FakeStructuredLLM:
    def __init__(self, outputs):
        self.outputs = outputs

    def with_structured_output(self, schema):
        output = self.outputs[schema]
        return RunnableLambda(lambda _: output)


@pytest.mark.asyncio
async def test_tailoring_returns_real_regression_and_blocks_failed_critic(monkeypatch):
    generated = TailoredApplicationOutput(
        tailored_professional_summary="Targeted but factual summary.",
        highlighted_skills=["Python"],
        tailored_experience=[
            {"title": "Engineer", "company": "Example", "bullets": ["Built a Python service."]}
        ],
        cover_letter="A factual cover letter.",
        cold_email="A factual outreach email.",
    )
    failed = CriticEvaluation(
        passed=False,
        hallucinations_found=["Unsupported metric"],
        feedback="Remove the unsupported metric.",
    )

    agent = ApplicationTailorAgent.__new__(ApplicationTailorAgent)
    agent.generator_llm = _FakeStructuredLLM({TailoredApplicationOutput: generated})
    agent.critic_llm = _FakeStructuredLLM({CriticEvaluation: failed})

    score_results = iter([{"match_score": 80.0}, {"match_score": 55.0}])
    monkeypatch.setattr(
        tailor_module,
        "compute_job_specific_ats_match",
        lambda **_: next(score_results),
    )

    result = await agent.tailor_application(
        parsed_cv={
            "skills_inventory": ["Python"],
            "experience": [{"title": "Engineer", "company": "Example", "bullets": []}],
            "experience_bullets": [],
            "education": [],
            "contact_info": {},
            "certifications": [],
        },
        job={
            "title": "Engineer",
            "company": "Target",
            "description": "Python engineer",
            "extracted_skills": ["Python"],
        },
        max_attempts=1,
    )

    assert result["ats_score_before"] == 80.0
    assert result["ats_score_after"] == 55.0
    assert result["critic_passed"] is False
    assert result["export_allowed"] is False
    assert result["hallucinations_found"] == ["Unsupported metric"]


def test_fact_critic_covers_skills_and_outreach_email():
    variables = set(tailor_module.CRITIC_PROMPT.input_variables)

    assert "highlighted_skills" in variables
    assert "cold_email" in variables
