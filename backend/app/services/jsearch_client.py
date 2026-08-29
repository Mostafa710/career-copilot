"""RapidAPI JSearch Client: Live LinkedIn, Indeed, and Glassdoor Job Aggregation."""

import hashlib
import logging
from typing import List, Dict, Any, Optional
import httpx
from backend.app.config import settings

logger = logging.getLogger(__name__)

JSEARCH_API_URL = "https://jsearch.p.rapidapi.com/search-v2"


class JSearchClient:
    """Client for RapidAPI JSearch endpoint (LinkedIn & Indeed aggregator)."""

    def __init__(self):
        pass

    @property
    def api_key(self) -> Optional[str]:
        return settings.RAPIDAPI_KEY

    @property
    def host(self) -> str:
        return settings.RAPIDAPI_JSEARCH_HOST or "jsearch.p.rapidapi.com"

    def _compute_hash(self, company: str, title: str, location: str) -> str:
        raw = f"{company.strip().lower()}|{title.strip().lower()}|{location.strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def search_jobs(
        self,
        query: str,
        location: Optional[str] = "Egypt",
        page: int = 1,
        num_pages: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Queries live LinkedIn and Indeed listings via RapidAPI JSearch.
        """
        api_key = self.api_key
        if not api_key or api_key.startswith("your_"):
            logger.info("RapidAPI key not configured; skipping JSearch live query.")
            return []

        search_query = f"{query} in {location}" if location else query
        headers = {
            "x-rapidapi-key": api_key,
            "x-rapidapi-host": self.host,
        }
        params = {
            "query": search_query,
            "page": str(page),
            "num_pages": str(num_pages),
            "date_posted": "all",
        }

        endpoints = [
            "https://jsearch.p.rapidapi.com/search-v2",
            "https://jsearch.p.rapidapi.com/search",
        ]

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = None
                for ep in endpoints:
                    resp = await client.get(ep, headers=headers, params=params)
                    if resp.status_code == 200:
                        break
                    elif resp.status_code == 404:
                        continue
                    else:
                        break

                if not resp or resp.status_code != 200:
                    logger.warning(f"JSearch API returned HTTP {resp.status_code if resp else 'N/A'}: {resp.text[:200] if resp else ''}")
                    return []

                json_data = resp.json()
                data_payload = json_data.get("data", [])
                if isinstance(data_payload, dict):
                    raw_jobs = data_payload.get("jobs", [])
                elif isinstance(data_payload, list):
                    raw_jobs = data_payload
                else:
                    raw_jobs = []

                return self._normalize_jobs(raw_jobs)

        except Exception as e:
            logger.error(f"Error querying JSearch API: {e}")
            return []

    def _normalize_jobs(self, raw_jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalizes JSearch response objects to unified Career Copilot schema."""
        normalized: List[Dict[str, Any]] = []

        for item in raw_jobs:
            title = item.get("job_title", "")
            company = item.get("employer_name", "Confidential")
            city = item.get("job_city", "")
            country = item.get("job_country", "")
            location = f"{city}, {country}".strip(", ") or "MENA / Remote"
            description = item.get("job_description", "")
            apply_url = item.get("job_apply_link") or item.get("job_google_link", "https://linkedin.com")

            # Determine publisher / source
            publisher = (item.get("job_publisher") or "").lower()
            if "linkedin" in publisher or "linkedin.com" in apply_url.lower():
                source = "linkedin"
            elif "indeed" in publisher or "indeed.com" in apply_url.lower():
                source = "indeed"
            elif "glassdoor" in publisher:
                source = "glassdoor"
            else:
                source = "linkedin" if "linkedin" in publisher else "web"

            # Extract skills if present in metadata
            skills = []
            req_skills = item.get("job_required_skills") or []
            if isinstance(req_skills, list):
                skills = [str(s) for s in req_skills if s]

            # Inferred skills if empty
            if not skills:
                import re
                words = re.findall(r"\b[A-Za-z#+]{2,}\b", f"{title} {description[:400]}")
                stop_words = {"the", "and", "for", "with", "from", "job", "jobs", "apply", "career", "company"}
                skills = list(dict.fromkeys([w for w in words if w.lower() not in stop_words and len(w) > 2]))[:6]

            content_hash = self._compute_hash(company, title, location)
            ext_id = f"{source}_{item.get('job_id') or hashlib.md5(apply_url.encode()).hexdigest()[:12]}"

            # Parse salary if available
            salary_min = item.get("job_min_salary")
            salary_max = item.get("job_max_salary")

            normalized.append({
                "id": ext_id,
                "external_id": ext_id,
                "content_hash": content_hash,
                "source": source,
                "title": title,
                "company": company,
                "location": location,
                "salary_min": float(salary_min) if salary_min is not None else None,
                "salary_max": float(salary_max) if salary_max is not None else None,
                "redirect_url": apply_url,
                "description": description,
                "extracted_skills": skills,
            })

        return normalized


jsearch_client = JSearchClient()
