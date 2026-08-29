# Career Copilot — Upgrade Version Plan

## 1. Purpose

This document defines the next major Career Copilot upgrade. The upgrade will make the product more truthful, explainable, interactive, and useful throughout the user's job-search journey.

The upgrade covers:

1. CV version history and progress tracking.
2. More reliable and evidence-aware ATS scoring.
3. Separation of CV evidence from broader candidate ability.
4. A diff-based Application Tailoring Studio.
5. A guided, document-centered user experience.
6. Stronger Fact Critic safety and score transparency.
7. Evaluation, calibration, migration, and rollout requirements.

This is an architecture and implementation plan. The weights and thresholds described below remain provisional until calibrated against representative CVs, job descriptions, and human reviews.

### Implementation status — current working version

Implemented in the first upgrade slice:

- Phase 0 truthfulness fixes: no fabricated parser fallback facts.
- Missing JD skills, embeddings, titles, dates, and soft-skill requirements are reported transparently instead of receiving favorable defaults.
- Match results now include factor availability, effective weights, confidence, semantic-component details, and scoring-engine version.
- Tailoring reports the real after-score, including regressions.
- Fact Critic scope now includes highlighted skills and outreach email; exhausted failures are blocked by the API.
- Immutable CV version storage with one current version and three normal archived versions.
- Application-referenced and pinned versions are protected from rolling retention.
- Legacy active profiles are migrated to Version 1 during database initialization.
- Version list, detail, compare, activate, and guarded-delete API capabilities.
- Applications record their exact source CV version and an immutable evidence snapshot.
- File selection now requires an explicit `Analyze & improve my CV` action.
- The CV page displays a first version-history timeline with scores and deltas.
- Regression tests cover scoring safety, critic safety, retention, protection, and version comparison.

Implemented in the second upgrade slice:

- The CV Audit now begins with an explicit choice between `Specific job` and `General CV`.
- Specific-job review requires the active CV, a target role, and the full job description; it returns the transparent five-factor JD match estimate and its confidence.
- General review is retained but is explicitly labeled as document health rather than a vacancy or employer-ATS score.
- Added `POST /cv/review` with general and targeted modes and optional version selection.
- Every actionable review suggestion includes the exact source CV text or missing-evidence statement, a correction/action, rationale, section, and confirmation requirement.
- The CV interface now presents original/missing evidence in red and suggested text in green, with Edit, Accept into draft, Ignore, Copy, and Copy accepted corrections actions.
- Weak passive bullet openings receive fact-preserving rewrites. Missing metrics keep a visible verified-evidence placeholder instead of receiving invented numbers.
- Foundational JD concepts such as linear algebra, statistics, probability, machine learning, and data science are now extracted. If they are not evidenced in the CV, the user is asked to confirm and locate real evidence; the skills are never inserted automatically.
- Added an individual-job quality gate for primary job sources and Tavily backfill. Aggregate result pages, generic companies, thin descriptions, invalid links, and search/category URLs are rejected before ranking or persistence.
- The job screen now states that only individual openings are accepted, labels verified postings, and explains why the result count may be empty rather than padded with misleading links.
- Roadmap chat now receives the parsed CV profile, including current roles and skills.
- Job-search and relocation goals no longer enter the learning-hours gate. A request such as `I want a job in UAE` uses the CV to infer a relevant role, asks when the user wants to apply, then asks only the next relocation or sponsorship question.
- Roadmap responses can return suggested reply chips so the conversation feels guided without forcing one fixed form.
- Added a public product landing page with hero, connected feature overview, how-it-works flow, audience section, truth/safety explanation, FAQ, final CTA, and sign-in/sign-up entry points.
- The landing page deliberately omits pricing, testimonials, and “loved by applicants” sections.
- Introduced the Finpay-inspired teal/mint/ivory visual direction: deep ink `#102A2A`, primary teal `#176B61`, interactive teal `#23877A`, soft mint `#DDF2EA`, pale aqua `#EDF8F5`, warm ivory `#FAFAF6`, lime `#CDEB8B`, and border `#D9E5E1`.
- Sign-in, sign-up, and sign-out are all connected to the existing authenticated workspace behavior.
- Added regression tests for safe source-linked corrections, foundational-skill confirmation, aggregate-job rejection, verified-job acceptance, and CV-aware UAE job-search follow-up behavior.

Second-slice verification:

- Focused upgraded-module regression run — 20 passed, including targeted CV review, MENA job aggregation and quality filtering, roadmap adaptation, scoring safety, critic safety, and CV versioning.
- Full repository run — 22 passed; the only three failures require the absent local fixture files `CV Tests/Mostafa Mamdouh - ITI.pdf` and `.docx`.
- `npx tsc --noEmit` — passed.
- The Next.js production build reached application compilation but could not fetch the existing Google-hosted Geist fonts because outbound font access is unavailable in the current environment.

Still planned:

- Full structured document-layout analysis and separate Document Readiness/Resume Quality models.
- Normalized employment timelines and experience recency.
- Structured JD requirement extraction, expanded ontologies, and real persisted JD embeddings.
- Separate JD Evidence Match and Candidate Potential Fit.
- Persisted structured patch generation, applying accepted changes back into a complete CV, and the full three-column document workspace. The current release provides source-linked semantic diff cards and a copyable review draft.
- Human calibration dataset, confidence ranges, and role-family calibration.
- Pixel-level PDF/DOCX highlighting and advanced responsive review interactions.

---

## 2. Product Principles

The upgraded system must follow these principles:

- Never invent candidate facts, including in fallback behavior.
- Never add a skill to a CV without evidence or explicit user confirmation.
- Explain every score, warning, and suggested change.
- Distinguish what the CV proves from what the candidate may know.
- Treat scores as estimates, not guarantees of passing a real employer ATS.
- Do not silently replace missing data with favorable default values.
- Let the user accept, reject, edit, or copy every proposed CV change.
- Preserve traceability between an application, its source CV version, and accepted changes.
- Make document downloads optional rather than the main tailoring experience.
- Compare historical CV scores only under compatible scoring-engine versions.

---

## 3. Terminology and Score Names

The phrase **ATS score** must not imply that all employer ATS products use the same algorithm. The product should use precise names:

| Name | Meaning |
|---|---|
| Document Readiness | Whether the original file can be parsed and read reliably |
| Resume Quality | How effectively the CV communicates structure, experience, evidence, and impact |
| JD Evidence Match | How much of a particular JD is visibly supported by the submitted CV |
| Candidate Potential Fit | CV evidence plus verified profile facts, user-confirmed competencies, and carefully discounted inference |
| Confidence | Reliability of a result based on input quality and evidence availability |

Scores are coaching and ranking estimates. They are not interview probabilities or guarantees that a particular employer ATS will accept the CV.

---

## 4. Upgrade Summary

| Area | Current behavior | Target behavior |
|---|---|---|
| CV storage | One active CV; previous CV is purged | One current CV plus up to three previous versions |
| Progress | Only the latest score is visible | Version timeline, category deltas, and semantic change summary |
| General scoring | One five-factor health score | Document Readiness and Resume Quality with confidence |
| JD matching | CV text is treated as the main truth | Separate JD Evidence Match and Candidate Potential Fit |
| Missing inputs | Some neutral or favorable defaults are used | Mark unavailable, lower confidence, retry extraction, or dynamically reweight |
| Skills | Mainly direct keyword and limited taxonomy matching | Requirement classification plus evidence graph and user confirmation |
| Experience | Estimated from the number of jobs | Parsed employment timeline, overlap handling, relevance, and recency |
| Semantic score | Can use a default when embeddings are missing | Real CV/JD embeddings or an explicit unavailable state |
| Tailoring | Generates complete documents first | Generates reviewable patches first |
| Fact Critic | Can return content after exhausted failures | Block unverified changes or require explicit manual review |
| Score delta | Tailored score cannot appear lower | Show the real before/after result and warn about regressions |
| UX | Module/tab-oriented interface | Guided journey with next-best actions and an interactive CV workspace |

---

## 5. CV Versioning and Progress Tracking

### 5.1 Retention policy

Each user will have:

- One current CV version.
- Up to three archived CV versions.
- A maximum of four normal versions in the rolling history.

When a new version becomes current:

1. Save the new CV as an immutable version.
2. Set it as the current version in the same transaction.
3. Archive the previously current version.
4. Remove the oldest unpinned archived version if more than three archived versions remain.

A CV version referenced by an active or saved application must either be pinned or represented by an immutable application evidence snapshot before normal retention removes it.

### 5.2 Proposed data model

Introduce a `cv_versions` entity with fields equivalent to:

```text
id
user_id
version_number
source_type                 # pdf, docx, pasted_text, etc.
raw_storage_key
raw_file_name
raw_text
parsed_data
parse_confidence
document_readiness_result
resume_quality_result
embedding
scoring_engine_version
change_summary
is_current
is_pinned
created_at
```

The user profile should point to `current_cv_version_id`, or an equivalent invariant must guarantee exactly one current version per user.

Applications must store:

```text
source_cv_version_id
source_cv_content_hash
source_evidence_snapshot
tailoring_engine_version
```

The snapshot protects the Fact Critic audit trail if a retained CV version is later removed.

### 5.3 Progress categories

The product must distinguish:

1. **Presentation improvement** — rewriting, organization, clarity, or formatting.
2. **Newly documented evidence** — existing ability that was missing from the CV.
3. **Genuine career growth** — a new job, project, skill, certification, or measurable outcome.

An increased score must not automatically be described as career growth.

### 5.4 Version comparison

Users should be able to compare any two retained versions and see:

- Overall and category score deltas.
- Added, removed, and modified sections.
- New quantified achievements.
- New or removed skills and evidence.
- Resolved parsing or formatting risks.
- Whether the scoring engine changed between versions.

Historical comparison rules:

- Prefer recomputing compared versions with the current engine.
- If recomputation is not possible, show the scoring-engine version beside each result.
- Do not present incompatible historical scores as a precise improvement trend.

### 5.5 Suggested endpoints

The final endpoint names may follow the existing API conventions, but the capabilities should include:

```text
POST   /cv/versions
GET    /cv/versions
GET    /cv/versions/{version_id}
POST   /cv/versions/{version_id}/activate
GET    /cv/versions/compare?from={id}&to={id}
DELETE /cv/versions/{version_id}
```

Deletion must reject current, pinned, or otherwise protected versions unless their dependencies are safely resolved.

---

## 6. ATS and Resume Scoring Upgrade

### 6.1 Preserve the useful foundation

The existing deterministic approach is valuable because it is repeatable, testable, and explainable. The current formulas may remain as a temporary baseline while the signal quality is upgraded.

Current standalone formula:

```text
30% Parseability
25% Action language and impact
20% Quantification
15% Contact hygiene
10% Brevity and formatting
```

Current JD match formula:

```text
40% Hard skills
25% Semantic similarity
15% Title and seniority
10% Experience duration
10% Soft skills
```

The primary short-term problem is not only the weights. It is the reliability of the inputs, silent defaults, incomplete evidence modeling, and lack of calibration.

### 6.2 Input-quality gate

Every scoring request must first produce an input-quality report:

```text
cv_parse_confidence
jd_parse_confidence
ocr_confidence
layout_analysis_available
experience_dates_confidence
skills_extraction_confidence
cv_embedding_available
jd_embedding_available
```

Rules:

- Never create placeholder employers, degrees, or skills.
- Missing information remains missing.
- Retry structured extraction when appropriate.
- Return `unavailable` for a factor that cannot be supported.
- Lower the overall confidence when evidence is incomplete.
- Dynamically reweight available factors only when the UI clearly explains it.
- Do not silently assign a favorable neutral score.

### 6.3 Document Readiness

Document Readiness should measure whether the employer can reliably parse the uploaded file.

Signals should include:

- Text extraction coverage by page.
- OCR quality and suspicious OCR output.
- Column count and reading order.
- Tables, text boxes, icons, and graphics containing important information.
- Header/footer contact-information risk.
- Standard and recognizable section headings.
- Missing or duplicated extracted content.
- Page count.
- File corruption or protected content.
- Difference between visible document content and extracted text.

The parser must retain document structure and coordinates where the file format permits it. Plain extracted text alone is not sufficient for a reliable layout audit.

### 6.4 Resume Quality

Resume Quality should assess communication quality independently of a particular JD.

Signals should include:

- Contact essentials, with role-aware treatment of portfolio links.
- Section completeness appropriate to the candidate level.
- Bullet quality using `Action + Scope + Method + Result/Evidence`.
- Achievement evidence rather than action-verb presence alone.
- Meaningful quantification, separated from dates and irrelevant numbers.
- Specificity and clarity.
- Duplicate or repetitive bullets.
- Grammar and spelling warnings.
- First-person language and filler phrases where inappropriate.
- Chronological consistency and unexplained parsing anomalies.
- Length appropriate to seniority, market, role, and document type.
- Suspicious keyword stuffing.

Not every good bullet must contain a number. Technical architecture, security, research, mentoring, and qualitative outcomes can be strong evidence when expressed specifically.

### 6.5 JD requirement extraction

Replace the small flat skill list with structured requirement extraction.

Each extracted requirement should contain:

```text
canonical_name
original_text
requirement_type
importance
required_or_preferred
minimum_level
minimum_years
recency_requirement
evidence_expected
extraction_confidence
```

Requirement types include:

- Technical tool or platform.
- Foundational knowledge.
- Responsibility or capability.
- Domain experience.
- Education or credential.
- Years and seniority.
- Language.
- Location, work authorization, or availability.
- Soft skill or behavior.

Importance levels should at least distinguish:

- Must-have.
- Important responsibility.
- Preferred.
- Contextual or descriptive.

If requirement extraction fails, the engine must not substitute the candidate's own skills as the JD requirements.

### 6.6 Skill and role ontologies

Build versioned taxonomies for:

- Aliases and abbreviations.
- Parent/child skills.
- Related but non-equivalent skills.
- Foundational prerequisites.
- Role families and specializations.
- Seniority.
- Individual-contributor versus management paths.

Example:

```text
Machine Learning
├── Probability and statistics
├── Linear algebra
├── Optimization
├── Supervised learning
└── Model evaluation
```

A prerequisite relationship creates cautious partial confidence. It must not automatically create a verified candidate fact.

### 6.7 Evidence graph

Every match must be traceable to evidence.

```text
requirement
candidate_claim
evidence_source
evidence_text
evidence_type
evidence_strength
confidence
```

Evidence levels:

| Level | Meaning | Scoring treatment |
|---|---|---|
| Explicit | Directly listed in the CV | Full credit when relevant |
| Demonstrated | Proven through a project or experience bullet | Strongest practical evidence |
| Supported | Consistent with education, certification, or portfolio evidence | Strong or partial credit |
| User-confirmed | Explicitly confirmed by the user | Candidate-fit credit; flag if absent from CV |
| Role-inferred | Suggested by title or related work | Discounted discovery credit only |
| Unsupported | No reliable evidence | No credit |

### 6.8 Separate JD Evidence Match from Candidate Potential Fit

**JD Evidence Match** uses only information visible in the CV and linked application evidence. It represents what an ATS or recruiter can observe.

**Candidate Potential Fit** may also use:

- User-confirmed skills.
- Verified portfolio or profile evidence.
- Education and certifications.
- Carefully discounted role inference.

Example result:

```text
JD Evidence Match: 68%
Candidate Potential Fit: 82%
Confidence: Medium

Explanation:
Statistics and linear algebra are relevant to the candidate's AI work,
but they are not explicitly demonstrated in the CV.
```

The interface may ask the user to confirm the competency and identify supporting evidence. Confirmed information can then be proposed as a CV change, but never inserted automatically.

### 6.9 Semantic similarity

The upgraded semantic layer must:

- Generate and persist embeddings for both CVs and JDs.
- Never substitute a fixed cosine value when an embedding is missing.
- Use a genuine sparse relevance method if the product calls it BM25.
- Support relevant phrases and responsibilities, not only unique-token overlap.
- Record embedding-model and sparse-index versions.
- Return semantic evidence or representative matched passages.

### 6.10 Experience calculation

Replace `number of positions × fixed duration` with an employment timeline.

The timeline must consider:

- Parsed start and end dates.
- Present employment.
- Overlapping positions.
- Internships, contract work, freelance work, and full-time employment.
- Total experience.
- Relevant experience for the target requirement.
- Recency.
- Incomplete or ambiguous dates.

When dates cannot be trusted, the result should show low confidence rather than a fabricated number of years.

### 6.11 Soft-skill evidence

Soft skills should be matched through demonstrated behavior, not only self-description.

For example:

```text
"Strong communicator"
```

is weaker evidence than:

```text
"Presented model-risk findings to engineering and finance leadership."
```

If a JD has no relevant soft-skill requirements, the system should not invent a generic set and penalize the candidate against it.

### 6.12 Hard gates and blockers

A weighted average can hide disqualifying requirements. Display blockers separately:

```text
JD Evidence Match: 82%
Blocking requirement: Work authorization not confirmed
```

Potential blockers include:

- Required work authorization.
- Required language proficiency.
- Mandatory certification.
- Required degree where genuinely mandatory.
- Location or on-site availability.
- Explicit must-have technology with no evidence.

The system should distinguish `missing`, `not confirmed`, and `not applicable`.

### 6.13 Confidence and precision

Avoid false precision. Prefer an output such as:

```text
JD Evidence Match: 78%
Confidence: Medium
Likely range: 72–83%
```

Confidence decreases when:

- OCR quality is poor.
- JD text is short or incomplete.
- Requirements could not be structured.
- Experience dates are ambiguous.
- Embeddings are unavailable.
- Most evidence is inferred rather than demonstrated.

### 6.14 Scoring-engine versioning

Every result must store:

```text
engine_name
engine_version
taxonomy_version
embedding_model_version
scored_at
input_content_hashes
```

This is required for reliable CV history, regression testing, and explainability.

---

## 7. Application Tailoring and Fact Critic Upgrade

### 7.1 Diff-first output

The primary tailoring result should be a set of proposed changes rather than a replacement document.

Each patch should contain:

```text
patch_id
source_cv_version_id
section
source_element_id
original_text
suggested_text
change_type
reason
jd_requirements_addressed
candidate_evidence_used
fact_critic_status
user_status
```

Change types include:

- Replace wording.
- Add evidence.
- Remove unsupported or irrelevant wording.
- Reorder content.
- Add a confirmed skill.
- Split or combine bullets.

User statuses include:

- Pending.
- Accepted.
- Edited.
- Rejected.
- Skipped.

### 7.2 Fact Critic scope

The Fact Critic must validate every generated asset and every accepted edit:

- Professional summary.
- Skills and skill prioritization.
- Experience bullets.
- Project bullets.
- Cover letter.
- Outreach email.
- Metrics.
- Titles, employers, education, and certifications.

The critic must return evidence-linked findings rather than only a boolean.

If all critic attempts fail:

- Do not describe the result as verified.
- Block automatic application of failed patches.
- Block normal export of unverified content, or require explicit manual-review acknowledgement.
- Show the unresolved claims and their locations.

### 7.3 Real before/after scoring

The system must show the actual result after accepted changes.

- Do not replace a lower after-score with the previous score.
- Warn if a change improves keyword overlap but reduces clarity or introduces unsupported claims.
- Recalculate only after user-accepted or user-edited changes.
- Show which factors caused the delta.

### 7.4 Optional exports

After review, users may:

- Save the accepted result as a new CV version.
- Copy an individual replacement.
- Copy all accepted text.
- Export DOCX.
- Export PDF or semantic HTML.
- Copy the cover letter.
- Copy the outreach email.
- Download the cover letter or email if desired.

Downloads remain useful for recruiter-ready formatting and application archives, but they are not required to use the tailoring workflow.

---

## 8. User Experience and Layout Upgrade

### 8.1 Primary journey

```text
Upload
  → Confirm file and target role
  → Analyze
  → Verify uncertain extraction
  → Understand results
  → Review proposed improvements
  → Accept, edit, reject, or copy
  → Save a new version
  → Optionally export or continue to job matching
```

### 8.2 Upload state

The initial screen should contain:

- Drag-and-drop PDF/DOCX area.
- Browse-file button.
- Paste-text alternative.
- Optional target role.
- Short privacy and non-automatic-editing message.

After a file is selected, show:

- Filename, type, size, and estimated pages.
- What the system will check.
- `Replace file` action.
- Primary `Analyze & improve my CV` button.

### 8.3 Analysis state

Replace the generic spinner with meaningful stages:

```text
Reading document structure
Extracting experience and skills
Checking achievement evidence
Evaluating document readiness
Preparing improvement suggestions
```

Display progress without claiming exact completion when underlying stages are indeterminate.

### 8.4 Results overview

The overview should show:

- A plain-language conclusion.
- Document Readiness.
- Resume Quality.
- Confidence.
- Strong areas.
- Highest-impact opportunities.
- Primary `Review N improvements` action.
- Secondary `View full report` action.

The score supports the explanation; it must not be the only or dominant result.

### 8.5 Improvement workspace

Desktop layout:

```text
┌────────────────┬──────────────────────────────┬──────────────────────┐
│ Review sections│ CV document / semantic view  │ Suggestion and proof │
│                │                              │                      │
│ Overview       │ Highlighted source text      │ Original             │
│ Structure      │ and accepted changes         │ Suggested            │
│ Experience     │                              │ Why it helps         │
│ Skills         │                              │ JD requirement       │
│ Contact        │                              │ Evidence used        │
│                │                              │ Accept/Edit/Skip/Copy│
└────────────────┴──────────────────────────────┴──────────────────────┘
```

Initial delivery may use a semantic section-and-bullet view. Pixel-perfect highlighting over arbitrary PDF/DOCX layouts is a later enhancement requiring reliable coordinates and document-run mapping.

### 8.6 Diff presentation

Diffs must not rely on color alone:

- Removed: red, minus symbol, and strikethrough.
- Added: green, plus symbol, and explicit label.
- Needs confirmation: yellow and warning label.
- Reordered: blue and movement label.

Every suggestion must offer:

- Accept.
- Edit.
- Reject or skip.
- Copy.
- View supporting evidence.

### 8.7 Confirmation cards

For inferred or uncertain competencies, ask the user to select an evidence state:

```text
I have project or work evidence
I know this but did not mention it
I am currently learning it
This is not part of my experience
```

The response becomes structured profile evidence and determines whether a CV addition can be proposed.

### 8.8 Completion screen

After review, show:

- Actual before and after scores.
- Accepted, edited, rejected, and unresolved change counts.
- Fact Critic status.
- Main reasons for the score delta.
- `Save as Version N` primary action.
- Copy and export actions.
- Compare-with-previous-version action.

### 8.9 Version timeline

The CV history screen should show:

- Version number and current badge.
- Upload/save date.
- Compatible score summary.
- Change summary.
- Pinned/application-used status.
- Compare, activate, and delete actions where allowed.

### 8.10 Navigation

Keep advanced modules accessible, but add a guided home screen with the user's next best action.

Example priorities:

```text
No CV                 → Upload and analyze a CV
Analysis incomplete  → Review extraction questions
Findings pending     → Review CV improvements
Healthy current CV   → Find matching jobs
Saved job            → Tailor application
Upcoming interview   → Start targeted practice
```

### 8.11 Responsive and accessibility requirements

- On mobile, convert the three-column workspace into a document/suggestion stepper.
- Maintain keyboard navigation for every review action.
- Provide labels in addition to color.
- Announce analysis and acceptance states to assistive technologies.
- Preserve sufficient contrast in light and dark themes.
- Never animate scores in a way that implies guaranteed success.

---

## 9. Backend and Service Changes

### 9.1 CV ingestion

- Preserve immutable CV versions.
- Produce parsing-confidence metadata.
- Extract page and layout structure where possible.
- Remove all fabricated fallback values.
- Store content hashes and engine versions.
- Support retention and application pinning.

### 9.2 JD analysis

- Extract structured requirements with importance and type.
- Generate JD embeddings.
- Version requirement-extraction prompts and taxonomies.
- Preserve source text for every extracted requirement.

### 9.3 Matching

- Produce JD Evidence Match and Candidate Potential Fit separately.
- Include confidence and blockers.
- Return evidence for every matched or missing requirement.
- Use actual timelines and real semantic signals.
- Avoid scoring unsupported factors.

### 9.4 Tailoring

- Generate patch operations.
- Validate every generated asset.
- Save critic findings and evidence links.
- Apply only accepted patches.
- Recalculate scores after acceptance.
- Generate complete documents from the accepted final state.

### 9.5 Auditability

Persist enough metadata to answer:

- Which CV version was used?
- Which JD version was used?
- Which engine and taxonomy versions produced the score?
- Which evidence supported a match?
- Which changes were generated, accepted, edited, or rejected?
- Did the Fact Critic pass every exported claim?

---

## 10. Migration Plan

### 10.1 Existing user profiles

For each existing active profile:

1. Create CV Version 1 from the current stored data.
2. Mark it as current.
3. Preserve the original stored file key where available.
4. Mark legacy parsing confidence as unknown if it cannot be reconstructed.
5. Record the legacy scoring-engine version.

### 10.2 Existing applications

- Link an application to the migrated source CV when it can be determined.
- Otherwise store `source_cv_version_id = null` and label the source as legacy/unknown.
- Preserve existing tailored assets.
- Do not claim that legacy assets passed the upgraded full-asset critic.

### 10.3 Documentation consistency

After implementation, update all architecture, database, README, and implementation-plan documents to use the same scoring model and terminology. Remove outdated references to older three-factor matching where present.

---

## 11. Testing and Evaluation

### 11.1 Unit tests

Add coverage for:

- CV retention and current-version invariants.
- Pinned version behavior.
- Version comparisons.
- Missing-data and unavailable-factor behavior.
- No fabricated fallback facts.
- Requirement importance classification.
- Skill aliases and non-equivalent related skills.
- Employment timeline overlap.
- Real embedding presence checks.
- Hard blockers.
- Confidence calculation.
- Fact Critic exhausted-attempt behavior.
- Real before/after score regressions.
- Patch accept, edit, reject, and application behavior.

### 11.2 Integration tests

- Upload → analyze → review → save new version.
- Compare current and archived versions.
- Analyze CV against a JD with complete and incomplete requirements.
- Confirm an implicit competency and add supporting evidence.
- Tailor an application and export only accepted, verified changes.
- Protect an application-referenced CV from unsafe retention deletion.

### 11.3 Adversarial tests

- Keyword-stuffed CVs.
- Invented metrics.
- Hidden text and decorative icons.
- Multi-column PDFs with incorrect extraction order.
- OCR-heavy scanned documents.
- Very short or vague JDs.
- JDs with contradictory requirements.
- Titles that imply skills the candidate does not possess.
- CVs with overlapping positions and incomplete dates.
- Prompt-injection text inside CVs or JDs.

### 11.4 Calibration dataset

Create an anonymized evaluation dataset containing:

- Representative CVs across seniority and role families.
- Representative JDs across markets.
- Parsing ground truth.
- Requirement-level match labels.
- Human recruiter or career-coach assessments.
- Strong and weak variations of the same CV.

Measure:

- Correlation with human assessments.
- Job-ranking accuracy.
- False matched-skill rate.
- False missing-skill rate.
- Stability under harmless formatting changes.
- Resistance to keyword stuffing.
- Reliability by role family and seniority.
- Confidence calibration.

Weights and tier thresholds should be adjusted from evaluation results rather than intuition alone.

---

## 12. Delivery Phases

### Phase 0 — Correctness and safety

- Remove fabricated fallback profile values.
- Remove candidate-skill fallback when JD extraction fails.
- Replace silent semantic and experience defaults with explicit unavailable states.
- Show the real tailored after-score.
- Prevent failed Fact Critic results from appearing verified.
- Validate skills, email, and every other generated asset in the critic scope.

### Phase 1 — CV version foundation

- Add CV version storage and migration.
- Implement current plus three archived versions.
- Add pinning/evidence snapshots for applications.
- Add scoring-engine metadata.
- Add version list and comparison endpoints.

### Phase 2 — Guided CV Studio

- Build upload confirmation and analysis stages.
- Add results overview.
- Build the semantic CV review workspace.
- Add accept, edit, reject, skip, and copy interactions.
- Add completion and version history views.

### Phase 3 — Evidence-aware matching

- Add structured JD requirement extraction.
- Introduce skill and role ontologies.
- Generate real JD embeddings.
- Parse employment timelines.
- Build the evidence graph.
- Separate JD Evidence Match and Candidate Potential Fit.
- Add confidence and blockers.

### Phase 4 — Diff-first Application Studio

- Generate structured patches.
- Expand Fact Critic validation.
- Apply only accepted changes.
- Recalculate real before/after scores.
- Generate optional documents from the accepted final state.

### Phase 5 — Calibration and advanced document rendering

- Build and label the evaluation dataset.
- Calibrate weights and thresholds.
- Add role-family variations where justified.
- Add pixel-level PDF/DOCX highlighting where document structure permits it.
- Monitor real-world score stability and correction rates.

---

## 13. Acceptance Criteria

The upgrade is complete when:

- A user can retain one current and three archived CV versions.
- Version retention does not break saved application audits.
- Historical progress distinguishes wording improvements from genuine new experience.
- No parser fallback invents candidate facts.
- Missing JD or embedding data cannot silently inflate a score.
- Scores include engine versions, confidence, and factor explanations.
- JD Evidence Match and Candidate Potential Fit are displayed separately.
- Every match is traceable to evidence or explicitly labeled inferred/unsupported.
- Employment years are derived from dates rather than position count.
- Hard requirements and blockers appear separately from the weighted score.
- A user can review CV suggestions as red/green labeled diffs.
- Every change can be accepted, edited, rejected, skipped, or copied.
- Unconfirmed skills are never inserted automatically.
- The Fact Critic validates all generated application content.
- Failed critic results cannot be shown as fully verified.
- Before/after scores show the true result, including regressions.
- The user can save accepted changes as a new version without downloading a file.
- DOCX/PDF/TXT/HTML exports remain available as optional actions.
- Mobile and keyboard users can complete the entire review flow.
- Tests cover correctness, integration, adversarial inputs, and scoring calibration.

---

## 14. Decisions to Confirm Before Implementation

The following decisions should be finalized before schema and UI implementation:

1. Whether application-referenced CV versions remain pinned indefinitely or are converted only to evidence snapshots.
2. Whether the rolling four-version limit applies to manually pinned versions.
3. Whether Candidate Potential Fit may use external portfolio evidence in the first release.
4. Which role families are supported by the first expanded ontology.
5. Whether score ranges are shown immediately or after calibration data is available.
6. Whether PDF export is generated directly or through semantic HTML/print rendering.
7. Whether the first diff workspace uses normalized semantic CV content only or also attempts DOCX run-level mapping.
8. Which human-review process will provide calibration labels and approve future scoring-engine versions.

These decisions do not block Phase 0 correctness work, but they affect later database retention, evidence, and user-interface behavior.
