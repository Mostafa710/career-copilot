"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  FileText,
  Search,
  Sparkles,
  Layers,
  MessageSquare,
  Compass,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  Building,
  MapPin,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Send,
  Trash2,
  Award,
  BookOpen,
  Clock,
  ShieldCheck,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export default function CareerCopilotApp() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"cv" | "jobs" | "tailor" | "crm" | "interview" | "roadmap">("cv");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // User & CV State
  const [activeCV, setActiveCV] = useState<any>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // Job Search State
  const [searchQuery, setSearchQuery] = useState("Software Engineer");
  const [searchCountry, setSearchCountry] = useState("gb");
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [companyInsights, setCompanyInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);

  // Application Tailor State
  const [tailoredApp, setTailoredApp] = useState<any>(null);
  const [tailorLoading, setTailorLoading] = useState(false);

  // Mini-CRM State
  const [crmApplications, setCrmApplications] = useState<any[]>([]);

  // Mock Interview State
  const [interviewType, setInterviewType] = useState("Technical");
  const [interviewSession, setInterviewSession] = useState<any>(null);
  const [interviewTurns, setInterviewTurns] = useState<any[]>([]);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);

  // Roadmap State
  const [roadmapRole, setRoadmapRole] = useState("Cloud Architect");
  const [roadmapTimeframe, setRoadmapTimeframe] = useState("3 months");
  const [roadmapHours, setRoadmapHours] = useState(10);
  const [roadmapResult, setRoadmapResult] = useState<any>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState("");

  useEffect(() => {
    setMounted(true);
    fetchActiveCV();
    fetchCRM();
  }, []);

  const fetchActiveCV = async () => {
    try {
      const res = await fetch(`${API_BASE}/cv/active`);
      if (res.ok) {
        const data = await res.json();
        if (data.has_active_cv) {
          setActiveCV(data);
        }
      }
    } catch (e) {
      console.log("Active CV fetch note:", e);
    }
  };

  const fetchCRM = async () => {
    try {
      const res = await fetch(`${API_BASE}/application/crm`);
      if (res.ok) {
        const data = await res.json();
        setCrmApplications(data.applications || []);
      }
    } catch (e) {
      console.log("CRM fetch note:", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    setCvLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cv/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCV({
          has_active_cv: true,
          filename: data.filename,
          general_ats_score: data.general_ats_score,
          parsed_profile: data.parsed_profile,
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setCvLoading(false);
    }
  };

  const handlePasteCV = async () => {
    if (!pasteText.trim()) return;
    setCvLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cv/paste`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: pasteText }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCV({
          has_active_cv: true,
          filename: data.filename,
          general_ats_score: data.general_ats_score,
          parsed_profile: data.parsed_profile,
        });
        setPasteText("");
      }
    } catch (err) {
      console.error("Paste error:", err);
    } finally {
      setCvLoading(false);
    }
  };

  const handleSearchJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Job search error:", err);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleFetchInsights = async (job: any) => {
    setSelectedJob(job);
    setInsightsLoading(true);
    setInsightsModalOpen(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/${job.id}/insights`);
      if (res.ok) {
        const data = await res.json();
        setCompanyInsights(data.insights);
      }
    } catch (err) {
      console.error("Insights error:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleTailorApplication = async (job: any) => {
    setSelectedJob(job);
    setActiveTab("tailor");
    setTailorLoading(true);
    try {
      const res = await fetch(`${API_BASE}/application/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setTailoredApp(data);
      }
    } catch (err) {
      console.error("Tailor error:", err);
    } finally {
      setTailorLoading(false);
    }
  };

  const handleSaveToCRM = async () => {
    if (!tailoredApp || !selectedJob) return;
    try {
      const res = await fetch(`${API_BASE}/application/save-crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedJob.id,
          status: "Tailored",
          tailored_cv_data: tailoredApp.tailored_cv_data,
          cover_letter: tailoredApp.cover_letter,
          cold_email: tailoredApp.cold_email,
          ats_score_before: tailoredApp.ats_score_before,
          ats_score_after: tailoredApp.ats_score_after,
        }),
      });
      if (res.ok) {
        fetchCRM();
        setActiveTab("crm");
      }
    } catch (err) {
      console.error("CRM save error:", err);
    }
  };

  const handleStartInterview = async () => {
    setInterviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_type: interviewType,
          job_id: selectedJob?.id || null,
          total_turns: 5,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewSession(data);
        setInterviewTurns([{ role: "interviewer", content: data.question }]);
      }
    } catch (err) {
      console.error("Interview start error:", err);
    } finally {
      setInterviewLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim() || !interviewSession) return;
    const answer = candidateAnswer;
    setCandidateAnswer("");
    setInterviewTurns((prev) => [...prev, { role: "candidate", content: answer }]);

    setInterviewLoading(true);
    try {
      const res = await fetch(`${API_BASE}/interview/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: interviewSession.session_id,
          user_response: answer,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewSession((prev: any) => ({
          ...prev,
          current_turn: data.current_turn,
          is_completed: data.is_completed,
          final_evaluation: data.final_evaluation,
        }));
        if (data.micro_feedback) {
          setInterviewTurns((prev) => [
            ...prev,
            { role: "feedback", content: data.micro_feedback, star_score: data.star_score },
          ]);
        }
        if (data.next_question) {
          setInterviewTurns((prev) => [...prev, { role: "interviewer", content: data.next_question }]);
        }
      }
    } catch (err) {
      console.error("Turn error:", err);
    } finally {
      setInterviewLoading(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!roadmapRole.trim()) {
      setRoadmapError("Please enter your target role.");
      return;
    }
    if (!roadmapHours || roadmapHours <= 0) {
      setRoadmapError("Please specify how many hours per week you can study.");
      return;
    }
    setRoadmapError("");
    setRoadmapLoading(true);
    try {
      const res = await fetch(`${API_BASE}/roadmap/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_role: roadmapRole,
          timeframe: roadmapTimeframe,
          hours_per_week: roadmapHours,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmapResult(data.roadmap);
      } else {
        const errData = await res.json();
        setRoadmapError(errData.detail || "Roadmap generation failed.");
      }
    } catch (err) {
      console.error("Roadmap error:", err);
      setRoadmapError("Failed to connect to backend roadmap engine.");
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to permanently delete your account and all data? This cannot be undone.")) {
      try {
        await fetch(`${API_BASE}/auth/account`, { method: "DELETE" });
        setActiveCV(null);
        setJobs([]);
        setTailoredApp(null);
        setCrmApplications([]);
        setSettingsOpen(false);
        alert("Account and personal records permanently deleted.");
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-cyan-500 dark:from-indigo-400 dark:to-cyan-300 bg-clip-text text-transparent">
                Career Copilot
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                Multi-Agent AI
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {[
              { id: "cv", label: "CV Analysis", icon: FileText },
              { id: "jobs", label: "Job Matcher", icon: Search },
              { id: "tailor", label: "Application Studio", icon: Sparkles },
              { id: "crm", label: "Mini-CRM", icon: Layers },
              { id: "interview", label: "Mock Interview", icon: MessageSquare },
              { id: "roadmap", label: "Roadmap Planner", icon: Compass },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Actions: Theme & Settings */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-md ${theme === "light" ? "bg-white text-amber-500 shadow-sm" : "text-slate-500"}`}
                title="Light Mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-md ${theme === "dark" ? "bg-slate-800 text-indigo-400 shadow-sm" : "text-slate-500"}`}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`p-1.5 rounded-md ${theme === "system" ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm" : "text-slate-500"}`}
                title="System Mode"
              >
                <Laptop className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: CV ANALYSIS */}
        {activeTab === "cv" && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">CV Ingestion & General ATS Readiness</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Upload your CV (PDF/DOCX) or paste raw text. The engine runs a deterministic 100-point audit without hallucinations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Card */}
              <div className="glass-card p-6 lg:col-span-1 space-y-5">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Single Active CV Upload
                </h3>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="cv-upload-input"
                  />
                  <label htmlFor="cv-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                      Click to upload resume file
                    </span>
                    <span className="text-xs text-slate-500">Supports PDF (with OCR fallback) and DOCX</span>
                  </label>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or Paste Text</span>
                  </div>
                </div>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste your CV text here..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handlePasteCV}
                  disabled={cvLoading || !pasteText.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow transition-all"
                >
                  {cvLoading ? "Analyzing..." : "Analyze Pasted Text"}
                </button>
              </div>

              {/* General ATS Score Display */}
              <div className="glass-card p-6 lg:col-span-2 space-y-6">
                {activeCV?.general_ats_score ? (
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Active Resume: {activeCV.filename}
                        </span>
                        <h2 className="text-xl font-bold mt-0.5">Resume Readiness Audit</h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                            {activeCV.general_ats_score.overall_score}
                            <span className="text-sm text-slate-400 font-normal">/100</span>
                          </div>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Deterministic Score
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4 Categories */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
                      {[
                        { label: "Contact & Sections", val: activeCV.general_ats_score.category_scores.contact_and_sections, max: 25 },
                        { label: "Action Verbs", val: activeCV.general_ats_score.category_scores.action_verbs, max: 25 },
                        { label: "Quantifiable Impact", val: activeCV.general_ats_score.category_scores.quantifiable_impact, max: 25 },
                        { label: "Formatting & Skills", val: activeCV.general_ats_score.category_scores.formatting_and_skills, max: 25 },
                      ].map((cat, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                          <span className="text-xs text-slate-500 dark:text-slate-400 block">{cat.label}</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {cat.val}<span className="text-xs text-slate-400 font-normal">/{cat.max}</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Feedback Checklist */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        Actionable Improvement Checklist
                      </h4>
                      <div className="space-y-2">
                        {activeCV.general_ats_score.feedback_checklist?.length > 0 ? (
                          activeCV.general_ats_score.feedback_checklist.map((fb: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                              <span>{fb}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Your CV meets all baseline ATS hygiene, action verb, and metrics criteria!</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detected Skills */}
                    <div className="mt-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Detected Skills ({activeCV.parsed_profile?.skills_inventory?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {activeCV.parsed_profile?.skills_inventory?.map((s: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 text-xs rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm font-medium">No CV analyzed yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Upload a resume to see your score and actionable suggestions.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: JOB SEARCH & MATCHER */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Market Research & Job Matcher</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Dynamic backfill pagination delivers 7–10 deduplicated postings per search with instant company insights.
              </p>
            </div>

            {/* Search Bar */}
            <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Target Role or Skills (e.g. FastAPI, DevOps Engineer)..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleSearchJobs}
                disabled={jobsLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow"
              >
                {jobsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search 7–10 Jobs
              </button>
            </div>

            {/* Job Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job, idx) => (
                <div key={idx} className="glass-card p-5 flex flex-col justify-between space-y-4 hover:border-indigo-500 transition-all">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{job.title}</h3>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3.5 h-3.5" /> {job.company} • <MapPin className="w-3.5 h-3.5" /> {job.location || "Remote"}
                        </span>
                      </div>
                      {job.match_score !== undefined && (
                        <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {job.match_score}% Match
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-3">
                      {job.description}
                    </p>

                    {/* Matched & Missing Skills */}
                    {job.matched_skills && job.matched_skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {job.matched_skills.slice(0, 4).map((ms: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                            ✓ {ms}
                          </span>
                        ))}
                        {job.missing_skills?.slice(0, 2).map((ms: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                            + {ms}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleFetchInsights(job)}
                      className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                    >
                      <Building className="w-3.5 h-3.5" /> Company Insights
                    </button>
                    <button
                      onClick={() => handleTailorApplication(job)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Tailor Application
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {jobs.length === 0 && !jobsLoading && (
              <div className="glass-card py-16 text-center text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-medium">Ready to search market postings.</p>
                <p className="text-xs text-slate-400 mt-1">Click "Search 7–10 Jobs" above to retrieve live openings.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APPLICATION STUDIO */}
        {activeTab === "tailor" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Application Studio (Fact-Checked)</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Tailored experience, cover letter, and cold email. Verified by Critic against your original CV.
                </p>
              </div>
              {tailoredApp && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveToCRM}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow"
                  >
                    Save to Mini-CRM
                  </button>
                </div>
              )}
            </div>

            {tailorLoading ? (
              <div className="glass-card py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-500" />
                <p className="text-sm font-semibold">Agent tailoring experience & running Fact Critic...</p>
                <p className="text-xs text-slate-400">Verifying zero hallucinations against your original CV.</p>
              </div>
            ) : tailoredApp ? (
              <div className="space-y-6">
                {/* Fact Critic Badge */}
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                        Fact Critic Validation Passed (Attempt {tailoredApp.critic_attempts})
                      </span>
                      <span className="text-xs text-emerald-700 dark:text-emerald-400">
                        100% verified against original experience. Zero invented skills or dates.
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">ATS Match Delta:</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {tailoredApp.ats_score_before}% → <span className="text-emerald-600">{tailoredApp.ats_score_after}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tailored Experience */}
                  <div className="glass-card p-5 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" /> Tailored Experience Bullets
                    </h3>
                    <div className="space-y-4">
                      {tailoredApp.tailored_cv_data?.experience?.map((exp: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <strong className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {exp.title} — {exp.company}
                          </strong>
                          <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                            {exp.bullets?.map((b: string, j: number) => (
                              <li key={j}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cover Letter & Email */}
                  <div className="glass-card p-5 space-y-5">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Cover Letter</h3>
                      <textarea
                        value={tailoredApp.cover_letter}
                        onChange={(e) => setTailoredApp({ ...tailoredApp, cover_letter: e.target.value })}
                        rows={7}
                        className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Cold Outreach Email</h3>
                      <textarea
                        value={tailoredApp.cold_email}
                        onChange={(e) => setTailoredApp({ ...tailoredApp, cold_email: e.target.value })}
                        rows={5}
                        className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card py-16 text-center text-slate-500">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-medium">Select a job posting in Job Matcher to tailor your application.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MINI-CRM */}
        {activeTab === "crm" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Application Tracker (Mini-CRM)</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Track your active job applications across all stages.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {["Tailored", "Applied", "Interviewing", "Offered"].map((colStatus) => {
                const colApps = crmApplications.filter((a) => a.status === colStatus);
                return (
                  <div key={colStatus} className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{colStatus}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        {colApps.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {colApps.map((app, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{app.title}</h4>
                          <span className="text-[11px] text-slate-500 block">{app.company}</span>
                          {app.ats_score_after && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              ATS Match: {app.ats_score_after}%
                            </span>
                          )}
                        </div>
                      ))}
                      {colApps.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-6">No applications in this stage</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: MOCK INTERVIEW */}
        {activeTab === "interview" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Interactive Mock Interview Simulator</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Dynamic multi-turn interview with real-time micro-feedback and STAR rubric evaluation.
              </p>
            </div>

            {!interviewSession ? (
              <div className="glass-card p-6 max-w-xl mx-auto space-y-5 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-indigo-500" />
                <h3 className="text-base font-bold">Configure Your Interview Session</h3>
                
                <div className="flex justify-center gap-2">
                  {["General", "Technical", "Behavioral"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setInterviewType(mode)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        interviewType === mode
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {mode} Mode
                    </button>
                  ))}
                </div>

                <p className="text-xs text-slate-500">
                  {interviewType === "Behavioral" && "Evaluates answers strictly on the STAR method (Situation, Task, Action, Result)."}
                  {interviewType === "Technical" && "Probes technical depth, architectures, and system tradeoffs based on target role."}
                  {interviewType === "General" && "Covers introduction, motivation, and career communication."}
                </p>

                <button
                  onClick={handleStartInterview}
                  disabled={interviewLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow"
                >
                  {interviewLoading ? "Starting..." : "Start 5-Turn Mock Interview"}
                </button>
              </div>
            ) : (
              <div className="glass-card p-6 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                    {interviewSession.interview_type} Interview — Turn {interviewSession.current_turn || 1}/5
                  </span>
                  {interviewSession.is_completed && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
                      Completed
                    </span>
                  )}
                </div>

                {/* Turns Chat Box */}
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                  {interviewTurns.map((turn, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl text-xs ${
                        turn.role === "interviewer"
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60"
                          : turn.role === "feedback"
                          ? "bg-amber-50/80 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50"
                          : "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ml-8"
                      }`}
                    >
                      <strong className="block font-bold mb-1 text-slate-900 dark:text-slate-100">
                        {turn.role === "interviewer" ? "🎙️ Interviewer:" : turn.role === "feedback" ? "💡 Micro-Feedback:" : "👤 You:"}
                      </strong>
                      <p className="leading-relaxed text-slate-700 dark:text-slate-300">{turn.content}</p>
                    </div>
                  ))}
                </div>

                {/* Scorecard on Completion */}
                {interviewSession.final_evaluation && (
                  <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <Award className="w-4 h-4" /> Final Evaluation Scorecard
                      </h4>
                      <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {interviewSession.final_evaluation.overall_score}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Recommendation: <strong>{interviewSession.final_evaluation.hiring_recommendation}</strong>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {interviewSession.final_evaluation.star_method_assessment || interviewSession.final_evaluation.technical_depth_assessment}
                    </p>
                  </div>
                )}

                {!interviewSession.is_completed && (
                  <div className="flex gap-2">
                    <textarea
                      value={candidateAnswer}
                      onChange={(e) => setCandidateAnswer(e.target.value)}
                      placeholder="Type your answer using the STAR method..."
                      rows={3}
                      className="flex-1 text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={interviewLoading || !candidateAnswer.trim()}
                      className="px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: CAREER ROADMAP */}
        {activeTab === "roadmap" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Market-Aware Career Roadmap Planner</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Phased learning milestones verified by the Feasibility Critic against your study hours budget.
              </p>
            </div>

            {/* Input Gate Form */}
            <div className="glass-card p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Target Role *
                  </label>
                  <input
                    type="text"
                    value={roadmapRole}
                    onChange={(e) => setRoadmapRole(e.target.value)}
                    placeholder="e.g. Cloud Architect, ML Engineer"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Timeframe *
                  </label>
                  <select
                    value={roadmapTimeframe}
                    onChange={(e) => setRoadmapTimeframe(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="3 months">3 Months (Intensive)</option>
                    <option value="6 months">6 Months (Standard)</option>
                    <option value="1 year">1 Year (Comprehensive)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Weekly Study Hours: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{roadmapHours} hrs/week</span>
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="35"
                    step="1"
                    value={roadmapHours}
                    onChange={(e) => setRoadmapHours(Number(e.target.value))}
                    className="w-full accent-indigo-600 mt-2"
                  />
                </div>
              </div>

              {roadmapError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {roadmapError}
                </div>
              )}

              <button
                onClick={handleGenerateRoadmap}
                disabled={roadmapLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow flex items-center justify-center gap-2"
              >
                {roadmapLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
                Generate Feasibility-Verified Roadmap
              </button>
            </div>

            {/* Render Roadmap Milestones */}
            {roadmapResult && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                      {roadmapResult.target_role} — {roadmapResult.timeframe} Roadmap
                    </h3>
                    <span className="text-xs text-indigo-700 dark:text-indigo-400">
                      Study Budget: {roadmapResult.total_study_budget_hours} Total Hours ({roadmapResult.hours_per_week} hrs/week)
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                    Feasibility Critic Passed
                  </span>
                </div>

                <div className="space-y-4">
                  {roadmapResult.milestones?.map((m: any, i: number) => (
                    <div key={i} className="glass-card p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{m.title}</h4>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {m.duration_weeks} Weeks ({m.allocated_hours} hrs)
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {m.core_topics?.map((topic: string, j: number) => (
                          <span key={j} className="text-[11px] px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                            {topic}
                          </span>
                        ))}
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                        <strong className="text-indigo-600 dark:text-indigo-400">Deliverable Project: </strong>
                        <span className="text-slate-700 dark:text-slate-300">{m.hands_on_project}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Company Insights Modal */}
      {insightsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 space-y-4 bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-500" />
                {selectedJob?.company || "Company"} Insights
              </h3>
              <button
                onClick={() => setInsightsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {insightsLoading ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-indigo-500" />
                <p className="text-xs text-slate-500">Querying company intelligence...</p>
              </div>
            ) : companyInsights ? (
              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <p className="leading-relaxed">{companyInsights.summary}</p>
                {companyInsights.culture_values && (
                  <div>
                    <strong className="block font-bold text-slate-900 dark:text-slate-100 mb-1">Culture & Values:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      {companyInsights.culture_values.map((v: string, i: number) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No additional company notes available.</p>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-5 bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-indigo-500" /> Settings & Preferences
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-200 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Theme Mode</label>
                <div className="flex gap-2">
                  {["light", "dark", "system"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-3 py-1.5 rounded-lg font-semibold capitalize ${
                        theme === t ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Active CV Status</label>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {activeCV?.filename || "No active CV"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Single Active Policy: Uploading a new CV automatically deletes the old file.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete Account & Purge Data
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-1.5">
                  Permanently deletes your profile, applications, sessions, and files.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
