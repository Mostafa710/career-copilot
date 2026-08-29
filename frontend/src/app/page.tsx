"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import PublicLanding from "./components/PublicLanding";
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
  LogOut,
  Lock,
  Mail,
  UserCheck,
  ChevronRight,
  StopCircle,
  Eye,
  EyeOff,
  BookmarkPlus,
  ExternalLink,
  Terminal,
  Activity,
  Cpu,
  CornerDownRight,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export default function CareerCopilotApp() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"cv" | "jobs" | "tailor" | "crm" | "interview" | "roadmap">("cv");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Authentication State
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [authPanelOpen, setAuthPanelOpen] = useState(false);

  // User & CV State
  const [activeCV, setActiveCV] = useState<any>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [selectedCVFile, setSelectedCVFile] = useState<File | null>(null);
  const [cvVersions, setCvVersions] = useState<any[]>([]);
  const [cvReviewMode, setCvReviewMode] = useState<"targeted" | "general">("targeted");
  const [targetRole, setTargetRole] = useState("");
  const [targetJobDescription, setTargetJobDescription] = useState("");
  const [cvReview, setCvReview] = useState<any>(null);
  const [cvReviewLoading, setCvReviewLoading] = useState(false);
  const [cvReviewError, setCvReviewError] = useState("");
  const [suggestionDecisions, setSuggestionDecisions] = useState<Record<string, "accepted" | "ignored">>({});
  const [suggestionEdits, setSuggestionEdits] = useState<Record<string, string>>({});

  // Job Search & Matcher Modal State
  const [searchQuery, setSearchQuery] = useState("Software Engineer");
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedMatcherJob, setSelectedMatcherJob] = useState<any>(null);
  const [jobDetailsModalOpen, setJobDetailsModalOpen] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [companyInsights, setCompanyInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Application Tailor State
  const [tailoredApp, setTailoredApp] = useState<any>(null);
  const [tailorLoading, setTailorLoading] = useState(false);

  // Mini-CRM State (All 6 Stages)
  const [crmApplications, setCrmApplications] = useState<any[]>([]);
  const [selectedCRMApp, setSelectedCRMApp] = useState<any>(null);
  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Mock Interview State
  const [interviewType, setInterviewType] = useState<"General" | "Technical" | "Behavioral">("Technical");
  const [interviewDomain, setInterviewDomain] = useState("Artificial Intelligence & Machine Learning");
  const [selectedInterviewJobId, setSelectedInterviewJobId] = useState<string>("");
  const [interviewSession, setInterviewSession] = useState<any>(null);
  const [interviewTurns, setInterviewTurns] = useState<any[]>([]);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [endingInterview, setEndingInterview] = useState(false);

  // Conversational Roadmap Chat State
  const [roadmapMessages, setRoadmapMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "Tell me what outcome you want. I can use your CV to plan a job search, relocation, career transition, or a learning roadmap—and I’ll ask only the next question that matters.",
    },
  ]);
  const [roadmapInput, setRoadmapInput] = useState("");
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const roadmapChatEndRef = useRef<HTMLDivElement>(null);

  // Check Local Auth Token on Mount
  useEffect(() => {
    setMounted(true);
    const storedToken = localStorage.getItem("career_copilot_token");
    const storedEmail = localStorage.getItem("career_copilot_email");
    if (storedToken) {
      setToken(storedToken);
      if (storedEmail) setUserEmail(storedEmail);
      fetchActiveCV(storedToken);
      fetchCVVersions(storedToken);
      fetchCRM(storedToken);
    }
  }, []);

  useEffect(() => {
    roadmapChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roadmapMessages]);

  // Authenticated Fetch Helper
  const authFetch = async (endpoint: string, options: RequestInit = {}, authToken = token) => {
    const headers = new Headers(options.headers || {});
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
    if (res.status === 401) {
      handleLogout();
    }
    return res;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const url = authMode === "login" ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data.detail || (authMode === "login" ? "Invalid email or password." : "Registration failed."));
        return;
      }

      setToken(data.access_token);
      setUserEmail(data.email);
      localStorage.setItem("career_copilot_token", data.access_token);
      localStorage.setItem("career_copilot_email", data.email);

      fetchActiveCV(data.access_token);
      fetchCVVersions(data.access_token);
      fetchCRM(data.access_token);
    } catch (err: any) {
      setAuthError("Unable to connect to backend server. Ensure API is running on port 8000.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserEmail("");
    setActiveCV(null);
    setJobs([]);
    setTailoredApp(null);
    setCrmApplications([]);
    setInterviewSession(null);
    setAuthPanelOpen(false);
    localStorage.removeItem("career_copilot_token");
    localStorage.removeItem("career_copilot_email");
  };

  const fetchActiveCV = async (authToken = token) => {
    try {
      const res = await authFetch("/cv/active", {}, authToken);
      if (res.ok) {
        const data = await res.json();
        if (data.has_active_cv) {
          setActiveCV(data);
        }
      }
    } catch (e) {
      console.log("CV fetch note:", e);
    }
  };

  const fetchCRM = async (authToken = token) => {
    try {
      const res = await authFetch("/application/crm", {}, authToken);
      if (res.ok) {
        const data = await res.json();
        setCrmApplications(data.applications || []);
      }
    } catch (e) {
      console.log("CRM fetch note:", e);
    }
  };

  const fetchCVVersions = async (authToken = token) => {
    try {
      const res = await authFetch("/cv/versions", {}, authToken);
      if (res.ok) {
        const data = await res.json();
        setCvVersions(data.versions || []);
      }
    } catch (e) {
      console.log("CV versions fetch note:", e);
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setSelectedCVFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedCVFile) return;
    const file = selectedCVFile;
    const formData = new FormData();
    formData.append("file", file);

    setCvLoading(true);
    try {
      const res = await authFetch("/cv/upload", {
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
        setSelectedCVFile(null);
        fetchCVVersions();
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
      const res = await authFetch("/cv/paste", {
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
        fetchCVVersions();
      }
    } catch (err) {
      console.error("Paste error:", err);
    } finally {
      setCvLoading(false);
    }
  };

  const handleCVReview = async (mode = cvReviewMode) => {
    if (!activeCV) {
      setCvReviewError("Upload or paste your CV first.");
      return;
    }
    setCvReviewError("");
    setCvReviewLoading(true);
    setSuggestionDecisions({});
    try {
      const res = await authFetch("/cv/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          target_role: mode === "targeted" ? targetRole : null,
          job_description: mode === "targeted" ? targetJobDescription : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCvReviewError(typeof data.detail === "string" ? data.detail : "The review could not be completed.");
        return;
      }
      setCvReview(data);
      setSuggestionEdits(Object.fromEntries((data.suggestions || []).map((item: any) => [item.id, item.suggested_text])));
    } catch (err) {
      console.error("CV review error:", err);
      setCvReviewError("Unable to connect to the CV review service.");
    } finally {
      setCvReviewLoading(false);
    }
  };

  const copyAcceptedCorrections = async () => {
    const accepted = (cvReview?.suggestions || [])
      .filter((item: any) => suggestionDecisions[item.id] === "accepted")
      .map((item: any) => `${item.section}\n${suggestionEdits[item.id] || item.suggested_text}`)
      .join("\n\n");
    if (accepted) await navigator.clipboard.writeText(accepted);
  };

  const copyTailoredCVText = async (cvData: any) => {
    if (!cvData) return;
    const experience = (cvData.experience || []).map((exp: any) =>
      `${exp.title || ""} — ${exp.company || ""}\n${(exp.bullets || []).map((bullet: string) => `• ${bullet}`).join("\n")}`
    ).join("\n\n");
    const text = [
      cvData.professional_summary ? `PROFESSIONAL SUMMARY\n${cvData.professional_summary}` : "",
      cvData.skills?.length ? `SKILLS\n${cvData.skills.join(", ")}` : "",
      experience ? `EXPERIENCE\n${experience}` : "",
    ].filter(Boolean).join("\n\n");
    if (text) await navigator.clipboard.writeText(text);
  };

  const handleSearchJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await authFetch("/jobs/search", {
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

  const handleSaveJobToCRM = async (job: any) => {
    try {
      const res = await authFetch("/application/save-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id, status: "Saved" }),
      });
      if (res.ok) {
        fetchCRM();
        alert(`Saved "${job.title}" to Mini-CRM!`);
      }
    } catch (err) {
      console.error("Save job error:", err);
    }
  };

  const handleOpenJobDetails = (job: any, autoExpandInsights = false) => {
    setSelectedMatcherJob(job);
    setSelectedJob(job);
    setJobDetailsModalOpen(true);
    setCompanyInsights(job.company_insights || null);
    if (autoExpandInsights) {
      setInsightsExpanded(true);
      if (!job.company_insights) {
        fetchInsightsForJob(job);
      }
    } else {
      setInsightsExpanded(false);
    }
  };

  const fetchInsightsForJob = async (job: any) => {
    setInsightsLoading(true);
    try {
      const res = await authFetch(`/jobs/${job.id}/insights`);
      if (res.ok) {
        const data = await res.json();
        setCompanyInsights(data.insights);
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, company_insights: data.insights } : j)));
      }
    } catch (err) {
      console.error("Insights error:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleTailorApplication = async (job: any) => {
    if (!activeCV) {
      alert("Please upload and analyze your CV in the 'CV Analysis' tab first before tailoring applications!");
      setActiveTab("cv");
      return;
    }
    setSelectedJob(job);
    setActiveTab("tailor");
    setTailorLoading(true);
    try {
      const res = await authFetch("/application/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setTailoredApp(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        const detail = errData.detail;
        const message = typeof detail === "string" ? detail : detail?.message;
        alert(message || "The application could not be tailored safely. Please try again.");
        if (detail?.code !== "TAILORING_FACT_CHECK_FAILED") {
          setActiveTab("cv");
        }
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
      const res = await authFetch("/application/save-crm", {
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
          source_cv_version_id: tailoredApp.source_cv_version_id,
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

  // Export Download Handlers
  const handleDownloadCVDocx = async (cvData: any, candidateName = "Candidate") => {
    try {
      const res = await authFetch("/application/export/cv/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tailored_cv_data: cvData,
          candidate_name: candidateName,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Tailored_CV_${candidateName.replace(/\s+/g, "_")}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error("Export CV error:", e);
    }
  };

  const handleDownloadCoverLetterDocx = async (letterText: string, company = "Job", title = "") => {
    try {
      const res = await authFetch("/application/export/cover-letter/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cover_letter: letterText,
          company_name: company,
          job_title: title,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Cover_Letter_${company.replace(/\s+/g, "_")}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error("Export Cover Letter error:", e);
    }
  };

  const handleDownloadEmailTxt = async (emailText: string, company = "Hiring_Manager") => {
    try {
      const res = await authFetch("/application/export/email/txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cold_email: emailText,
          company_name: company,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Cold_Email_${company.replace(/\s+/g, "_")}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error("Export Email error:", e);
    }
  };

  // Mini-CRM Handlers
  const handleOpenCRMAppDetails = (app: any) => {
    setSelectedCRMApp(app);
    setCrmModalOpen(true);
  };

  const handleUpdateCRMStatus = async (appId: string, newStatus: string) => {
    setStatusUpdateLoading(true);
    try {
      const res = await authFetch(`/application/crm/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchCRM();
        if (selectedCRMApp && selectedCRMApp.id === appId) {
          setSelectedCRMApp((prev: any) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleDeleteCRMApp = async (appId: string) => {
    if (confirm("Remove this application from your pipeline?")) {
      try {
        const res = await authFetch(`/application/crm/${appId}`, { method: "DELETE" });
        if (res.ok) {
          fetchCRM();
          setCrmModalOpen(false);
        }
      } catch (err) {
        console.error("CRM delete error:", err);
      }
    }
  };

  // Mock Interview Handlers
  const handleStartInterview = async () => {
    setInterviewLoading(true);
    try {
      const jobId = (interviewType === "Technical" || interviewType === "Behavioral")
        ? (selectedInterviewJobId || selectedJob?.id || null)
        : null;

      const res = await authFetch("/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_type: interviewType,
          domain: interviewType === "General" ? interviewDomain : null,
          job_id: jobId,
          total_turns: 999,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewSession(data);
        setInterviewTurns([{ role: "interviewer", content: data.question }]);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Failed to initialize interview.");
      }
    } catch (err) {
      console.error("Interview start error:", err);
    } finally {
      setInterviewLoading(false);
    }
  };

  const handleExitInterview = () => {
    setInterviewSession(null);
    setInterviewTurns([]);
    setCandidateAnswer("");
  };

  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim() || !interviewSession || interviewLoading || endingInterview) return;
    const answer = candidateAnswer;
    setCandidateAnswer("");
    setInterviewTurns((prev) => [...prev, { role: "candidate", content: answer }]);

    setInterviewLoading(true);
    try {
      const res = await authFetch("/interview/turn", {
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

  const handleEndInterview = async () => {
    if (!interviewSession || endingInterview) return;
    setEndingInterview(true);
    try {
      const res = await authFetch("/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: interviewSession.session_id }),
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewSession((prev: any) => ({
          ...prev,
          is_completed: true,
          final_evaluation: data.final_evaluation,
        }));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Failed to conclude interview.");
      }
    } catch (err) {
      console.error("End interview error:", err);
    } finally {
      setEndingInterview(false);
    }
  };

  // Conversational Roadmap Handler
  const handleSendRoadmapMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmapInput.trim() || roadmapLoading) return;

    const userMsg = roadmapInput.trim();
    setRoadmapInput("");
    setRoadmapMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    setRoadmapLoading(true);
    try {
      const history = roadmapMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await authFetch("/roadmap/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          conversation_history: history,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoadmapMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            roadmap: data.roadmap,
            suggestedReplies: data.suggested_replies || [],
          },
        ]);
      } else {
        setRoadmapMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I could not continue the plan just now. Please try that message again.",
          },
        ]);
      }
    } catch (err) {
      setRoadmapMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "ERR // Connection to Career Roadmap agent failed.",
        },
      ]);
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("Permanently delete your account and all associated data?")) {
      try {
        const res = await authFetch("/auth/account", { method: "DELETE" });
        if (res.ok || res.status === 401) {
          handleLogout();
          setSettingsOpen(false);
          alert("Account and records permanently deleted.");
        }
      } catch (err) {
        console.error("Delete error:", err);
        handleLogout();
        setSettingsOpen(false);
      }
    }
  };

  if (!mounted) return null;

  // Unauthenticated Flow: Architectural Gate Screen
  if (!token) {
    if (!authPanelOpen) {
      return (
        <PublicLanding
          onSignIn={() => { setAuthMode("login"); setAuthError(""); setAuthPanelOpen(true); }}
          onRegister={() => { setAuthMode("register"); setAuthError(""); setAuthPanelOpen(true); }}
        />
      );
    }
    return (
      <div className="min-h-screen bg-white dark:bg-[#07090e] bg-grid-pattern flex flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100">
        <div className="w-full max-w-md space-y-6">
          <button onClick={() => setAuthPanelOpen(false)} className="text-xs font-bold text-[#176B61] hover:underline">← Back to Career Copilot</button>
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>SYS // RUNNING</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>MULTI-AGENT AI</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Career Copilot
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Autonomous Career Strategy & Job Search Platform
            </p>
          </div>

          {/* Form Card */}
          <div className="arch-card corner-cross p-8 space-y-6 shadow-xl">
            <div className="flex border border-slate-200 dark:border-slate-800 rounded-lg p-1 bg-slate-50 dark:bg-slate-950 font-mono text-xs">
              <button
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`flex-1 py-1.5 font-bold rounded-md transition-all ${
                  authMode === "login"
                    ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`flex-1 py-1.5 font-bold rounded-md transition-all ${
                  authMode === "register"
                    ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Register
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 block uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="candidate@domain.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 block uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-mono font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                {authMode === "login" ? "Authenticate →" : "Create Account →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Main Surface
  return (
    <div className="min-h-screen bg-[#FAFAF6] dark:bg-[#071614] bg-grid-pattern text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Dock Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#D9E5E1] dark:border-[#23423E] bg-[#FAFAF6]/90 dark:bg-[#071614]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#102A2A] dark:bg-[#176B61] flex items-center justify-center text-white font-mono font-black text-xs shadow-sm">
              CC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  Career Copilot
                </span>
                <span className="tag-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Dock Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {[
              { id: "cv", label: "01. CV Audit", icon: FileText },
              { id: "jobs", label: "02. Matcher", icon: Search },
              { id: "tailor", label: "03. Studio", icon: Sparkles },
              { id: "crm", label: "04. Mini-CRM", icon: Layers },
              { id: "interview", label: "05. Interview", icon: MessageSquare },
              { id: "roadmap", label: "06. Roadmap", icon: Compass },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`nav-pill flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    isActive
                      ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-md ${theme === "light" ? "bg-white text-amber-500 shadow-sm" : "text-slate-400"}`}
                title="Light Mode"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-md ${theme === "dark" ? "bg-slate-800 text-indigo-400 shadow-sm" : "text-slate-400"}`}
                title="Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`p-1.5 rounded-md ${theme === "system" ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm" : "text-slate-400"}`}
                title="System Mode"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Surface */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* TAB 1: CV AUDIT */}
        {activeTab === "cv" && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <span className="tag-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                [MODULE // 01: CV ANALYSIS & ATS AUDIT]
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                CV review: general health or one specific job
              </h2>
            </div>

            <div className="arch-card corner-cross overflow-hidden">
              <div className="grid lg:grid-cols-[.8fr_1.2fr]">
                <div className="bg-[#102A2A] p-6 text-white">
                  <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#CDEB8B]">Choose the scoring context</span>
                  <h3 className="mt-3 text-2xl font-black">A useful ATS estimate needs context.</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">Targeted mode compares this CV with one real job description. General mode only checks document health and never presents itself as a vacancy match.</p>
                  <div className="mt-6 flex rounded-xl bg-white/10 p-1 text-xs font-bold">
                    <button onClick={() => setCvReviewMode("targeted")} className={`flex-1 rounded-lg px-3 py-2.5 ${cvReviewMode === "targeted" ? "bg-[#CDEB8B] text-[#102A2A]" : "text-white/70"}`}>Specific job</button>
                    <button onClick={() => setCvReviewMode("general")} className={`flex-1 rounded-lg px-3 py-2.5 ${cvReviewMode === "general" ? "bg-[#CDEB8B] text-[#102A2A]" : "text-white/70"}`}>General CV</button>
                  </div>
                </div>
                <div className="space-y-4 p-6">
                  {cvReviewMode === "targeted" ? (
                    <>
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Specific job role
                        <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Machine Learning Engineer" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#23877A] dark:border-slate-800 dark:bg-slate-950" />
                      </label>
                      <label className="block text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Job description
                        <textarea value={targetJobDescription} onChange={(e) => setTargetJobDescription(e.target.value)} rows={5} placeholder="Paste the full description for the exact vacancy..." className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#23877A] dark:border-slate-800 dark:bg-slate-950" />
                      </label>
                    </>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      <strong className="block">General CV health only</strong>
                      This checks parsing, action language, measurable evidence, contact hygiene, and brevity. It cannot tell you whether this CV fits a particular employer or vacancy.
                    </div>
                  )}
                  {cvReviewError && <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{cvReviewError}</div>}
                  <button onClick={() => handleCVReview()} disabled={cvReviewLoading || !activeCV || (cvReviewMode === "targeted" && (!targetRole.trim() || targetJobDescription.trim().length < 80))} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#176B61] py-3 text-xs font-black text-white hover:bg-[#102A2A] disabled:opacity-40">
                    {cvReviewLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {cvReviewMode === "targeted" ? "Analyze CV against this job" : "Run general CV health review"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Card */}
              <div className="arch-card corner-cross p-6 space-y-5 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" /> Active Resume File
                  </h3>
                  <span className="tag-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    PDF / DOCX
                  </span>
                </div>

                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-950/50">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileSelection}
                    className="hidden"
                    id="cv-file-input"
                  />
                  <label htmlFor="cv-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {selectedCVFile ? "Choose a different file" : "Upload Resume File"}
                    </span>
                    <span className="tag-mono text-[10px] text-slate-400">PDF (with OCR fallback) & DOCX</span>
                  </label>
                </div>

                {selectedCVFile && (
                  <div className="space-y-3 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{selectedCVFile.name}</span>
                        <span className="tag-mono text-[9px] text-slate-500">
                          {(selectedCVFile.size / 1024).toFixed(1)} KB • Ready to review
                        </span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300">
                      We will check document readability, experience evidence, skills, contact details, and improvement opportunities. Nothing is rewritten automatically.
                    </p>
                    <button
                      onClick={handleFileUpload}
                      disabled={cvLoading}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-lg shadow-sm transition-all"
                    >
                      {cvLoading ? "Analyzing your CV..." : "Analyze & improve my CV →"}
                    </button>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-mono">
                    <span className="bg-white dark:bg-[#0c101a] px-2 text-slate-400">Or Paste Text</span>
                  </div>
                </div>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste resume text directly..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handlePasteCV}
                  disabled={cvLoading || !pasteText.trim()}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-lg shadow-sm transition-all"
                >
                  {cvLoading ? "Analyzing..." : "Analyze Pasted Text →"}
                </button>
              </div>

              {/* Score Display Card */}
              <div className="arch-card corner-cross p-6 space-y-6 lg:col-span-2">
                {cvLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center space-y-5 font-mono">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl border border-indigo-500/30 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/40 flex items-center justify-center shadow-inner">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    </div>

                    <div className="space-y-1">
                      <span className="tag-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                        [SYS // PARSING & DETERMINISTIC EVALUATION]
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        Analyzing Resume Architecture
                      </h4>
                      <p className="text-xs text-slate-400">
                        Extracting sections and computing 100-point ATS compliance...
                      </p>
                    </div>

                    <div className="w-full max-w-md space-y-2.5 text-left text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse shrink-0" />
                        <span>01. Ingesting text stream & OCR fallback check...</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <Cpu className="w-3.5 h-3.5 text-indigo-600 animate-pulse shrink-0" />
                        <span>02. Extracting skills inventory & work experience...</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                        <span>03. Computing 100-point deterministic ATS score...</span>
                      </div>
                    </div>
                  </div>
                ) : activeCV?.general_ats_score ? (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-3">
                      <div>
                        <span className="tag-mono text-[10px] font-bold text-slate-400 uppercase">
                          ACTIVE FILE: {activeCV.filename}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                          Readiness Score Breakdown
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-4xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
                            {activeCV.general_ats_score.overall_score}
                            <span className="text-sm font-normal text-slate-400">/100</span>
                          </div>
                          <span className={`tag-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase border inline-block mt-0.5 ${
                            activeCV.general_ats_score.rating_tier === "Excellent"
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                              : activeCV.general_ats_score.rating_tier === "Good"
                              ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                              : activeCV.general_ats_score.rating_tier === "Average"
                              ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                              : "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                          }`}>
                            Tier: {activeCV.general_ats_score.rating_tier || "Standard"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 5 Standardized Standalone Sub-Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-5">
                      {[
                        { label: "Parseability", weight: "30%", val: activeCV.general_ats_score.category_scores?.parseability ?? 100 },
                        { label: "Action Impact", weight: "25%", val: activeCV.general_ats_score.category_scores?.action_impact ?? 85 },
                        { label: "Quantification", weight: "20%", val: activeCV.general_ats_score.category_scores?.quantification ?? 70 },
                        { label: "Contact Hygiene", weight: "15%", val: activeCV.general_ats_score.category_scores?.contact_hygiene ?? 100 },
                        { label: "Brevity & Format", weight: "10%", val: activeCV.general_ats_score.category_scores?.brevity_formatting ?? 90 },
                      ].map((cat, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                          <div>
                            <span className="tag-mono text-[9px] text-slate-500 uppercase block font-bold">{cat.label}</span>
                            <span className="tag-mono text-[8px] text-indigo-500 block">Weight: {cat.weight}</span>
                          </div>
                          <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
                            {cat.val}<span className="text-xs text-slate-400 font-normal">/100</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Feedback Checklist */}
                    <div>
                      <h4 className="tag-mono text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-3">
                        Improvement Action Items
                      </h4>
                      <div className="space-y-2">
                        {activeCV.general_ats_score.feedback_checklist?.length > 0 ? (
                          activeCV.general_ats_score.feedback_checklist.map((fb: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs font-mono text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                              <span>{fb}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>100% ATS hygiene criteria satisfied.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Extracted Skills */}
                    <div className="mt-6">
                      <h4 className="tag-mono text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                        Detected Skills Inventory ({activeCV.parsed_profile?.skills_inventory?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {activeCV.parsed_profile?.skills_inventory?.map((s: string, i: number) => (
                          <span key={i} className="tag-mono text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-400 font-mono text-xs">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">NO CV PROFILE LOADED</p>
                    <p className="text-slate-400 mt-1">Upload a resume to initialize the ATS scoring pipeline.</p>
                  </div>
                )}
              </div>
            </div>

            {cvReview && (
              <div className="arch-card corner-cross p-5 sm:p-6">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
                  <div><span className="text-[10px] font-black uppercase tracking-[.18em] text-[#23877A]">{cvReview.scope_label}</span><h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Problems paired with controlled corrections</h3><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">{cvReview.disclaimer}</p></div>
                  {cvReview.target_match && <div className="min-w-28 rounded-xl bg-[#DDF2EA] p-3 text-right text-[#102A2A]"><span className="block text-3xl font-black">{cvReview.target_match.match_score ?? "N/A"}</span><span className="text-[9px] font-black uppercase">Target match</span><span className="mt-1 block text-[9px]">{cvReview.target_match.score_confidence} confidence</span></div>}
                </div>
                <div className="mt-5 space-y-4">
                  {(cvReview.suggestions || []).length ? cvReview.suggestions.map((item: any) => {
                    const decision = suggestionDecisions[item.id];
                    return (
                      <article key={item.id} className={`rounded-2xl border p-4 ${decision === "accepted" ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10" : decision === "ignored" ? "border-slate-200 opacity-60 dark:border-slate-800" : "border-slate-200 dark:border-slate-800"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.section}</span><span className="text-xs font-black text-slate-900 dark:text-white">{item.category}</span></div>{item.requires_confirmation && <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase text-amber-800">Confirm evidence before use</span>}</div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-950 dark:bg-red-950/20"><span className="text-[9px] font-black uppercase tracking-wider text-red-600">Current CV / missing evidence</span><p className="mt-2 text-xs leading-5 text-red-950 dark:text-red-100">{item.source_text}</p></div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-950 dark:bg-emerald-950/20"><span className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Suggested correction or action</span><textarea value={suggestionEdits[item.id] ?? item.suggested_text} onChange={(e) => setSuggestionEdits((prev) => ({ ...prev, [item.id]: e.target.value }))} rows={3} className="mt-2 w-full resize-y bg-transparent text-xs leading-5 text-emerald-950 outline-none dark:text-emerald-100" /></div>
                        </div>
                        <p className="mt-3 text-[11px] leading-5 text-slate-500">{item.rationale}</p>
                        <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setSuggestionDecisions((prev) => ({ ...prev, [item.id]: "accepted" }))} className="rounded-lg bg-[#176B61] px-3 py-2 text-[10px] font-black text-white">{item.requires_confirmation ? "I verified / keep in draft" : "Accept into draft"}</button><button onClick={() => setSuggestionDecisions((prev) => ({ ...prev, [item.id]: "ignored" }))} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black dark:border-slate-700">Ignore</button><button onClick={() => navigator.clipboard.writeText(suggestionEdits[item.id] || item.suggested_text)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black dark:border-slate-700">Copy</button></div>
                      </article>
                    );
                  }) : <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">No source-linked corrections were found in the parsed CV.</div>}
                </div>
                {Object.values(suggestionDecisions).some((value) => value === "accepted") && <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-[#102A2A] p-4 text-white"><span className="text-xs">Accepted corrections stay in a review draft until you paste them into your CV.</span><button onClick={copyAcceptedCorrections} className="shrink-0 rounded-lg bg-[#CDEB8B] px-4 py-2 text-xs font-black text-[#102A2A]">Copy accepted corrections</button></div>}
              </div>
            )}

            {cvVersions.length > 0 && (
              <div className="arch-card corner-cross p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="tag-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">CV Progress</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Current and previous versions</h3>
                  </div>
                  <span className="tag-mono text-[9px] text-slate-500">1 current • up to 3 archived</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  {cvVersions.map((version) => (
                    <div
                      key={version.id}
                      className={`rounded-lg border p-3 ${version.is_current ? "border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="tag-mono text-[10px] font-black text-slate-900 dark:text-slate-100">VERSION {version.version_number}</span>
                        {version.is_current && (
                          <span className="tag-mono text-[8px] px-1.5 py-0.5 rounded bg-indigo-600 text-white">CURRENT</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate mt-2">{version.filename || "Pasted CV"}</p>
                      <div className="flex items-end justify-between mt-3">
                        <span className="text-[9px] text-slate-500">
                          {version.created_at ? new Date(version.created_at).toLocaleDateString() : "Date unavailable"}
                        </span>
                        <span className="font-mono text-lg font-black text-indigo-600 dark:text-indigo-400">
                          {version.resume_quality_result?.overall_score ?? "N/A"}
                        </span>
                      </div>
                      {version.change_summary?.score_delta != null && (
                        <p className={`tag-mono text-[9px] mt-2 ${version.change_summary.score_delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {version.change_summary.score_delta >= 0 ? "+" : ""}{version.change_summary.score_delta} points from previous
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: JOB MATCHER */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <span className="tag-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                [MODULE // 02: MARKET RESEARCH & HYBRID MATCHING]
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Verified individual job openings
              </h2>
              <p className="mt-2 text-xs text-slate-500">Search and category pages are rejected. Every result must identify one vacancy, include meaningful job detail, and link to that posting.</p>
            </div>

            {/* Search Bar */}
            <div className="arch-card p-3 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Target Role or Skills (e.g. AI Engineer, Python Cairo, React Remote)..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleSearchJobs}
                disabled={jobsLoading}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-mono font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm"
              >
                {jobsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Execute Search →
              </button>
            </div>

            {/* Job Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!jobsLoading && jobs.length === 0 && (
                <div className="arch-card col-span-full p-8 text-center"><Search className="mx-auto h-7 w-7 text-[#23877A]" /><h3 className="mt-3 text-sm font-black">Search for individual vacancies</h3><p className="mt-1 text-xs text-slate-500">If sources return only job-board category pages, the list stays empty rather than showing misleading results.</p></div>
              )}
              {jobs.map((job, idx) => (
                <div
                  key={idx}
                  className="arch-card corner-cross p-5 flex flex-col justify-between space-y-4 hover:border-slate-400 dark:hover:border-slate-600 transition-all cursor-pointer group"
                  onClick={() => handleOpenJobDetails(job)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="tag-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border border-slate-200 dark:border-slate-700">
                            {job.source ? `[${job.source.toUpperCase()}]` : "[MENA // RADAR]"}
                          </span>
                          {job.listing_quality === "individual_posting" && <span className="tag-mono rounded bg-[#DDF2EA] px-1.5 py-0.5 text-[8px] font-black uppercase text-[#176B61]">Verified posting</span>}
                          <span className="tag-mono text-[10px] text-slate-500 flex items-center gap-1">
                            <Building className="w-3 h-3" /> {job.company} • <MapPin className="w-3 h-3" /> {job.location || "Egypt / MENA"}
                          </span>
                        </div>
                      </div>
                      {job.match_score != null ? (
                        <div className="tag-mono px-2.5 py-1 rounded-md text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                          {job.match_score}% MATCH
                        </div>
                      ) : job.score_available === false ? (
                        <div className="tag-mono px-2.5 py-1 rounded-md text-xs font-black bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                          MATCH N/A
                        </div>
                      ) : null}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-3 leading-relaxed">
                      {job.description}
                    </p>
                    <span className="tag-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1.5 group-hover:underline">
                      Click to view full description & insights →
                    </span>

                    {job.matched_skills && job.matched_skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {job.matched_skills.slice(0, 4).map((ms: string, i: number) => (
                          <span key={i} className="tag-mono text-[9px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                            ✓ {ms}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <button
                        onClick={() => handleSaveJobToCRM(job)}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1"
                        title="Save Job to Mini-CRM"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" /> Save
                      </button>
                      <button
                        onClick={() => handleOpenJobDetails(job, true)}
                        className="px-2 py-1 text-slate-500 hover:text-indigo-600 flex items-center gap-1"
                      >
                        <Building className="w-3.5 h-3.5" /> Insights
                      </button>
                    </div>
                    <button
                      onClick={() => handleTailorApplication(job)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold rounded-md flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Tailor App →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: APPLICATION STUDIO */}
        {activeTab === "tailor" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
              <div>
                <span className="tag-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                  [MODULE // 03: APPLICATION FACT STUDIO]
                </span>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                  Fact-Checked Full Resume & Document Suite
                </h2>
              </div>
              {tailoredApp?.critic_passed && (
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <button
                    onClick={() => handleDownloadCVDocx(tailoredApp.tailored_cv_data, activeCV?.parsed_profile?.contact_info?.name || "Candidate")}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" /> CV (DOCX)
                  </button>
                  <button
                    onClick={() => handleDownloadCoverLetterDocx(tailoredApp.cover_letter, selectedJob?.company || "Company", selectedJob?.title || "Role")}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" /> Letter (DOCX)
                  </button>
                  <button
                    onClick={() => handleDownloadEmailTxt(tailoredApp.cold_email, selectedJob?.company || "Hiring_Manager")}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" /> Email (TXT)
                  </button>
                  <button
                    onClick={handleSaveToCRM}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-sm"
                  >
                    Save to CRM →
                  </button>
                </div>
              )}
            </div>

            {tailorLoading ? (
              <div className="arch-card py-16 text-center space-y-3 font-mono">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-600" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">GENERATING FULL CV & FACT CRITIC LOOP...</p>
                <p className="text-xs text-slate-400">Verifying zero hallucinations against candidate profile.</p>
              </div>
            ) : tailoredApp ? (
              <div className="space-y-6">
                {/* Fact Critic Badge */}
                <div className={`p-4 rounded-lg border flex items-center justify-between ${tailoredApp.critic_passed ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60" : "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60"}`}>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className={`w-5 h-5 ${tailoredApp.critic_passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
                    <div>
                      <span className={`tag-mono text-xs font-bold block ${tailoredApp.critic_passed ? "text-emerald-900 dark:text-emerald-200" : "text-red-900 dark:text-red-200"}`}>
                        FACT CRITIC: {tailoredApp.critic_passed ? "PASSED" : "FAILED — MANUAL REVIEW REQUIRED"} (ATTEMPT {tailoredApp.critic_attempts}/3)
                      </span>
                      <span className={`text-xs ${tailoredApp.critic_passed ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                        {tailoredApp.critic_passed
                          ? "Verified against the complete candidate profile, including skills, letter, and email."
                          : "This content is not verified and cannot be saved or exported automatically."}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-500 block">ATS MATCH DELTA:</span>
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {tailoredApp.ats_score_before != null ? `${tailoredApp.ats_score_before}%` : "N/A"} →{" "}
                      <span className="text-emerald-600">
                        {tailoredApp.ats_score_after != null ? `${tailoredApp.ats_score_after}%` : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Full Tailored CV */}
                  <div className="arch-card corner-cross p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <h3 className="tag-mono text-xs font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" /> Full Tailored Resume
                      </h3>
                      <div className="flex items-center gap-3"><button onClick={() => copyTailoredCVText(tailoredApp.tailored_cv_data)} className="tag-mono text-xs font-bold text-[#176B61] hover:underline">Copy CV text</button><button onClick={() => handleDownloadCVDocx(tailoredApp.tailored_cv_data, activeCV?.parsed_profile?.contact_info?.name || "Candidate")} className="tag-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"><Download className="w-3.5 h-3.5" /> DOCX</button></div>
                    </div>

                    {tailoredApp.tailored_cv_data?.professional_summary && (
                      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <strong className="tag-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1 uppercase">
                          Targeted Professional Summary:
                        </strong>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {tailoredApp.tailored_cv_data.professional_summary}
                        </p>
                      </div>
                    )}

                    {tailoredApp.tailored_cv_data?.skills?.length > 0 && (
                      <div>
                        <strong className="tag-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5 uppercase">
                          Emphasized Technical Skills:
                        </strong>
                        <div className="flex flex-wrap gap-1">
                          {tailoredApp.tailored_cv_data.skills.map((s: string, i: number) => (
                            <span key={i} className="tag-mono text-[9px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <strong className="tag-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 block uppercase">
                        Tailored Experience:
                      </strong>
                      {tailoredApp.tailored_cv_data?.experience?.map((exp: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <strong className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {exp.title} — {exp.company}
                          </strong>
                          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                            {exp.bullets?.map((b: string, j: number) => (
                              <li key={j}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Letter & Outreach Email */}
                  <div className="arch-card corner-cross p-5 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="tag-mono text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Cover Letter</h3>
                        <div className="flex items-center gap-3"><button onClick={() => navigator.clipboard.writeText(tailoredApp.cover_letter || "")} className="tag-mono text-xs font-bold text-[#176B61] hover:underline">Copy</button><button onClick={() => handleDownloadCoverLetterDocx(tailoredApp.cover_letter, selectedJob?.company || "Company", selectedJob?.title || "Role")} className="tag-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"><Download className="w-3.5 h-3.5" /> DOCX</button></div>
                      </div>
                      <textarea
                        value={tailoredApp.cover_letter}
                        onChange={(e) => setTailoredApp({ ...tailoredApp, cover_letter: e.target.value })}
                        rows={8}
                        className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="tag-mono text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Cold Outreach Email</h3>
                        <div className="flex items-center gap-3"><button onClick={() => navigator.clipboard.writeText(tailoredApp.cold_email || "")} className="tag-mono text-xs font-bold text-[#176B61] hover:underline">Copy</button><button onClick={() => handleDownloadEmailTxt(tailoredApp.cold_email, selectedJob?.company || "Hiring_Manager")} className="tag-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"><Download className="w-3.5 h-3.5" /> TXT</button></div>
                      </div>
                      <textarea
                        value={tailoredApp.cold_email}
                        onChange={(e) => setTailoredApp({ ...tailoredApp, cold_email: e.target.value })}
                        rows={5}
                        className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="arch-card py-16 text-center text-slate-400 font-mono text-xs">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="font-bold text-slate-700 dark:text-slate-300">SELECT A JOB POSTING</p>
                <p className="text-slate-400 mt-1">Open Job Matcher and click 'Tailor App' to generate documents.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MINI-CRM */}
        {activeTab === "crm" && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <span className="tag-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                [MODULE // 04: PIPELINE CRM]
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                6-Stage Application Pipeline
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              {["Saved", "Tailored", "Applied", "Interviewing", "Offered", "Rejected"].map((colStatus) => {
                const colApps = crmApplications.filter((a) => a.status === colStatus);
                return (
                  <div key={colStatus} className="arch-card corner-cross p-3 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="tag-mono text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">{colStatus}</span>
                        <span className="tag-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {colApps.length}
                        </span>
                      </div>

                      <div className="space-y-2 mt-3">
                        {colApps.map((app, i) => (
                          <div
                            key={i}
                            onClick={() => handleOpenCRMAppDetails(app)}
                            className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer transition-all space-y-1"
                          >
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{app.title}</h4>
                            <span className="tag-mono text-[10px] text-slate-500 block line-clamp-1">{app.company}</span>
                            {app.ats_score_after && (
                              <span className="tag-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block">
                                ATS: {app.ats_score_after}%
                              </span>
                            )}
                          </div>
                        ))}
                        {colApps.length === 0 && (
                          <p className="tag-mono text-[10px] text-slate-400 text-center py-6">-- EMPTY --</p>
                        )}
                      </div>
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
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <span className="tag-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                [MODULE // 05: INTERVIEW SIMULATOR]
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Stateful Mock Interview & STAR Scorecard
              </h2>
            </div>

            {!interviewSession ? (
              <div className="arch-card corner-cross p-8 max-w-xl mx-auto space-y-5">
                <div className="text-center space-y-1">
                  <MessageSquare className="w-8 h-8 mx-auto text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Configure Interview Protocol</h3>
                  <p className="tag-mono text-[11px] text-slate-500">Select focus mode and target parameters.</p>
                </div>
                
                {/* Mode Selector */}
                <div className="flex border border-slate-200 dark:border-slate-800 rounded-lg p-1 bg-slate-50 dark:bg-slate-950 font-mono text-xs">
                  {(["General", "Technical", "Behavioral"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setInterviewType(mode)}
                      className={`flex-1 py-1.5 font-bold rounded-md transition-all ${
                        interviewType === mode
                          ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {interviewType === "General" && (
                  <div className="text-left space-y-1">
                    <label className="tag-mono text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                      Target Interview Domain / Focus Field:
                    </label>
                    <input
                      type="text"
                      value={interviewDomain}
                      onChange={(e) => setInterviewDomain(e.target.value)}
                      placeholder="e.g. Machine Learning, Cloud Architecture, DevOps..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {(interviewType === "Technical" || interviewType === "Behavioral") && (
                  <div className="text-left space-y-1.5">
                    <label className="tag-mono text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 block">
                      Target Job Opportunity (from Mini-CRM Pipeline):
                    </label>
                    {crmApplications.length > 0 ? (
                      <select
                        value={selectedInterviewJobId}
                        onChange={(e) => setSelectedInterviewJobId(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">-- Select Mini-CRM Opportunity ({crmApplications.length} Available) --</option>
                        {crmApplications.map((app) => (
                          <option key={app.id} value={app.job_id}>
                            {app.title} — {app.company} [{app.status}]
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-mono flex items-center justify-between">
                        <span>No jobs saved in Mini-CRM yet.</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("jobs")}
                          className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100"
                        >
                          Find & Save Jobs →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleStartInterview}
                  disabled={interviewLoading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {interviewLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                  Initialize Interview Session →
                </button>
              </div>
            ) : (
              <div className="arch-card corner-cross p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="tag-mono text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                    [INTERVIEW // {interviewSession.interview_type} — TURN {interviewSession.current_turn || 1}]
                  </span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    {!interviewSession.is_completed ? (
                      <button
                        onClick={handleEndInterview}
                        disabled={endingInterview}
                        className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold rounded-md flex items-center gap-1.5"
                      >
                        {endingInterview ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
                        Conclude & Scorecard
                      </button>
                    ) : (
                      <span className="tag-mono text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-md">
                        COMPLETED
                      </span>
                    )}
                    <button
                      onClick={handleExitInterview}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Exit
                    </button>
                  </div>
                </div>

                {/* Conversation Transcript */}
                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                  {interviewTurns.map((turn, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg text-xs leading-relaxed ${
                        turn.role === "interviewer"
                          ? "bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800"
                          : turn.role === "feedback"
                          ? "bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50"
                          : "bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 ml-8"
                      }`}
                    >
                      <strong className="tag-mono block font-bold mb-1 uppercase text-slate-900 dark:text-slate-100">
                        {turn.role === "interviewer" ? "[INTERVIEWER]" : turn.role === "feedback" ? "[MICRO-FEEDBACK]" : "[CANDIDATE]"}
                      </strong>
                      <p className="text-slate-800 dark:text-slate-200">{turn.content}</p>
                    </div>
                  ))}
                </div>

                {/* Scorecard */}
                {interviewSession.final_evaluation && (
                  <div className="p-5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="tag-mono text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <Award className="w-4 h-4" /> [FINAL EVALUATION SCORECARD]
                      </h4>
                      <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {interviewSession.final_evaluation.overall_score}/100
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      Recommendation: <strong className="text-emerald-600 uppercase">{interviewSession.final_evaluation.hiring_recommendation}</strong>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {interviewSession.final_evaluation.star_method_assessment || interviewSession.final_evaluation.technical_depth_assessment}
                    </p>

                    <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900/50 flex justify-end">
                      <button
                        onClick={handleExitInterview}
                        className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white font-mono text-xs font-bold rounded-md flex items-center gap-1.5 shadow"
                      >
                        <ArrowRight className="w-3.5 h-3.5" /> Exit Session & Return →
                      </button>
                    </div>
                  </div>
                )}

                {!interviewSession.is_completed && (
                  <div className="flex gap-2">
                    <textarea
                      value={candidateAnswer}
                      onChange={(e) => setCandidateAnswer(e.target.value)}
                      placeholder={endingInterview ? "Concluding interview and compiling scorecard..." : "Type response to interviewer..."}
                      disabled={interviewLoading || endingInterview}
                      rows={3}
                      className="flex-1 text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={interviewLoading || endingInterview || !candidateAnswer.trim()}
                      className="px-5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ROADMAP PLANNER */}
        {activeTab === "roadmap" && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <span className="tag-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                [MODULE // 06: CAREER ROADMAP ASSISTANT]
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Adaptive career strategy and learning roadmap
              </h2>
            </div>

            <div className="arch-card corner-cross flex flex-col h-[650px]">
              {/* Messages Feed */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {roadmapMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-2xl p-4 rounded-xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-slate-900 text-white dark:bg-indigo-600 font-mono shadow-sm"
                          : "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {msg.roadmap && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between tag-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            <span>{msg.roadmap.target_role} ({msg.roadmap.timeframe})</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                              FEASIBILITY VERIFIED
                            </span>
                          </div>

                          {msg.roadmap.milestones?.map((m: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-lg bg-white dark:bg-[#0c101a] border border-slate-200 dark:border-slate-800 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <strong className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">{m.title}</strong>
                                <span className="tag-mono text-[10px] text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {m.duration_weeks} wks ({m.allocated_hours} hrs)
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {m.core_topics?.map((topic: string, j: number) => (
                                  <span key={j} className="tag-mono text-[9px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                                    {topic}
                                  </span>
                                ))}
                              </div>

                              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]">
                                <strong className="tag-mono text-indigo-600 dark:text-indigo-400 uppercase">Deliverable: </strong>
                                <span>{m.hands_on_project}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.suggestedReplies?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                          {msg.suggestedReplies.map((reply: string) => (
                            <button key={reply} onClick={() => setRoadmapInput(reply)} className="rounded-full border border-[#9ACFC4] bg-[#EDF8F5] px-3 py-1.5 text-[10px] font-bold text-[#176B61] hover:bg-[#DDF2EA]">{reply}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {roadmapLoading && (
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 p-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>SYS // Evaluating feasibility against market trends...</span>
                  </div>
                )}
                <div ref={roadmapChatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendRoadmapMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2 bg-slate-50/50 dark:bg-slate-950/50">
                <input
                  type="text"
                  value={roadmapInput}
                  onChange={(e) => setRoadmapInput(e.target.value)}
                  placeholder="Try: 'I want a job in UAE' or 'Help me become an AI Engineer'..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={roadmapLoading || !roadmapInput.trim()}
                  className="px-5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Mini-CRM Modal */}
      {crmModalOpen && selectedCRMApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="arch-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedCRMApp.title}</h3>
                <span className="tag-mono text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Building className="w-3.5 h-3.5" /> {selectedCRMApp.company} • <MapPin className="w-3.5 h-3.5" /> {selectedCRMApp.location || "Remote"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteCRMApp(selectedCRMApp.id)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  title="Delete Application"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCrmModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Stage Selector */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="tag-mono text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Stage:</span>
              <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                {["Saved", "Tailored", "Applied", "Interviewing", "Offered", "Rejected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateCRMStatus(selectedCRMApp.id, st)}
                    disabled={statusUpdateLoading}
                    className={`px-2.5 py-1 font-bold rounded transition-all ${
                      selectedCRMApp.status === st
                        ? "bg-slate-900 text-white dark:bg-indigo-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Untailored CTA or Generated Tailored Assets */}
            {!selectedCRMApp.tailored_cv_data ? (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="tag-mono text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Untailored Opportunity
                  </span>
                  <p className="text-xs text-slate-500 font-mono">
                    Run the multi-agent Application Studio to generate a tailored CV, cover letter, and outreach email.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCrmModalOpen(false);
                    handleTailorApplication({
                      id: selectedCRMApp.job_id || selectedCRMApp.id,
                      title: selectedCRMApp.title,
                      company: selectedCRMApp.company,
                      description: selectedCRMApp.description,
                      location: selectedCRMApp.location,
                    });
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Run Application Agent →
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="tag-mono text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Generated Tailored Assets
                  </span>
                  {selectedCRMApp.ats_score_after && (
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      ATS: {selectedCRMApp.ats_score_after}%
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDownloadCVDocx(selectedCRMApp.tailored_cv_data, activeCV?.parsed_profile?.contact_info?.name || "Candidate")}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-900 dark:text-slate-100 font-bold rounded border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" /> CV (DOCX)
                    </button>
                    {selectedCRMApp.cover_letter && (
                      <button
                        onClick={() => handleDownloadCoverLetterDocx(selectedCRMApp.cover_letter, selectedCRMApp.company, selectedCRMApp.title)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-900 dark:text-slate-100 font-bold rounded border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" /> Letter (DOCX)
                      </button>
                    )}
                    {selectedCRMApp.cold_email && (
                      <button
                        onClick={() => handleDownloadEmailTxt(selectedCRMApp.cold_email, selectedCRMApp.company)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-900 dark:text-slate-100 font-bold rounded border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" /> Email (TXT)
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCrmModalOpen(false);
                      handleTailorApplication({
                        id: selectedCRMApp.job_id || selectedCRMApp.id,
                        title: selectedCRMApp.title,
                        company: selectedCRMApp.company,
                        description: selectedCRMApp.description,
                        location: selectedCRMApp.location,
                      });
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded flex items-center gap-1.5 shadow-sm ml-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Re-Tailor →
                  </button>
                </div>
              </div>
            )}

            <div>
              <strong className="tag-mono text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Job Description
              </strong>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                {selectedCRMApp.description || "No description recorded."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Job Details & Expandable Insights Modal (Matcher Tab) */}
      {jobDetailsModalOpen && selectedMatcherJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="arch-card max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedMatcherJob.title}</h3>
                  <span className="tag-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border border-slate-200 dark:border-slate-700">
                    {selectedMatcherJob.source ? `[${selectedMatcherJob.source.toUpperCase()}]` : "[RADAR]"}
                  </span>
                  {selectedMatcherJob.match_score != null ? (
                    <span className="tag-mono text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                      {selectedMatcherJob.match_score}% Match
                    </span>
                  ) : selectedMatcherJob.score_available === false ? (
                    <span className="tag-mono text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                      Match unavailable
                    </span>
                  ) : null}
                </div>
                <span className="tag-mono text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Building className="w-3.5 h-3.5" /> {selectedMatcherJob.company} • <MapPin className="w-3.5 h-3.5" /> {selectedMatcherJob.location || "Egypt / MENA"}
                </span>
              </div>
              <button
                onClick={() => setJobDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* 5-Factor Match Breakdown */}
            {selectedMatcherJob.sub_scores && (
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="tag-mono text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    5-Factor Target Match Model
                  </span>
                  <span className="tag-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    Tier: {selectedMatcherJob.rating_tier || "Standard"} • Confidence: {selectedMatcherJob.score_confidence || "Unknown"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: "Hard Skills", weight: "40%", val: selectedMatcherJob.sub_scores.hard_skills },
                    { label: "Semantic NLP", weight: "25%", val: selectedMatcherJob.sub_scores.semantic_nlp },
                    { label: "Title Fit", weight: "15%", val: selectedMatcherJob.sub_scores.title_alignment },
                    { label: "Exp Years", weight: "10%", val: selectedMatcherJob.sub_scores.experience_years },
                    { label: "Soft Skills", weight: "10%", val: selectedMatcherJob.sub_scores.soft_skills },
                  ].map((sub, idx) => (
                    <div key={idx} className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="tag-mono text-[8px] text-slate-500 uppercase block">{sub.label} ({sub.weight})</span>
                      <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                        {sub.val == null ? "N/A" : `${sub.val}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 gap-2 font-mono text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveJobToCRM(selectedMatcherJob)}
                  className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-bold shadow-sm"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" /> Save to Mini-CRM
                </button>
                {selectedMatcherJob.redirect_url && (
                  <a
                    href={selectedMatcherJob.redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-bold shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-600" /> Open original job posting ↗
                  </a>
                )}
              </div>
              <button
                onClick={() => {
                  setJobDetailsModalOpen(false);
                  handleTailorApplication(selectedMatcherJob);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Tailor Application →
              </button>
            </div>

            {/* Skills Tags */}
            {selectedMatcherJob.extracted_skills && selectedMatcherJob.extracted_skills.length > 0 && (
              <div className="space-y-1.5">
                <span className="tag-mono text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                  Required / Extracted Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMatcherJob.extracted_skills.map((skill: string, i: number) => (
                    <span
                      key={i}
                      className="tag-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Full Unclipped Job Description */}
            <div className="space-y-1.5">
              <span className="tag-mono text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                Full Job Description
              </span>
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
                {selectedMatcherJob.description || "No description provided."}
              </div>
            </div>

            {/* Company Insights Accordion / Extension */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="tag-mono text-xs font-bold uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-600" />
                  Company Intelligence & Culture
                </span>
                <button
                  onClick={() => {
                    if (!insightsExpanded) {
                      setInsightsExpanded(true);
                      if (!companyInsights) {
                        fetchInsightsForJob(selectedMatcherJob);
                      }
                    } else {
                      setInsightsExpanded(false);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Building className="w-3.5 h-3.5" />
                  {insightsExpanded ? "Hide Insights ↑" : "Load & View Company Insights ↓"}
                </button>
              </div>

              {insightsExpanded && (
                <div className="p-4 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 space-y-3 transition-all">
                  {insightsLoading ? (
                    <div className="py-6 text-center space-y-2 font-mono text-xs">
                      <RefreshCw className="w-5 h-5 mx-auto animate-spin text-indigo-600" />
                      <p className="text-slate-500">Querying company intelligence & culture...</p>
                    </div>
                  ) : companyInsights ? (
                    <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                      <div>
                        <strong className="tag-mono text-[10px] block font-bold text-slate-900 dark:text-slate-100 mb-1 uppercase">
                          Company Overview
                        </strong>
                        <p className="bg-white/80 dark:bg-slate-900/80 p-3 rounded border border-indigo-100 dark:border-indigo-950">
                          {companyInsights.summary}
                        </p>
                      </div>

                      {companyInsights.culture_values && companyInsights.culture_values.length > 0 && (
                        <div>
                          <strong className="tag-mono text-[10px] block font-bold text-slate-900 dark:text-slate-100 mb-1 uppercase">
                            Culture & Core Values
                          </strong>
                          <ul className="list-disc pl-5 space-y-1 bg-white/80 dark:bg-slate-900/80 p-3 rounded border border-indigo-100 dark:border-indigo-950">
                            {companyInsights.culture_values.map((val: string, idx: number) => (
                              <li key={idx}>{val}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {companyInsights.tech_stack_highlights && companyInsights.tech_stack_highlights.length > 0 && (
                        <div>
                          <strong className="tag-mono text-[10px] block font-bold text-slate-900 dark:text-slate-100 mb-1 uppercase">
                            Tech Stack Highlights
                          </strong>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {companyInsights.tech_stack_highlights.map((tech: string, idx: number) => (
                              <span
                                key={idx}
                                className="tag-mono text-[9px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-mono">No specific company intelligence cached.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="arch-card max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="tag-mono text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white uppercase">
                <SettingsIcon className="w-4 h-4 text-indigo-600" /> System Settings
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-200 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 uppercase">Active User</label>
                <p className="text-slate-600 dark:text-slate-400">{userEmail}</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 uppercase">Theme Mode</label>
                <div className="flex gap-2">
                  {["light", "dark", "system"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-3 py-1.5 rounded font-bold capitalize ${
                        theme === t ? "bg-slate-900 text-white dark:bg-indigo-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 uppercase">Active Resume Status</label>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {activeCV?.filename || "No active CV"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Single Active Policy: Uploading a new CV automatically purges previous files.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button
                  onClick={handleLogout}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete Account & Purge Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
