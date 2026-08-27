"""Bayt Job Scraper Service: Extracts live job postings for Egypt and MENA."""

import re
import hashlib
import logging
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

BAYT_BASE_URL = "https://www.bayt.com"
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
}


class BaytScraper:
    """High-speed asynchronous scraper for Bayt.com."""

    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout

    def _compute_hash(self, company: str, title: str, location: str) -> str:
        raw = f"{company.strip().lower()}|{title.strip().lower()}|{location.strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def search_jobs(
        self,
        query: str,
        country: str = "egypt",
    ) -> List[Dict[str, Any]]:
        """
        Scrapes job listings from Bayt for Egypt / MENA region.
        """
        clean_query = re.sub(r"[^\w\s-]", "", query).strip().replace(" ", "-").lower()
        if not clean_query:
            clean_query = "technology"

        # Bayt search URL format: /en/egypt/jobs/{clean_query}-jobs/
        target_url = f"{BAYT_BASE_URL}/en/{country}/jobs/{clean_query}-jobs/"

        try:
            async with httpx.AsyncClient(headers=DEFAULT_HEADERS, timeout=self.timeout, follow_redirects=True) as client:
                resp = await client.get(target_url)
                if resp.status_code != 200:
                    # Fallback to international search
                    fallback_url = f"{BAYT_BASE_URL}/en/international/jobs/{clean_query}-jobs/"
                    resp = await client.get(fallback_url)

                if resp.status_code != 200:
                    logger.warning(f"Bayt returned status code {resp.status_code}")
                    return []

                html_content = resp.text
                return self.parse_html(html_content)

        except Exception as e:
            logger.error(f"Error scraping Bayt jobs for '{query}': {e}")
            return []

    def parse_html(self, html_content: str) -> List[Dict[str, Any]]:
        """Parses Bayt search results HTML into structured job records."""
        soup = BeautifulSoup(html_content, "html.parser")
        jobs: List[Dict[str, Any]] = []

        # Bayt cards are typically <li> items with data-js-job or classes containing 'has-pointer-d'
        cards = soup.find_all("li", attrs={"data-js-job": True})
        if not cards:
            cards = soup.find_all("li", class_=lambda c: c and "has-pointer-d" in c)
        if not cards:
            cards = soup.find_all("div", class_=lambda c: c and "job-item" in c)

        for card in cards:
            try:
                # 1. Job Title & Link
                title_elem = card.find("h2") or card.find("h3") or card.find("a", class_=lambda c: c and "title" in c)
                if not title_elem:
                    continue

                link_elem = title_elem.find("a") if title_elem.name != "a" else title_elem
                title = title_elem.get_text(strip=True) if title_elem else ""

                raw_href = link_elem["href"] if (link_elem and "href" in link_elem.attrs) else ""
                if raw_href.startswith("/"):
                    redirect_url = f"{BAYT_BASE_URL}{raw_href}"
                else:
                    redirect_url = raw_href or BAYT_BASE_URL

                # 2. Company Name
                company_elem = card.find("b", class_=lambda c: c and "company" in c) or card.find("div", class_=lambda c: c and "company" in c)
                if not company_elem:
                    company_elem = card.find("span", class_=lambda c: c and "company" in c)
                company = company_elem.get_text(strip=True) if company_elem else "Confidential Company"

                # 3. Location
                location_elem = card.find("span", class_=lambda c: c and "location" in c) or card.find("div", class_=lambda c: c and "location" in c)
                location = location_elem.get_text(strip=True) if location_elem else "Egypt / MENA"

                # 4. Job Description Snippet
                desc_elem = card.find("div", class_=lambda c: c and ("jb-description" in c or "description" in c or "p10t" in c))
                description = desc_elem.get_text(separator=" ", strip=True) if desc_elem else f"Opportunities in {title} at {company}."

                # 5. Extract inferred skills from title & description
                words = re.findall(r"\b[A-Za-z#+]{2,}\b", f"{title} {description}")
                stop_words = {"the", "and", "for", "with", "from", "job", "jobs", "apply", "career", "company", "requirements"}
                skills = list(dict.fromkeys([w for w in words if w.lower() not in stop_words and len(w) > 2]))[:6]

                if not title or len(title) < 2:
                    continue

                content_hash = self._compute_hash(company, title, location)
                ext_id = f"bayt_{hashlib.md5(redirect_url.encode()).hexdigest()[:12]}"

                jobs.append({
                    "id": ext_id,
                    "external_id": ext_id,
                    "content_hash": content_hash,
                    "source": "bayt",
                    "title": title,
                    "company": company,
                    "location": location,
                    "salary_min": None,
                    "salary_max": None,
                    "redirect_url": redirect_url,
                    "description": description,
                    "extracted_skills": skills,
                })
            except Exception as e:
                logger.debug(f"Error parsing individual Bayt card: {e}")
                continue

        return jobs


bayt_scraper = BaytScraper()
