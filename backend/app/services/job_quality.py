"""Quality gate that separates active individual vacancies from search/category pages and closed/expired postings."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from urllib.parse import urlparse


_AGGREGATOR_TITLE_PATTERNS = (
    r"^\s*\d+[\d,+]*\+?\s+.*\b(jobs?|vacancies|openings|شغل|وظائف|وظيفة|وظايف|فرص\s+عمل)\b",
    r"\b(jobs?,?\s+employment|jobs\s+in|careers\s+in|vacancies\s+in)\b",
    r"\b(open roles?|openings|vacancies|browse jobs|find jobs|job search)\b",
    r"^(وظائف|وظايف|شغل|فرص\s+عمل)\b",
    r"\b(وظائف|وظايف|فرص\s+عمل|وظيفة|شغل)\b.*\b(في\s+مصر|بمصر|في\s+القاهرة|اليوم|شاغرة|خالية)\b",
    r"^\s*\d+[\d,+]*\s+(شغل|وظيفة|وظائف|وظايف)",
)

_CLOSED_OR_EXPIRED_PATTERNS = (
    r"\b(no longer accepting applications|not accepting applications|closed for applications)\b",
    r"\b(this job is closed|this position is closed|job is closed|position is closed|vacancy is closed)\b",
    r"\b(this job has expired|job has expired|posting has expired|listing has expired|has expired|expired job)\b",
    r"\b(this role has been filled|position filled|role filled|job filled)\b",
    r"\b(applications are closed|applications closed|application closed)\b",
    r"\b(job is no longer available|position is no longer available|no longer open)\b",
    r"\b(offer expired|deadline passed)\b",
    r"\[closed\]|\(closed\)|\[expired\]|\(expired\)",
    r"(تم إغلاق الوظيفة|انتهى التقديم|الوظيفة مغلقة|غير متاحة|لم نعد نقبل|انتهت صلاحية الإعلان|مغلق|مغلقة|منتهي|منتهية)",
)

_GENERIC_COMPANIES = {
    "tech employer", "web", "linkedin", "indeed", "bayt", "wuzzuf",
    "job board", "jobs", "unknown", "n/a", "", "identified employer",
}
_ROOT_OR_SEARCH_PATHS = {
    "", "/", "/jobs", "/search", "/job-search", "/jobs/search", "/search/jobs",
    "/en/egypt/jobs", "/ar/egypt/jobs", "/en/jobs", "/ar/jobs",
}


def is_specific_job_url(url: str) -> bool:
    """Validate that a URL points to a specific individual vacancy rather than a search directory."""
    if not url or not isinstance(url, str):
        return False
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    path = parsed.path.lower().rstrip("/")

    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False

    if path in _ROOT_OR_SEARCH_PATHS or any(
        marker in path for marker in ("/job-search", "/search/jobs", "/jobs/search", "/jobs/egypt")
    ):
        return False

    # Platform-specific individual vacancy URL patterns
    if "linkedin.com" in domain:
        if not re.search(r"/jobs/view/\d+", path) and not ("currentjobid=" in parsed.query.lower()):
            return False
    elif "wuzzuf.net" in domain:
        if not re.search(r"/jobs/p/[\w\-]+", path):
            return False
    elif "bayt.com" in domain:
        if path.endswith("/jobs") or "/jobs/" in path:
            return False
        if not ("/job/" in path or "-job-" in path or re.search(r"/job-\d+", path)):
            return False
    elif "indeed.com" in domain:
        if not re.search(r"/(viewjob|rc/clk|pagead/clk)", path) and "jk=" not in parsed.query.lower():
            return False

    return True


def assess_job_posting(job: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Return whether a record looks like one active, identifiable, directly linkable open job."""
    title = str(job.get("title") or "").strip()
    company = str(job.get("company") or "").strip()
    description = str(job.get("description") or "").strip()
    redirect_url = str(job.get("redirect_url") or "").strip()
    reasons: List[str] = []

    # 1. Structural requirements
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

    # 2. Check for closed/expired explicit flags
    if job.get("is_closed") is True or job.get("is_expired") is True:
        reasons.append("explicitly_closed_or_expired")
    if job.get("is_active") is False:
        reasons.append("marked_inactive")

    # 3. Check for closed/expired text markers in title or description
    combined_text = f"{title} {description}"
    if any(re.search(pattern, combined_text, re.IGNORECASE) for pattern in _CLOSED_OR_EXPIRED_PATTERNS):
        reasons.append("closed_or_expired_text_marker")

    # 4. Expiration date / timestamp checks
    now_utc = datetime.now(timezone.utc)
    expiration_ts = job.get("job_offer_expiration_timestamp") or job.get("expiration_timestamp")
    if expiration_ts:
        try:
            exp_dt = datetime.fromtimestamp(float(expiration_ts), tz=timezone.utc)
            if exp_dt < now_utc:
                reasons.append("expiration_timestamp_in_past")
        except (ValueError, OSError, OverflowError):
            pass

    expiration_dt_str = job.get("job_offer_expiration_datetime_utc") or job.get("expiration_date")
    if expiration_dt_str and isinstance(expiration_dt_str, str):
        try:
            exp_dt = datetime.fromisoformat(expiration_dt_str.replace("Z", "+00:00"))
            if exp_dt < now_utc:
                reasons.append("expiration_datetime_in_past")
        except ValueError:
            pass

    # 5. Direct Vacancy URL validation (prevent open category/search links)
    if not is_specific_job_url(redirect_url):
        reasons.append("search_or_category_url")

    return not reasons, reasons


def keep_actual_job_postings(jobs: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    accepted: List[Dict[str, Any]] = []
    rejected: List[Dict[str, Any]] = []
    for job in jobs:
        is_posting, reasons = assess_job_posting(job)
        if is_posting:
            accepted.append({
                **job,
                "listing_quality": "individual_posting",
                "is_active": True,
                "status": "open",
            })
        else:
            rejected.append({"title": job.get("title"), "url": job.get("redirect_url"), "reasons": reasons})
    return accepted, rejected

