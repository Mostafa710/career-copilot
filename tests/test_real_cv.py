"""Test script to evaluate real CV files (PDF & DOCX) against the parsing and ATS engine."""

import os
import pytest
import asyncio
from backend.app.services.cv_parser import parse_cv_file
from backend.app.services.ats_engine import compute_general_ats_score
from backend.app.agents.cv_analysis_agent import cv_analysis_agent


def test_real_cv_parsing_pdf():
    pdf_path = os.path.join("CV Tests", "Mostafa Mamdouh - ITI.pdf")
    assert os.path.exists(pdf_path), "PDF file not found"

    with open(pdf_path, "rb") as f:
        content = f.read()

    text, used_ocr = parse_cv_file("Mostafa Mamdouh - ITI.pdf", content)

    print("\n--- PDF EXTRACTION RESULTS ---")
    print(f"Extracted Character Count: {len(text)}")
    print(f"Used OCR Fallback: {used_ocr}")
    print(f"First 300 Characters:\n{text[:300]}")

    assert len(text) > 100, "Text extraction returned too few characters"


def test_real_cv_parsing_docx():
    docx_path = os.path.join("CV Tests", "Mostafa Mamdouh - ITI.docx")
    assert os.path.exists(docx_path), "DOCX file not found"

    with open(docx_path, "rb") as f:
        content = f.read()

    text, used_ocr = parse_cv_file("Mostafa Mamdouh - ITI.docx", content)

    print("\n--- DOCX EXTRACTION RESULTS ---")
    print(f"Extracted Character Count: {len(text)}")
    print(f"Used OCR Fallback: {used_ocr}")
    print(f"First 300 Characters:\n{text[:300]}")

    assert len(text) > 100, "Text extraction returned too few characters"


@pytest.mark.asyncio
async def test_full_ats_audit_on_real_cv():
    pdf_path = os.path.join("CV Tests", "Mostafa Mamdouh - ITI.pdf")
    with open(pdf_path, "rb") as f:
        content = f.read()

    text, _ = parse_cv_file("Mostafa Mamdouh - ITI.pdf", content)

    # Run Structured Analysis & ATS Audit
    analysis_result = await cv_analysis_agent.analyze_cv(text)

    parsed = analysis_result["parsed_data"]
    ats = analysis_result["general_ats_score"]

    print("\n--- REAL CV STRUCTURED EXTRACTION ---")
    print(f"Candidate Name: {parsed.get('contact_info', {}).get('name')}")
    print(f"Email: {parsed.get('contact_info', {}).get('email')}")
    print(f"Skills Found ({len(parsed.get('skills_inventory', []))}): {parsed.get('skills_inventory', [])[:10]}...")
    print(f"Experience Bullets Extracted: {len(parsed.get('experience_bullets', []))}")

    print("\n--- 100-POINT GENERAL ATS SCORECARD ---")
    print(f"Overall ATS Score: {ats.get('overall_score')}/100")
    print("Category Breakdown (5 Standard Sub-Metrics):")
    for cat, score in ats.get("category_scores", {}).items():
        print(f"  - {cat}: {score}/100")

    print("\nActionable Feedback Checklist:")
    for item in ats.get("feedback_checklist", []):
        print(f"  * {item}")

    assert ats["overall_score"] > 0
