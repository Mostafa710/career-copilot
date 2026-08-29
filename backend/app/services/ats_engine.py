"""
Standardized Dual-Mode ATS Scoring Engine.

Implements:
1. Feature 1: Standalone Resume Health & Parseability Score (5-Metric Weighted Model)
   S_standalone = (0.30 * S_parse) + (0.25 * S_impact) + (0.20 * S_quant) + (0.15 * S_hygiene) + (0.10 * S_brevity)

2. Feature 2: Job Description (JD) Target Match Score (5-Factor Multi-Factor Model)
   S_match = (0.40 * S_hard_skills) + (0.25 * S_semantic_nlp) + (0.15 * S_title_align) + (0.10 * S_exp_years) + (0.10 * S_soft_skills)
"""

import math
import re
from typing import Dict, Any, List, Optional, Set, Tuple


SCORING_ENGINE_VERSION = "2.0.0-phase0"
MATCH_FACTOR_WEIGHTS: Dict[str, float] = {
    "hard_skills": 0.40,
    "semantic_nlp": 0.25,
    "title_alignment": 0.15,
    "experience_years": 0.10,
    "soft_skills": 0.10,
}

# ------------------------------------------------------------------------------
# 1. DICTIONARIES & TAXONOMIES
# ------------------------------------------------------------------------------

# Tier-1 Action Verbs
STRONG_ACTION_VERBS = {
    "accelerated", "accomplished", "achieved", "acquired", "adapted", "administered",
    "advised", "analyzed", "architected", "assembled", "authored", "automated",
    "boosted", "built", "calculated", "centralized", "championed", "collaborated",
    "composed", "conceptualized", "conducted", "consolidated", "constructed",
    "converted", "coordinated", "created", "customized", "debugged", "decreased",
    "delegated", "delivered", "deployed", "designed", "developed", "devised",
    "diagnosed", "directed", "discovered", "documented", "doubled", "drafted",
    "eliminated", "enabled", "engineered", "enhanced", "established", "estimated",
    "evaluated", "executed", "expanded", "expedited", "fabricated", "facilitated",
    "forecasted", "formulated", "generated", "guided", "halted", "headed",
    "identified", "implemented", "improved", "increased", "initiated", "innovated",
    "installed", "instituted", "integrated", "introduced", "invented", "investigated",
    "launched", "lead", "led", "managed", "maximized", "mentored", "migrated",
    "minimized", "modernized", "negotiated", "optimized", "orchestrated", "organized",
    "originated", "overhauled", "oversaw", "partnered", "performed", "pioneered",
    "planned", "prepared", "produced", "programmed", "promoted", "proposed",
    "published", "re-engineered", "rebuilt", "reconciled", "redesigned", "reduced",
    "refactored", "refined", "remodeled", "reorganized", "replaced", "resolved",
    "restructured", "revamped", "reviewed", "revised", "scaled", "scheduled",
    "secured", "simplified", "spearheaded", "standardized", "streamlined",
    "strengthened", "structured", "succeeded", "supervised", "surpassed", "synthesized",
    "trained", "transformed", "transitioned", "translated", "tripled", "troubleshot",
    "unified", "upgraded", "utilized", "validated", "verified", "yielded",
}

# Weak / Passive Starter Phrases to Penalize (-5 pts each)
PASSIVE_STARTER_PHRASES = [
    "responsible for", "worked on", "helped with", "assisted in", "tasked with",
    "duties included", "handled", "participated in", "involved in",
]

# Cliché & Filler Buzzwords to Penalize (-3 pts each, max -15 pts)
CLICHE_BUZZWORDS = [
    "team player", "thought leader", "out of the box", "hardworking", "hard worker",
    "detail-oriented", "results-driven", "self-starter", "dynamic", "synergy",
    "work ethic", "go-getter", "fast learner", "ninja", "rockstar", "guru", "wizard",
]

# Regex for Quantifiable Metrics and Numbers
QUANT_METRIC_REGEX = re.compile(
    r"(\b\d+(\.\d+)?%|\$[\d,]+(\.\d+)?[kMB]?|\b\d+(\.\d+)?(x|X)\b|\b\d+\+?\s*[kKmMbB]\b|\b\d+\+?\s*(users|clients|requests|transactions|tps|ms|seconds|hours|days|weeks|months|years|members|teams|projects)\b|\b(reduced|increased|grew|saved|improved|boosted|scaled)\s+(by\s+)?\d+)",
    re.IGNORECASE,
)

# Tech Synonym & Alias Mapping (Maps aliases to canonical terms)
TECH_SYNONYMS: Dict[str, str] = {
    "reactjs": "react",
    "react.js": "react",
    "react native": "react native",
    "k8s": "kubernetes",
    "postgres": "postgresql",
    "psql": "postgresql",
    "amazon web services": "aws",
    "google cloud platform": "gcp",
    "google cloud": "gcp",
    "microsoft azure": "azure",
    "ts": "typescript",
    "js": "javascript",
    "node": "node.js",
    "nodejs": "node.js",
    "mongo": "mongodb",
    "tf": "tensorflow",
    "pytorch": "pytorch",
    "llms": "llm",
    "large language models": "llm",
    "generative ai": "genai",
    "ci/cd": "cicd",
    "ci-cd": "cicd",
    "rest": "rest api",
    "restful": "rest api",
    "rest apis": "rest api",
    "graphql": "graphql",
    "golang": "go",
    "nextjs": "next.js",
    "vuejs": "vue.js",
    "vue": "vue.js",
    "springboot": "spring boot",
}

# Parent/Child Skill Taxonomies for Partial Credit (75% credit)
PARENT_CHILD_SKILLS: Dict[str, Set[str]] = {
    "machine learning": {"pytorch", "tensorflow", "scikit-learn", "keras", "xgboost", "pandas", "numpy", "lightgbm"},
    "deep learning": {"pytorch", "tensorflow", "keras", "cuda", "transformers", "cnn", "rnn", "lstm"},
    "generative ai": {"langchain", "langgraph", "llamaindex", "huggingface", "rag", "fine-tuning", "prompt engineering", "openai", "claude", "gemini", "mistral", "groq"},
    "cloud computing": {"aws", "gcp", "azure", "docker", "kubernetes", "terraform", "cloudformation", "serverless"},
    "devops": {"docker", "kubernetes", "cicd", "github actions", "terraform", "ansible", "jenkins", "argocd"},
    "backend development": {"fastapi", "django", "flask", "node.js", "express", "spring boot", "postgresql", "sql", "redis"},
    "frontend development": {"react", "next.js", "vue.js", "angular", "tailwind", "typescript", "javascript", "html", "css"},
    "database": {"postgresql", "mysql", "mongodb", "redis", "elasticsearch", "supabase", "sqlite", "dynamodb"},
    "data science": {"pandas", "numpy", "scipy", "matplotlib", "seaborn", "tableau", "power bi", "sql"},
}

# Soft Skills and Core Competencies Taxonomy
SOFT_SKILLS_TAXONOMY: Set[str] = {
    "cross-functional collaboration", "collaboration", "agile mindset", "agile", "scrum",
    "stakeholder management", "stakeholder communication", "problem-solving", "critical thinking",
    "communication", "verbal communication", "written communication", "leadership", "mentorship",
    "teamwork", "time management", "adaptability", "ownership", "conflict resolution",
    "project management", "decision making", "analytical thinking",
}


def map_rating_tier(score: float) -> str:
    """Universal ATS candidate tier classifications."""
    if score >= 85.0:
        return "Excellent"
    elif score >= 70.0:
        return "Good"
    elif score >= 55.0:
        return "Average"
    else:
        return "Poor"


# ------------------------------------------------------------------------------
# 2. FEATURE 1: STANDALONE RESUME HEALTH SCORE (NO JOB DESCRIPTION)
# ------------------------------------------------------------------------------

def compute_general_ats_score(parsed_cv: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
    """
    Computes the standardized 5-Metric Standalone Resume Health & Parseability Score.

    Formula:
        S_standalone = (0.30 * S_parse) + (0.25 * S_impact) + (0.20 * S_quant) + (0.15 * S_hygiene) + (0.10 * S_brevity)
    """
    feedback: List[str] = []
    formatting_flags: List[Dict[str, str]] = []

    contact_info = parsed_cv.get("contact_info", {})
    sections = parsed_cv.get("sections_present", [])
    bullets = parsed_cv.get("experience_bullets", [])
    skills = parsed_cv.get("skills_inventory", [])
    total_bullets = len(bullets) if bullets else 0

    # ----------------------------------------------------
    # Sub-Metric 1: Parseability & Structural Integrity (Weight: 30%)
    # ----------------------------------------------------
    s_parse = 100.0

    # Canonical section verification (-10 pts per missing core section)
    core_sections = ["experience", "education", "skills"]
    missing_sections = []
    for sec in core_sections:
        if not any(sec in s.lower() for s in sections):
            missing_sections.append(sec.capitalize())
            s_parse -= 10.0

    if missing_sections:
        feedback.append(f"Ensure standard section headers are present: missing {', '.join(missing_sections)}.")

    # Multi-column / Layout Scramble Check (Heuristic on line continuity / token layout)
    scrambled_tables = parsed_cv.get("formatting_flags", {}).get("has_tables", False)
    if scrambled_tables:
        s_parse -= 20.0
        formatting_flags.append({
            "type": "WARNING",
            "message": "Multi-column layout or table elements detected; high risk of text scramble in legacy ATS parsers."
        })

    # Text extraction success ratio
    word_count = len(raw_text.split())
    if word_count < 100:
        s_parse -= 20.0
        feedback.append("Low text extraction volume detected. Ensure the document is not an image scan.")

    s_parse = min(100.0, max(0.0, s_parse))

    # ----------------------------------------------------
    # Sub-Metric 2: Action Language & NLP Impact (Weight: 25%)
    # ----------------------------------------------------
    strong_verb_count = 0
    passive_starter_count = 0

    for bullet in bullets:
        cleaned_bullet = bullet.strip().lower()
        words = re.findall(r"\b[a-zA-Z\-]+\b", cleaned_bullet)
        
        # Check active verb
        if words and words[0] in STRONG_ACTION_VERBS:
            strong_verb_count += 1

        # Check weak/passive starter phrases
        if any(cleaned_bullet.startswith(p) for p in PASSIVE_STARTER_PHRASES):
            passive_starter_count += 1

    # Base verb score
    s_verb = (strong_verb_count / total_bullets * 100.0) if total_bullets > 0 else 50.0

    # Passive starter penalty (-5 pts per instance)
    passive_penalties = passive_starter_count * 5.0

    # Cliché & Buzzword penalty (-3 pts per occurrence, max 15 pts)
    buzzwords_found = []
    raw_lower = raw_text.lower()
    for bw in CLICHE_BUZZWORDS:
        count = raw_lower.count(bw)
        if count > 0:
            buzzwords_found.extend([bw] * count)

    buzzword_penalties = min(15.0, len(buzzwords_found) * 3.0)

    s_impact = min(100.0, max(0.0, s_verb - passive_penalties - buzzword_penalties))

    if total_bullets > 0 and (strong_verb_count / total_bullets) < 0.7:
        feedback.append(f"{total_bullets - strong_verb_count} of your {total_bullets} experience bullets could start with stronger action verbs (e.g., 'Architected', 'Spearheaded', 'Optimized').")

    if passive_starter_count > 0:
        feedback.append(f"Remove passive starter phrases ({passive_starter_count} detected, e.g., 'Responsible for...', 'Worked on...').")

    if buzzwords_found:
        unique_bw = sorted(list(set(buzzwords_found)))
        feedback.append(f"Replace generic buzzwords ({', '.join(unique_bw[:3])}) with concrete demonstrations of technical impact.")

    # ----------------------------------------------------
    # Sub-Metric 3: Quantification Density (Weight: 20%)
    # ----------------------------------------------------
    metric_bullet_count = 0
    for bullet in bullets:
        if QUANT_METRIC_REGEX.search(bullet):
            metric_bullet_count += 1

    quant_ratio = (metric_bullet_count / total_bullets) if total_bullets > 0 else 0.0

    if quant_ratio >= 0.40:
        s_quant = 100.0
    elif quant_ratio >= 0.30:
        s_quant = 85.0
    elif quant_ratio >= 0.20:
        s_quant = 70.0
    elif quant_ratio >= 0.10:
        s_quant = 50.0
    else:
        s_quant = 25.0

    if quant_ratio < 0.40:
        feedback.append(f"Quantify more achievements with numbers, percentages, scale, or dollar metrics ({metric_bullet_count}/{total_bullets} bullets currently quantified).")

    # ----------------------------------------------------
    # Sub-Metric 4: Contact & Essential Hygiene (Weight: 15%)
    # ----------------------------------------------------
    s_hygiene = 0.0

    if contact_info.get("email"):
        s_hygiene += 25.0
    else:
        feedback.append("Missing or unparsed email address.")

    if contact_info.get("phone"):
        s_hygiene += 25.0
    else:
        feedback.append("Missing or unparsed phone number.")

    if contact_info.get("location") or contact_info.get("address"):
        s_hygiene += 25.0
    else:
        feedback.append("Include target city/location for geographic filtering.")

    if contact_info.get("linkedin_url") or contact_info.get("github_url") or contact_info.get("portfolio_url"):
        s_hygiene += 25.0
    else:
        feedback.append("Include links to your professional profile (LinkedIn, GitHub, or Portfolio).")

    # Header / Footer area penalty check
    if contact_info.get("in_header_footer"):
        s_hygiene = max(0.0, s_hygiene - 10.0)
        formatting_flags.append({
            "type": "WARNING",
            "message": "Contact info appears located inside header/footer margins; older ATS systems may strip these sections."
        })

    # ----------------------------------------------------
    # Sub-Metric 5: Brevity, Length & Formatting (Weight: 10%)
    # ----------------------------------------------------
    # Word count evaluation
    if 350 <= word_count <= 800:
        s_word = 100.0
    elif 801 <= word_count <= 1400:
        s_word = 90.0
    elif word_count < 350:
        s_word = 60.0
        feedback.append(f"Resume is brief ({word_count} words). Aim for 350-800 words with detailed project scope.")
    else:
        s_word = 50.0
        feedback.append(f"Resume is lengthy ({word_count} words). Aim for a concise 1-2 page document under 1400 words.")

    # Bullet length evaluation (12 - 28 words optimal)
    bullet_penalties = 0.0
    long_bullets = 0
    fragment_bullets = 0

    for bullet in bullets:
        b_len = len(bullet.split())
        if b_len > 45:
            bullet_penalties += 5.0
            long_bullets += 1
        elif b_len < 5 and b_len > 0:
            bullet_penalties += 3.0
            fragment_bullets += 1

    s_brevity = min(100.0, max(0.0, s_word - bullet_penalties))

    if long_bullets > 0:
        feedback.append(f"{long_bullets} bullet points exceed 45 words. Break paragraph bullets into concise single-idea points.")

    # ----------------------------------------------------
    # Composite Standalone Score Calculation
    # ----------------------------------------------------
    composite_score = round(
        (0.30 * s_parse) +
        (0.25 * s_impact) +
        (0.20 * s_quant) +
        (0.15 * s_hygiene) +
        (0.10 * s_brevity),
        1
    )
    composite_score = min(100.0, max(0.0, composite_score))
    rating_tier = map_rating_tier(composite_score)

    return {
        "mode": "STANDALONE_HEALTH_SCORE",
        "scoring_engine_version": SCORING_ENGINE_VERSION,
        "overall_score": composite_score,
        "rating_tier": rating_tier,
        "category_scores": {
            "parseability": round(s_parse, 1),
            "action_impact": round(s_impact, 1),
            "quantification": round(s_quant, 1),
            "contact_hygiene": round(s_hygiene, 1),
            "brevity_formatting": round(s_brevity, 1),
        },
        "strong_verb_bullets": f"{strong_verb_count}/{total_bullets}",
        "metric_backed_bullets": f"{metric_bullet_count}/{total_bullets}",
        "total_words": word_count,
        "skills_detected_count": len(skills),
        "formatting_flags": formatting_flags,
        "feedback_checklist": feedback,
        "actionable_recommendations": feedback[:5],
    }


# ------------------------------------------------------------------------------
# 3. FEATURE 2: JOB DESCRIPTION (JD) TARGET MATCH SCORE
# ------------------------------------------------------------------------------

def _normalize_skill(skill: str) -> str:
    """Normalizes skill text and maps known tech aliases."""
    s = skill.lower().strip()
    s = re.sub(r"[^\w\s\.\#\+\-]", "", s)
    return TECH_SYNONYMS.get(s, s)


def _skill_in_text(skill: str, text: str) -> bool:
    """Check if skill token exists in text with word boundaries."""
    if not skill or not text:
        return False
    pattern = r"(?:\b|\s)" + re.escape(skill) + r"(?:\b|\s)"
    return bool(re.search(pattern, text, re.IGNORECASE))


def _compute_cosine_sim(v1: Optional[List[float]], v2: Optional[List[float]]) -> Optional[float]:
    """Computes cosine similarity, or returns None when either vector is unavailable."""
    if not v1 or not v2 or len(v1) != len(v2):
        return None
    dot = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


def _compute_ngram_sparse_score(cv_text: str, jd_text: str) -> Optional[float]:
    """Computes deterministic unique-token overlap for the available CV and JD text."""
    if not cv_text or not jd_text:
        return None

    cv_words = set(re.findall(r"\b[a-zA-Z0-9\.\+#]+\b", cv_text.lower()))
    jd_words = set(re.findall(r"\b[a-zA-Z0-9\.\+#]+\b", jd_text.lower()))

    # Stopwords filter
    stopwords = {"and", "or", "the", "in", "to", "for", "with", "a", "an", "is", "of", "as", "by", "on", "at", "be", "this", "that", "you", "we", "our", "are"}
    cv_clean = cv_words - stopwords
    jd_clean = jd_words - stopwords

    if not jd_clean:
        return None

    overlap = cv_clean.intersection(jd_clean)
    return max(0.0, min(1.0, len(overlap) / len(jd_clean)))


def compute_job_specific_ats_match(
    cv_skills: List[str],
    job_required_skills: List[str],
    cv_bullets: List[str],
    job_description: str,
    cv_embedding: Optional[List[float]] = None,
    job_embedding: Optional[List[float]] = None,
    cv_experience: Optional[List[Dict[str, Any]]] = None,
    target_job_title: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes the standardized 5-Factor Job Description Target Match Score.

    Formula:
        S_match = (0.40 * S_hard_skills) + (0.25 * S_semantic_nlp) + (0.15 * S_title_align) + (0.10 * S_exp_years) + (0.10 * S_soft_skills)
    """
    jd_lower = job_description.lower() if job_description else ""
    cv_full_text = " ".join(cv_skills) + " " + " ".join(cv_bullets)
    cv_full_lower = cv_full_text.lower()

    norm_cv_map = {_normalize_skill(s): s for s in cv_skills if s}
    norm_cv_skills = set(norm_cv_map.keys())
    norm_job_skills = [_normalize_skill(s) for s in job_required_skills if s]

    # ----------------------------------------------------
    # Sub-Metric A: Hard Skills & Technical Keywords (Weight: 40%)
    # ----------------------------------------------------
    total_jd_skill_weight = 0.0
    matched_skill_weight = 0.0
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    synonym_matches: List[Dict[str, str]] = []

    for raw_s in norm_job_skills:
        s = _normalize_skill(raw_s)
        
        # Skill weighting: Required/Must-have (3.0), Responsibilities (2.0), Preferred (1.5)
        if f"must have {s}" in jd_lower or f"required: {s}" in jd_lower or f"requirement: {s}" in jd_lower or f"expert in {s}" in jd_lower:
            weight = 3.0
        elif f"nice to have {s}" in jd_lower or f"preferred {s}" in jd_lower or f"bonus: {s}" in jd_lower:
            weight = 1.5
        else:
            weight = 2.0

        total_jd_skill_weight += weight

        # 1. Exact or Direct Synonym Match (100% Credit)
        if s in norm_cv_skills or _skill_in_text(s, cv_full_lower) or _skill_in_text(raw_s, cv_full_lower):
            matched_skill_weight += weight
            matched_skills.append(raw_s)
            orig_cv = norm_cv_map.get(s, s)
            if orig_cv.lower() != raw_s.lower() or s != raw_s:
                synonym_matches.append({"resume_term": orig_cv, "jd_term": raw_s})
            continue

        # 2. Parent / Child Partial Match (75% Credit)
        parent_matched = False
        for parent, children in PARENT_CHILD_SKILLS.items():
            if s == parent and any(c in norm_cv_skills or _skill_in_text(c, cv_full_lower) for c in children):
                matched_skill_weight += (weight * 0.75)
                matched_skills.append(f"{raw_s} (via stack)")
                parent_matched = True
                break
            elif s in children and (parent in norm_cv_skills or _skill_in_text(parent, cv_full_lower)):
                matched_skill_weight += (weight * 0.75)
                matched_skills.append(f"{raw_s} (via {parent})")
                parent_matched = True
                break

        if not parent_matched:
            missing_skills.append(raw_s)

    s_hard_skills: Optional[float] = None
    if total_jd_skill_weight > 0:
        s_hard_skills = min(100.0, max(0.0, matched_skill_weight / total_jd_skill_weight * 100.0))

    # ----------------------------------------------------
    # Sub-Metric B: Semantic Similarity via NLP (Weight: 25%)
    # ----------------------------------------------------
    cos_sim = _compute_cosine_sim(cv_embedding, job_embedding)
    sparse_sim = _compute_ngram_sparse_score(cv_full_text, job_description)
    s_semantic_nlp: Optional[float] = None
    if cos_sim is not None and sparse_sim is not None:
        s_semantic_nlp = (0.70 * cos_sim * 100.0) + (0.30 * sparse_sim * 100.0)
    elif cos_sim is not None:
        s_semantic_nlp = cos_sim * 100.0
    elif sparse_sim is not None:
        s_semantic_nlp = sparse_sim * 100.0
    if s_semantic_nlp is not None:
        s_semantic_nlp = min(100.0, max(0.0, round(s_semantic_nlp, 1)))

    # ----------------------------------------------------
    # Sub-Metric C: Job Title & Seniority Alignment (Weight: 15%)
    # ----------------------------------------------------
    s_title_align: Optional[float] = None
    candidate_titles = []
    if cv_experience:
        for exp in cv_experience:
            t = exp.get("role") or exp.get("title")
            if t:
                candidate_titles.append(t.lower())

    if target_job_title and candidate_titles:
        target_t = target_job_title.lower()
        if any(target_t == ct for ct in candidate_titles):
            s_title_align = 100.0  # Exact Title Match
        elif any(
            ("developer" in target_t and "engineer" in ct) or
            ("engineer" in target_t and "developer" in ct) or
            ("ai" in target_t and "machine learning" in ct) or
            ("data scientist" in target_t and "machine learning" in ct)
            for ct in candidate_titles
        ):
            s_title_align = 90.0  # Equivalent Title Match
        elif "senior" in target_t or "lead" in target_t or "principal" in target_t:
            if any("senior" in ct or "lead" in ct for ct in candidate_titles):
                s_title_align = 95.0
            else:
                s_title_align = 60.0  # Seniority mismatch
        else:
            s_title_align = 80.0

    # ----------------------------------------------------
    # Sub-Metric D: Experience Years & Recency (Weight: 10%)
    # ----------------------------------------------------
    # Extract required years from JD (e.g., "3+ years", "5 years of experience")
    req_years_match = re.search(r"\b(\d+)\+?\s*(?:-\s*\d+\s*)?(?:years?|yrs?)\b", jd_lower)
    required_years = int(req_years_match.group(1)) if req_years_match else None

    # Phase 0 deliberately leaves this factor unavailable until employment dates
    # are normalized into a real, overlap-aware timeline. Position count is not years.
    candidate_total_years: Optional[float] = None
    s_exp_years: Optional[float] = None

    # ----------------------------------------------------
    # Sub-Metric E: Soft Skills & Competencies (Weight: 10%)
    # ----------------------------------------------------
    jd_soft_skills = [ss for ss in SOFT_SKILLS_TAXONOMY if ss in jd_lower]
    matched_soft = []
    for ss in jd_soft_skills:
        if ss in cv_full_lower:
            matched_soft.append(ss)
            continue
        # Stem and component token matching (e.g. 'solve' matches 'solving', 'collaborated' matches 'collaboration')
        parts = ss.replace("-", " ").split()
        if all(any(p[:4] in token for token in cv_full_lower.split()) for p in parts):
            matched_soft.append(ss)

    s_soft_skills: Optional[float] = None
    if jd_soft_skills:
        s_soft_skills = min(100.0, max(0.0, len(matched_soft) / len(jd_soft_skills) * 100.0))

    # ----------------------------------------------------
    # Composite JD Target Match Score Calculation
    # ----------------------------------------------------
    factor_scores: Dict[str, Optional[float]] = {
        "hard_skills": s_hard_skills,
        "semantic_nlp": s_semantic_nlp,
        "title_alignment": s_title_align,
        "experience_years": s_exp_years,
        "soft_skills": s_soft_skills,
    }
    available_weight = sum(
        MATCH_FACTOR_WEIGHTS[name]
        for name, score in factor_scores.items()
        if score is not None
    )
    if available_weight > 0:
        composite_match: Optional[float] = round(
            sum(
                MATCH_FACTOR_WEIGHTS[name] * score
                for name, score in factor_scores.items()
                if score is not None
            ) / available_weight,
            1,
        )
        composite_match = min(100.0, max(0.0, composite_match))
        rating_tier = map_rating_tier(composite_match)
    else:
        composite_match = None
        rating_tier = "Unavailable"

    factor_availability = {
        "hard_skills": {
            "available": s_hard_skills is not None,
            "reason": None if s_hard_skills is not None else "No structured JD skills were extracted.",
        },
        "semantic_nlp": {
            "available": s_semantic_nlp is not None,
            "reason": None if s_semantic_nlp is not None else "CV or JD semantic text was unavailable.",
        },
        "title_alignment": {
            "available": s_title_align is not None,
            "reason": None if s_title_align is not None else "Candidate or target titles were unavailable.",
        },
        "experience_years": {
            "available": False,
            "reason": (
                "The JD does not state a required number of years."
                if required_years is None
                else "Candidate employment dates have not been normalized into a reliable timeline."
            ),
        },
        "soft_skills": {
            "available": s_soft_skills is not None,
            "reason": None if s_soft_skills is not None else "The JD did not state a recognized soft-skill requirement.",
        },
    }

    effective_weights = {
        name: round(MATCH_FACTOR_WEIGHTS[name] / available_weight, 4) if score is not None and available_weight else 0.0
        for name, score in factor_scores.items()
    }
    if available_weight >= 0.80 and cos_sim is not None:
        score_confidence = "High"
    elif available_weight >= 0.50:
        score_confidence = "Medium"
    else:
        score_confidence = "Low"

    actionable_recs = []
    if missing_skills:
        actionable_recs.append(f"Add critical missing technical skills to your CV: {', '.join(missing_skills[:4])}.")
    if s_semantic_nlp is not None and s_semantic_nlp < 70:
        actionable_recs.append("Incorporate more domain terminology and core verbs from the Job Description into your summary and project bullets.")
    if s_hard_skills is not None and s_hard_skills < 75:
        actionable_recs.append("Highlight hands-on tools and libraries that match required stack components.")
    if s_hard_skills is None:
        actionable_recs.append("The JD's technical requirements could not be extracted reliably; review them before trusting this match estimate.")

    return {
        "mode": "MATCH_SCORE",
        "scoring_engine_version": SCORING_ENGINE_VERSION,
        "score_available": composite_match is not None,
        "score_confidence": score_confidence,
        "available_weight": round(available_weight, 2),
        "match_score": composite_match,
        "overall_score": composite_match,
        "rating_tier": rating_tier,
        "match_level": rating_tier,
        "sub_scores": {
            "hard_skills": round(s_hard_skills, 1) if s_hard_skills is not None else None,
            "semantic_nlp": round(s_semantic_nlp, 1) if s_semantic_nlp is not None else None,
            "title_alignment": round(s_title_align, 1) if s_title_align is not None else None,
            "experience_years": round(s_exp_years, 1) if s_exp_years is not None else None,
            "soft_skills": round(s_soft_skills, 1) if s_soft_skills is not None else None,
        },
        "factor_availability": factor_availability,
        "effective_weights": effective_weights,
        "semantic_components": {
            "cosine_similarity": round(cos_sim * 100.0, 1) if cos_sim is not None else None,
            "token_overlap": round(sparse_sim * 100.0, 1) if sparse_sim is not None else None,
        },
        "experience_analysis": {
            "required_years": required_years,
            "candidate_total_years": candidate_total_years,
        },
        "keyword_analysis": {
            "matched_skills": sorted(list(set(matched_skills))),
            "missing_skills": sorted(list(set(missing_skills))),
            "synonym_matches": synonym_matches,
        },
        "matched_skills": sorted(list(set(matched_skills))),
        "missing_skills": sorted(list(set(missing_skills))),
        "actionable_recommendations": actionable_recs,
    }
