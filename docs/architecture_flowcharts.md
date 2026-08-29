# Career Copilot: Architecture & Agent Flowcharts

Standalone reference document containing the global architecture and complete workflow flowcharts for all agents and use cases in **Career Copilot**.

---

## 1. Global System Architecture

```mermaid
flowchart TD
    User["User / Browser"] <-->|HTTP / Port 3000| NextFrontend["Next.js 16 Frontend (Geist Typography + RunRobRun Architectural System)"]
    NextFrontend <-->|REST API / Port 8000| FastApiServer["FastAPI Backend Server (:8000)"]
    
    SharedDB["PostgreSQL 16 + pgvector (Database & Semantic Embeddings)"]
    LocalStorage["Local Storage / S3 Adapter (Active CV & Documents)"]

    FastApiServer <--> SharedDB
    FastApiServer <--> LocalStorage

    subgraph AgentsLayer ["Agents & Core Engines"]
        Agent_CV["CV Ingestion & Profiler (pdfplumber + pytesseract OCR)"]
        ATS_Gen["Standalone ATS Health Engine (5-Metric Weighted Audit + Rating Tiers)"]
        Agent_MR["Market Research Agent (RapidAPI JSearch + Wuzzuf + Bayt + Tavily)"]
        Agent_JM["Job Matching & Ranking (Standard 5-Factor Target Match Engine)"]
        Agent_APP["Application Tailoring Agent (Full CV + Fact Critic Reflection Loop)"]
        Agent_INT["Mock Interview Agent (Stateful Multi-Turn + STAR + Company Insights)"]
        Agent_CR["Career Roadmap Agent (Conversational Chat + Feasibility Critic Loop)"]
        Tool_Tavily["Tavily Tool (Auto-Cached Company Insights & Market Trends)"]
    end

    FastApiServer --> Agent_CV & ATS_Gen & Agent_MR & Agent_JM & Agent_APP & Agent_INT & Agent_CR
    Agent_APP & Agent_INT & Agent_CR <--> Tool_Tavily
```

---

## 2. Agent Use-Case Flowcharts

---

### Use Case 1: CV Ingestion, Deterministic Standalone ATS Audit & Single Active CV Policy

```mermaid
flowchart TD
    Upload["User Uploads File (PDF/DOCX) or Pastes Text"] --> CheckType{"Input Format"}
    
    CheckType -->|Raw Text| Sanitize["Text Sanitizer & Normalizer"]
    CheckType -->|DOCX File| DocxParser["python-docx Parser"] --> Sanitize
    CheckType -->|PDF File| PdfParser["pdfplumber Extractor"]
    
    PdfParser --> IsEmpty{"Text Extracted?"}
    IsEmpty -->|Yes| Sanitize
    IsEmpty -->|No or Scanned Image| OCR["Fallback: pytesseract OCR"] --> Sanitize
    
    Sanitize --> DeleteOld["Purge Previous Disk Files & DB Profile Embeddings"]
    DeleteOld --> SaveFile["Save New Active Resume File"]
    
    Sanitize --> StructExt["Pydantic Structured Profile Extractor"]
    StructExt --> Vectorize["Generate Dense Vector Embedding (all-MiniLM-L6-v2, 384 dims)"]
    
    StructExt --> GenATS["Standard 5-Metric Standalone ATS Health Engine"]
    
    subgraph GenBreakdown ["5-Metric Standalone Health Breakdown"]
        GenATS --> C1["Parseability & Structure (30%)"]
        GenATS --> C2["Action Language & NLP Impact (25%)"]
        GenATS --> C3["Quantification Density (20%)"]
        GenATS --> C4["Contact & Essential Hygiene (15%)"]
        GenATS --> C5["Brevity, Length & Formatting (10%)"]
    end
    
    C1 & C2 & C3 & C4 & C5 --> SaveProfile["Upsert into user_profiles Table in PostgreSQL"]
    Vectorize --> SaveProfile
    SaveProfile --> ReturnGenReport["Return Profile & ATS Readiness Breakdown to UI"]
```

---

### Use Case 2: Market Research Agent for Egypt & MENA (LinkedIn, Indeed, Wuzzuf, Bayt)

```mermaid
flowchart TD
    UserQuery["User Search Query"] --> CheckInput{"Did user specify explicit criteria?"}
    
    CheckInput -->|Explicit Query| UseExplicit["Extract explicit Role, Location, Skills"]
    CheckInput -->|General Query| Infill["Infill from User Preferences & Active CV Profile"]
    
    UseExplicit & Infill --> RunConcurrent["Run Prioritized Multi-Source Ingestion Pipeline"]
    
    subgraph MENAPipeline ["Concurrent Egypt & MENA Ingestion Pipeline ($0 Cost)"]
        RunConcurrent --> JSearch["1. RapidAPI JSearch: Live LinkedIn & Indeed Postings"]
        RunConcurrent --> Wuzzuf["2. Wuzzuf Scraper: Direct Egyptian Tech Postings"]
        RunConcurrent --> Bayt["3. Bayt Scraper: Egypt & Gulf Postings"]
    end
    
    JSearch & Wuzzuf & Bayt --> Merge["Merge & Deduplicate: SHA-256 Content Hash + ID Check"]
    
    Merge --> CheckCount{"Count >= 15 Jobs?"}
    CheckCount -->|Yes| StoreNewJobs["Upsert Delivered Jobs into jobs Table"]
    CheckCount -->|"No (< 15)"| TavilyFallback["4. Tavily Live Web Search (site:linkedin.com OR site:wuzzuf.net)"] --> StoreNewJobs
    
    StoreNewJobs --> ReturnJobs["Return 15 to 20 Distinct Job Cards with Source Badges to UI"]
```

---

### Use Case 3: On-Demand & Auto-Cached Company Intelligence

```mermaid
flowchart TD
    Trigger["Agent or User Requests Company Insights"] --> CheckDBCache{"PostgreSQL company_insights IS NOT NULL?"}
    
    CheckDBCache -->|Yes: Cached| ReturnFromDB["Return Cached Dossier in <5ms (0 Tavily Calls)"]
    CheckDBCache -->|No: Not Yet Cached| FetchTavily["Call Tavily API Search Tool"]
    
    FetchTavily --> SaveDB["Update jobs Table: set company_insights = payload"]
    SaveDB --> ReturnFromDB
    
    ReturnFromDB --> Inject["Inject into Tailor / Interview Agent or Render Modal"]
```

---

### Use Case 4: Standard 5-Factor JD Target Match Engine

```mermaid
flowchart TD
    ActiveCV["Active Candidate CV Profile"] & JobBatch["Retrieved Job Listings"] --> MatchPipeline["5-Factor Target Match Engine"]
    
    subgraph Standard5Factor ["Standard 5-Factor Target Match Model"]
        MatchPipeline --> F1["Hard Skills & Keywords (40% Weight): Weighted & Synonym Match"]
        MatchPipeline --> F2["Semantic NLP & Embeddings (25% Weight): CosSim (70%) + BM25 (30%)"]
        MatchPipeline --> F3["Title & Seniority Alignment (15% Weight): Role Fit & Seniority"]
        MatchPipeline --> F4["Experience Duration & Recency (10% Weight): Years Requirement Fit"]
        MatchPipeline --> F5["Soft Skills & Competencies (10% Weight): Collaboration & Agile"]
    end
    
    F1 & F2 & F3 & F4 & F5 --> WeightedRank["Total Match Score = (0.40 * Hard) + (0.25 * NLP) + (0.15 * Title) + (0.10 * Exp) + (0.10 * Soft)"]
    WeightedRank --> SortDesc["Sort Jobs Descending by Total Match Score"]
    SortDesc --> ReturnRanked["Display Top 15-20 Ranked Job Cards with Rating Tier Badges in UI"]
```

---

### Use Case 5: Application Tailoring with Fact Critic Reflection Loop & Document Exports

```mermaid
flowchart TD
    SelectJob["User Selects Opportunity to Tailor"] --> RetrieveInsights["Retrieve or Auto-Fetch Company Insights from DB/Tavily"]
    RetrieveInsights --> TriggerAgent["Trigger Application Tailoring Agent"]
    
    TriggerAgent --> InitAttempt["Initialize: attempt = 1, feedback = empty"]
    
    subgraph CriticLoop ["Agentic Generator-Critic Loop (Max 3 Attempts)"]
        InitAttempt --> GenNode["Generator Node: Craft Full CV, Cover Letter, Outreach Email"]
        GenNode --> CriticNode{"Critic Node: Fact-Check Against Candidate's Original CV"}
        
        CriticNode -->|Pass: Zero hallucinations, accurate facts| CalcGap["Compute ATS Match Score Before vs After"]
        CriticNode -->|Fail: Invented unverified degree or skill| CheckAttempts{"Attempt < 3?"}
        
        CheckAttempts -->|Yes: Retry| IncrementAttempt["attempt += 1, pass Critic Feedback"] --> GenNode
        CheckAttempts -->|No: Exhausted| CalcGap
    end
    
    CalcGap --> RenderStudio["Render Application Studio with Inline Editors & Save to CRM CTA"]
    
    RenderStudio --> ExportActions{"User Clicks Download"}
    ExportActions -->|CV DOCX| DocxCV["Generate Microsoft Word CV (.docx)"]
    ExportActions -->|Letter DOCX| DocxLetter["Generate Microsoft Word Cover Letter (.docx)"]
    ExportActions -->|Email TXT| TxtEmail["Generate Plain Text Email (.txt)"]
    ExportActions -->|Semantic HTML| HtmlExport["Render Semantic HTML (/export/html)"]
```

---

### Use Case 6: 6-Stage Mini-CRM Pipeline Lifecycle

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

### Use Case 7: Stateful Mock Interview Multi-Turn Simulator

```mermaid
flowchart TD
    Start["User Starts Mock Interview"] --> SelectMode{"Select Mode"}
    
    SelectMode -->|General| InitGeneral["Load Custom User Domain (e.g. Machine Learning, Cloud)"]
    SelectMode -->|Technical| InitTech["Load Target Mini-CRM Job + Company Insights + Active CV"]
    SelectMode -->|Behavioral| InitBehav["Load Target Mini-CRM Job + Company Culture Values + Active CV"]
    
    InitGeneral & InitTech & InitBehav --> QuestionLoop["Generate Question 1 of N"]
    
    subgraph InterviewLoop ["Multi-Turn Interview State Machine"]
        QuestionLoop --> WaitAnswer["Wait for Candidate Answer (Text input locked during evaluation)"]
        WaitAnswer --> EvalResponse["Evaluate Response against Domain / JD / STAR Framework"]
        
        EvalResponse --> MicroFeedback["Generate Immediate Micro-Feedback & Rubric Ratings"]
        MicroFeedback --> NextQ["Generate Contextual Follow-Up Question"] --> QuestionLoop
    end
    
    InterviewLoop --> ConcludeAction["Candidate Clicks 'Conclude & Scorecard' or Completes Session"]
    ConcludeAction --> FinalScorecard["Compile Comprehensive Evaluation Scorecard & Hiring Recommendation"]
    FinalScorecard --> SaveSession["Persist Session to PostgreSQL"]
    SaveSession --> ExitCTA["Display Performance Breakdown + 'Exit Interview & Start New Session' Button"]
```

---

### Use Case 8: Conversational Career Roadmap Planner with Feasibility Critic

```mermaid
flowchart TD
    UserReq["User Sends Message in Roadmap Chat"] --> CheckInputs{"Required Inputs Present? (Target Role, Timeframe, Weekly Hours)"}
    
    CheckInputs -->|Missing Hours/Role| PromptUser["Input Gate: Prompt User to Specify Weekly Study Hours & Goal"]
    
    CheckInputs -->|All Fields Provided| LoadProfile["Read User Current Skills & Active CV"]
    
    LoadProfile --> SearchTrends["Tavily Tool: Query Live Market Skill Trends & In-Demand Frameworks"]
    SearchTrends --> InitRoadmapAttempt["Initialize: attempt = 1, feedback = empty"]
    
    subgraph FeasibilityCriticLoop ["Roadmap Generator-Critic Loop (Max 3 Attempts)"]
        InitRoadmapAttempt --> GenRoadmap["Generator Node: Budget Workload Realistic for (Weeks * Hours/Week)"]
        GenRoadmap --> FeasibilityCritic{"Feasibility Critic: Is Workload Feasible for Allocated Hours?"}
        
        FeasibilityCritic -->|Pass: Workload verified feasible| SaveRoadmap["Save to career_roadmaps Table in PostgreSQL"]
        FeasibilityCritic -->|Fail: Overambitious pacing| CheckRoadmapAttempts{"Attempt < 3?"}
        
        CheckRoadmapAttempts -->|Yes: Retry| IncrementRoadmap["attempt += 1, pass Critic Feedback"] --> GenRoadmap
        CheckRoadmapAttempts -->|No: Max attempts reached| SaveRoadmap
    end
    
    SaveRoadmap --> RenderRoadmap["Render Feasibility-Verified Milestones with Project Deliverables in Chat"]
```
