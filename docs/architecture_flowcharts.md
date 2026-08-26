# Career Copilot: Architecture & Agent Flowcharts

Standalone reference document containing the global architecture and complete workflow flowcharts for all agents and use cases in **Career Copilot**.

---

## 1. Global System Architecture

```mermaid
flowchart TD
    User["User / Browser"] <-->|HTTPS / SSL| Vercel["Next.js Frontend on Vercel (Light / Dark / System)"]
    Vercel <-->|HTTPS / ACM Port 443| ALB["AWS Application Load Balancer"]
    
    subgraph AutoScalingGroup ["AWS Cloud Auto-Scaling Group"]
        subgraph Worker1 ["Worker 1"]
            API1["FastAPI Instance 1"] <--> LG1["LangGraph Engine 1"]
        end
        subgraph Worker2 ["Worker 2"]
            API2["FastAPI Instance 2"] <--> LG2["LangGraph Engine 2"]
        end
        subgraph WorkerN ["Worker N"]
            APIn["FastAPI Instance N"] <--> LGn["LangGraph Engine N"]
        end
    end

    ALB --> API1 & API2 & APIn

    SharedDB["PostgreSQL on RDS + pgvector (PostgresSaver Checkpointer + App Data)"]
    S3["AWS S3 Bucket (Active CV + Exported PDFs/DOCX)"]

    LG1 & LG2 & LGn <--> SharedDB
    API1 & API2 & APIn <--> SharedDB
    API1 & API2 & APIn <--> S3

    subgraph AgentsLayer ["Agents & Core Engines"]
        Agent_CV["CV Ingestion & Profiler (pdfplumber + pytesseract)"]
        ATS_Gen["General ATS Readiness Engine (Format + Impact + Structure)"]
        Agent_MR["Market Research Agent (Adzuna Dynamic Backfill)"]
        Agent_JM["Job Matching & Ranking (Embeddings + LLM Evaluator)"]
        ATS_Job["Job-Specific ATS Engine (Keyword Gap + Overlap)"]
        Agent_APP["Application Tailoring Agent (with Fact Critic Loop)"]
        Agent_INT["Mock Interview Agent (Stateful Multi-Turn + STAR)"]
        Agent_CR["Career Roadmap Agent (with Feasibility Critic Loop)"]
        Tool_Tavily["On-Demand Tavily Tool (Company Insights & Market Trends)"]
    end

    LG1 & LG2 & LGn --> Agent_CV & ATS_Gen & Agent_MR & Agent_JM & ATS_Job & Agent_APP & Agent_INT & Agent_CR
    Agent_APP & Agent_INT & Agent_CR <--> Tool_Tavily
    
    subgraph Observability ["Observability & Tracing"]
        LS["LangSmith Tracing Project: career-copilot"]
    end
    LG1 & LG2 & LGn -. Hierarchical Traces .-> LS
```

---

## 2. LangSmith Observability & Tracing Hierarchy

```mermaid
flowchart TD
    Root["Project: career-copilot"] --> Trace1["Trace: cv_analysis_pipeline"]
    Root --> Trace2["Trace: market_research_agent"]
    Root --> Trace3["Trace: job_matching_ranking"]
    Root --> Trace4["Trace: application_tailoring_pipeline"]
    Root --> Trace5["Trace: mock_interview_session"]
    Root --> Trace6["Trace: career_roadmap_agent"]

    subgraph CV_Traces ["cv_analysis_pipeline spans"]
        Trace1 --> S1_1["span: document_text_extraction"]
        Trace1 --> S1_2["span: pydantic_schema_extraction"]
        Trace1 --> S1_3["span: deterministic_general_ats_scoring"]
        Trace1 --> S1_4["span: pgvector_profile_embedding"]
    end

    subgraph MR_Traces ["market_research_agent spans"]
        Trace2 --> S2_1["span: query_intent_infilling"]
        Trace2 --> S2_2["span: adzuna_pagination_backfill_loop"]
        Trace2 --> S2_3["span: deduplication_and_filtering"]
    end

    subgraph App_Traces ["application_tailoring_pipeline spans"]
        Trace4 --> S4_1["span: cached_or_tavily_company_research"]
        Trace4 --> S4_2["span: ats_experience_rephrasing"]
        Trace4 --> S4_3["span: cover_letter_generation"]
        Trace4 --> S4_4["span: critic_fact_validation_node"]
        Trace4 --> S4_5["span: hitl_interrupt_and_resume"]
    end

    subgraph Interview_Traces ["mock_interview_session spans"]
        Trace5 --> S5_1["span: turn_n_question_generation"]
        Trace5 --> S5_2["span: answer_evaluation_star_rubric"]
        Trace5 --> S5_3["span: micro_feedback_generation"]
        Trace5 --> S5_4["span: final_scorecard_compilation"]
    end

    subgraph Roadmap_Traces ["career_roadmap_agent spans"]
        Trace6 --> S6_1["span: input_completeness_validation"]
        Trace6 --> S6_2["span: market_trends_retrieval"]
        Trace6 --> S6_3["span: milestone_generation_by_hours"]
        Trace6 --> S6_4["span: feasibility_critic_node"]
    end
```

---

## 3. Agent Use-Case Flowcharts

---

### Use Case 1: CV Ingestion, General ATS Readiness & Single Active CV

```mermaid
flowchart TD
    Upload["User Uploads File or Pastes Text"] --> CheckType{"Input Format"}
    
    CheckType -->|Raw Text| Sanitize["Text Sanitizer & Normalizer"]
    CheckType -->|DOCX File| DocxParser["python-docx Parser"] --> Sanitize
    CheckType -->|PDF File| PdfParser["pdfplumber Extractor"]
    
    PdfParser --> IsEmpty{"Text Extracted?"}
    IsEmpty -->|Yes| Sanitize
    IsEmpty -->|No or Scanned Image| OCR["Fallback: pytesseract OCR"] --> Sanitize
    
    Sanitize --> DeleteOld["Hard Delete Previous S3 File & DB Profile Records"]
    DeleteOld --> SaveS3["Save New Raw File to S3: s3://resumes/user_id/active_cv"]
    
    Sanitize --> StructExt["Pydantic Structured Extractor (Skills, Experience, Education, Contact)"]
    StructExt --> Vectorize["Generate Profile Embedding via Text-Embedding Model"]
    
    StructExt --> GenATS["Deterministic General ATS Engine"]
    
    subgraph GenBreakdown ["General ATS Readiness Breakdown"]
        GenATS --> FormatCheck["Format & Contact Check"]
        GenATS --> ActionRatio["Action Verb & Metric Density Ratio"]
        GenATS --> SkillInv["Categorized Skill Inventory"]
    end
    
    FormatCheck & ActionRatio & SkillInv --> SaveProfile["Save to user_profiles Table in PostgreSQL"]
    Vectorize --> SaveProfile
    SaveProfile --> ReturnGenReport["Return Profile & ATS Readiness Score to UI"]
```

---

### Use Case 2: Market Research Agent with Dynamic Backfill Pagination

```mermaid
flowchart TD
    UserQuery["User Search Query"] --> CheckInput{"Did user specify explicit criteria?"}
    
    CheckInput -->|Explicit Query| UseExplicit["Extract explicit Role, Location, Remote flag"]
    CheckInput -->|General Query| Infill["Infill from User Settings & Active CV Profile"]
    
    UseExplicit & Infill --> InitState["Initialize: page = 1, collected_jobs = empty"]
    
    subgraph BackfillLoop ["Dynamic Backfill Pagination Loop - Max 3 Attempts"]
        InitState --> CallAdzuna["Call Adzuna API: results_per_page = 10, page = page"]
        CallAdzuna --> FilterDup["Deduplicate against adzuna_id & User Applied/Rejected DB Records"]
        FilterDup --> Accumulate["Add unique jobs to collected_jobs"]
        
        Accumulate --> CheckCount{"Count in range 7 to 10?"}
        
        CheckCount -->|Target Reached: 7 to 10| FinalSlice["Slice top 10 distinct jobs"]
        CheckCount -->|Below 7 and attempts under 3| IncrementPage["page += 1"] --> CallAdzuna
        CheckCount -->|Pool Exhausted: Under 7 Available| FinalSlice
    end
    
    FinalSlice --> StoreNewJobs["Upsert Delivered Jobs into jobs Table"]
    StoreNewJobs --> ReturnJobs["Return 7 to 10 Distinct Job Cards to UI"]
```

---

### Use Case 3: On-Demand Company Insights Caching & Debouncing

```mermaid
flowchart TD
    Click["User clicks Company Insights on a Job Card"] --> ClientCache{"Cached in Frontend TanStack Query?"}
    
    ClientCache -->|Yes: Already viewed| OpenModalInstant["Open Modal instantly from Browser RAM (0 Network Calls)"]
    
    ClientCache -->|No: First click| DebounceBtn["Disable button and Show Spinner"]
    DebounceBtn --> ApiReq["Request to FastAPI endpoint for job insights"]
    
    ApiReq --> CheckDBCache{"PostgreSQL company_insights column is NOT NULL?"}
    
    CheckDBCache -->|Yes: Previously retrieved| ReturnFromDB["Return DB Record in sub-5ms (0 Tavily Calls)"]
    CheckDBCache -->|No: Needs search| FetchTavily["Call Tavily API Search Tool"]
    
    FetchTavily --> SaveDB["Update jobs table: set company_insights = payload"]
    SaveDB --> ReturnFromDB
    
    ReturnFromDB --> RenderUI["Render Insights Modal & Cache in Browser"]
```

---

### Use Case 4: Job Matching & Ranking Engine

```mermaid
flowchart TD
    ActiveCV["User Active CV Profile"] & JobBatch["7 to 10 Retrieved Jobs"] --> MatchPipeline["Hybrid Matching Pipeline"]
    
    subgraph HybridPipeline ["Hybrid Matching Pipeline"]
        MatchPipeline --> VectorSim["Vector Cosine Similarity: CV Vector vs Job Vectors"]
        MatchPipeline --> StructLLM["Structured Extraction of Job Requirements via LLM"]
        
        StructLLM --> RuleScorer["Deterministic Formula Scoring Engine"]
        
        subgraph MathScore ["Mathematical Scoring"]
            RuleScorer --> CalcOverlap["Skill Overlap Score: Matched / Required"]
            RuleScorer --> CalcExp["Experience Level Alignment Score"]
        end
    end
    
    VectorSim & CalcOverlap & CalcExp --> WeightedRank["Weighted Total Match Score (0 to 100%)"]
    WeightedRank --> SortDesc["Sort 7 to 10 Jobs by Score Descending"]
    SortDesc --> ReturnRanked["Display Ranked Jobs with Match Badge & Gap Preview in UI"]
```

---

### Use Case 5: Application Tailoring with Fact Critic Reflection Loop

```mermaid
flowchart TD
    SelectJob["User Selects a Ranked Job"] --> TriggerAgent["Trigger Application Tailoring Agent"]
    
    TriggerAgent --> InitAttempt["Initialize: attempt = 1, feedback = empty"]
    
    subgraph CriticLoop ["Agentic Generator-Critic Loop (Max 3 Total Attempts)"]
        InitAttempt --> GenNode["Generator Node: Craft Tailored CV Bullets, Cover Letter, Email"]
        GenNode --> CriticNode{"Critic Node: Fact-Check Against Original CV"}
        
        CriticNode -->|Pass: Zero hallucinations, accurate ATS keywords| CalcGap["Compute Before vs After ATS Keyword Gap Score"]
        CriticNode -->|Fail: Invented fake skill or hallucinated date| CheckAttempts{"Attempt < 3?"}
        
        CheckAttempts -->|Yes: Retry| IncrementAttempt["attempt += 1, pass Critic Feedback"] --> GenNode
        CheckAttempts -->|No: Max attempts reached| CalcGap
    end
    
    CalcGap --> Interrupt["LangGraph HITL Interrupt: Pause Execution & Render UI Diff View"]
    
    subgraph HITLReview ["HITL Review in UI"]
        Interrupt --> UserReview{"User Action in UI"}
        UserReview -->|Edit Inline| UserEdit["User modifies text directly"]
        UserReview -->|Regenerate| AdjustPrompt["User adds manual feedback"] --> TriggerAgent
        UserReview -->|Approve| Confirm["Save to Mini-CRM as Tailored"]
        UserReview -->|Reject| Discard["Discard Draft Assets"]
    end
    
    Confirm --> ExportOpt{"User Clicks Export"}
    
    subgraph Exporters ["Document Exporters"]
        ExportOpt -->|Export DOCX| DocxTpl["python-docx-template Engine"] --> OutDocx["Download .docx"]
        ExportOpt -->|Export PDF| WeasyPrint["WeasyPrint HTML/CSS Engine"] --> OutPDF["Download .pdf"]
    end
```

---

### Use Case 6: Mini-CRM Application Tracking Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Saved: User saves interesting job posting
    Saved --> Tailored: Application Agent generates & user approves assets
    Tailored --> Applied: User submits application to company
    
    Applied --> Interviewing: Recruiter reaches out / schedules interview
    Applied --> Rejected: Received rejection email
    
    Interviewing --> Offered: Passed interview rounds & received offer
    Interviewing --> Rejected: Interview process ended
```

---

### Use Case 7: Mock Interview Multi-Turn State Machine

```mermaid
flowchart TD
    Start["User Starts Mock Interview"] --> SelectMode{"Select Mode"}
    
    SelectMode -->|General| InitGeneral["Load General Interview Persona"]
    SelectMode -->|Technical| InitTech["Load Target JD + Company Insights + Active CV Context"]
    SelectMode -->|Behavioral| InitBehav["Load Soft Skills & STAR Rubric Persona"]
    
    InitGeneral & InitTech & InitBehav --> QuestionLoop["Generate Question 1 of N"]
    
    subgraph InterviewLoop ["Multi-Turn Loop with PostgresSaver Checkpoint"]
        QuestionLoop --> WaitAnswer["Wait for User Response in UI"]
        WaitAnswer --> EvalResponse["Evaluate Answer"]
        
        EvalResponse --> CheckRubric{"Mode is Behavioral?"}
        CheckRubric -->|Yes| STAREval["Score on Situation, Task, Action, Result"]
        CheckRubric -->|No| TechEval["Score on Technical Accuracy & Depth"]
        
        STAREval & TechEval --> MicroFeedback["Generate Immediate Micro-Feedback"]
        MicroFeedback --> IsLastQ{"Questions Completed?"}
        
        IsLastQ -->|No| NextQ["Generate Contextual Follow-Up or Next Question"] --> QuestionLoop
        IsLastQ -->|Yes| FinalReport["Compile Comprehensive Evaluation Scorecard"]
    end
    
    FinalReport --> SaveSession["Save to interview_sessions Table"]
    SaveSession --> DisplayScorecard["Display Performance Breakdown & Areas to Improve in UI"]
```

---

### Use Case 8: Market-Aware Career Roadmap with Hours Validation & Feasibility Critic

```mermaid
flowchart TD
    UserReq["User Requests Roadmap"] --> CheckInputs{"Required Inputs Present? (Role, Timeframe, Study Hours/Week)"}
    
    CheckInputs -->|Missing Fields| PromptUser["UI Validation Prompt: Please enter Target Role, Timeframe, and Hours/Week"]
    
    CheckInputs -->|All Fields Provided| LoadProfile["Read User Current Skills & CV"]
    
    LoadProfile --> SearchTrends["Tavily Tool: Query Current Market Skill Trends & Tools"]
    SearchTrends --> InitRoadmapAttempt["Initialize: attempt = 1, feedback = empty"]
    
    subgraph FeasibilityCriticLoop ["Roadmap Generator-Critic Loop (Max 3 Attempts)"]
        InitRoadmapAttempt --> GenRoadmap["Generator Node: Plan Phased Milestones Based on Total Study Hours Budget"]
        GenRoadmap --> FeasibilityCritic{"Feasibility Critic: Is Workload Realistic for Allocated Hours?"}
        
        FeasibilityCritic -->|Pass: Workload fits hours and has realistic project milestones| SaveRoadmap["Save to career_roadmaps Table in PostgreSQL"]
        FeasibilityCritic -->|Fail: Overambitious pacing or illogical sequence| CheckRoadmapAttempts{"Attempt < 3?"}
        
        CheckRoadmapAttempts -->|Yes: Retry| IncrementRoadmap["attempt += 1, pass Critic Feedback"] --> GenRoadmap
        CheckRoadmapAttempts -->|No: Max attempts reached| SaveRoadmap
    end
    
    SaveRoadmap --> RenderRoadmap["Render Interactive Timeline & Project Milestones in UI"]
```
