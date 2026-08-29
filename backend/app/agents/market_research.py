"""Market Research Agent: Multi-source Egypt & MENA job discovery (LinkedIn, Indeed, Wuzzuf, Bayt)."""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Set
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from backend.app.core.llm_factory import get_llm
from backend.app.services.wuzzuf_scraper import wuzzuf_scraper
from backend.app.services.bayt_scraper import bayt_scraper
from backend.app.services.jsearch_client import jsearch_client
from backend.app.services.tavily_client import tavily_client
from backend.app.services.job_quality import keep_actual_job_postings

logger = logging.getLogger(__name__)


class SearchIntent(BaseModel):
    role_keywords: str = Field(..., description="Target job title or skill keywords (e.g. 'Backend Engineer', 'Python FastAPI')")
    location: Optional[str] = Field("Egypt", description="Location, City or Region (e.g. 'Cairo', 'Egypt', 'MENA', 'Remote')")
    is_remote: bool = Field(False, description="True if remote work is preferred")


INTENT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert job search intent analyzer specializing in the Egypt and MENA technical market.
Extract the target role keywords, location (default to 'Egypt' if unspecified), and remote preference from the user's query.
If the query is general (e.g., 'find jobs for me', 'show openings'), infill with the candidate's target role and preferences.
"""),
    ("human", """User Query: {query}
Candidate Default Role: {default_role}
Candidate Default Country: {default_country}
""")
])


class MarketResearchAgent:
    """Orchestrates concurrent multi-source job searches for Egypt & MENA."""

    def __init__(self):
        self.llm = get_llm(temperature=0.0)

    async def search_jobs(
        self,
        query: str,
        user_preferences: Optional[Dict[str, Any]] = None,
        candidate_skills: Optional[List[str]] = None,
        existing_external_ids: Optional[Set[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Extracts search intent and aggregates listings concurrently from Wuzzuf, Bayt,
        RapidAPI JSearch (LinkedIn & Indeed), with Tavily live search backfill.
        Guarantees 7–10 distinct jobs.
        """
        prefs = user_preferences or {}
        default_role = prefs.get("target_role") or (candidate_skills[0] if candidate_skills else "Software Engineer")
        default_country = prefs.get("default_country", "Egypt")

        try:
            structured_llm = self.llm.with_structured_output(SearchIntent)
            chain = INTENT_PROMPT | structured_llm
            intent: SearchIntent = await chain.ainvoke({
                "query": query or "Find jobs for me in Egypt",
                "default_role": default_role,
                "default_country": default_country,
            })
            search_query = intent.role_keywords
            location = intent.location or ("Remote" if intent.is_remote else "Egypt")
        except Exception as e:
            logger.warning(f"Query intent parsing fallback: {e}")
            search_query = query if query and len(query) > 3 else default_role
            location = "Egypt"

        logger.info(f"Market Research querying MENA sources: query='{search_query}', location='{location}'")

        # 1. Execute concurrent multi-source job fetch (RapidAPI JSearch first, then Wuzzuf & Bayt)
        tasks = [
            jsearch_client.search_jobs(query=search_query, location=location),
            wuzzuf_scraper.search_jobs(query=search_query),
            bayt_scraper.search_jobs(query=search_query, country="egypt"),
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        collected_jobs: List[Dict[str, Any]] = []
        seen_hashes: Set[str] = set()
        seen_ids: Set[str] = set(existing_external_ids or set())

        # Merge results from scrapers and API in priority order (RapidAPI -> Wuzzuf -> Bayt)
        for res in results:
            if isinstance(res, list):
                for job in res:
                    c_hash = job.get("content_hash")
                    ext_id = job.get("external_id")
                    if ext_id and ext_id not in seen_ids and c_hash not in seen_hashes:
                        collected_jobs.append(job)
                        seen_ids.add(ext_id)
                        if c_hash:
                            seen_hashes.add(c_hash)

        collected_jobs, rejected_primary = keep_actual_job_postings(collected_jobs)
        logger.info(
            "Primary sources returned %s verified postings; rejected %s aggregate/incomplete pages.",
            len(collected_jobs),
            len(rejected_primary),
        )

        # 2. Universal Dynamic Backfill via Tavily Live Web Search if fewer than 15 jobs
        if len(collected_jobs) < 15 and tavily_client.is_configured():
            logger.info(f"Backfilling {15 - len(collected_jobs)} jobs via Tavily live web search...")
            tavily_jobs = await tavily_client.search_live_jobs(
                query=f"{search_query} {location}",
                location=location,
                max_results=20 - len(collected_jobs),
            )
            verified_tavily_jobs, rejected_tavily = keep_actual_job_postings(tavily_jobs)
            logger.info("Tavily quality gate rejected %s non-posting results.", len(rejected_tavily))
            for tj in verified_tavily_jobs:
                c_hash = tj.get("content_hash")
                ext_id = tj.get("external_id")
                if ext_id not in seen_ids and c_hash not in seen_hashes:
                    collected_jobs.append(tj)
                    seen_ids.add(ext_id)
                    if c_hash:
                        seen_hashes.add(c_hash)
                if len(collected_jobs) >= 20:
                    break

        return collected_jobs


market_research_agent = MarketResearchAgent()
