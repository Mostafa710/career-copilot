"""Unit tests for CV parsing and text sanitization."""

from backend.app.services.cv_parser import sanitize_text, parse_cv_file


def test_sanitize_text():
    dirty_text = "Jane Doe \r\n\r\n\r\n  Software   Engineer   \n\n\n\nSkills: Python, SQL"
    clean = sanitize_text(dirty_text)
    assert "\r" not in clean
    assert "   " not in clean
    assert "Jane Doe\n\nSoftware Engineer\n\nSkills: Python, SQL" in clean


def test_parse_plain_text_cv():
    raw_content = b"John Smith\nEmail: john@example.com\nExperience: Senior Developer at Acme Corp"
    text, used_ocr = parse_cv_file("resume.txt", raw_content)
    assert "John Smith" in text
    assert "john@example.com" in text
    assert used_ocr is False
