"""Deterministic ATS Scoring Engine for General CV Readiness and Job-Specific Match Analysis."""

import re
from typing import Dict, Any, List

# Curated dictionary of strong action verbs for resume bullets
STRONG_ACTION_VERBS = {
    "accelerated", "accomplished", "achieved", "acquired", "adapted", "administered",
    "advised", "analyzed", "architected", "assembled", "authored", "automated",
    "boosted", "built", "calculated", "centralized", "championed", "collaborated",
    "composed", "conceptualized", "conducted", "consolidated", "constructed",
    "converted", "coordinated", "created", "customized", "debugged", "decreased",
    "delegated", "delivered", "deployed", "designed", "developed", "devised",
    "diagnosed", "directed", "discovered", "documented", "doubled", "drafted",
    "eliminated", "enabled", "engineered", "enhanced", "established", "estimated",
    "evaluated", "executed", "expanded", "expedited", "fabricated", "facilitated",
    "forecasted", "formulated", "generated", "guided", "halted", "headed",
    "identified", "implemented", "improved", "increased", "initiated", "innovated",
    "installed", "instituted", "integrated", "introduced", "invented", "investigated",
    "launched", "lead", "led", "managed", "maximized", "mentored", "migrated",
    "minimized", "modernized", "negotiated", "optimized", "orchestrated", "organized",
    "originated", "overhauled", "oversaw", "partnered", "performed", "pioneered",
    "planned", "prepared", "produced", "programmed", "promoted", "proposed",
    "published", "re-engineered", "rebuilt", "reconciled", "redesigned", "reduced",
    "refactored", "refined", "remodeled", "reorganized", "replaced", "resolved",
    "restructured", "revamped", "reviewed", "revised", "scaled", "scheduled",
    "secured", "simplified", "spearheaded", "standardized", "streamlined",
    "strengthened", "structured", "succeeded", "supervised", "surpassed", "synthesized",
    "trained", "transformed", "transitioned", "translated", "tripled", "troubleshot",
    "unified", "upgraded", "utilized", "validated", "verified", "yielded",
}

# Cliché / Empty Buzzwords to flag
BUZZWORDS = {
    "team player", "hard worker", "go-getter", "detail-oriented", "synergy",
    "think outside the box", "results-driven", "self-starter", "dynamic",
    "work ethic", "ninja", "rockstar", "guru", "wizard", "fast learner"
}

# Regex for metrics & quantifiable numbers
METRIC_REGEX = re.compile(
    r"(\b\d+(\.\d+)?%|\$\d+(\.\d+)?[kmb]?|\b\d+(\.\d+)?x\b|\b\d+\+?\s*[kmb]\b|\b\d+\+?(\s*(k|m|b|million|billion|users|clients|requests|transactions|tps|ms|seconds|hours|days|weeks|months|years))\b|\b(increased|decreased|reduced|saved|improved|boosted|grew|scaled)\s+(by\s+)?\d+)",
    re.IGNORECASE,
)


def compute_general_ats_score(parsed_cv: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
    """
    Computes a 100-point deterministic General ATS Readiness Score.
    
    Breakdown:
    1. Contact & Section Hygiene (25 pts)
    2. Action Verb Strength (25 pts)
    3. Quantifiable Impact & Metrics (25 pts)
    4. Clarity, Formatting & Skill Density (25 pts)
    """
    feedback = []
    contact_info = parsed_cv.get("contact_info", {})
    sections = parsed_cv.get("sections_present", [])
    bullets = parsed_cv.get("experience_bullets", [])
    skills = parsed_cv.get("skills_inventory", [])

    # ----------------------------------------------------
    # Category 1: Contact & Section Hygiene (25 pts)
    # ----------------------------------------------------
    cat1_score = 0
    if contact_info.get("email"):
        cat1_score += 5
    else:
        feedback.append("Missing email address.")

    if contact_info.get("phone"):
        cat1_score += 5
    else:
        feedback.append("Missing phone number.")

    if contact_info.get("linkedin_url") or contact_info.get("github_url") or contact_info.get("portfolio_url"):
        cat1_score += 5
    else:
        feedback.append("Include links to your LinkedIn, GitHub, or portfolio.")

    # Core sections check (Experience, Education, Skills, Summary/Projects)
    core_sections = ["experience", "education", "skills"]
    found_core = [s for s in core_sections if any(s in sec.lower() for sec in sections)]
    cat1_score += min(10, int((len(found_core) / 3.0) * 10))

    if len(found_core) < 3:
        feedback.append("Ensure your CV has standard section headers (Experience, Education, Skills).")

    # ----------------------------------------------------
    # Category 2: Action Verb Strength (25 pts)
    # ----------------------------------------------------
    cat2_score = 0
    strong_bullet_count = 0
    total_bullets = len(bullets) if bullets else 1

    for bullet in bullets:
        words = re.findall(r"\b[a-zA-Z\-]+\b", bullet.lower())
        if words and words[0] in STRONG_ACTION_VERBS:
            strong_bullet_count += 1

    if bullets:
        verb_ratio = strong_bullet_count / total_bullets
        cat2_score = round(verb_ratio * 25)
        if verb_ratio < 0.7:
            feedback.append(f"{total_bullets - strong_bullet_count} of your {total_bullets} experience bullet points could start with stronger action verbs (e.g. 'Architected', 'Spearheaded', 'Optimized').")
    else:
        cat2_score = 10
        feedback.append("Add structured bullet points under your work experience.")

    # ----------------------------------------------------
    # Category 3: Quantifiable Impact & Metrics (25 pts)
    # ----------------------------------------------------
    cat3_score = 0
    metric_bullet_count = 0

    for bullet in bullets:
        if METRIC_REGEX.search(bullet):
            metric_bullet_count += 1

    if bullets:
        metric_ratio = metric_bullet_count / total_bullets
        cat3_score = round(metric_ratio * 25)
        if metric_ratio < 0.5:
            feedback.append(f"Add measurable numbers, percentages, or scale metrics to more bullet points ({metric_bullet_count}/{total_bullets} currently contain metrics).")
    else:
        cat3_score = 5

    # ----------------------------------------------------
    # Category 4: Formatting, Length & Skill Density (25 pts)
    # ----------------------------------------------------
    cat4_score = 0
    word_count = len(raw_text.split())

    # Word count balance (300 to 1000 words is ideal for 1-2 page CV)
    if 300 <= word_count <= 1200:
        cat4_score += 10
    elif 150 <= word_count < 300:
        cat4_score += 5
        feedback.append("Your CV appears quite brief. Consider adding more project details and achievements.")
    else:
        cat4_score += 5
        feedback.append("Your CV may be too lengthy. Aim for a focused 1-2 page document.")

    # Skill density
    if len(skills) >= 8:
        cat4_score += 10
    elif len(skills) >= 4:
        cat4_score += 6
        feedback.append("Expand your skills section with specific technical tools, frameworks, and technologies.")
    else:
        cat4_score += 2
        feedback.append("List your technical skills clearly in a dedicated Skills section.")

    # Buzzword check (penalize 1 pt per buzzword found, max 5 pts)
    buzzwords_found = [bw for bw in BUZZWORDS if bw in raw_text.lower()]
    buzzword_penalty = min(5, len(buzzwords_found))
    cat4_score += (5 - buzzword_penalty)

    if buzzwords_found:
        feedback.append(f"Replace generic buzzwords ({', '.join(buzzwords_found[:3])}) with concrete demonstrations of your work.")

    # Total Score
    total_score = min(100, max(0, cat1_score + cat2_score + cat3_score + cat4_score))

    return {
        "overall_score": total_score,
        "category_scores": {
            "contact_and_sections": cat1_score,
            "action_verbs": cat2_score,
            "quantifiable_impact": cat3_score,
            "formatting_and_skills": cat4_score,
        },
        "strong_verb_bullets": f"{strong_bullet_count}/{total_bullets}",
        "metric_backed_bullets": f"{metric_bullet_count}/{total_bullets}",
        "total_words": word_count,
        "skills_detected_count": len(skills),
        "feedback_checklist": feedback,
    }


def compute_job_specific_ats_match(
    cv_skills: List[str],
    job_required_skills: List[str],
    cv_bullets: List[str],
    job_description: str,
) -> Dict[str, Any]:
    """
    Computes a deterministic Job-Specific ATS Match Score & Keyword Gap.
    """
    # Normalize skill tokens
    norm_cv_skills = {s.lower().strip() for s in cv_skills if s}
    norm_job_skills = {s.lower().strip() for s in job_required_skills if s}

    if not norm_job_skills:
        return {
            "match_score": 75.0,
            "matched_skills": list(cv_skills)[:5],
            "missing_skills": [],
            "match_level": "Good",
        }

    matched_skills = [s for s in norm_job_skills if s in norm_cv_skills or any(s in b.lower() for b in cv_bullets)]
    missing_skills = [s for s in norm_job_skills if s not in matched_skills]

    # Calculate skill overlap percentage
    skill_overlap_ratio = len(matched_skills) / len(norm_job_skills)

    # Calculate overall match score (scaled 0-100)
    match_score = round(skill_overlap_ratio * 100, 1)

    if match_score >= 80:
        match_level = "Excellent"
    elif match_score >= 60:
        match_level = "Strong"
    elif match_score >= 40:
        match_level = "Moderate"
    else:
        match_level = "Low"

    return {
        "match_score": match_score,
        "matched_skills": sorted(matched_skills),
        "missing_skills": sorted(missing_skills),
        "match_level": match_level,
        "total_required_skills": len(norm_job_skills),
    }
