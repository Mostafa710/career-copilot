"""Unit tests for Adzuna Client and dynamic backfill pagination."""

import pytest
from backend.app.services.adzuna_client import adzuna_client, compute_job_content_hash


def test_job_content_hash_consistency():
    h1 = compute_job_content_hash("Google", "Senior Software Engineer", "London, UK")
    h2 = compute_job_content_hash("  google  ", "senior software engineer", "LONDON, UK")
    assert h1 == h2


@pytest.mark.asyncio
async def test_dynamic_backfill_pagination_mock():
    # Test that the dynamic backfill always returns between 7 and 10 distinct jobs
    jobs = await adzuna_client.search_with_dynamic_backfill(
        query="Python Developer",
        existing_external_ids=set(),
        min_target=7,
        max_target=10,
    )

    assert len(jobs) >= 7
    assert len(jobs) <= 10

    # Ensure all jobs have unique external IDs
    ext_ids = [j["external_id"] for j in jobs]
    assert len(ext_ids) == len(set(ext_ids))
