"""CV Analysis Agent: Extracts structured data from raw CV text and computes the General ATS score."""

import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, field_validator
from langchain_core.prompts import ChatPromptTemplate
from backend.app.core.llm_factory import get_llm, compute_text_embedding
from backend.app.services.ats_engine import compute_general_ats_score

logger = logging.getLogger(__name__)


class ContactInfo(BaseModel):
    name: Optional[str] = Field(None, description="Full candidate name")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    location: Optional[str] = Field(None, description="City, Country or Location")
    linkedin_url: Optional[str] = Field(None, description="LinkedIn profile URL")
    github_url: Optional[str] = Field(None, description="GitHub profile URL")
    portfolio_url: Optional[str] = Field(None, description="Portfolio or personal website URL")


class WorkExperienceItem(BaseModel):
    title: str = Field(..., description="Job title / role")
    company: str = Field(..., description="Company name")
    dates: Optional[str] = Field(None, description="Employment dates / duration")
    location: Optional[str] = Field(None, description="Job location")
    bullets: Optional[List[str]] = Field(default_factory=list, description="List of accomplishment bullet points")

    @field_validator("bullets", mode="before")
    @classmethod
    def convert_bullets_null(cls, v):
        return v if v is not None else []


class EducationItem(BaseModel):
    degree: str = Field(..., description="Degree or qualification name")
    institution: str = Field(..., description="University or institution name")
    year: Optional[str] = Field(None, description="Graduation year or date range")


class ParsedCVSchema(BaseModel):
    contact_info: ContactInfo
    professional_summary: Optional[str] = Field(None, description="Professional summary or bio")
    sections_present: Optional[List[str]] = Field(default_factory=list, description="Detected standard sections (e.g. Experience, Education, Skills, Projects)")
    experience: Optional[List[WorkExperienceItem]] = Field(default_factory=list, description="List of work experience entries")
    experience_bullets: Optional[List[str]] = Field(default_factory=list, description="Flat list of all individual experience bullet points")
    education: Optional[List[EducationItem]] = Field(default_factory=list, description="List of education entries")
    skills_inventory: Optional[List[str]] = Field(default_factory=list, description="All detected technical skills, tools, and frameworks")
    certifications: Optional[List[str]] = Field(default_factory=list, description="Certifications and licenses")

    @field_validator(
        "sections_present",
        "experience",
        "experience_bullets",
        "education",
        "skills_inventory",
        "certifications",
        mode="before"
    )
    @classmethod
    def convert_null_to_list(cls, v):
        return v if v is not None else []


EXTRACTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert ATS parser and resume analysis assistant.
Your task is to extract structured information from the provided raw resume/CV text into the strict JSON schema.
Extract all work experience bullet points verbatim, all technical skills, education, and contact details.
Do NOT invent or hallucinate any facts.
"""),
    ("human", "Raw Resume Text:\n\n{raw_text}")
])


class CVAnalysisAgent:
    def __init__(self):
        self.llm = get_llm(temperature=0.0)

    async def analyze_cv(self, raw_text: str) -> Dict[str, Any]:
        """
        Extracts structured data and computes the General ATS score.
        """
        try:
            # LLM Structured Extraction
            structured_llm = self.llm.with_structured_output(ParsedCVSchema)
            chain = EXTRACTION_PROMPT | structured_llm
            extracted: ParsedCVSchema = await chain.ainvoke({"raw_text": raw_text})
            parsed_data = extracted.model_dump()
        except Exception as e:
            logger.warning(f"Structured LLM extraction fallback to rule parsing: {e}")
            parsed_data = self._fallback_parse(raw_text)

        # Flatten experience bullets if not populated
        if not parsed_data.get("experience_bullets"):
            bullets = []
            for exp in parsed_data.get("experience", []):
                bullets.extend(exp.get("bullets", []))
            parsed_data["experience_bullets"] = bullets

        # Compute Deterministic 100-Point General ATS Readiness Score
        general_ats_score = compute_general_ats_score(parsed_data, raw_text)

        # Generate Profile Vector Embedding
        embedding_text = f"{parsed_data.get('professional_summary', '')} Skills: {', '.join(parsed_data.get('skills_inventory', []))} {' '.join(parsed_data.get('experience_bullets', []))}"
        embedding = compute_text_embedding(embedding_text)

        return {
            "parsed_data": parsed_data,
            "general_ats_score": general_ats_score,
            "embedding": embedding,
        }

    def _fallback_parse(self, raw_text: str) -> Dict[str, Any]:
        """Rule-based fallback parser extracting contacts, sections, bullets, and skills."""
        import re
        from backend.app.agents.job_matching import COMMON_TECH_KEYWORDS

        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        
        # Email & Phone Regex
        email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", raw_text)
        phone_match = re.search(r"(\+?\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4,6}", raw_text)
        linkedin_match = re.search(r"(https?://)?(www\.)?linkedin\.com/in/[\w\-]+", raw_text, re.IGNORECASE)
        github_match = re.search(r"(https?://)?(www\.)?github\.com/[\w\-]+", raw_text, re.IGNORECASE)

        # Bullets
        bullets = [l.lstrip("•-* ") for l in lines if l.startswith(("•", "-", "*", "1.", "2.", "3.", "4.", "5."))]
        if not bullets:
            bullets = [l for l in lines if len(l) > 30 and not l.isupper()][:20]

        # Extract skills from dictionary
        found_skills = []
        raw_lower = raw_text.lower()
        for skill in COMMON_TECH_KEYWORDS:
            pattern = r"\b" + re.escape(skill) + r"\b"
            if re.search(pattern, raw_lower):
                found_skills.append(skill.capitalize())

        # Detected Sections
        standard_sections = ["Experience", "Education", "Skills", "Projects", "Summary", "Certifications"]
        sections_present = [s for s in standard_sections if s.lower() in raw_lower]

        return {
            "contact_info": {
                "name": lines[0] if lines else "Candidate",
                "email": email_match.group(0) if email_match else None,
                "phone": phone_match.group(0) if phone_match else None,
                "linkedin_url": linkedin_match.group(0) if linkedin_match else None,
                "github_url": github_match.group(0) if github_match else None,
            },
            "professional_summary": lines[1] if len(lines) > 1 else "",
            "sections_present": sections_present,
            # Do not manufacture roles, employers, education, or default skills when
            # structured extraction is unavailable. Unknown facts must remain unknown.
            "experience": [],
            "experience_bullets": bullets,
            "education": [],
            "skills_inventory": found_skills,
            "certifications": [],
        }


cv_analysis_agent = CVAnalysisAgent()
