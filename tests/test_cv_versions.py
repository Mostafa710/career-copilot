"""Unit coverage for CV version comparison and retention policy."""

import uuid
from types import SimpleNamespace

from backend.app.db.models import CVVersion
from backend.app.services.cv_versions import compare_versions, select_prunable_versions


def _version(number: int, *, pinned: bool = False):
    return SimpleNamespace(
        id=uuid.uuid4(),
        version_number=number,
        is_pinned=pinned,
        raw_storage_key=f"version-{number}.pdf",
    )


def test_retention_keeps_three_latest_unprotected_archives():
    # Input is newest first, matching the database query used by the service.
    archived = [_version(number) for number in [5, 4, 3, 2, 1]]

    prunable = select_prunable_versions(archived, protected_ids=set())

    assert [item.version_number for item in prunable] == [2, 1]


def test_retention_never_prunes_pinned_or_application_protected_versions():
    archived = [_version(number) for number in [6, 5, 4, 3, 2, 1]]
    archived[-1].is_pinned = True
    protected_ids = {archived[-2].id}

    prunable = select_prunable_versions(archived, protected_ids=protected_ids)

    assert all(item.id not in protected_ids for item in prunable)
    assert all(not item.is_pinned for item in prunable)
    assert [item.version_number for item in prunable] == [3]


def test_version_comparison_reports_score_categories_and_skills():
    old = CVVersion(
        id=uuid.uuid4(),
        version_number=1,
        raw_file_name="old.pdf",
        source_type="pdf",
        content_hash="a" * 64,
        parsed_data={"skills_inventory": ["Python", "SQL"]},
        resume_quality_result={"overall_score": 70.0, "category_scores": {"impact": 60.0}},
        document_readiness_result={},
        scoring_engine_version="2.0.0-phase0",
        change_summary={},
        is_current=False,
        is_pinned=False,
    )
    new = CVVersion(
        id=uuid.uuid4(),
        version_number=2,
        raw_file_name="new.pdf",
        source_type="pdf",
        content_hash="b" * 64,
        parsed_data={"skills_inventory": ["Python", "Docker"]},
        resume_quality_result={"overall_score": 78.0, "category_scores": {"impact": 72.0}},
        document_readiness_result={},
        scoring_engine_version="2.0.0-phase0",
        change_summary={},
        is_current=True,
        is_pinned=False,
    )

    result = compare_versions(old, new)

    assert result["compatible_engine"] is True
    assert result["overall_score_delta"] == 8.0
    assert result["category_deltas"]["impact"] == 12.0
    assert result["skills_added"] == ["Docker"]
    assert result["skills_removed"] == ["SQL"]
