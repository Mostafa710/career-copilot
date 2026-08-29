"""Tavily Client for on-demand company intelligence, real-time market trends, and live web search."""

import hashlib
import logging
import httpx
from typing import Dict, Any, Optional, List
from backend.app.config import settings

logger = logging.getLogger(__name__)


def compute_job_content_hash(company: str, title: str, location: str) -> str:
    raw = f"{company.strip().lower()}|{title.strip().lower()}|{location.strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class TavilyClient:
    def __init__(self):
        self.api_key = settings.TAVILY_API_KEY
        self.base_url = "https://api.tavily.com/search"

    def is_configured(self) -> bool:
        return bool(self.api_key and not self.api_key.startswith("your_"))

    def _mock_company_insights(self, company_name: str, job_title: Optional[str] = "") -> Dict[str, Any]:
        return {
            "company": company_name,
            "summary": f"{company_name} is an innovative technology organization recognized for building robust digital products, high-velocity engineering workflows, and scalable cloud architectures.",
            "tech_stack_highlights": ["Python", "TypeScript / React", "PostgreSQL", "Cloud Infrastructure (AWS/GCP)", "Docker & Microservices"],
            "culture_values": ["High ownership & autonomy", "Collaborative cross-functional teams", "Data-driven experimentation", "Clean, maintainable code standards"],
            "recent_focus": f"Expanding modern engineering capabilities and scaling backend services for {job_title or 'core products'}.",
            "cached": True,
        }

    async def get_company_insights(self, company_name: str, job_title: Optional[str] = "") -> Dict[str, Any]:
        """Fetch company background, engineering culture, tech stack, and recent developments."""
        if not self.is_configured():
            return self._mock_company_insights(company_name, job_title)

        query = f"{company_name} company overview tech stack engineering culture recent news"
        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": "advanced",
            "include_answer": True,
            "max_results": 4,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(self.base_url, json=payload)
                response.raise_for_status()
                data = response.json()
                
                answer = data.get("answer", "")
                results = data.get("results", [])
                key_snippets = [r.get("content", "") for r in results[:3]]
                
                return {
                    "company": company_name,
                    "summary": answer or " ".join(key_snippets[:2]),
                    "sources": [r.get("url") for r in results if r.get("url")],
                    "key_takeaways": key_snippets,
                    "culture_values": ["High ownership & autonomy", "Technical craftsmanship", "Continuous learning"],
                    "cached": True,
                }
            except Exception as e:
                logger.error(f"Tavily search error: {e}")
                return self._mock_company_insights(company_name, job_title)

    async def get_market_skill_trends(self, target_role: str) -> Dict[str, Any]:
        """Fetch current trending tools, demanded skills, and certifications for a role."""
        if not self.is_configured():
            return {
                "target_role": target_role,
                "trending_skills": ["FastAPI", "Docker", "Kubernetes", "LangChain/LangGraph", "PostgreSQL", "AWS / Cloud Native", "CI/CD & DevOps"],
                "in_demand_frameworks": ["Pydantic v2", "PyTorch", "Next.js 14", "TailwindCSS"],
                "recommended_certifications": ["AWS Certified Solutions Architect", "CKA (Kubernetes Administrator)"],
            }

        query = f"in demand skills requirements technologies tools for {target_role} roadmap 2026 2027"
        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": "advanced",
            "include_answer": True,
            "max_results": 4,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(self.base_url, json=payload)
                response.raise_for_status()
                data = response.json()
                return {
                    "target_role": target_role,
                    "overview": data.get("answer", ""),
                    "market_insights": [r.get("content", "") for r in data.get("results", [])[:3]],
                }
            except Exception as e:
                logger.error(f"Tavily skill trends error: {e}")
                return {
                    "target_role": target_role,
                    "overview": f"High demand for modern cloud-native, Python, and scalable architecture skills in {target_role}.",
                    "market_insights": [],
                }

    async def search_live_jobs(self, query: str, location: Optional[str] = "Egypt", max_results: int = 15) -> List[Dict[str, Any]]:
        """Fetch live direct vacancy postings from LinkedIn, Wuzzuf, and Bayt for any MENA location."""
        if not self.is_configured():
            return []

        # Target direct vacancy posting endpoints to avoid directory/search aggregate index pages
        search_query = f'"{query}" (site:linkedin.com/jobs/view/ OR site:wuzzuf.net/jobs/p/ OR site:bayt.com/en/egypt/jobs/) {location or "Egypt"}'
        payload = {
            "api_key": self.api_key,
            "query": search_query,
            "search_depth": "advanced",
            "max_results": max_results,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(self.base_url, json=payload)
                response.raise_for_status()
                data = response.json()
                results = data.get("results", [])
                
                parsed_jobs = []
                for r in results:
                    title_raw = r.get("title", f"{query} Opening")
                    url = r.get("url", "")
                    desc = r.get("content", f"Open position for {query} in {location or 'Egypt'}.")

                    # Smart Company & Title Extraction
                    company = "Identified Employer"
                    title = title_raw

                    if " hiring " in title_raw:
                        h_parts = title_raw.split(" hiring ", 1)
                        company = h_parts[0].strip()
                        title = h_parts[1].split(" in ")[0].strip() if " in " in h_parts[1] else h_parts[1].strip()
                    elif " job at " in title_raw:
                        at_parts = title_raw.split(" job at ", 1)
                        title = at_parts[0].strip()
                        company = at_parts[1].split(" in ")[0].strip() if " in " in at_parts[1] else at_parts[1].strip()
                    elif " at " in title_raw:
                        at_parts = title_raw.split(" at ", 1)
                        title = at_parts[0].strip()
                        company = at_parts[1].split(" in ")[0].strip() if " in " in at_parts[1] else at_parts[1].strip()
                    elif " - " in title_raw:
                        dash_parts = title_raw.split(" - ")
                        title = dash_parts[0].strip()
                        company = dash_parts[1].strip() if len(dash_parts) > 1 else "Identified Employer"
                    elif " | " in title_raw:
                        pipe_parts = title_raw.split(" | ")
                        title = pipe_parts[0].strip()
                        company = pipe_parts[1].strip() if len(pipe_parts) > 1 else "Identified Employer"

                    # Clean company name from platform branding
                    for brand in ["LinkedIn Jobs", "LinkedIn", "Wuzzuf", "Bayt", "Glassdoor", "Indeed"]:
                        if company.lower() == brand.lower():
                            company = "Identified Employer"
                        elif brand in company:
                            company = company.replace(brand, "").strip(" -|·")

                    if not company:
                        company = "Identified Employer"

                    content_hash = compute_job_content_hash(company, title, location or "Egypt")
                    
                    # Detect source from URL
                    if "linkedin" in url:
                        source = "linkedin"
                    elif "wuzzuf" in url:
                        source = "wuzzuf"
                    elif "bayt" in url:
                        source = "bayt"
                    elif "indeed" in url:
                        source = "indeed"
                    else:
                        source = "web"

                    parsed_jobs.append({
                        "id": f"tavily_{hashlib.md5(url.encode()).hexdigest()[:12]}",
                        "external_id": f"tavily_{hashlib.md5(url.encode()).hexdigest()[:12]}",
                        "content_hash": content_hash,
                        "source": source,
                        "title": title,
                        "company": company,
                        "location": location or "Egypt",
                        "salary_min": None,
                        "salary_max": None,
                        "redirect_url": url,
                        "description": desc,
                        "extracted_skills": [],
                    })
                return parsed_jobs
            except Exception as e:
                logger.error(f"Tavily live job search error: {e}")
                return []


tavily_client = TavilyClient()
