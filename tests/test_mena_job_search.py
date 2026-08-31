import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from backend.app.services.wuzzuf_scraper import wuzzuf_scraper
from backend.app.services.jsearch_client import jsearch_client
from backend.app.agents.market_research import market_research_agent


SAMPLE_WUZZUF_HTML = """
<html>
<body>
    <div class="css-pkv5jc">
        <h2><a href="/jobs/p/12345-Senior-Python-Developer-Cairo-Egypt">Senior Python Developer</a></h2>
        <div class="css-d7j1kk"><a class="css-17s97q8">Vodafone Egypt</a></div>
        <span class="css-5wys0k">Smart Village, Giza, Egypt</span>
        <div class="css-y4udm8">Building scalable Python microservices, FastAPI, and Kubernetes.</div>
        <a class="css-5x9pm1">Python</a>
        <a class="css-5x9pm1">FastAPI</a>
        <a class="css-5x9pm1">Docker</a>
    </div>
    <div class="css-pkv5jc">
        <h2><a href="/jobs/p/67890-Full-Stack-Engineer-Cairo-Egypt">Full Stack Engineer</a></h2>
        <div class="css-d7j1kk"><a class="css-17s97q8">Instabug</a></div>
        <span class="css-5wys0k">New Cairo, Cairo, Egypt</span>
        <div class="css-y4udm8">React, Next.js, and Node.js developer for global mobile SDK dashboard.</div>
        <a class="css-5x9pm1">React</a>
        <a class="css-5x9pm1">TypeScript</a>
    </div>
</body>
</html>
"""


SAMPLE_JSEARCH_DATA = [
    {
        "job_id": "linkedin_111",
        "job_title": "AI / ML Engineer",
        "employer_name": "Microsoft Egypt",
        "job_city": "Cairo",
        "job_country": "EG",
        "job_description": "Join Microsoft AI Hub in Cairo building PyTorch and LLM pipelines.",
        "job_apply_link": "https://linkedin.com/jobs/view/111",
        "job_publisher": "LinkedIn",
        "job_required_skills": ["Python", "PyTorch", "Azure"],
        "job_min_salary": 50000,
        "job_max_salary": 80000,
    },
    {
        "job_id": "indeed_222",
        "job_title": "DevOps Engineer",
        "employer_name": "Valu",
        "job_city": "Giza",
        "job_country": "EG",
        "job_description": "Valu fintech looking for Kubernetes and Terraform automation engineers.",
        "job_apply_link": "https://indeed.com/viewjob?jk=222",
        "job_publisher": "Indeed",
        "job_required_skills": ["Docker", "Kubernetes", "AWS"],
    },
]


def test_wuzzuf_html_parsing():
    """Verify Wuzzuf HTML parser extracts structured cards, skills, and links."""
    jobs = wuzzuf_scraper.parse_html(SAMPLE_WUZZUF_HTML)
    assert len(jobs) == 2
    
    j1 = jobs[0]
    assert j1["title"] == "Senior Python Developer"
    assert "Vodafone" in j1["company"]
    assert "Egypt" in j1["location"]
    assert "https://wuzzuf.net/jobs/p/12345" in j1["redirect_url"]
    assert j1["source"] == "wuzzuf"
    assert "Python" in j1["extracted_skills"]
    assert j1["content_hash"] is not None


def test_jsearch_normalization():
    """Verify JSearch raw objects normalize to unified schema with source attribution."""
    normalized = jsearch_client._normalize_jobs(SAMPLE_JSEARCH_DATA)
    assert len(normalized) == 2
    
    # LinkedIn job
    assert normalized[0]["source"] == "linkedin"
    assert normalized[0]["title"] == "AI / ML Engineer"
    assert normalized[0]["company"] == "Microsoft Egypt"
    assert "linkedin.com" in normalized[0]["redirect_url"]
    assert "PyTorch" in normalized[0]["extracted_skills"]
    
    # Indeed job
    assert normalized[1]["source"] == "indeed"
    assert normalized[1]["title"] == "DevOps Engineer"
    assert normalized[1]["company"] == "Valu"
    assert "indeed.com" in normalized[1]["redirect_url"]


@pytest.mark.asyncio
async def test_market_research_mena_aggregation(monkeypatch):
    """Verify market research agent aggregates Wuzzuf and JSearch concurrently."""
    async def mock_wuzzuf(query, page=0):
        return wuzzuf_scraper.parse_html(SAMPLE_WUZZUF_HTML)

    async def mock_jsearch(query, location="Egypt", page=1, num_pages=1):
        return jsearch_client._normalize_jobs(SAMPLE_JSEARCH_DATA)

    from backend.app.services.tavily_client import tavily_client

    monkeypatch.setattr(wuzzuf_scraper, "search_jobs", mock_wuzzuf)
    monkeypatch.setattr(jsearch_client, "search_jobs", mock_jsearch)
    monkeypatch.setattr(tavily_client, "is_configured", lambda: False)

    jobs = await market_research_agent.search_jobs(
        query="Python Engineer in Cairo",
        user_preferences={"target_role": "Python Engineer", "default_country": "Egypt"},
    )

    # With Tavily backfill disabled, exactly 2 (Wuzzuf) + 2 (JSearch) = 4 jobs
    assert len(jobs) == 4
    sources = {j["source"] for j in jobs}
    assert "wuzzuf" in sources
    assert "linkedin" in sources
    assert "indeed" in sources


def test_closed_job_filtering():
    """Verify closed/expired jobs are filtered out across scrapers and JSearch."""
    from backend.app.services.job_quality import assess_job_posting, keep_actual_job_postings

    # 1. Closed text in description or title
    closed_job = {
        "title": "Backend Python Engineer [CLOSED]",
        "company": "Tech Corp",
        "description": "We are no longer accepting applications for this vacancy.",
        "redirect_url": "https://linkedin.com/jobs/view/999",
    }
    is_valid, reasons = assess_job_posting(closed_job)
    assert not is_valid
    assert "closed_or_expired_text_marker" in reasons

    # 2. Expired timestamp
    expired_job = {
        "title": "Senior AI Engineer",
        "company": "AI Labs",
        "description": "Building next-gen LLM agents and FastAPI backend infrastructure.",
        "redirect_url": "https://wuzzuf.net/jobs/p/9999",
        "job_offer_expiration_timestamp": 1600000000, # Year 2020 (in past)
    }
    is_valid, reasons = assess_job_posting(expired_job)
    assert not is_valid
    assert "expiration_timestamp_in_past" in reasons

    # 3. JSearch normalization excludes closed jobs
    raw_jsearch_with_closed = [
        {
            "job_id": "closed_1",
            "job_title": "Python Dev",
            "employer_name": "Old Corp",
            "job_is_closed": True,
            "job_apply_link": "https://linkedin.com/jobs/view/closed1",
        },
        {
            "job_id": "expired_2",
            "job_title": "React Dev",
            "employer_name": "Past Corp",
            "job_offer_expiration_datetime_utc": "2020-01-01T00:00:00Z",
            "job_apply_link": "https://indeed.com/viewjob?jk=exp2",
        },
        {
            "job_id": "open_3",
            "job_title": "FastAPI Dev",
            "employer_name": "Live Corp",
            "job_is_closed": False,
            "job_apply_link": "https://linkedin.com/jobs/view/open3",
            "job_description": "Active vacancy looking for FastAPI and Python backend engineers.",
        }
    ]
    normalized = jsearch_client._normalize_jobs(raw_jsearch_with_closed)
    assert len(normalized) == 1
    assert normalized[0]["title"] == "FastAPI Dev"


def test_arabic_aggregator_and_url_rejection():
    """Verify Arabic category titles and open directory links are rejected."""
    from backend.app.services.job_quality import assess_job_posting

    # 1. Arabic directory / aggregate titles
    arabic_aggregator_1 = {
        "title": "150 شغل في مصر",
        "company": "Job Portal",
        "description": "Browse hundreds of open jobs and vacancies across Egypt today.",
        "redirect_url": "https://www.bayt.com/en/egypt/jobs/",
    }
    is_valid, reasons = assess_job_posting(arabic_aggregator_1)
    assert not is_valid
    assert "aggregator_title" in reasons
    assert "search_or_category_url" in reasons

    arabic_aggregator_2 = {
        "title": "وظائف AI في مصر",
        "company": "Egyptian Jobs",
        "description": "Discover the latest artificial intelligence jobs in Cairo and Giza.",
        "redirect_url": "https://wuzzuf.net/search/jobs/?q=AI",
    }
    is_valid, reasons = assess_job_posting(arabic_aggregator_2)
    assert not is_valid
    assert "aggregator_title" in reasons
    assert "search_or_category_url" in reasons

    # 2. Open LinkedIn category search link vs direct vacancy
    open_search_link = {
        "title": "Junior AI Engineer",
        "company": "Vodafone Egypt",
        "description": "Building NLP and computer vision pipelines using Python and PyTorch.",
        "redirect_url": "https://www.linkedin.com/jobs/ai-engineer-jobs-cairo/",
    }
    is_valid, reasons = assess_job_posting(open_search_link)
    assert not is_valid
    assert "search_or_category_url" in reasons

    # 3. Valid individual job vacancy
    valid_posting = {
        "title": "Junior AI Engineer",
        "company": "Vodafone Egypt",
        "description": "Building NLP and computer vision pipelines using Python and PyTorch in Cairo.",
        "redirect_url": "https://www.linkedin.com/jobs/view/3948102938",
    }
    is_valid, reasons = assess_job_posting(valid_posting)
    assert is_valid
    assert len(reasons) == 0


if __name__ == "__main__":
    import asyncio
    test_wuzzuf_html_parsing()
    print("[PASS] test_wuzzuf_html_parsing passed")
    test_jsearch_normalization()
    print("[PASS] test_jsearch_normalization passed")
    test_closed_job_filtering()
    print("[PASS] test_closed_job_filtering passed")
    test_arabic_aggregator_and_url_rejection()
    print("[PASS] test_arabic_aggregator_and_url_rejection passed")

    class DummyMonkey:
        def setattr(self, obj, name, val):
            setattr(obj, name, val)

    asyncio.run(test_market_research_mena_aggregation(DummyMonkey()))
    print("[PASS] test_market_research_mena_aggregation passed")
    print("ALL MENA JOB SEARCH TESTS PASSED!")
