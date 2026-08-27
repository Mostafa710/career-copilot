"""Unit tests for Egypt & MENA Job Search Engine (Wuzzuf, Bayt, JSearch)."""

import pytest
from backend.app.services.wuzzuf_scraper import wuzzuf_scraper
from backend.app.services.bayt_scraper import bayt_scraper
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

SAMPLE_BAYT_HTML = """
<html>
<body>
    <ul>
        <li class="has-pointer-d">
            <h2 class="title"><a href="/en/egypt/jobs/backend-engineer-998877/">Backend Engineer (Python / Cloud)</a></h2>
            <b class="company">Fawry Banking & Payment</b>
            <span class="location">Cairo, Egypt</span>
            <div class="jb-description">Design enterprise financial microservices and scalable APIs.</div>
        </li>
    </ul>
</body>
</html>
"""

SAMPLE_JSEARCH_DATA = [
    {
        "job_id": "linkedin_98765",
        "job_title": "AI / ML Engineer",
        "employer_name": "Microsoft Egypt",
        "job_city": "Cairo",
        "job_country": "Egypt",
        "job_description": "Work on Azure AI models and generative intelligence pipelines.",
        "job_apply_link": "https://www.linkedin.com/jobs/view/123456789",
        "job_publisher": "LinkedIn",
        "job_required_skills": ["Python", "PyTorch", "Azure"],
        "job_min_salary": 40000,
        "job_max_salary": 70000,
    },
    {
        "job_id": "indeed_54321",
        "job_title": "DevOps Engineer",
        "employer_name": "Valu",
        "job_city": "Giza",
        "job_country": "Egypt",
        "job_description": "Manage Kubernetes clusters, Terraform infrastructure, and CI/CD pipelines.",
        "job_apply_link": "https://eg.indeed.com/viewjob?jk=abcdef",
        "job_publisher": "Indeed",
        "job_required_skills": ["Kubernetes", "Docker", "CI/CD"],
        "job_min_salary": None,
        "job_max_salary": None,
    }
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


def test_bayt_html_parsing():
    """Verify Bayt HTML parser extracts titles, companies, and apply URLs."""
    jobs = bayt_scraper.parse_html(SAMPLE_BAYT_HTML)
    assert len(jobs) == 1
    
    j = jobs[0]
    assert "Backend Engineer" in j["title"]
    assert "Fawry" in j["company"]
    assert "Cairo" in j["location"]
    assert "https://www.bayt.com/en/egypt/jobs" in j["redirect_url"]
    assert j["source"] == "bayt"
    assert j["content_hash"] is not None


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
    """Verify market research agent aggregates Wuzzuf, Bayt, and JSearch concurrently."""
    async def mock_wuzzuf(query, page=0):
        return wuzzuf_scraper.parse_html(SAMPLE_WUZZUF_HTML)

    async def mock_bayt(query, country="egypt"):
        return bayt_scraper.parse_html(SAMPLE_BAYT_HTML)

    async def mock_jsearch(query, location="Egypt", page=1, num_pages=1):
        return jsearch_client._normalize_jobs(SAMPLE_JSEARCH_DATA)

    monkeypatch.setattr(wuzzuf_scraper, "search_jobs", mock_wuzzuf)
    monkeypatch.setattr(bayt_scraper, "search_jobs", mock_bayt)
    monkeypatch.setattr(jsearch_client, "search_jobs", mock_jsearch)

    jobs = await market_research_agent.search_jobs(
        query="Python Engineer in Cairo",
        user_preferences={"target_role": "Python Engineer", "default_country": "Egypt"},
    )

    # We expect 2 (Wuzzuf) + 1 (Bayt) + 2 (JSearch) = 5 distinct jobs
    assert len(jobs) == 5
    sources = {j["source"] for j in jobs}
    assert "wuzzuf" in sources
    assert "bayt" in sources
    assert "linkedin" in sources
    assert "indeed" in sources
