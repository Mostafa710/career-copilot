"""Wuzzuf Job Scraper Service: Extracts live technical job postings in Egypt."""

import re
import hashlib
import logging
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

WUZZUF_SEARCH_URL = "https://wuzzuf.net/search/jobs/"
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "Referer": "https://wuzzuf.net/",
}


class WuzzufScraper:
    """High-speed asynchronous scraper for Wuzzuf.net."""

    def __init__(self, timeout: float = 10.0):
        self.timeout = timeout

    def _compute_hash(self, company: str, title: str, location: str) -> str:
        raw = f"{company.strip().lower()}|{title.strip().lower()}|{location.strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def search_jobs(
        self,
        query: str,
        page: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Scrapes job listings from Wuzzuf for a given search query.
        Filters for postings within the last month to ensure open, active vacancies.
        """
        params = {
            "q": query,
            "a": "hpb",
            "start": page,
            "filters[post_date][0]": "within_1_month",
        }

        try:
            async with httpx.AsyncClient(headers=DEFAULT_HEADERS, timeout=self.timeout, follow_redirects=True) as client:
                resp = await client.get(WUZZUF_SEARCH_URL, params=params)
                if resp.status_code != 200:
                    logger.warning(f"Wuzzuf returned status code {resp.status_code}")
                    return []

                html_content = resp.text
                return self.parse_html(html_content)

        except Exception as e:
            logger.error(f"Error scraping Wuzzuf jobs for '{query}': {e}")
            return []

    def parse_html(self, html_content: str) -> List[Dict[str, Any]]:
        """Parses Wuzzuf search results HTML into structured job records, skipping closed vacancies."""
        soup = BeautifulSoup(html_content, "html.parser")
        jobs: List[Dict[str, Any]] = []

        # Wuzzuf job containers are typically inside divs containing job card classes
        cards = soup.find_all("div", class_=lambda c: c and ("css-pkv5jc" in c or "css-1gatmva" in c or "job-card" in c))
        
        # Fallback to article or general container if specific class changed
        if not cards:
            cards = soup.find_all("div", attrs={"data-qa": "job-card"}) or soup.find_all("article")

        closed_keywords = {"closed", "expired", "job closed", "job expired", "no longer accepting applications"}

        for card in cards:
            try:
                # 0. Check for closed/expired badges or status text
                card_text_lower = card.get_text(separator=" ", strip=True).lower()
                if any(ck in card_text_lower for ck in ["job closed", "expired", "closed for applications", "no longer accepting"]):
                    continue

                status_badge = card.find(lambda el: el.name in ("span", "div", "strong", "badge") and el.get_text(strip=True).lower() in closed_keywords)
                if status_badge:
                    continue

                # 1. Job Title & Link
                title_elem = card.find("h2") or card.find("h3")
                if not title_elem:
                    continue
                
                link_elem = title_elem.find("a") or card.find("a", href=re.compile(r"/jobs/p/"))
                title = title_elem.get_text(strip=True) if title_elem else ""
                
                raw_href = link_elem["href"] if (link_elem and "href" in link_elem.attrs) else ""
                if raw_href.startswith("/"):
                    redirect_url = f"https://wuzzuf.net{raw_href}"
                else:
                    redirect_url = raw_href or "https://wuzzuf.net"

                # 2. Company Name
                company_elem = card.find("div", class_=lambda c: c and "css-d7j1kk" in c) or card.find("a", class_=lambda c: c and "css-17s97q8" in c)
                if not company_elem:
                    # Fallback text
                    company_elem = card.find("span", class_=lambda c: c and "company" in c)
                company = company_elem.get_text(strip=True).rstrip(" -") if company_elem else "Confidential Company"

                # 3. Location
                location_elem = card.find("span", class_=lambda c: c and ("css-5wys0k" in c or "location" in c))
                location = location_elem.get_text(strip=True) if location_elem else "Egypt"

                # 4. Skills & Badges
                skills: List[str] = []
                skill_links = card.find_all("a", class_=lambda c: c and "css-5x9pm1" in c)
                if not skill_links:
                    skill_links = card.find_all("span", class_=lambda c: c and ("css-128m2e3" in c or "skill" in c))
                for s in skill_links:
                    s_text = s.get_text(strip=True)
                    if s_text and s_text not in ["·", "Full Time", "Part Time", "Remote", "Work from home"]:
                        skills.append(s_text)

                # 5. Job Description / Requirements snippet
                desc_elem = card.find("div", class_=lambda c: c and ("css-y4udm8" in c or "description" in c))
                description = desc_elem.get_text(separator=" ", strip=True) if desc_elem else f"Opportunities in {title} at {company}."

                if not title or len(title) < 2:
                    continue

                content_hash = self._compute_hash(company, title, location)
                ext_id = f"wuzzuf_{hashlib.md5(redirect_url.encode()).hexdigest()[:12]}"

                jobs.append({
                    "id": ext_id,
                    "external_id": ext_id,
                    "content_hash": content_hash,
                    "source": "wuzzuf",
                    "title": title,
                    "company": company,
                    "location": location,
                    "salary_min": None,
                    "salary_max": None,
                    "redirect_url": redirect_url,
                    "description": description,
                    "extracted_skills": skills,
                    "is_active": True,
                    "is_closed": False,
                })
            except Exception as e:
                logger.debug(f"Error parsing individual Wuzzuf card: {e}")
                continue

        return jobs


wuzzuf_scraper = WuzzufScraper()
