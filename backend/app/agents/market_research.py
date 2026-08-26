"""Market Research Agent: Searches for job postings with dynamic backfill pagination and deduplication."""

import logging
from typing import List, Dict, Any, Optional, Set
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from backend.app.core.llm_factory import get_llm
from backend.app.services.adzuna_client import adzuna_client
from backend.app.services.tavily_client import tavily_client

logger = logging.getLogger(__name__)


class SearchIntent(BaseModel):
    role_keywords: str = Field(..., description="Target job title or skill keywords (e.g. 'Backend Engineer', 'Python FastAPI')")
    location: Optional[str] = Field(None, description="Location or City (e.g. 'London', 'Remote')")
    is_remote: bool = Field(False, description="True if remote work is preferred")


INTENT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a smart job search query analyzer.
Extract the target role keywords, location, and remote preference from the user's natural language request.
If the user's query is general (e.g., 'find jobs for me', 'show openings'), infill with the candidate's target role and preferences.
"""),
    ("human", """User Query: {query}
Candidate Default Role: {default_role}
Candidate Default Country: {default_country}
""")
])


class MarketResearchAgent:
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
        Extracts search intent and runs the dynamic backfill loop to return 7–10 distinct jobs.
        """
        prefs = user_preferences or {}
        default_role = prefs.get("target_role") or (candidate_skills[0] if candidate_skills else "Software Engineer")
        default_country = prefs.get("default_country", "gb")

        try:
            structured_llm = self.llm.with_structured_output(SearchIntent)
            chain = INTENT_PROMPT | structured_llm
            intent: SearchIntent = await chain.ainvoke({
                "query": query or "Find jobs for me",
                "default_role": default_role,
                "default_country": default_country,
            })
            search_query = intent.role_keywords
            location = intent.location or ("Remote" if intent.is_remote else None)
        except Exception as e:
            logger.warning(f"Query intent parsing fallback: {e}")
            search_query = query if query and len(query) > 3 else default_role
            location = None

        logger.info(f"Market Research querying Adzuna: query='{search_query}', location='{location}'")

        # 1. Execute Adzuna Search
        jobs = await adzuna_client.search_with_dynamic_backfill(
            query=search_query,
            country=default_country,
            location=location,
            existing_external_ids=existing_external_ids or set(),
            min_target=7,
            max_target=10,
            max_attempts=3,
        )

        # 2. Universal Global / Egypt Fallback: If Adzuna returned fewer than 7 jobs or location is non-Adzuna
        if len(jobs) < 7 and tavily_client.is_configured():
            logger.info(f"Augmenting job search with Tavily live web jobs for query='{search_query}', location='{location}'")
            seen_hashes = {j.get("content_hash") for j in jobs if j.get("content_hash")}
            tavily_jobs = await tavily_client.search_live_jobs(
                query=search_query,
                location=location or "Egypt",
                max_results=10 - len(jobs),
            )
            for tj in tavily_jobs:
                if (
                    tj["external_id"] not in (existing_external_ids or set())
                    and tj.get("content_hash") not in seen_hashes
                ):
                    jobs.append(tj)
                    seen_hashes.add(tj.get("content_hash"))
                if len(jobs) >= 10:
                    break

        return jobs


market_research_agent = MarketResearchAgent()
