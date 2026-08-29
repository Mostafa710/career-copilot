"""Evidence-grounded CV review suggestions for general and JD-targeted audits."""

from __future__ import annotations

import hashlib
import re
from typing import Any, Dict, Iterable, List, Optional

from backend.app.services.ats_engine import PASSIVE_STARTER_PHRASES, QUANT_METRIC_REGEX


_STARTER_REPLACEMENTS = {
    "responsible for": "Delivered",
    "worked on": "Developed",
    "helped with": "Supported",
    "assisted in": "Contributed to",
    "tasked with": "Executed",
    "duties included": "Delivered",
    "handled": "Managed",
    "participated in": "Contributed to",
    "involved in": "Contributed to",
}
_GERUND_ACTIONS = {
    "building": "Built", "developing": "Developed", "designing": "Designed",
    "creating": "Created", "implementing": "Implemented", "managing": "Managed",
    "maintaining": "Maintained", "leading": "Led", "analyzing": "Analyzed",
    "deploying": "Deployed", "optimizing": "Optimized", "automating": "Automated",
}


def _suggestion_id(category: str, source_text: str) -> str:
    digest = hashlib.sha1(f"{category}:{source_text}".encode("utf-8")).hexdigest()[:10]
    return f"{category}-{digest}"


def _clean_sentence(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" \t\r\n-•")


def _rewrite_weak_starter(bullet: str) -> Optional[str]:
    cleaned = _clean_sentence(bullet)
    lowered = cleaned.lower()
    for phrase in PASSIVE_STARTER_PHRASES:
        if lowered.startswith(phrase):
            remainder = cleaned[len(phrase):].lstrip(" :,-")
            if not remainder:
                return None
            first_word, _, rest = remainder.partition(" ")
            if first_word.lower() in _GERUND_ACTIONS:
                action = _GERUND_ACTIONS[first_word.lower()]
                return f"{action} {rest}".rstrip()
            replacement = _STARTER_REPLACEMENTS.get(phrase, "Delivered")
            return f"{replacement} {remainder[0].lower() + remainder[1:]}"
    return None


def build_review_suggestions(
    parsed_cv: Dict[str, Any],
    *,
    missing_skills: Optional[Iterable[str]] = None,
    job_title: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Return source-linked corrections without manufacturing candidate facts."""
    suggestions: List[Dict[str, Any]] = []
    bullets = [str(item) for item in parsed_cv.get("experience_bullets", []) if str(item).strip()]

    for bullet in bullets:
        source = _clean_sentence(bullet)
        rewritten = _rewrite_weak_starter(source)
        if rewritten and rewritten != source:
            suggestions.append({
                "id": _suggestion_id("action-language", source),
                "category": "Action language",
                "severity": "high",
                "section": "Experience",
                "source_text": source,
                "suggested_text": rewritten,
                "rationale": "This keeps the original fact while replacing a passive opening with a direct action verb.",
                "jd_requirement": job_title,
                "requires_confirmation": False,
                "action": "replace",
            })

        if not QUANT_METRIC_REGEX.search(source) and len(source.split()) >= 7:
            suggested = source.rstrip(".") + " — resulting in [add a verified metric, scale, or outcome]."
            suggestions.append({
                "id": _suggestion_id("verified-impact", source),
                "category": "Verified impact",
                "severity": "medium",
                "section": "Experience",
                "source_text": source,
                "suggested_text": suggested,
                "rationale": "ATS and recruiters understand impact more clearly when the result is measurable. The placeholder must be replaced with a fact you can prove.",
                "jd_requirement": None,
                "requires_confirmation": True,
                "action": "edit_then_replace",
            })

        if len(suggestions) >= 8:
            break

    skills = {str(skill).strip().lower() for skill in parsed_cv.get("skills_inventory", []) if str(skill).strip()}
    for skill in list(missing_skills or [])[:5]:
        if skill.strip().lower() in skills:
            continue
        source = f"No evidence of {skill} was found in the parsed CV."
        suggestions.append({
            "id": _suggestion_id("skill-evidence", source),
            "category": "Job requirement",
            "severity": "high",
            "section": "Skills or relevant project",
            "source_text": source,
            "suggested_text": f"If accurate, add {skill} beside the project or role where you used it and describe the evidence. Otherwise, keep it out and treat it as a learning gap.",
            "rationale": "The job description mentions this requirement, but adding it without evidence would be misleading.",
            "jd_requirement": skill,
            "requires_confirmation": True,
            "action": "confirm_evidence",
        })

    return suggestions[:12]
