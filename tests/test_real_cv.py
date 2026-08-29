"""Test script to evaluate real CV files (PDF & DOCX) against the parsing and ATS engine."""

import os
import pytest
from backend.app.services.cv_parser import parse_cv_file
from backend.app.agents.cv_analysis_agent import cv_analysis_agent

PDF_PATH = os.path.join("CV Tests", "Mostafa Mamdouh - ITI.pdf")
DOCX_PATH = os.path.join("CV Tests", "Mostafa Mamdouh - ITI.docx")


@pytest.mark.skipif(not os.path.exists(PDF_PATH), reason="Local test PDF not present in repo")
def test_real_cv_parsing_pdf():
    with open(PDF_PATH, "rb") as f:
        content = f.read()

    text, used_ocr = parse_cv_file("Mostafa Mamdouh - ITI.pdf", content)

    print("\n--- PDF EXTRACTION RESULTS ---")
    print(f"Extracted Character Count: {len(text)}")
    print(f"Used OCR Fallback: {used_ocr}")
    print(f"First 300 Characters:\n{text[:300]}")

    assert len(text) > 100, "Text extraction returned too few characters"


@pytest.mark.skipif(not os.path.exists(DOCX_PATH), reason="Local test DOCX not present in repo")
def test_real_cv_parsing_docx():
    with open(DOCX_PATH, "rb") as f:
        content = f.read()

    text, used_ocr = parse_cv_file("Mostafa Mamdouh - ITI.docx", content)

    print("\n--- DOCX EXTRACTION RESULTS ---")
    print(f"Extracted Character Count: {len(text)}")
    print(f"Used OCR Fallback: {used_ocr}")
    print(f"First 300 Characters:\n{text[:300]}")

    assert len(text) > 100, "Text extraction returned too few characters"


@pytest.mark.asyncio
@pytest.mark.skipif(not os.path.exists(PDF_PATH), reason="Local test PDF not present in repo")
async def test_full_ats_audit_on_real_cv():
    with open(PDF_PATH, "rb") as f:
        content = f.read()

    text, _ = parse_cv_file("Mostafa Mamdouh - ITI.pdf", content)

    # Run Structured Analysis & ATS Audit
    analysis_result = await cv_analysis_agent.analyze_cv(text)

    parsed = analysis_result["parsed_data"]
    ats = analysis_result["general_ats_score"]

    print("\n--- REAL CV STRUCTURED EXTRACTION ---")
    print(f"Candidate Name: {parsed.get('contact_info', {}).get('name')}")
    print(f"General ATS Score: {ats.get('overall_score')}")

    assert parsed.get("contact_info", {}).get("name") is not None
    assert ats.get("overall_score") > 0
