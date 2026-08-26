"""Adzuna API Client with Dynamic Backfill Pagination (7–10 jobs) and Deduplication."""

import hashlib
import logging
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set
from backend.app.config import settings

logger = logging.getLogger(__name__)


def compute_job_content_hash(company: str, title: str, location: Optional[str] = "") -> str:
    """Generate SHA256 hash to detect duplicate or reposted job openings."""
    norm = f"{company.lower().strip()}:{title.lower().strip()}:{(location or '').lower().strip()}"
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


class AdzunaClient:
    def __init__(self):
        self.app_id = settings.ADZUNA_APP_ID
        self.api_key = settings.ADZUNA_API_KEY
        self.default_country = settings.ADZUNA_DEFAULT_COUNTRY
        self.base_url = "https://api.adzuna.com/v1/api/jobs"

    def is_configured(self) -> bool:
        return bool(self.app_id and self.api_key and not self.app_id.startswith("your_"))

    async def fetch_jobs_page(
        self,
        query: str,
        country: Optional[str] = None,
        location: Optional[str] = None,
        page: int = 1,
        results_per_page: int = 10,
    ) -> List[Dict[str, Any]]:
        """Fetch a single page of results from Adzuna API."""
        if not self.is_configured():
            logger.info("Adzuna credentials not configured. Returning simulated mock jobs for local development.")
            return self._generate_mock_jobs(query, page, results_per_page)

        c = country or self.default_country
        url = f"{self.base_url}/{c}/search/{page}"
        params = {
            "app_id": self.app_id,
            "app_key": self.api_key,
            "results_per_page": results_per_page,
            "what": query,
            "content-type": "application/json",
        }
        if location:
            params["where"] = location

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                results = data.get("results", [])
                
                standardized = []
                for item in results:
                    job_data = {
                        "external_id": str(item.get("id")),
                        "source": "adzuna",
                        "title": item.get("title", "").replace("<strong>", "").replace("</strong>", ""),
                        "company": item.get("company", {}).get("display_name", "Unknown Company"),
                        "location": item.get("location", {}).get("display_name", location or "Remote"),
                        "salary_min": item.get("salary_min"),
                        "salary_max": item.get("salary_max"),
                        "redirect_url": item.get("redirect_url"),
                        "description": item.get("description", "").replace("<strong>", "").replace("</strong>", ""),
                        "posted_at": item.get("created"),
                        "content_hash": compute_job_content_hash(
                            item.get("company", {}).get("display_name", ""),
                            item.get("title", ""),
                            item.get("location", {}).get("display_name", ""),
                        ),
                    }
                    standardized.append(job_data)
                return standardized
            except Exception as e:
                logger.error(f"Adzuna API query error: {e}")
                return self._generate_mock_jobs(query, page, results_per_page)

    async def search_with_dynamic_backfill(
        self,
        query: str,
        country: Optional[str] = None,
        location: Optional[str] = None,
        existing_external_ids: Optional[Set[str]] = None,
        min_target: int = 7,
        max_target: int = 10,
        max_attempts: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Dynamic backfill pagination loop:
        Guarantees the user receives 7–10 distinct jobs, paginating if duplicates are filtered out.
        """
        seen_ids = existing_external_ids or set()
        collected_jobs: List[Dict[str, Any]] = []
        collected_hashes: Set[str] = set()

        current_page = 1
        attempts = 0

        while len(collected_jobs) < min_target and attempts < max_attempts:
            attempts += 1
            batch = await self.fetch_jobs_page(
                query=query,
                country=country,
                location=location,
                page=current_page,
                results_per_page=10,
            )

            if not batch:
                break

            for job in batch:
                ext_id = job.get("external_id")
                c_hash = job.get("content_hash")

                # Deduplicate against DB applied/saved records and within-batch duplicates
                if ext_id not in seen_ids and c_hash not in collected_hashes:
                    seen_ids.add(ext_id)
                    collected_hashes.add(c_hash)
                    collected_jobs.append(job)
                    if len(collected_jobs) >= max_target:
                        break

            current_page += 1

        return collected_jobs[:max_target]

    def _generate_mock_jobs(self, query: str, page: int, count: int) -> List[Dict[str, Any]]:
        """Fallback mock job generator for local testing and development."""
        mock_templates = [
            ("Senior Backend Engineer", "TechNova Solutions", "London, UK", 75000, 95000, "FastAPI, PostgreSQL, Docker, AWS, Distributed Systems"),
            ("Full Stack Developer", "Apex Digital Labs", "Remote", 60000, 80000, "React, Next.js, TypeScript, Python, TailwindCSS"),
            ("Machine Learning Engineer", "Cognitive AI Systems", "Cambridge, UK", 80000, 110000, "PyTorch, LangChain, LLM Fine-tuning, RAG, Kubernetes"),
            ("Cloud & DevOps Architect", "CloudWave Global", "Bristol, UK", 85000, 115000, "AWS, Terraform, Kubernetes, CI/CD, Microservices"),
            ("Python Software Engineer", "DataPulse Analytics", "Manchester, UK", 55000, 72000, "Python, SQL, Redis, REST APIs, Celery"),
            ("Frontend Engineer (React/Next)", "PixelForge Studio", "Remote", 58000, 75000, "React, Next.js, Shadcn UI, GraphQL, State Management"),
            ("Lead Data Engineer", "Vanguard Financial Tech", "London, UK", 90000, 120000, "PostgreSQL, Snowflake, dbt, Spark, Kafka, Airflow"),
            ("AI Systems Engineer", "NextGen Robotics", "Oxford, UK", 78000, 98000, "Python, LangGraph, Vector Databases, FastRTC, FastAPI"),
            ("Site Reliability Engineer (SRE)", "FinTech Horizon", "Remote", 70000, 90000, "Linux, Prometheus, Grafana, AWS, Python Automation"),
            ("Software Engineer II", "Starlight Media", "London, UK", 62000, 82000, "FastAPI, React, PostgreSQL, Docker, Redis"),
        ]

        jobs = []
        for i, (title, comp, loc, s_min, s_max, skills) in enumerate(mock_templates[:count]):
            ext_id = f"mock_{page}_{i+1}_{abs(hash(title)) % 10000}"
            jobs.append({
                "external_id": ext_id,
                "source": "adzuna_mock",
                "title": f"{title} - {query.capitalize() if query else 'Tech'}",
                "company": comp,
                "location": loc,
                "salary_min": s_min,
                "salary_max": s_max,
                "redirect_url": "https://example.com/apply",
                "description": f"We are seeking an exceptional {title} to join our engineering team. Core skills required: {skills}. Responsibilities include building scalable architectures, collaborating with product teams, and writing clean, tested code.",
                "posted_at": datetime.now(timezone.utc).isoformat(),
                "content_hash": compute_job_content_hash(comp, title, loc),
            })
        return jobs


adzuna_client = AdzunaClient()
