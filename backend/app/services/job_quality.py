"""Quality gate that separates individual vacancies from search/category pages."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse


_AGGREGATOR_TITLE_PATTERNS = (
    r"^\s*\d+[\d,+]*\+?\s+.*\bjobs?\b",
    r"\bjobs?,?\s+employment\b",
    r"\bjobs\s+in\b",
    r"\b(open roles?|openings|vacancies)\b",
    r"\b(job search|browse jobs|find jobs)\b",
)
_GENERIC_COMPANIES = {
    "tech employer", "web", "linkedin", "indeed", "bayt", "wuzzuf",
    "job board", "jobs", "unknown", "n/a", "",
}
_ROOT_OR_SEARCH_PATHS = {"", "/", "/jobs", "/search", "/job-search"}


def assess_job_posting(job: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Return whether a record looks like one identifiable, directly linkable job."""
    title = str(job.get("title") or "").strip()
    company = str(job.get("company") or "").strip()
    description = str(job.get("description") or "").strip()
    redirect_url = str(job.get("redirect_url") or "").strip()
    reasons: List[str] = []

    if len(title) < 4:
        reasons.append("missing_specific_title")
    if any(re.search(pattern, title, re.IGNORECASE) for pattern in _AGGREGATOR_TITLE_PATTERNS):
        reasons.append("aggregator_title")
    if company.lower() in _GENERIC_COMPANIES:
        reasons.append("missing_identifiable_company")
    if len(description) < 40:
        reasons.append("insufficient_posting_detail")
    if description.lower().startswith("opportunities in "):
        reasons.append("placeholder_description")

    parsed = urlparse(redirect_url)
    path = parsed.path.lower().rstrip("/") or "/"
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        reasons.append("invalid_apply_url")
    elif path in _ROOT_OR_SEARCH_PATHS or any(
        marker in path for marker in ("/job-search", "/search/jobs", "/jobs/search")
    ):
        reasons.append("search_or_category_url")

    return not reasons, reasons


def keep_actual_job_postings(jobs: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    accepted: List[Dict[str, Any]] = []
    rejected: List[Dict[str, Any]] = []
    for job in jobs:
        is_posting, reasons = assess_job_posting(job)
        if is_posting:
            accepted.append({**job, "listing_quality": "individual_posting"})
        else:
            rejected.append({"title": job.get("title"), "url": job.get("redirect_url"), "reasons": reasons})
    return accepted, rejected
