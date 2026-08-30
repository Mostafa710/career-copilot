# Career Copilot: Architecture & Agent Flowcharts

Comprehensive reference document containing the global architecture and end-to-end workflow flowcharts for all agents, security modules, and user flows in **Career Copilot**.

---

## 1. Global System Architecture

```mermaid
flowchart TD
    User["User / Browser"] <-->|HTTP / Port 3000| NextFrontend["Next.js 16 Frontend (Widescreen Bento Grid + Emerald & Slate Palette + Geist Typography)"]
    NextFrontend <-->|REST API / Port 8000| FastApiServer["FastAPI Backend Server (:8000)"]
    
    SharedDB["PostgreSQL 16 + pgvector (Database & Semantic Embeddings)"]
    LocalStorage["Local Storage / File System Adapter (Active CV & DOCX Exports)"]

    FastApiServer <--> SharedDB
    FastApiServer <--> LocalStorage

    subgraph SecurityLayer ["Authentication & Verification"]
        Auth_OTP["6-Digit Email OTP Verification Engine (10-Min Expiry)"]
        Auth_JWT["Stateless JWT Token Access & Role Permissions"]
    end

    subgraph LLMLayer ["LLM Pool & Key Rotation"]
        GroqRotator["Groq Multi-Key Rotator (GROQ_API_KEY_1..4) with Round-Robin & Failover"]
    end

    subgraph AgentsLayer ["Autonomous Agents & Core Engines"]
        Agent_CV["01: CV Diagnostics & Ingestion Engine (pdfplumber + pytesseract OCR)"]
        ATS_Gen["01: 100-Point Deterministic ATS Engine (5 Weighted Sub-Metrics + Tier Badges)"]
        Agent_MR["02: Market Research Agent (RapidAPI JSearch v2 + Wuzzuf + Tavily SERP)"]
        Agent_JM["02: Job Matching & Fit Engine (Standardized 5-Factor JD Match Model)"]
        Agent_APP["03: Multi-Agent Application Studio (Dual-Pass Fact Critic Loop + DOCX/TXT Generator)"]
        Agent_CRM["04: 6-Stage Mini-CRM Kanban Pipeline (Saved → Offered/Rejected)"]
        Agent_INT["05: Stateful Mock Interview Simulator (General, Technical, Behavioral + STAR)"]
        Agent_CR["06: Career Strategy & Roadmap Coach (Conversational + Feasibility Critic)"]
        Tool_Tavily["Tavily Tool (Auto-Cached Company Dossiers & Real-Time Market Trends)"]
    end

    FastApiServer --> SecurityLayer
    FastApiServer --> AgentsLayer
    AgentsLayer <--> GroqRotator
    Agent_APP & Agent_INT & Agent_CR <--> Tool_Tavily
```

---

## 2. Authentication & Email Verification Lifecycle

```mermaid
flowchart TD
    Start["User Submits Signup Form (Name, Email, Strong Password)"] --> CheckUser{"User already registered?"}
    
    CheckUser -->|Yes| PromptLogin["Return Error: Email already registered"]
    CheckUser -->|No| HashPass["Hash Password using bcrypt"]
    
    HashPass --> GenOTP["Generate Secure 6-Digit Verification OTP"]
    GenOTP --> SetExpiry["Set Expiry Window (Now + 10 Minutes)"]
    SetExpiry --> SaveDB["Create User record in PostgreSQL (is_verified = False)"]
    SaveDB --> SendMail["Dispatch HTML Verification Email to User Inbox"]
    
    SendMail --> Modal["Frontend opens 6-Digit OTP Verification Modal"]
    
    Modal --> UserTypesCode["User Enters 6-Digit OTP"]
    UserTypesCode --> VerifyCode{"Check: OTP matches AND not expired?"}
    
    VerifyCode -->|Invalid / Expired| ShowError["Display Error + 'Resend Code' Button"]
    VerifyCode -->|Valid| SetVerified["Update User: is_verified = True, verification_code = NULL"]
    
    SetVerified --> IssueJWT["Generate Signed JWT Access Token"]
    IssueJWT --> OpenDashboard["Unlock Full Widescreen System Dashboard"]
```

---

## 3. Agent Use-Case Flowcharts

---

### Module 01: CV Diagnostics, Deterministic ATS Scoring & Version Snapshots

```mermaid
flowchart TD
    Upload["User Uploads File (PDF/DOCX) or Pastes Text"] --> CheckType{"Input Format"}
    
    CheckType -->|Raw Text| Sanitize["Text Sanitizer & Normalizer"]
    CheckType -->|DOCX File| DocxParser["python-docx Parser"] --> Sanitize
    CheckType -->|PDF File| PdfParser["pdfplumber Extractor"]
    
    PdfParser --> IsEmpty{"Text Extracted?"}
    IsEmpty -->|Yes| Sanitize
    IsEmpty -->|No or Scanned Image| OCR["Fallback: pytesseract OCR"] --> Sanitize
    
    Sanitize --> SaveVersion["Persist Version Snapshot (Rolling 4-Version History with Pinned Retention)"]
    SaveVersion --> SaveFile["Save New Active Resume File"]
    
    Sanitize --> StructExt["Pydantic Structured Profile Extractor"]
    StructExt --> Vectorize["Generate Dense Vector Embedding (all-MiniLM-L6-v2, 384 dims)"]
    
    StructExt --> GenATS["Standard 5-Metric Standalone ATS Health Engine"]
    
    subgraph GenBreakdown ["5-Metric Standalone Health Breakdown"]
        GenATS --> C1["Parseability & Structural Integrity (30%)"]
        GenATS --> C2["Action Language & Power Verbs (25%)"]
        GenATS --> C3["Quantification Density (20%)"]
        GenATS --> C4["Contact Hygiene & Section Completeness (15%)"]
        GenATS --> C5["Brevity & Formatting Boundaries (10%)"]
    end
    
    C1 & C2 & C3 & C4 & C5 --> FinalStandalone["Assign General ATS Health Score (0–100) & Tier Badge"]
```

---

### Module 02: Market Research & 5-Factor Job Matching

```mermaid
flowchart TD
    SearchReq["User Triggers Job Search (Query, Location, Filters)"] --> CheckInput{"Query provided?"}
    
    CheckInput -->|Explicit Query| UseExplicit["Use Query: e.g. Senior AI Engineer"]
    CheckInput -->|Default / Blank| Infill["Infill from User Preferences & Active CV Profile"]
    
    UseExplicit & Infill --> RunConcurrent["Run Prioritized Multi-Source Discovery Pipeline"]
    
    subgraph MENAPipeline ["Concurrent Multi-Source Ingestion Pipeline"]
        RunConcurrent --> JSearch["1. RapidAPI JSearch v2: Live LinkedIn & Indeed Postings"]
        RunConcurrent --> Wuzzuf["2. Wuzzuf Scraper: Direct Egyptian Tech Postings"]
    end
    
    JSearch & Wuzzuf --> Merge["Merge & Deduplicate: SHA-256 Content Hash + Unique External ID"]
    
    Merge --> QualGate{"Anti-Aggregator Quality Gate (job_quality.py)"}
    QualGate -->|Reject Directory/Dead Links| Discard["Discard Non-Posting Results"]
    QualGate -->|Verified Individual Vacancy| CheckCount{"Count >= 15 Jobs?"}
    
    CheckCount -->|Yes| MatchPipeline["5-Factor Target Match Engine"]
    CheckCount -->|"No (< 15)"| TavilyFallback["3. Tavily Live Search (site:linkedin.com/jobs OR site:wuzzuf.net)"] --> MatchPipeline
    
    subgraph Standard5Factor ["Standard 5-Factor Target Match Model"]
        MatchPipeline --> F1["Hard Skills & Keywords (40%): Canonical Tech Synonym Overlap"]
        MatchPipeline --> F2["Semantic NLP & Embeddings (25%): Cosine Sim (70%) + Sparse BM25 (30%)"]
        MatchPipeline --> F3["Title & Seniority Alignment (15%): Role & Level Fit"]
        MatchPipeline --> F4["Experience Duration & Recency (10%): Required Years Fit"]
        MatchPipeline --> F5["Soft Skills & Competencies (10%): Collaboration & Agile"]
    end
    
    F1 & F2 & F3 & F4 & F5 --> WeightedRank["Compute Weighted Match Score & Assign Rating Tier"]
    WeightedRank --> SortDesc["Sort Vacancies Descending by Match Score"]
    SortDesc --> ReturnRanked["Display 15–20 Ranked Job Cards with Score Badges in UI"]
```

---

### Module 03: Application Tailoring Studio & Fact Critic Reflection Loop

```mermaid
flowchart TD
    SelectJob["User Selects Opportunity to Tailor"] --> RetrieveInsights["Retrieve or Auto-Fetch Company Insights from DB / Tavily"]
    RetrieveInsights --> TriggerAgent["Trigger Multi-Agent Application Tailor"]
    
    TriggerAgent --> InitAttempt["Initialize: attempt = 1, feedback = empty"]
    
    subgraph CriticLoop ["Agentic Generator-Critic Loop (Max 3 Attempts)"]
        InitAttempt --> GenNode["Generator Node: Craft Full Tailored CV, Cover Letter, Outreach Email"]
        GenNode --> CriticNode{"Critic Node: Fact-Check Against Candidate's Original CV"}
        
        CriticNode -->|Pass: Zero hallucinations, accurate facts| CalcGap["Compute ATS Match Score Before vs After"]
        CriticNode -->|Fail: Invented unverified degree or skill| CheckAttempts{"Attempt < 3?"}
        
        CheckAttempts -->|Yes: Retry| IncrementAttempt["attempt += 1, pass Critic Feedback"] --> GenNode
        CheckAttempts -->|No: Exhausted| Return422["Return 422: Fact-Check Unverified, purge studio state"]
    end
    
    CalcGap --> RenderStudio["Render Application Studio with Side-by-Side Editors & Save to CRM CTA"]
    
    RenderStudio --> ExportActions{"User Selects Download"}
    ExportActions -->|CV DOCX| DocxCV["Generate Microsoft Word CV (.docx)"]
    ExportActions -->|Letter DOCX| DocxLetter["Generate Microsoft Word Cover Letter (.docx)"]
    ExportActions -->|Email TXT| TxtEmail["Generate Plain Text Email (.txt)"]
```

---

### Module 04: 6-Stage Mini-CRM Pipeline Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Saved: User saves interesting job posting from Matcher
    Saved --> Tailored: Application Agent tailors full CV & user saves assets
    Tailored --> Applied: Candidate submits application to employer
    
    Applied --> Interviewing: Employer responds & schedules interview
    Applied --> Rejected: Received rejection notification
    
    Interviewing --> Offered: Successfully completed interview & received offer
    Interviewing --> Rejected: Process ended without offer
```

---

### Module 05: Stateful Mock Interview Multi-Turn Simulator

```mermaid
flowchart TD
    Start["User Starts Mock Interview"] --> SelectMode{"Select Mode & Validate Selection"}
    
    SelectMode -->|General| InitGeneral["Load Custom User Domain (e.g. Machine Learning, Backend)"]
    SelectMode -->|Technical: Job Selected| InitTech["Load Target Mini-CRM Job + Company Insights + Active CV"]
    SelectMode -->|Behavioral: Job Selected| InitBehav["Load Target Mini-CRM Job + Company Culture Values + Active CV"]
    SelectMode -->|Technical/Behavioral: Empty Selection| LockButton["Lock 'Initialize Session' CTA Button"]
    
    InitGeneral & InitTech & InitBehav --> DynamicQ1["AI Generates Dynamic Turn 1 Opening Question tailored to context"]
    
    subgraph InterviewLoop ["Multi-Turn Interview State Machine"]
        DynamicQ1 --> WaitAnswer["Wait for Candidate Answer (Input locked during evaluation)"]
        WaitAnswer --> EvalResponse["Evaluate Response against Domain / JD / STAR Framework"]
        
        EvalResponse --> MicroFeedback["Generate Immediate Micro-Feedback & Rubric Ratings"]
        MicroFeedback --> NextQ["Generate Contextual Follow-Up Question"] --> WaitAnswer
    end
    
    InterviewLoop --> ConcludeAction["Candidate Clicks 'Conclude & Scorecard' or Completes Turns"]
    ConcludeAction --> FinalScorecard["Compile 100-Point Evaluation Scorecard & Hiring Recommendation"]
    FinalScorecard --> SaveSession["Persist Session to PostgreSQL"]
    SaveSession --> ExitCTA["Display Performance Breakdown + 'Exit & Start New Session' Button"]
```

---

### Module 06: Conversational Career Roadmap Coach with Feasibility Critic

```mermaid
flowchart TD
    UserReq["User Sends Message in Roadmap Chat"] --> CheckIntent{"Conversational exploration vs Formal Roadmap?"}
    
    CheckIntent -->|Career / Relocation / Market Advice| CoachMode["Provide Structured Markdown Strategy with Channel Tables & Schedules"]
    CheckIntent -->|Explicit Roadmap Request| CheckInputs{"Target Role, Timeframe & Weekly Hours confirmed?"}
    
    CheckInputs -->|Missing Hours/Role| PromptUser["Ask clarifying questions regarding weekly study availability"]
    CheckInputs -->|All Parameters Present| LoadProfile["Read User Current Skills & Active CV"]
    
    LoadProfile --> SearchTrends["Tavily Tool: Query Live Market Skill Trends & In-Demand Tools"]
    SearchTrends --> InitRoadmapAttempt["Initialize: attempt = 1, feedback = empty"]
    
    subgraph FeasibilityCriticLoop ["Roadmap Generator-Critic Loop (Max 3 Attempts)"]
        InitRoadmapAttempt --> GenRoadmap["Generator Node: Budget Workload Realistic for (Weeks * Hours/Week) across 4 Phases"]
        GenRoadmap --> FeasibilityCritic{"Feasibility Critic: Is Workload Feasible for Allocated Hours?"}
        
        FeasibilityCritic -->|Pass: Workload verified feasible| SaveRoadmap["Save to career_roadmaps Table in PostgreSQL"]
        FeasibilityCritic -->|Fail: Overambitious pacing| CheckRoadmapAttempts{"Attempt < 3?"}
        
        CheckRoadmapAttempts -->|Yes: Retry| IncrementRoadmap["attempt += 1, pass Critic Feedback"] --> GenRoadmap
        CheckRoadmapAttempts -->|No: Max attempts reached| SaveRoadmap
    end
    
    SaveRoadmap --> RenderRoadmap["Render 4-Phase Milestones with Concrete GitHub Portfolio Deliverables in Chat"]
    RenderRoadmap --> ResetCTA["User can click 'End Chat / New Session' to Reset Chat State"]
```
