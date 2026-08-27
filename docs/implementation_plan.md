# Career Copilot — Architecture & Implementation Blueprint

## 1. System Architecture & Tech Stack

Career Copilot is an end-to-end multi-agent AI system built for job discovery, ATS readiness auditing, truthful resume tailoring, stateful mock interviews, and feasibility-verified career roadmaps.

```mermaid
graph TD
    Client([Next.js Frontend: Vercel Geist + RunRobRun Aesthetic]) <--> API[FastAPI Backend :8000]
    API <--> LLM[LLM Factory: Groq Primary / Lightning.ai Fallback]
    API <--> Embed[HuggingFace all-MiniLM-L6-v2 CPU Embeddings]
    API <--> DB[(PostgreSQL + pgvector)]
    API <--> Adzuna[Adzuna Dynamic Backfill 7-10 Jobs]
    API <--> Tavily[Tavily Live Web Search & Company Insights]
    API <--> ATS[Deterministic 100-Point ATS Engine]
```

### Core Technologies:
* **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, `uv` package manager.
* **LLM Engine:** Groq primary (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`) with automatic failover to Lightning.ai (`lightning-ai/gpt-oss-120b`) via LangChain `.with_fallbacks()`.
* **Embeddings:** Free local HuggingFace `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions, CPU-optimized for AWS Free Tier).
* **Database & Vector Store:** PostgreSQL 16 with `pgvector` extension.
* **Search & Intelligence:** Multi-source Egypt & MENA engine (RapidAPI JSearch for LinkedIn/Indeed, Wuzzuf & Bayt scrapers, and Tavily live search fallback) with auto-cached company intelligence.
* **Frontend:** Next.js 16 (App Router), React 19, TypeScript, TailwindCSS, Lucide Icons, Vercel Geist fonts, and `next-themes` (Light/Dark/System modes).

---

## 2. Multi-Agent Workflows & Critic Loops

### Agent 1: CV Ingestion & ATS Readiness Audit
* **Input:** Multipart file upload (PDF/DOCX) or raw text paste with live architectural scanning screen.
* **Single Active CV Policy:** Overwrites and purges previous files from storage and vector store upon new upload.
* **OCR Fallback:** `pytesseract` automatically processes scanned pages yielding $<50$ characters.
* **100-Point Deterministic ATS Engine:**
  1. *Contact & Section Hygiene (25 pts):* Verifies name, email, phone, location, LinkedIn/GitHub, and standard headers.
  2. *Action Verb Strength (25 pts):* Analyzes experience bullets for leading power verbs.
  3. *Quantifiable Impact (25 pts):* Measures percentages, currency, multipliers, and scale numbers.
  4. *Formatting & Skill Density (25 pts):* Evaluates word count, bullet density, and technical skill breadth.

### Agent 2: Multi-Source Egypt & MENA Job Discovery Engine
* **Concurrent Ingestion ($0 Cost):**
  * *Wuzzuf Scraper:* Direct HTML extraction of Egyptian technical roles.
  * *Bayt Scraper:* Direct HTML extraction of Egypt & Gulf opportunities.
  * *RapidAPI JSearch Client:* Queries live **LinkedIn** and **Indeed** listings (200 free monthly requests).
* **Universal Dynamic Backfill:** Tavily live web search queries `linkedin.com`, `wuzzuf.net`, and `bayt.com` if fewer than 7 jobs are collected, guaranteeing 7–10 distinct opportunities.
* **Cross-Source SHA-256 Deduplication:** Normalizes `sha256(company|title|location)` to discard duplicate postings across scrapers and APIs.

### Agent 3: Job Matching & Fit Ranking
* **3-Factor Weighted Formula:**
  $$\text{Total Match Score} = (0.50 \times \text{Skill Overlap}) + (0.30 \times \text{Vector Cosine}) + (0.20 \times \text{Experience Alignment})$$
* **Dynamic Re-sorting:** Orders search batches descending by total match percentage (`88% Match`, `75% Match`).

### Agent 4: Application Tailoring with Fact-Check Critic Loop
* **Full Resume Integrity:** Generates complete tailored CV preserving contact information, education, and certifications while tailoring professional summary, technical skills, and experience bullets. Generates targeted cover letters and 3-paragraph cold outreach emails.
* **Company Insights Integration:** Checks PostgreSQL first; auto-fetches via Tavily if absent and caches in DB.
* **Fact & Anti-Hallucination Critic Node:** Validates tailored bullets against original CV. Rejects unverified skills, degrees, or companies (up to 3 total attempts).
* **ATS Gap Delta:** Computes Before vs. After ATS match score.
* **Document Exports:** One-click downloads for Word (`.docx`) CV, Word (`.docx`) Cover Letter, Plain Text (`.txt`) Email, and Semantic HTML (`/export/html`).

### Agent 5: Stateful Mock Interview Simulator
* **Modes:**
  * *General:* Custom domain/field specification.
  * *Technical:* Probes technical depth and system design against selected Mini-CRM opportunities + active CV + company intelligence.
  * *Behavioral:* Evaluates candidate responses against the STAR framework in the context of target Mini-CRM job + active CV + company culture values.
* **State Machine:** Multi-turn conversation tracking with immediate per-turn micro-feedback.
* **Scorecard & Session Management:** Overall score (0–100), STAR rubric assessment, technical depth, strengths, areas for improvement, hiring recommendations, zero-turn conclusion handling, and prominent Exit Interview button.

### Agent 6: Career Roadmap Planner with Feasibility Critic
* **Input Gate:** Validates that Target Role, Timeframe, AND Weekly Study Hours are provided.
* **Real-time Market Trends:** Queries Tavily for in-demand technologies, frameworks, and certifications.
* **Workload Budgeting:** Allocates topics realistically based on total study hours ($Weeks \times Hours/Week$).
* **Feasibility Critic Node:** Verifies milestone sequencing and ensures workload volume is realistic for the hours budget (up to 3 attempts).

---

## 3. Database Schema Overview

```sql
-- 6 Core Relational Models with pgvector
users (id, email, hashed_password, preferences, created_at, updated_at)
user_profiles (id, user_id, raw_storage_key, raw_text, parsed_data, general_ats_score, embedding vector(384))
jobs (id, external_id, content_hash, source, title, company, location, salary_min, salary_max, description, company_insights, embedding vector(384))
applications (id, user_id, job_id, status, tailored_cv_data, cover_letter, cold_email, ats_score_before, ats_score_after, notes)
interview_sessions (id, user_id, job_id, interview_type, conversation_history, current_turn, total_turns, final_evaluation, is_completed)
career_roadmaps (id, user_id, target_role, timeframe, hours_per_week, milestones)
```

---

## 4. Verification & Testing

The complete test suite runs via `uv run pytest`:
* `test_job_content_hash_consistency`: **PASSED**
* `test_dynamic_backfill_pagination_mock`: **PASSED**
* `test_general_ats_score_high_quality_cv`: **PASSED**
* `test_general_ats_score_missing_contact_and_weak_verbs`: **PASSED**
* `test_job_specific_ats_match`: **PASSED**
* `test_sanitize_text`: **PASSED**
* `test_parse_plain_text_cv`: **PASSED**
* `test_real_cv_parsing_pdf`: **PASSED**
* `test_real_cv_parsing_docx`: **PASSED**
* `test_full_ats_audit_on_real_cv`: **PASSED**
